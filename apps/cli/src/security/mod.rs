//! Security and encryption module (Phase 9).
//!
//! Provides:
//! - Key derivation from passwords (Argon2id)
//! - Convergent chunk encryption (AES-256-GCM)
//! - Secure key storage
//! - Audit logging

mod audit;
mod encryption;
mod keys;
mod keystore;

pub use audit::{AuditEvent, AuditEventType, AuditLog, AuditOutcome};
pub use encryption::{decrypt_chunk, encrypt_chunk, EncryptedChunk};
pub use keys::{derive_keys, Argon2Params, KeyBundle, RootKey, UserSecret};
pub use keystore::{KeyStore, KeyStoreError};
