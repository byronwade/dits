import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Algorithms",
  description: "Core algorithms used in Dits",
};

export default function AlgorithmsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Algorithms</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits uses several specialized algorithms to efficiently handle large
        binary files. This page explains the key algorithms and their
        implementations.
      </p>

      <h2>FastCDC (Content-Defined Chunking)</h2>
      <p>
        FastCDC determines where to split files into chunks based on content,
        not fixed positions. This enables efficient deduplication even when
        content is inserted or removed.
      </p>

      <h3>Algorithm Overview</h3>
      <pre className="not-prose">
        <code>{`FastCDC Parameters:
  MIN_SIZE = 256 KB    // Minimum chunk size
  AVG_SIZE = 1 MB      // Target average size
  MAX_SIZE = 4 MB      // Maximum chunk size

  // Gear table: 256 random 64-bit values
  GEAR: [u64; 256]

  // Masks for boundary detection
  MASK_S = (1 << 13) - 1  // For small chunks
  MASK_L = (1 << 15) - 1  // For large chunks`}</code>
      </pre>

      <h3>Implementation</h3>
      <pre className="not-prose">
        <code>{`fn find_chunk_boundaries(data: &[u8]) -> Vec<usize> {
    let mut boundaries = vec![0];
    let mut pos = 0;

    while pos < data.len() {
        let boundary = find_next_boundary(&data[pos..], data.len() - pos);
        pos += boundary;
        boundaries.push(pos);
    }

    boundaries
}

fn find_next_boundary(data: &[u8], remaining: usize) -> usize {
    // Initialize rolling hash
    let mut hash: u64 = 0;

    // Minimum chunk size - no boundary detection here
    let min_end = MIN_SIZE.min(data.len());
    for i in 0..min_end {
        hash = (hash << 1).wrapping_add(GEAR[data[i] as usize]);
    }

    // Normal boundary detection (smaller mask = more boundaries)
    let normal_end = AVG_SIZE.min(data.len());
    for i in min_end..normal_end {
        hash = (hash << 1).wrapping_add(GEAR[data[i] as usize]);
        if (hash & MASK_S) == 0 {
            return i + 1;  // Found boundary
        }
    }

    // Larger chunks use larger mask (fewer boundaries)
    let max_end = MAX_SIZE.min(data.len());
    for i in normal_end..max_end {
        hash = (hash << 1).wrapping_add(GEAR[data[i] as usize]);
        if (hash & MASK_L) == 0 {
            return i + 1;  // Found boundary
        }
    }

    // Force boundary at max size
    max_end
}`}</code>
      </pre>

      <h3>Shift Resistance</h3>
      <p>
        The key property of CDC is shift resistance: inserting or deleting data
        only affects nearby chunks, not the entire file:
      </p>
      <pre className="not-prose">
        <code>{`Original:  [AAAA][BBBBB][CCC][DDDDD]
           Boundaries at content-defined positions

Insert "XX" at position 2:
           [AA][XX][AA][BBBBB][CCC][DDDDD]
                   ↑
           Only first chunk changed!

Fixed-size (bad):
Original:  [AAAA][BBBB][CCCC][DDDD]
Insert:    [AAXX][AABB][BBCC][CCDD][DD]
           ALL chunks changed!`}</code>
      </pre>

      <h2>Keyframe Alignment</h2>
      <p>
        For video files, Dits adjusts chunk boundaries to align with keyframes
        (I-frames) when possible:
      </p>

      <pre className="not-prose">
        <code>{`fn align_to_keyframe(
    boundary: usize,
    keyframes: &[usize],
    tolerance: usize,
) -> usize {
    // Find keyframes within tolerance of boundary
    let candidates: Vec<_> = keyframes
        .iter()
        .filter(|&&kf| {
            kf.abs_diff(boundary) <= tolerance
        })
        .collect();

    // Return nearest keyframe, or original boundary
    candidates
        .into_iter()
        .min_by_key(|&&kf| kf.abs_diff(boundary))
        .copied()
        .unwrap_or(boundary)
}

// Integration with CDC:
fn chunk_video(data: &[u8], keyframes: &[usize]) -> Vec<Chunk> {
    let mut chunks = Vec::new();
    let mut pos = 0;

    while pos < data.len() {
        // Find CDC boundary
        let cdc_boundary = find_next_boundary(&data[pos..]);

        // Align to keyframe if close
        let aligned = align_to_keyframe(
            pos + cdc_boundary,
            keyframes,
            TOLERANCE,  // e.g., 64KB
        );

        let chunk_data = &data[pos..aligned];
        chunks.push(create_chunk(chunk_data));
        pos = aligned;
    }

    chunks
}`}</code>
      </pre>

      <h2>BLAKE3 Hashing</h2>
      <p>
        BLAKE3 is used for all content addressing. It&apos;s designed for speed and
        parallelism while maintaining cryptographic security.
      </p>

      <h3>Key Properties</h3>
      <ul>
        <li><strong>Speed:</strong> ~10 GB/s on modern CPUs</li>
        <li><strong>Parallelism:</strong> Utilizes all CPU cores</li>
        <li><strong>Tree structure:</strong> Enables incremental hashing</li>
        <li><strong>Fixed output:</strong> 256-bit (32 bytes)</li>
      </ul>

      <pre className="not-prose">
        <code>{`use blake3::Hasher;

fn hash_chunk(data: &[u8]) -> [u8; 32] {
    let mut hasher = Hasher::new();
    hasher.update(data);
    *hasher.finalize().as_bytes()
}

// For large files, use parallel hashing:
fn hash_file_parallel(data: &[u8]) -> [u8; 32] {
    // BLAKE3 automatically parallelizes for large inputs
    blake3::hash(data).into()
}

// Incremental hashing (for streaming):
fn hash_streaming<R: Read>(reader: &mut R) -> io::Result<[u8; 32]> {
    let mut hasher = Hasher::new();
    let mut buffer = [0u8; 65536];

    loop {
        let n = reader.read(&mut buffer)?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }

    Ok(*hasher.finalize().as_bytes())
}`}</code>
      </pre>

      <h2>ISOBMFF Parsing</h2>
      <p>
        For MP4/MOV files, Dits parses the ISOBMFF container format to find
        keyframe positions and protect critical atoms:
      </p>

      <pre className="not-prose">
        <code>{`struct Atom {
    size: u64,
    atom_type: [u8; 4],
    offset: u64,
    children: Vec<Atom>,
}

fn parse_atoms(data: &[u8]) -> Vec<Atom> {
    let mut atoms = Vec::new();
    let mut pos = 0;

    while pos < data.len() {
        let size = read_u32_be(&data[pos..]) as u64;
        let atom_type = &data[pos + 4..pos + 8];

        let actual_size = if size == 1 {
            // Extended size
            read_u64_be(&data[pos + 8..])
        } else if size == 0 {
            // Extends to end of file
            (data.len() - pos) as u64
        } else {
            size
        };

        let atom = Atom {
            size: actual_size,
            atom_type: atom_type.try_into().unwrap(),
            offset: pos as u64,
            children: if is_container(atom_type) {
                parse_atoms(&data[pos + 8..pos + actual_size as usize])
            } else {
                Vec::new()
            },
        };

        atoms.push(atom);
        pos += actual_size as usize;
    }

    atoms
}

fn find_keyframes(atoms: &[Atom], data: &[u8]) -> Vec<u64> {
    // Navigate to moov/trak/mdia/minf/stbl/stss
    // stss (Sync Sample) contains keyframe indices

    let stss = find_atom_path(atoms, &[
        b"moov", b"trak", b"mdia", b"minf", b"stbl", b"stss"
    ]);

    if let Some(stss) = stss {
        parse_stss(&data[stss.offset as usize..])
    } else {
        // No stss = all frames are keyframes (e.g., ProRes)
        find_all_frame_positions(atoms, data)
    }
}`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Protected Atoms</AlertTitle>
        <AlertDescription>
          The <code>moov</code> atom contains critical metadata. Dits never
          chunks through it - the entire moov is kept as a single chunk to
          ensure file playability.
        </AlertDescription>
      </Alert>

      <h2>Delta Encoding</h2>
      <p>
        When transferring data, Dits uses delta encoding to minimize bandwidth:
      </p>

      <pre className="not-prose">
        <code>{`// Chunk set comparison for sync
struct SyncRequest {
    // Chunks the client has
    have: HashSet<[u8; 32]>,

    // Chunks the client wants
    want: HashSet<[u8; 32]>,
}

struct SyncResponse {
    // Chunks to transfer
    chunks: Vec<ChunkData>,

    // Chunks client already has (no transfer needed)
    already_have: Vec<[u8; 32]>,
}

fn compute_delta(
    client_have: &HashSet<[u8; 32]>,
    server_have: &HashSet<[u8; 32]>,
    needed: &HashSet<[u8; 32]>,
) -> Vec<[u8; 32]> {
    needed
        .iter()
        .filter(|hash| !client_have.contains(*hash))
        .filter(|hash| server_have.contains(*hash))
        .copied()
        .collect()
}`}</code>
      </pre>

      <h2>Merkle Tree Verification</h2>
      <p>
        Dits uses Merkle trees for efficient verification of large datasets:
      </p>

      <pre className="not-prose">
        <code>{`fn build_merkle_tree(chunks: &[[u8; 32]]) -> [u8; 32] {
    if chunks.is_empty() {
        return [0u8; 32];
    }
    if chunks.len() == 1 {
        return chunks[0];
    }

    let mut level = chunks.to_vec();

    while level.len() > 1 {
        let mut next_level = Vec::new();

        for pair in level.chunks(2) {
            let hash = if pair.len() == 2 {
                hash_pair(pair[0], pair[1])
            } else {
                pair[0]
            };
            next_level.push(hash);
        }

        level = next_level;
    }

    level[0]
}

// Verify a single chunk with proof
fn verify_chunk_proof(
    chunk_hash: [u8; 32],
    proof: &[ProofNode],
    root: [u8; 32],
) -> bool {
    let mut current = chunk_hash;

    for node in proof {
        current = match node {
            ProofNode::Left(sibling) => hash_pair(*sibling, current),
            ProofNode::Right(sibling) => hash_pair(current, *sibling),
        };
    }

    current == root
}`}</code>
      </pre>

      <h2>Compression Selection</h2>
      <p>
        Dits adaptively selects compression based on content type:
      </p>

      <pre className="not-prose">
        <code>{`fn select_compression(data: &[u8], mime_type: &str) -> Compression {
    // Pre-compressed formats: don&apos;t compress
    if is_compressed_format(mime_type) {
        return Compression::None;
    }

    // Test compressibility with small sample
    let sample = &data[..data.len().min(65536)];
    let compressed = zstd::encode_all(sample, 3)?;
    let ratio = compressed.len() as f64 / sample.len() as f64;

    if ratio > 0.95 {
        // Not compressible
        Compression::None
    } else if data.len() > 10_000_000 {
        // Large data: use faster compression
        Compression::Zstd { level: 3 }
    } else {
        // Small data: use better compression
        Compression::Zstd { level: 9 }
    }
}

fn is_compressed_format(mime_type: &str) -> bool {
    matches!(mime_type,
        "video/mp4" | "video/quicktime" |
        "video/x-matroska" |
        "image/jpeg" | "image/png" |
        "application/zip" | "application/gzip"
    )
}`}</code>
      </pre>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/architecture/data-structures">Data Structures</Link> -
          How algorithmic output is stored
        </li>
        <li>
          <Link href="/docs/architecture/protocol">Network Protocol</Link> -
          How data is transferred
        </li>
        <li>
          <Link href="/docs/concepts/chunking">Chunking & Deduplication</Link> -
          User-facing chunking concepts
        </li>
      </ul>
    </div>
  );
}
