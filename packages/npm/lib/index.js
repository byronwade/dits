#!/usr/bin/env node
/**
 * Dits CLI binary resolution and execution
 *
 * This module handles:
 * 1. Platform detection (OS + architecture)
 * 2. Finding the correct platform-specific binary (bundled in this package)
 * 3. Executing the binary with passed arguments
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let cachedMusl;

// Map Node.js platform/arch to binary directory names
const PLATFORMS = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-x64': 'linux-x64',
  'linux-arm64': 'linux-arm64',
  'linux-x64-musl': 'linux-x64-musl',
  'linux-arm64-musl': 'linux-arm64-musl',
  'win32-x64': 'win32-x64',
  'win32-arm64': 'win32-arm64',
};

/**
 * Detect if running on musl libc (Alpine Linux, etc.)
 */
function isMusl() {
  if (process.platform !== 'linux') return false;
  if (cachedMusl !== undefined) return cachedMusl;

  // Node exposes the runtime libc in its in-process diagnostic report. Prefer
  // that over spawning `ldd`, which used to add a child process to every fresh
  // CLI invocation through the npm shim.
  try {
    const header = process.report?.getReport?.().header;
    if (header?.glibcVersionRuntime) {
      cachedMusl = false;
      return cachedMusl;
    }
  } catch {
    // Fall through to filesystem probes on runtimes without diagnostic reports.
  }

  // Alpine is the common musl distribution. This small synchronous read is a
  // fallback only and avoids executing another program.
  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    if (osRelease.toLowerCase().includes('alpine')) {
      cachedMusl = true;
      return cachedMusl;
    }
  } catch {
    // Continue to the dynamic-loader probe.
  }

  try {
    const libDir = fs.readdirSync('/lib');
    cachedMusl = libDir.some(f => f.startsWith('ld-musl'));
  } catch {
    cachedMusl = false;
  }

  return cachedMusl;
}

/**
 * Get the platform key for binary lookup
 */
function getPlatformKey() {
  const platform = process.platform;
  const arch = process.arch;

  // Handle musl variants for Linux
  if (platform === 'linux' && isMusl()) {
    const muslKey = `linux-${arch}-musl`;
    if (PLATFORMS[muslKey]) {
      return muslKey;
    }
  }

  const key = `${platform}-${arch}`;

  if (!PLATFORMS[key]) {
    const knownTargets = Object.keys(PLATFORMS).join(', ');
    throw new Error(
      `Unsupported platform: ${platform} ${arch}\n` +
      `Known release targets: ${knownTargets}\n\n` +
      `Build the repository source directly:\n` +
      `  git clone https://github.com/byronwade/dits.git\n` +
      `  cd dits && cargo build --locked --release -p dits`
    );
  }

  return key;
}

/**
 * Get the path to the dits binary
 */
function getBinaryPath() {
  const platformKey = getPlatformKey();
  const binaryName = process.platform === 'win32' ? 'dits.exe' : 'dits';

  // Binary is bundled in this package under bin/<platform>/dits
  const binaryPath = path.join(__dirname, '..', 'bin', platformKey, binaryName);

  // Verify binary exists
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Binary not found for your platform (${process.platform} ${process.arch}).\n` +
      `Expected at: ${binaryPath}\n\n` +
      `This published package does not contain that target.\n` +
      `Build the repository source directly:\n` +
      `  git clone https://github.com/byronwade/dits.git\n` +
      `  cd dits && cargo build --locked --release -p dits\n\n` +
      `Or download from GitHub releases:\n` +
      `  https://github.com/byronwade/dits/releases`
    );
  }

  return binaryPath;
}

/**
 * Run the dits binary with the given arguments
 */
function run(args = process.argv.slice(2)) {
  const binaryPath = getBinaryPath();

  const result = spawnSync(binaryPath, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    // Handle specific error cases
    if (result.error.code === 'ENOENT') {
      console.error(`Error: Could not find dits binary at ${binaryPath}`);
    } else if (result.error.code === 'EACCES') {
      console.error(`Error: Permission denied executing ${binaryPath}`);
      console.error('Try: chmod +x ' + binaryPath);
    } else {
      console.error('Error executing dits:', result.error.message);
    }
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

// Export for programmatic use
module.exports = {
  getBinaryPath,
  getPlatformKey,
  run,
  isMusl
};

// Run if executed directly
if (require.main === module) {
  run();
}
