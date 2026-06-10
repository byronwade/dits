//! Branching and history operations.

pub mod branch;
pub mod checkout;
pub mod cherry_pick;
pub mod merge;
pub mod rebase;
pub mod reflog;
pub mod reset;
pub mod restore;
pub mod stash;
pub mod tag;

pub use branch::{branch, switch};
pub use checkout::{checkout, CheckoutMode};
pub use cherry_pick::cherry_pick;
pub use merge::merge;
pub use rebase::rebase;
pub use reflog::reflog;
pub use reset::{reset, ResetMode};
pub use restore::restore;
pub use stash::stash;
pub use tag::{tag, TagSort};
