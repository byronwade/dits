//! Advanced features.

pub mod dependency;
pub mod hooks;
pub mod lifecycle;
pub mod lock;
pub mod meta;
pub mod p2p;
pub mod proxy;
pub mod security;
pub mod segment;
pub mod video;

pub use dependency::{dep_check, dep_graph, dep_list};
#[allow(unused_imports)]
pub use hooks::{
    install as hooks_install, list as hooks_list, run as hooks_run, show as hooks_show,
    uninstall as hooks_uninstall,
};
pub use lifecycle::{freeze, freeze_init, freeze_policy, freeze_status, thaw};
pub use lock::{lock as lock_file, locks, unlock};
pub use meta::{meta_list, meta_scan, meta_show};
pub use p2p::handle_p2p_command;
pub use proxy::{proxy_delete, proxy_generate, proxy_list, proxy_status};
pub use security::{
    audit_export, audit_show, audit_stats, change_password, encrypt_init, encrypt_status, login,
    logout,
};
pub use segment::segment;
pub use video::{video_add_clip, video_init, video_list, video_show};
