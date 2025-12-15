//! Completions command - Generate shell completions.

use anyhow::Result;
use clap_complete::{generate, Shell};
use std::io;

/// Generate shell completions
pub fn generate_completions(shell: &str) -> Result<()> {
    let shell = match shell.to_lowercase().as_str() {
        "bash" => Shell::Bash,
        "zsh" => Shell::Zsh,
        "fish" => Shell::Fish,
        "powershell" | "ps" => Shell::PowerShell,
        "elvish" => Shell::Elvish,
        _ => anyhow::bail!(
            "Unknown shell: {}. Supported: bash, zsh, fish, powershell, elvish",
            shell
        ),
    };
    
    // We need to get the clap Command from main.rs
    // For now, we'll create a minimal version
    let mut cmd = create_cli_command();
    
    generate(shell, &mut cmd, "dits", &mut io::stdout());
    
    Ok(())
}

/// Print installation instructions
pub fn print_install_instructions(shell: &str) {
    match shell.to_lowercase().as_str() {
        "bash" => {
            println!("# Add this to your ~/.bashrc:");
            println!("eval \"$(dits completions bash)\"");
            println!();
            println!("# Or save to a file:");
            println!("dits completions bash > /etc/bash_completion.d/dits");
        }
        "zsh" => {
            println!("# Add this to your ~/.zshrc:");
            println!("eval \"$(dits completions zsh)\"");
            println!();
            println!("# Or save to a file:");
            println!("dits completions zsh > ~/.zsh/completions/_dits");
            println!("# Make sure ~/.zsh/completions is in your fpath");
        }
        "fish" => {
            println!("# Save to fish completions directory:");
            println!("dits completions fish > ~/.config/fish/completions/dits.fish");
        }
        "powershell" | "ps" => {
            println!("# Add to your PowerShell profile:");
            println!("dits completions powershell | Out-String | Invoke-Expression");
        }
        _ => {
            println!("Supported shells: bash, zsh, fish, powershell");
        }
    }
}

// Create a minimal CLI command for completions
// In a real implementation, this would be the same as the main CLI
fn create_cli_command() -> clap::Command {
    clap::Command::new("dits")
        .version(env!("CARGO_PKG_VERSION"))
        .about("Version control for video and large binary files")
        .subcommand(clap::Command::new("init").about("Initialize a new repository"))
        .subcommand(clap::Command::new("add").about("Add files to the staging area"))
        .subcommand(clap::Command::new("status").about("Show repository status"))
        .subcommand(clap::Command::new("commit").about("Create a commit"))
        .subcommand(clap::Command::new("log").about("Show commit history"))
        .subcommand(clap::Command::new("checkout").about("Checkout a commit or branch"))
        .subcommand(clap::Command::new("branch").about("List, create, or delete branches"))
        .subcommand(clap::Command::new("switch").about("Switch to a different branch"))
        .subcommand(clap::Command::new("diff").about("Show changes"))
        .subcommand(clap::Command::new("tag").about("List, create, or delete tags"))
        .subcommand(clap::Command::new("merge").about("Merge a branch"))
        .subcommand(clap::Command::new("show").about("Show details of a commit"))
        .subcommand(clap::Command::new("blame").about("Show who changed what"))
        .subcommand(clap::Command::new("reflog").about("Show reference history"))
        .subcommand(clap::Command::new("bisect").about("Binary search for bugs"))
        .subcommand(clap::Command::new("rebase").about("Reapply commits"))
        .subcommand(clap::Command::new("cherry-pick").about("Apply specific commits"))
        .subcommand(clap::Command::new("reset").about("Reset HEAD"))
        .subcommand(clap::Command::new("restore").about("Restore files"))
        .subcommand(clap::Command::new("config").about("Get and set options"))
        .subcommand(clap::Command::new("stash").about("Stash changes"))
        .subcommand(clap::Command::new("clean").about("Remove untracked files"))
        .subcommand(clap::Command::new("grep").about("Search tracked files"))
        .subcommand(clap::Command::new("worktree").about("Manage worktrees"))
        .subcommand(clap::Command::new("sparse-checkout").about("Manage sparse checkout"))
        .subcommand(clap::Command::new("hooks").about("Manage hooks"))
        .subcommand(clap::Command::new("archive").about("Create archives"))
        .subcommand(clap::Command::new("describe").about("Describe a commit"))
        .subcommand(clap::Command::new("shortlog").about("Summarize commits"))
        .subcommand(clap::Command::new("maintenance").about("Repository maintenance"))
        .subcommand(clap::Command::new("clone").about("Clone a repository"))
        .subcommand(clap::Command::new("remote").about("Manage remotes"))
        .subcommand(clap::Command::new("push").about("Push changes"))
        .subcommand(clap::Command::new("pull").about("Pull changes"))
        .subcommand(clap::Command::new("fetch").about("Fetch objects"))
        .subcommand(clap::Command::new("lock").about("Lock a file"))
        .subcommand(clap::Command::new("unlock").about("Unlock a file"))
        .subcommand(clap::Command::new("locks").about("List locks"))
        .subcommand(clap::Command::new("gc").about("Garbage collection"))
        .subcommand(clap::Command::new("fsck").about("Check integrity"))
        .subcommand(clap::Command::new("completions").about("Generate shell completions"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_command_builds() {
        let cmd = create_cli_command();
        assert_eq!(cmd.get_name(), "dits");
    }
}
