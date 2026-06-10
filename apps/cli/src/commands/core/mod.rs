//! Core Git operations.

pub mod add;
pub mod commit;
pub mod diff;
pub mod log;
pub mod show;
pub mod status;

pub use add::add;
pub use commit::commit;
pub use diff::diff;
pub use log::log;
pub use show::show;
pub use status::status;
