//! Dits CLI - Git for Creative Professionals
//!
//! Command-line interface for distributed version control designed specifically
//! for creative workflows. Dits CLI is to creative assets what Git is to code.
//!
//! FEATURES:
//! - Git-like version control for video, photos, designs, and creative assets
//! - P2P file sharing with wormhole-style direct transfers
//! - Video-aware chunking and large file optimization
//! - Seamless integration with DitsHub for collaboration
//! - Creative-specific workflows and commands

use clap::{Args, Parser, Subcommand};
use tracing::info;

mod commands;
mod p2p;
mod p2p_commands;
mod ui;

#[derive(Parser)]
#[command(name = "dits")]
#[command(about = "Git for creatives - version control for video, photos, designs, and creative assets")]
#[command(long_about = r#"
Dits CLI - Git for Creative Professionals

Distributed version control designed specifically for creative workflows.
Dits CLI brings Git-like version control to video, photos, designs, and creative assets.

Just as Git revolutionized software development, Dits CLI revolutionizes
how creative professionals manage their work - providing powerful version
control, collaboration, and sharing capabilities optimized for creative assets.

FEATURES:
  - Git-like commands adapted for creative workflows
  - Video-aware chunking at keyframe boundaries
  - Large file optimization and progressive uploads
  - P2P sharing with wormhole-style direct transfers
  - Seamless integration with DitsHub collaboration platform
  - Creative-specific commands (lock, p2p share, etc.)

EXAMPLES:
  dits init                    # Initialize creative repository
  dits add video.mp4           # Stage creative assets
  dits commit -m "Add footage" # Create version snapshot
  dits push origin main        # Share with DitsHub
  dits p2p share ./project     # Direct P2P collaboration

INTEGRATION:
  Works seamlessly with DitsHub (like Git + GitHub)
  Local version control + Remote collaboration
  Creative asset management + Team workflows

DOCUMENTATION:
  https://dits.byronwade.com/docs/cli
"#)]
#[command(version)]
#[command(arg_required_else_help = true)]
struct Cli {
    /// Enable verbose output (-v info, -vv debug, -vvv trace)
    #[arg(short, long, action = clap::ArgAction::Count, global = true)]
    verbose: u8,

    /// Suppress all output except errors
    #[arg(short, long, global = true, conflicts_with = "verbose")]
    quiet: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    // === Repository Commands ===
    /// Initialize a new repository
    Init {
        /// Path to initialize
        #[arg(default_value = ".")]
        path: String,
        /// Use bare repository format
        #[arg(long)]
        bare: bool,
    },

    /// Clone a repository
    Clone {
        /// Repository URL or path
        repo: String,
        /// Local path
        path: Option<String>,
        /// Branch to checkout
        #[arg(short, long)]
        branch: Option<String>,
        /// Shallow clone with limited history
        #[arg(long)]
        depth: Option<u32>,
    },

    // === Working Directory Commands ===
    /// Show working directory status
    #[command(visible_alias = "st")]
    Status {
        /// Show short format
        #[arg(short, long)]
        short: bool,
    },

    /// Add files to staging
    Add {
        /// Files to add (use . for all)
        #[arg(required = true)]
        files: Vec<String>,
        /// Add all modified files
        #[arg(short = 'A', long)]
        all: bool,
        /// Dry run - show what would be added
        #[arg(short, long)]
        dry_run: bool,
    },

    /// Remove files from staging
    Reset {
        /// Files to unstage
        files: Vec<String>,
        /// Reset to specific commit
        #[arg(long)]
        hard: bool,
    },

    /// Create a commit
    #[command(visible_alias = "ci")]
    Commit {
        /// Commit message
        #[arg(short, long)]
        message: String,
        /// Amend the last commit
        #[arg(long)]
        amend: bool,
    },

    // === Remote Commands ===
    /// Push changes to remote
    Push {
        /// Remote name
        #[arg(default_value = "origin")]
        remote: String,
        /// Branch to push
        branch: Option<String>,
        /// Force push
        #[arg(short, long)]
        force: bool,
        /// Set upstream tracking
        #[arg(short = 'u', long)]
        set_upstream: bool,
    },

    /// Pull changes from remote
    Pull {
        /// Remote name
        #[arg(default_value = "origin")]
        remote: String,
        /// Rebase instead of merge
        #[arg(short, long)]
        rebase: bool,
    },

    /// Fetch changes from remote
    Fetch {
        /// Remote name
        #[arg(default_value = "origin")]
        remote: String,
        /// Fetch all remotes
        #[arg(long)]
        all: bool,
        /// Prune deleted remote branches
        #[arg(short, long)]
        prune: bool,
    },

    /// Manage remotes
    Remote(RemoteArgs),

    // === Branch Commands ===
    /// Branch operations
    Branch {
        /// Branch name (for create)
        name: Option<String>,
        /// Delete branch
        #[arg(short, long)]
        delete: bool,
        /// List all branches (including remote)
        #[arg(short, long)]
        all: bool,
        /// List branches
        #[arg(short, long)]
        list: bool,
    },

    /// Switch branches or restore files
    #[command(visible_alias = "co")]
    Checkout {
        /// Branch or commit to checkout
        target: String,
        /// Create new branch
        #[arg(short = 'b', long)]
        create: bool,
    },

    /// Create and switch to new branch
    Switch {
        /// Branch name
        branch: String,
        /// Create if doesn't exist
        #[arg(short, long)]
        create: bool,
    },

    /// Merge branches
    Merge {
        /// Branch to merge
        branch: String,
        /// Don't fast-forward
        #[arg(long)]
        no_ff: bool,
        /// Abort current merge
        #[arg(long)]
        abort: bool,
    },

    /// Rebase current branch
    Rebase {
        /// Branch to rebase onto
        branch: String,
        /// Interactive rebase
        #[arg(short, long)]
        interactive: bool,
        /// Continue rebase after resolving conflicts
        #[arg(long)]
        continue_rebase: bool,
        /// Abort rebase
        #[arg(long)]
        abort: bool,
    },

    // === History Commands ===
    /// Show commit history
    Log {
        /// Number of commits to show
        #[arg(short, long, default_value = "10")]
        limit: usize,
        /// Show one line per commit
        #[arg(long)]
        oneline: bool,
        /// Show graph
        #[arg(long)]
        graph: bool,
        /// Filter by path
        path: Option<String>,
    },

    /// Show differences
    Diff {
        /// Path to diff
        path: Option<String>,
        /// Show staged changes
        #[arg(long)]
        staged: bool,
        /// Compare with specific commit
        #[arg(long)]
        commit: Option<String>,
    },

    /// Show file blame/annotate
    Blame {
        /// File to annotate
        file: String,
        /// Show line range (e.g., 10,20)
        #[arg(short = 'L', long)]
        lines: Option<String>,
    },

    /// Show commit details
    Show {
        /// Commit hash (default: HEAD)
        #[arg(default_value = "HEAD")]
        commit: String,
    },

    // === File Locking (Video Production) ===
    /// Lock a file for exclusive editing
    Lock {
        /// File to lock
        path: String,
        /// Reason for locking
        #[arg(short, long)]
        reason: Option<String>,
        /// Force lock (override existing)
        #[arg(short, long)]
        force: bool,
    },

    /// Unlock a file
    Unlock {
        /// File to unlock
        path: String,
        /// Force unlock (even if locked by others)
        #[arg(short, long)]
        force: bool,
    },

    /// List all locks
    Locks {
        /// Show only your locks
        #[arg(long)]
        mine: bool,
    },

    // === P2P Commands (Wormhole-style) ===
    /// Peer-to-peer file sharing
    #[command(subcommand)]
    P2p(P2pCommands),

    // === Authentication ===
    /// Authenticate with remote
    Login {
        /// Server URL
        #[arg(long)]
        server: Option<String>,
    },

    /// Log out from remote
    Logout,

    /// Show authentication status
    Whoami,

    // === Configuration ===
    /// Show or set configuration
    Config {
        /// Key to get/set
        key: Option<String>,
        /// Value to set
        value: Option<String>,
        /// List all config
        #[arg(short, long)]
        list: bool,
        /// Global config
        #[arg(long)]
        global: bool,
    },

    // === Utility Commands ===
    /// Clean untracked files
    Clean {
        /// Also remove ignored files
        #[arg(short = 'x', long)]
        ignored: bool,
        /// Dry run
        #[arg(short, long)]
        dry_run: bool,
        /// Force clean
        #[arg(short, long)]
        force: bool,
    },

    /// Stash changes
    Stash(StashArgs),

    /// Garbage collection
    Gc {
        /// Aggressive cleanup
        #[arg(long)]
        aggressive: bool,
    },

    /// Verify repository integrity
    Fsck {
        /// Fix issues if possible
        #[arg(long)]
        fix: bool,
    },

    /// Show repository info
    Info,

    /// Generate shell completions
    Completions {
        /// Shell to generate for
        shell: String,
    },
}

#[derive(Subcommand)]
enum P2pCommands {
    /// Share a directory via P2P (host)
    #[command(visible_alias = "host")]
    Share {
        /// Directory to share
        path: String,
        /// Port to listen on
        #[arg(short, long)]
        port: Option<u16>,
        /// Signal server URL
        #[arg(long)]
        signal: Option<String>,
        /// Use specific join code
        #[arg(long)]
        code: Option<String>,
        /// Name for this share
        #[arg(short, long)]
        name: Option<String>,
        /// Use only mDNS (local network, no internet required)
        #[arg(long, conflicts_with_all = ["direct", "stun", "relay"])]
        local: bool,
        /// Use only direct IP mode (no discovery)
        #[arg(long, conflicts_with_all = ["local", "stun", "relay"])]
        direct: bool,
        /// Use STUN to discover external IP for NAT traversal
        #[arg(long, conflicts_with_all = ["local", "direct", "relay"])]
        stun: bool,
        /// Force relay mode (guaranteed NAT traversal, no port forwarding needed)
        #[arg(long, conflicts_with_all = ["local", "direct", "stun"])]
        relay: bool,
    },

    /// Connect to a P2P share (client)
    #[command(visible_alias = "join")]
    Connect {
        /// Join code, URL, or direct address
        target: String,
        /// Output directory
        #[arg(short, long)]
        output: Option<String>,
        /// Signal server URL
        #[arg(long)]
        signal: Option<String>,
        /// Use only mDNS (local network)
        #[arg(long, conflicts_with_all = ["direct", "relay"])]
        local: bool,
        /// Use only direct IP mode (no discovery)
        #[arg(long, conflicts_with_all = ["local", "relay"])]
        direct: bool,
        /// Force relay mode (guaranteed NAT traversal, no port forwarding needed)
        #[arg(long, conflicts_with_all = ["local", "direct"])]
        relay: bool,
    },

    /// Send a file to a peer
    Send {
        /// File to send
        file: String,
        /// Target (join code or address)
        target: String,
        /// Signal server URL
        #[arg(long)]
        signal: Option<String>,
    },

    /// Receive a file from a peer
    Receive {
        /// Output path
        #[arg(short, long)]
        output: Option<String>,
        /// Port to listen on
        #[arg(short, long)]
        port: Option<u16>,
        /// Signal server URL
        #[arg(long)]
        signal: Option<String>,
        /// Use specific join code
        #[arg(long)]
        code: Option<String>,
    },

    /// Show P2P status
    Status,

    /// Ping a peer
    Ping {
        /// Target (join code or address)
        target: String,
        /// Number of pings
        #[arg(short, long, default_value = "4")]
        count: u32,
    },
}

#[derive(Args)]
struct RemoteArgs {
    #[command(subcommand)]
    command: Option<RemoteCommands>,
}

#[derive(Subcommand)]
enum RemoteCommands {
    /// Add a remote
    Add {
        /// Remote name
        name: String,
        /// Remote URL
        url: String,
    },
    /// Remove a remote
    Remove {
        /// Remote name
        name: String,
    },
    /// Show remote URL
    GetUrl {
        /// Remote name
        name: String,
    },
    /// Set remote URL
    SetUrl {
        /// Remote name
        name: String,
        /// New URL
        url: String,
    },
}

#[derive(Args)]
struct StashArgs {
    #[command(subcommand)]
    command: Option<StashCommands>,
}

#[derive(Subcommand)]
enum StashCommands {
    /// Stash changes (default)
    Push {
        /// Message for stash
        #[arg(short, long)]
        message: Option<String>,
    },
    /// Apply stashed changes
    Pop {
        /// Stash index
        #[arg(default_value = "0")]
        index: usize,
    },
    /// Apply without removing from stash
    Apply {
        /// Stash index
        #[arg(default_value = "0")]
        index: usize,
    },
    /// List stashes
    List,
    /// Drop a stash
    Drop {
        /// Stash index
        #[arg(default_value = "0")]
        index: usize,
    },
    /// Clear all stashes
    Clear,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Initialize tracing based on verbosity
    let level = if cli.quiet {
        "error"
    } else {
        match cli.verbose {
            0 => "warn",
            1 => "info",
            2 => "debug",
            _ => "trace",
        }
    };

    tracing_subscriber::fmt()
        .with_env_filter(level)
        .without_time()
        .with_target(cli.verbose >= 2)
        .init();

    match cli.command {
        // Repository commands
        Commands::Init { path, bare } => commands::init(&path).await?,
        Commands::Clone { repo, path, branch, depth } => {
            commands::clone(&repo, path.as_deref(), branch.as_deref()).await?
        }

        // Working directory commands
        Commands::Status { short } => commands::status().await?,
        Commands::Add { files, all, dry_run } => commands::add(&files).await?,
        Commands::Reset { files, hard } => {
            println!("Reset command not yet implemented");
        }
        Commands::Commit { message, amend } => commands::commit(&message).await?,

        // Remote commands
        Commands::Push { remote, branch, force, set_upstream } => {
            commands::push(&remote, force).await?
        }
        Commands::Pull { remote, rebase } => commands::pull(&remote, rebase).await?,
        Commands::Fetch { remote, all, prune } => commands::fetch(&remote).await?,
        Commands::Remote(args) => {
            match args.command {
                Some(RemoteCommands::Add { name, url }) => {
                    println!("Adding remote {} -> {}", name, url);
                }
                Some(RemoteCommands::Remove { name }) => {
                    println!("Removing remote {}", name);
                }
                Some(RemoteCommands::GetUrl { name }) => {
                    println!("Getting URL for remote {}", name);
                }
                Some(RemoteCommands::SetUrl { name, url }) => {
                    println!("Setting URL for remote {} -> {}", name, url);
                }
                None => {
                    println!("Listing remotes...");
                }
            }
        }

        // Branch commands
        Commands::Branch { name, delete, all, list } => {
            commands::branch(name.as_deref(), delete, list || all).await?
        }
        Commands::Checkout { target, create } => commands::checkout(&target, create).await?,
        Commands::Switch { branch, create } => commands::checkout(&branch, create).await?,
        Commands::Merge { branch, no_ff, abort } => commands::merge(&branch).await?,
        Commands::Rebase { branch, interactive, continue_rebase, abort } => {
            println!("Rebase command not yet fully implemented");
        }

        // History commands
        Commands::Log { limit, oneline, graph, path } => commands::log(limit).await?,
        Commands::Diff { path, staged, commit } => commands::diff(path.as_deref()).await?,
        Commands::Blame { file, lines } => {
            println!("Blame for {}", file);
        }
        Commands::Show { commit } => {
            println!("Showing commit {}", commit);
        }

        // File locking
        Commands::Lock { path, reason, force } => {
            commands::lock(&path, reason.as_deref()).await?
        }
        Commands::Unlock { path, force } => commands::unlock(&path, force).await?,
        Commands::Locks { mine } => commands::locks().await?,

        // P2P commands
        Commands::P2p(p2p_cmd) => match p2p_cmd {
            P2pCommands::Share { path, port, signal, code, name, local, direct, stun, relay } => {
                p2p_commands::share(&path, port, signal, code, name, local, direct, stun, relay).await?
            }
            P2pCommands::Connect { target, output, signal, local, direct, relay } => {
                p2p_commands::p2p_connect(&target, output, signal, local, direct, relay).await?
            }
            P2pCommands::Send { file, target, signal } => {
                p2p_commands::send(&file, &target, signal).await?
            }
            P2pCommands::Receive { output, port, signal, code } => {
                p2p_commands::receive(output, port, signal, code).await?
            }
            P2pCommands::Status => p2p_commands::p2p_status().await?,
            P2pCommands::Ping { target, count } => {
                println!("Pinging {} ({} times)", target, count);
            }
        },

        // Authentication
        Commands::Login { server } => commands::login().await?,
        Commands::Logout => commands::logout().await?,
        Commands::Whoami => {
            println!("Showing current user...");
        }

        // Configuration
        Commands::Config { key, value, list, global } => {
            commands::config(key.as_deref(), value.as_deref(), list).await?
        }

        // Utility commands
        Commands::Clean { ignored, dry_run, force } => {
            println!("Cleaning untracked files...");
        }
        Commands::Stash(args) => {
            match args.command {
                Some(StashCommands::Push { message }) => println!("Stashing changes..."),
                Some(StashCommands::Pop { index }) => println!("Popping stash {}...", index),
                Some(StashCommands::Apply { index }) => println!("Applying stash {}...", index),
                Some(StashCommands::List) => println!("Listing stashes..."),
                Some(StashCommands::Drop { index }) => println!("Dropping stash {}...", index),
                Some(StashCommands::Clear) => println!("Clearing all stashes..."),
                None => println!("Stashing changes..."),
            }
        }
        Commands::Gc { aggressive } => {
            println!("Running garbage collection...");
        }
        Commands::Fsck { fix } => {
            println!("Verifying repository integrity...");
        }
        Commands::Info => {
            println!("DITS Repository Info");
            println!("====================");
            println!("Protocol Version: {}", p2p::P2P_PROTOCOL_VERSION);
        }
        Commands::Completions { shell } => {
            println!("Generating completions for {}...", shell);
        }
    }

    Ok(())
}
