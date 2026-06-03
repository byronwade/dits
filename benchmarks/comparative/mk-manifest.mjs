import { readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
const dir = process.argv[2];
const lines = readFileSync(path.join(dir, "checksums.txt"), "utf8").trim().split("\n");
const files = lines.map((l) => {
  const [sha, name] = l.split(/\s+/);
  return { name, sha256: sha, bytes: statSync(path.join(dir, name)).size };
});
writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ files }, null, 2) + "\n");
console.log("wrote manifest.json with", files.length, "files");
