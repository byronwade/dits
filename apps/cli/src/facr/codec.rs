//! Frame codec abstraction.
//!
//! `FrameCodec` is the seam between FACR and a concrete intra-frame encoding.
//! Every frame must be *independently decodable* (no inter-frame prediction) so
//! it can be content-addressed and shared across versions. The shipped v1 codec
//! is a deflate-backed raw codec — fully testable without external tools;
//! production codecs (ProRes/DNxHR via ffmpeg, intra-AV1, JPEG-XL) implement
//! the same trait.

use std::io::{Read, Write};

use anyhow::{Context, Result};
use flate2::{read::ZlibDecoder, write::ZlibEncoder, Compression};

/// An uncompressed frame: raw interleaved pixel bytes plus dimensions.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RawFrame {
    pub width:  u32,
    pub height: u32,
    /// Interleaved pixel data (e.g. RGBA8); length should be
    /// `width*height*channels`.
    pub data:   Vec<u8>,
}

/// A codec that encodes/decodes individual frames independently.
pub trait FrameCodec {
    /// Stable codec name, recorded in the clip manifest.
    fn name(&self) -> &'static str;

    /// Encode a frame to its stored representation. MUST be deterministic: the
    /// same `RawFrame` must always produce identical bytes, or content
    /// addressing breaks.
    fn encode_frame(&self, frame: &RawFrame) -> Result<Vec<u8>>;

    /// Decode a stored frame back to pixels.
    fn decode_frame(&self, bytes: &[u8]) -> Result<RawFrame>;
}

/// Deflate-backed raw frame codec (v1, dependency-light, lossless).
///
/// Layout: `width: u32 LE | height: u32 LE | zlib(data)`.
pub struct DeflateRawCodec;

impl FrameCodec for DeflateRawCodec {
    fn name(&self) -> &'static str {
        "deflate_raw_v1"
    }

    fn encode_frame(&self, frame: &RawFrame) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(8 + frame.data.len() / 2);
        out.extend_from_slice(&frame.width.to_le_bytes());
        out.extend_from_slice(&frame.height.to_le_bytes());
        // Fixed compression level keeps the output deterministic for content
        // addressing.
        let mut enc = ZlibEncoder::new(Vec::new(), Compression::new(6));
        enc.write_all(&frame.data).context("zlib write")?;
        let compressed = enc.finish().context("zlib finish")?;
        out.extend_from_slice(&compressed);
        Ok(out)
    }

    fn decode_frame(&self, bytes: &[u8]) -> Result<RawFrame> {
        anyhow::ensure!(bytes.len() >= 8, "frame too short to contain a header");
        let width = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
        let height = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
        let mut data = Vec::new();
        ZlibDecoder::new(&bytes[8..])
            .read_to_end(&mut data)
            .context("zlib decode")?;
        Ok(RawFrame { width, height, data })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_frame() -> RawFrame {
        // 2x2 RGBA gradient.
        RawFrame {
            width:  2,
            height: 2,
            data:   vec![0, 0, 0, 255, 64, 64, 64, 255, 128, 128, 128, 255, 255, 255, 255, 255],
        }
    }

    #[test]
    fn encodes_deterministically_and_round_trips() {
        let codec = DeflateRawCodec;
        let frame = sample_frame();

        let e1 = codec.encode_frame(&frame).unwrap();
        let e2 = codec.encode_frame(&frame).unwrap();

        // Deterministic: identical pixels -> identical bytes (required for addressing).
        assert_eq!(e1, e2);

        // Independently decodable back to the exact pixels (lossless).
        let decoded = codec.decode_frame(&e1).unwrap();
        assert_eq!(decoded, frame);
    }
}
