//! File operations.

pub mod archive;
pub mod clean;
#[cfg(feature = "fuser")]
pub mod mount;
#[cfg(feature = "fuser")]
pub mod unmount;
pub mod sparse_checkout;
pub mod worktree;

#[allow(unused_imports)]
pub use {
    archive::archive,
    clean::clean,
    sparse_checkout::{
        add as sparse_checkout_add, disable as sparse_checkout_disable, init as sparse_checkout_init,
        is_enabled as sparse_checkout_is_enabled, list as sparse_checkout_list,
        print_status as sparse_checkout_print_status, set as sparse_checkout_set,
    },
    worktree::{
        add as worktree_add, list as worktree_list, lock as worktree_lock,
        print_list as worktree_print_list, prune as worktree_prune, remove as worktree_remove,
        unlock as worktree_unlock,
    },
};
#[cfg(feature = "fuser")]
pub use mount::mount;
#[cfg(feature = "fuser")]
pub use unmount::unmount;
