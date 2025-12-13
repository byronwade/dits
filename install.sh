#!/bin/sh
# Dits installer script
# Usage: curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
#
# Environment variables:
#   DITS_VERSION  - Version to install (default: latest)
#   DITS_INSTALL  - Installation directory (default: /usr/local/bin or ~/.local/bin)

set -e

REPO="byronwade/dits"
BINARY_NAME="dits"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
    exit 1
}

# Detect OS and architecture
detect_platform() {
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux)
            PLATFORM="linux"
            # Check for musl
            if ldd --version 2>&1 | grep -q musl; then
                LIBC="musl"
            elif [ -f /etc/alpine-release ]; then
                LIBC="musl"
            else
                LIBC="gnu"
            fi
            ;;
        Darwin)
            PLATFORM="darwin"
            LIBC=""
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="win32"
            LIBC=""
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac

    case "$ARCH" in
        x86_64|amd64)
            ARCH="x64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        *)
            error "Unsupported architecture: $ARCH"
            ;;
    esac

    # Construct platform string
    if [ "$PLATFORM" = "linux" ] && [ "$LIBC" = "musl" ]; then
        TARGET="${PLATFORM}-${ARCH}-musl"
    else
        TARGET="${PLATFORM}-${ARCH}"
    fi

    info "Detected platform: $TARGET"
}

# Get the latest version from GitHub
get_latest_version() {
    if [ -n "$DITS_VERSION" ]; then
        VERSION="$DITS_VERSION"
        info "Using specified version: $VERSION"
    else
        info "Fetching latest version..."
        VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
        if [ -z "$VERSION" ]; then
            error "Failed to get latest version. Please specify DITS_VERSION."
        fi
        info "Latest version: $VERSION"
    fi
}

# Determine installation directory
get_install_dir() {
    if [ -n "$DITS_INSTALL" ]; then
        INSTALL_DIR="$DITS_INSTALL"
    elif [ -w "/usr/local/bin" ]; then
        INSTALL_DIR="/usr/local/bin"
    else
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
    fi
    info "Installation directory: $INSTALL_DIR"
}

# Download and install
install_dits() {
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/v${VERSION}/dits-${TARGET}.tar.gz"

    info "Downloading from: $DOWNLOAD_URL"

    # Create temp directory
    TMP_DIR=$(mktemp -d)
    trap "rm -rf $TMP_DIR" EXIT

    # Download
    if command -v curl > /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/dits.tar.gz" || error "Download failed"
    elif command -v wget > /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "$TMP_DIR/dits.tar.gz" || error "Download failed"
    else
        error "Neither curl nor wget found. Please install one of them."
    fi

    # Extract
    info "Extracting..."
    tar -xzf "$TMP_DIR/dits.tar.gz" -C "$TMP_DIR"

    # Find the binary
    BINARY_PATH=$(find "$TMP_DIR" -name "$BINARY_NAME" -type f | head -1)
    if [ -z "$BINARY_PATH" ]; then
        error "Binary not found in archive"
    fi

    # Install
    info "Installing to $INSTALL_DIR/$BINARY_NAME..."
    chmod +x "$BINARY_PATH"
    mv "$BINARY_PATH" "$INSTALL_DIR/$BINARY_NAME"

    success "Installed dits v$VERSION to $INSTALL_DIR/$BINARY_NAME"
}

# Verify installation
verify_install() {
    if command -v dits > /dev/null; then
        success "dits is now available in your PATH"
        dits --version
    else
        warn "dits was installed but is not in your PATH"
        echo ""
        echo "Add the following to your shell profile (.bashrc, .zshrc, etc.):"
        echo ""
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        echo ""
    fi
}

# Print post-install message
print_help() {
    echo ""
    echo "Getting started:"
    echo "  dits init          # Initialize a new repository"
    echo "  dits add .         # Add files to staging"
    echo "  dits commit -m \"\" # Commit changes"
    echo "  dits status        # Show repository status"
    echo ""
    echo "For more information: https://github.com/$REPO"
    echo ""
}

main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                    Dits Installer                         ║"
    echo "║   Version control for video and large binary files        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    detect_platform
    get_latest_version
    get_install_dir
    install_dits
    verify_install
    print_help
}

main
