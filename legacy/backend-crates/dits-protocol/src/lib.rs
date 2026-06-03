//! Wire protocol for Dits.
//!
//! QUIC-based protocol for efficient chunk transfer.

pub mod codec;
pub mod messages;
pub mod transport;

/// Protocol version.
pub const PROTOCOL_VERSION: u8 = 1;

/// Default port for Dits protocol.
pub const DEFAULT_PORT: u16 = 9418;
