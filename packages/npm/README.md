# @byronwade/dits

**Version control for video and large binary files** - like Git, but optimized for large binary files.

[![npm version](https://img.shields.io/npm/v/@byronwade/dits.svg)](https://www.npmjs.com/package/@byronwade/dits)
[![License](https://img.shields.io/npm/l/@byronwade/dits.svg)](LICENSE)

## Quick Install

```bash
npm install -g @byronwade/dits
```

Or using other package managers:

```bash
# Using bun
bun install -g @byronwade/dits

# Using pnpm
pnpm install -g @byronwade/dits

# Using yarn
yarn global add @byronwade/dits
```

After installation, verify it works:

```bash
dits --version
```

## What is Dits?

Dits is a version control system designed for large binary files like video, 3D assets, and game files. It brings Git-like workflows to creative professionals who work with massive media files.

### Key Features

- 🎬 **Video-Aware**: Optimized for video files with MP4 atom preservation
- 🚀 **Fast**: Content-defined chunking (FastCDC) for efficient deduplication
- 💾 **Storage Efficient**: Automatic deduplication saves massive disk space
- 🔒 **Secure**: BLAKE3 hashing and optional encryption
- 🌐 **P2P Support**: Direct peer-to-peer sharing without cloud servers
- 📦 **Git-Like**: Familiar commands (`init`, `add`, `commit`, `status`, `log`)

## Quick Start

```bash
# Initialize a new repository
dits init

# Add your video files
dits add footage/video.mp4
dits add project.prproj

# Commit your changes
dits commit -m "Initial commit: Add raw footage and project"

# Check status
dits status

# View history
dits log
```

## Example Workflow

```bash
# Create a new project
mkdir my-video-project
cd my-video-project
dits init

# Add files
dits add raw-footage/
dits add edits/
dits add project.prproj

# Commit
dits commit -m "Add all project files"

# Create a branch for experimentation
dits branch experimental-edit
dits switch experimental-edit

# Make changes, then commit
dits add new-edit.mp4
dits commit -m "Try new editing approach"

# Switch back and merge
dits switch main
dits merge experimental-edit
```

## Supported Platforms

| Platform | Architecture | Status |
|----------|--------------|--------|
| macOS | Apple Silicon (M1/M2/M3) | ✅ Supported |
| macOS | Intel (x64) | ✅ Supported |
| Linux | x64 (glibc) | ✅ Supported |
| Linux | ARM64 (glibc) | ✅ Supported |
| Linux | x64 (musl/Alpine) | ✅ Supported |
| Linux | ARM64 (musl/Alpine) | ✅ Supported |
| Windows | x64 | ✅ Supported |
| Windows | ARM64 | ✅ Supported |

## Common Commands

```bash
# Repository management
dits init                    # Initialize new repository
dits status                  # Show working tree status
dits add <file>              # Stage files
dits commit -m "message"     # Commit changes
dits log                     # View commit history

# Branching
dits branch                  # List branches
dits branch <name>           # Create branch
dits switch <branch>         # Switch branch
dits merge <branch>         # Merge branch

# Remote operations
dits remote add <name> <url> # Add remote
dits push                    # Push to remote
dits pull                    # Pull from remote
dits clone <url>             # Clone repository

# Advanced features
dits proxy-generate          # Generate video proxies
dits p2p share              # Share via P2P
dits encrypt-init           # Enable encryption
```

## Documentation

- **Full Documentation**: https://dits.byronwade.com/docs
- **GitHub Repository**: https://github.com/byronwade/dits
- **Issue Tracker**: https://github.com/byronwade/dits/issues

## Alternative Installation Methods

### Quick Install Script

```bash
curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
```

### Homebrew (macOS/Linux)

```bash
brew install byronwade/tap/dits
```

### Build from Source

```bash
cargo install dits
```

Or build from repository:

```bash
git clone https://github.com/byronwade/dits.git
cd dits
cargo build --release
```

## Requirements

- Node.js 16.0.0 or higher (for npm package)
- Rust 1.75+ (for building from source)
- 8GB RAM minimum (16GB recommended)
- 50GB free disk space for cache

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](https://github.com/byronwade/dits/blob/main/CONTRIBUTING.md) for details.

## Support

- 📖 [Documentation](https://dits.byronwade.com/docs)
- 💬 [Discussions](https://github.com/byronwade/dits/discussions)
- 🐛 [Report Issues](https://github.com/byronwade/dits/issues)
