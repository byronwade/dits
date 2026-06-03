//! Cryptographic utilities for DITS P2P
//!
//! Provides:
//! - Join code generation and parsing
//! - BLAKE3 checksums for data integrity

use blake3::Hasher;

/// Length of a join code in characters (without dashes)
pub const JOIN_CODE_LENGTH: usize = 6;

/// Characters used in join codes (unambiguous set)
const JOIN_CODE_CHARS: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/// Generate a random join code (e.g., "ABC-123")
pub fn generate_join_code() -> String {
    try_generate_join_code().expect("RNG failed - system entropy source unavailable")
}

/// Try to generate a random join code, returning an error if RNG fails
pub fn try_generate_join_code() -> Result<String, getrandom::Error> {
    let mut bytes = [0u8; JOIN_CODE_LENGTH];
    getrandom::getrandom(&mut bytes)?;

    let code: String = bytes
        .iter()
        .map(|b| JOIN_CODE_CHARS[(*b as usize) % JOIN_CODE_CHARS.len()] as char)
        .collect();

    Ok(format!("{}-{}", &code[..3], &code[3..]))
}

/// Normalize a join code (remove dashes, uppercase)
pub fn normalize_join_code(code: &str) -> String {
    code.chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

/// Validate a join code format
pub fn validate_join_code(code: &str) -> bool {
    let normalized = normalize_join_code(code);
    normalized.len() == JOIN_CODE_LENGTH && normalized.bytes().all(|b| JOIN_CODE_CHARS.contains(&b))
}

/// Base URL for DITS share links
pub const DITS_BASE_URL: &str = "https://dits.byronwade.com";

/// Extract a join code from a URL or return the input if it's already a code
pub fn extract_join_code(input: &str) -> Option<String> {
    let input = input.trim();

    // Check if it's a dits:// deep link
    if let Some(path) = input
        .strip_prefix("dits://")
        .or_else(|| input.strip_prefix("dits:"))
    {
        let path = path.trim_start_matches('/');
        let code = if let Some(rest) = path.strip_prefix("join/") {
            rest
        } else if let Some(rest) = path.strip_prefix("j/") {
            rest
        } else {
            path
        };
        let normalized = normalize_join_code(code);
        if validate_join_code(&normalized) {
            return Some(format_join_code(&normalized));
        }
        return None;
    }

    // Check if it's a web URL
    if input.starts_with("http://") || input.starts_with("https://") {
        if let Some(path_start) = input.find("/j/").or_else(|| input.find("/join/")) {
            let after_prefix = if input[path_start..].starts_with("/j/") {
                &input[path_start + 3..]
            } else {
                &input[path_start + 6..]
            };
            let code = after_prefix.split('/').next().unwrap_or("");
            let normalized = normalize_join_code(code);
            if validate_join_code(&normalized) {
                return Some(format_join_code(&normalized));
            }
        }
        return None;
    }

    // It might be a plain code
    let normalized = normalize_join_code(input);
    if validate_join_code(&normalized) {
        return Some(format_join_code(&normalized));
    }

    None
}

/// Format a normalized join code with dashes (e.g., "ABCXYZ" -> "ABC-XYZ")
pub fn format_join_code(normalized: &str) -> String {
    if normalized.len() == JOIN_CODE_LENGTH {
        format!("{}-{}", &normalized[..3], &normalized[3..])
    } else {
        normalized.to_string()
    }
}

/// Generate a full share link for a join code
pub fn make_share_link(join_code: &str) -> String {
    let normalized = normalize_join_code(join_code);
    let formatted = format_join_code(&normalized);
    format!("{}/j/{}", DITS_BASE_URL, formatted)
}

/// Compute BLAKE3 checksum of data
pub fn checksum(data: &[u8]) -> [u8; 32] {
    *blake3::hash(data).as_bytes()
}

/// Verify BLAKE3 checksum
pub fn verify_checksum(data: &[u8], expected: &[u8; 32]) -> bool {
    &checksum(data) == expected
}

/// Incremental hasher for streaming data
pub struct StreamingHasher {
    hasher: Hasher,
}

impl StreamingHasher {
    pub fn new() -> Self {
        Self {
            hasher: Hasher::new(),
        }
    }

    pub fn update(&mut self, data: &[u8]) {
        self.hasher.update(data);
    }

    pub fn finalize(self) -> [u8; 32] {
        *self.hasher.finalize().as_bytes()
    }
}

impl Default for StreamingHasher {
    fn default() -> Self {
        Self::new()
    }
}
