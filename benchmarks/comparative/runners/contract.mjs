import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export function has(bin) {
  if (bin.includes("/")) return existsSync(bin);
  return spawnSync("command", ["-v", bin], { shell: true }).status === 0;
}

export function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: opts.cwd, env: opts.env ?? process.env });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(" ")} -> ${r.status}\n${r.stderr}`);
  }
  return r;
}

export const DITS = process.env.DITS_BIN
  || new URL("../../../target/release/dits", import.meta.url).pathname;
