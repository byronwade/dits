//! File operations.

pub mod archive;
pub mod clean;
#[cfg(feature = "fuser")]
pub mod mount;
#[cfg(feature = "fuser")]
pub mod unmount;
pub mod sparse_checkout;
pub mod worktree;

pub use archive::archive;
pub use clean::clean;
#[cfg(feature = "fuser")]
pub use mount::mount;
#[cfg(feature = "fuser")]
pub use unmount::unmount;
pub use sparse_checkout::{init as sparse_checkout_init, set as sparse_checkout_set, add as sparse_checkout_add, list as sparse_checkout_list, disable as sparse_checkout_disable, is_enabled as sparse_checkout_is_enabled, print_status as sparse_checkout_print_status};
pub use worktree::{list as worktree_list, add as worktree_add, remove as worktree_remove, lock as worktree_lock, unlock as worktree_unlock, prune as worktree_prune, print_list as worktree_print_list};