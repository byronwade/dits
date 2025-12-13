//! Special and internal commands.

pub mod assemble;
pub mod completions;

pub use assemble::assemble;
pub use completions::{generate_completions, print_install_instructions};