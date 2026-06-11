//! Initialize a new repository.

use std::path::Path;

use anyhow::Result;
use console::style;

use crate::store::Repository;

/// Initialize a new Dits repository.
pub fn init(path: &str) -> Result<()> {
    let path = Path::new(path);

    match Repository::init(path) {
        Ok(repo) => {
            println!(
                "{} Initialized empty Dits repository in {}",
                style("✓").green().bold(),
                repo.dits_dir().display()
            );
            Ok(())
        },
        Err(crate::store::repository::RepoError::AlreadyExists(p)) => {
            println!("{} Repository already exists at {}", style("!").yellow().bold(), p.display());
            Ok(())
        },
        Err(e) => Err(e.into()),
    }
}
