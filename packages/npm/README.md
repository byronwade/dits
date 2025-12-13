# @byronwade/dits

**Version control for video and large binary files** - like Git, but optimized for large binary files.

## Installation

### npm / bun / pnpm

```bash
npm install -g @byronwade/dits
# or
bun install -g @byronwade/dits
# or
pnpm install -g @byronwade/dits
```

### Other Methods

```bash
# Quick install script
curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

# Homebrew (macOS/Linux)
brew install byronwade/tap/dits

# Build from source
cargo install dits
```

## Usage

Dits works just like Git:

```bash
dits init                    # Initialize a new repository
dits add video.mp4           # Add files
dits add .                   # Add all files
dits commit -m "Add video"   # Commit changes
dits status                  # Check status
dits log                     # View history
```

## Features

- **Content-Defined Chunking**: Only upload changed portions of large files
- **BLAKE3 Hashing**: Fast, secure content addressing
- **Deduplication**: Shared content stored once across all versions
- **Large File Support**: Optimized for video, game assets, and media files
- **Git-Like Workflow**: Familiar commands and mental model

## Supported Platforms

| Platform | Architecture |
|----------|--------------|
| macOS | Apple Silicon (M1/M2/M3) |
| macOS | Intel (x64) |
| Linux | x64 (glibc) |
| Linux | ARM64 (glibc) |
| Linux | x64 (musl/Alpine) |
| Linux | ARM64 (musl/Alpine) |
| Windows | x64 |
| Windows | ARM64 |

## Documentation

For full documentation, visit: https://github.com/byronwade/dits

## License

Apache-2.0 OR MIT
