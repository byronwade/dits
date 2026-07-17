#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targets = [
  ['darwin-arm64', 'dits'],
  ['darwin-x64', 'dits'],
  ['linux-x64', 'dits'],
  ['linux-arm64', 'dits'],
  ['linux-x64-musl', 'dits'],
  ['linux-arm64-musl', 'dits'],
  ['win32-x64', 'dits.exe'],
  ['win32-arm64', 'dits.exe'],
];

const invalid = targets
  .map(([target, binary]) => path.join('bin', target, binary))
  .filter((binaryPath) => {
    const absolutePath = path.join(__dirname, '..', binaryPath);
    try {
      const stat = fs.statSync(absolutePath);
      return !stat.isFile() || stat.size === 0;
    } catch {
      return true;
    }
  });

if (invalid.length > 0) {
  console.error('Refusing to publish an incomplete Dits native-binary matrix.');
  for (const binaryPath of invalid) {
    console.error(`  missing or empty: ${binaryPath}`);
  }
  process.exit(1);
}

console.log(`Found ${targets.length} non-empty packaged Dits binary files.`);
