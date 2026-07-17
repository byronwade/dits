#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tracked = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((file) => !file.startsWith("legacy/"));

const markdownLink = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
const failures = [];

for (const file of tracked) {
  const text = await readFile(join(root, file), "utf8");
  for (const match of text.matchAll(markdownLink)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    } else {
      target = target.split(/\s+["']/u, 1)[0];
    }
    if (
      !target ||
      target.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/iu.test(target) ||
      target.startsWith("//")
    ) {
      continue;
    }

    const pathPart = decodeURIComponent(target.split("#", 1)[0].split("?", 1)[0]);
    if (!pathPart) continue;

    const absolute = normalize(resolve(dirname(join(root, file)), pathPart));
    const candidates = [absolute];
    if (!extname(absolute)) {
      candidates.push(`${absolute}.md`, join(absolute, "README.md"));
    }
    if (!candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile())) {
      const line = text.slice(0, match.index).split("\n").length;
      failures.push(`${file}:${line} -> ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Found ${failures.length} broken relative Markdown link(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`✓ ${tracked.length} maintained Markdown files have resolvable relative links.`);
