//! Branching and history operations.

pub mod branch;
pub mod checkout;
pub mod merge;
pub mod rebase;
pub mod cherry_pick;
pub mod tag;
pub mod reset;
pub mod restore;
pub mod stash;
pub mod reflog;

pub use branch::{branch, switch};
pub use checkout::{checkout, CheckoutMode};
pub use merge::merge;
pub use rebase::rebase;
pub use cherry_pick::cherry_pick;
pub use tag::{tag, TagSort};
pub use reset::{reset, ResetMode};
pub use restore::restore;
pub use stash::stash;
pub use reflog::reflog;



