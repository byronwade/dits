//! Special and internal commands.

pub mod assemble;
pub mod completions;

pub use assemble::assemble;
#[allow(unused_imports)]
pub use completions::{generate_completions, print_install_instructions};


