//! Core Git operations.

pub mod add;
pub mod commit;
pub mod status;
pub mod log;
pub mod show;
pub mod diff;

pub use add::add;
pub use commit::commit;
pub use status::status;
pub use log::log;
pub use show::show;
pub use diff::diff;