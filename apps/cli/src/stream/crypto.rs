//! Deterministic AES-128-CBC segment encryption (HLS `EXT-X-KEY` / METHOD=AES-128).
//!
//! The reuse model survives encryption because encryption is deterministic: the per-segment IV is
//! derived from the *plaintext* content hash, so identical plaintext segments produce identical
//! ciphertext — the encrypted segment is itself content-addressable, and the QUIC delta-push still
//! transfers only changed encrypted segments.

use crate::core::Hash;
use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use anyhow::Result;
use sha2::{Digest, Sha256};

type Enc = cbc::Encryptor<aes::Aes128>;
type Dec = cbc::Decryptor<aes::Aes128>;

/// A 16-byte AES-128 content key.
#[derive(Clone, Copy)]
pub struct SegmentKey {
    pub key: [u8; 16],
}

impl SegmentKey {
    /// Derive a stable demo key from a passphrase (`sha256(passphrase)[..16]`).
    pub fn from_passphrase(passphrase: &str) -> Self {
        let digest = Sha256::digest(passphrase.as_bytes());
        let mut key = [0u8; 16];
        key.copy_from_slice(&digest[..16]);
        SegmentKey { key }
    }
}

/// Per-segment IV from the plaintext segment's content hash (deterministic → reuse-stable).
pub fn derive_iv(plaintext_hash: &Hash) -> [u8; 16] {
    let mut iv = [0u8; 16];
    iv.copy_from_slice(&plaintext_hash.as_bytes()[..16]);
    iv
}

/// AES-128-CBC encrypt with PKCS7 padding.
pub fn encrypt_segment(plaintext: &[u8], key: &SegmentKey, iv: &[u8; 16]) -> Vec<u8> {
    Enc::new(&key.key.into(), iv.into()).encrypt_padded_vec_mut::<Pkcs7>(plaintext)
}

/// AES-128-CBC decrypt with PKCS7 padding.
pub fn decrypt_segment(ciphertext: &[u8], key: &SegmentKey, iv: &[u8; 16]) -> Result<Vec<u8>> {
    Dec::new(&key.key.into(), iv.into())
        .decrypt_padded_vec_mut::<Pkcs7>(ciphertext)
        .map_err(|e| anyhow::anyhow!("AES-128-CBC decrypt (bad key/iv/padding): {e:?}"))
}

/// Hex-encode an IV for the `#EXT-X-KEY:...,IV=0x...` attribute.
pub fn iv_hex(iv: &[u8; 16]) -> String {
    format!("0x{}", hex::encode(iv))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key() -> SegmentKey {
        SegmentKey::from_passphrase("demo-secret")
    }

    #[test]
    fn round_trip_and_ciphertext_differs() {
        let pt = b"a fragmented-mp4 segment payload, more than one block long".to_vec();
        let iv = derive_iv(&Hash::from_slice(blake3::hash(&pt).as_bytes()));
        let ct = encrypt_segment(&pt, &key(), &iv);
        assert_ne!(ct, pt);
        assert_eq!(ct.len() % 16, 0, "CBC output is block-aligned");
        assert_eq!(decrypt_segment(&ct, &key(), &iv).unwrap(), pt);
    }

    #[test]
    fn deterministic_for_reuse() {
        // Same plaintext + key -> identical ciphertext (the reuse guarantee).
        let pt = b"segment bytes".to_vec();
        let iv = derive_iv(&Hash::from_slice(blake3::hash(&pt).as_bytes()));
        let a = encrypt_segment(&pt, &key(), &iv);
        let b = encrypt_segment(&pt, &key(), &iv);
        assert_eq!(a, b);
        // derive_iv stable; passphrase stable.
        let h = Hash::from_slice(blake3::hash(b"x").as_bytes());
        assert_eq!(derive_iv(&h), derive_iv(&h));
        assert_eq!(key().key, SegmentKey::from_passphrase("demo-secret").key);
    }

    #[test]
    fn wrong_key_fails() {
        let pt = b"secret".to_vec();
        let iv = derive_iv(&Hash::from_slice(blake3::hash(&pt).as_bytes()));
        let ct = encrypt_segment(&pt, &key(), &iv);
        let wrong = SegmentKey::from_passphrase("other");
        // Wrong key usually yields a padding error; if it happens to validate, bytes differ.
        match decrypt_segment(&ct, &wrong, &iv) {
            Err(_) => {}
            Ok(out) => assert_ne!(out, pt),
        }
    }
}
