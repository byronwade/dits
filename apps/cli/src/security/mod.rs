//! Security and encryption module (Phase 9).
//!
//! Provides:
//! - Key derivation from passwords (Argon2id)
//! - Convergent chunk encryption (AES-256-GCM)
//! - Secure key storage
//! - Audit logging

mod keys;
mod encryption;
mod keystore;
mod audit;

pub use keys::{RootKey, UserSecret, KeyBundle, derive_keys, Argon2Params};
pub use encryption::{encrypt_chunk, decrypt_chunk, EncryptedChunk};
pub use keystore::{KeyStore, KeyStoreError};
pub use audit::{AuditLog, AuditEvent, AuditEventType, AuditOutcome};
