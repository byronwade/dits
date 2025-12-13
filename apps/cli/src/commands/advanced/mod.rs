//! Advanced features.

pub mod p2p;
pub mod proxy;
pub mod video;
pub mod segment;
pub mod lifecycle;
pub mod security;
pub mod dependency;
pub mod meta;
pub mod hooks;
pub mod lock;

pub use p2p::handle_p2p_command;
pub use proxy::{proxy_generate, proxy_status, proxy_list, proxy_delete};
pub use video::{video_init, video_add_clip, video_show, video_list};
pub use segment::segment;
pub use lifecycle::{freeze_init, freeze_status, freeze, thaw, freeze_policy};
pub use security::{encrypt_init, encrypt_status, login, logout, change_password, audit_show, audit_stats, audit_export};
pub use dependency::{dep_check, dep_graph, dep_list};
pub use meta::{meta_scan, meta_show, meta_list};
pub use hooks::{list as hooks_list, install as hooks_install, uninstall as hooks_uninstall, run as hooks_run, show as hooks_show};
pub use lock::{lock as lock_file, unlock, locks};
