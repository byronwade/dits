"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import init, { chunk as wasmChunk, Profile } from "@/wasm/dits/dits_wasm.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, AlertTriangle, Sparkles } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB cap to keep the main thread responsive

type ChunkRow = { offset: number; length: number; hash: string; reused?: boolean };

const PROFILES: { key: keyof typeof Profile; label: string; sizes: string }[] = [
  { key: "Demo", label: "Demo", sizes: "1 / 4 / 16 KB" },
  { key: "Project", label: "Project", sizes: "4 / 16 / 64 KB" },
  { key: "Default", label: "Default (CLI)", sizes: "16 / 64 / 256 KB" },
  { key: "Media", label: "Media", sizes: "64 / 256 KB / 1 MB" },
];

// A sample big enough — and varied enough — to produce many chunks under the
// Demo profile, so editing a single line visibly changes only the chunk around
// it while the rest stay byte-identical. Variation matters: FastCDC places
// boundaries from the content, so repetitive text would collapse into a few
// max-size chunks and hide the effect.
const WORDS = [
  "chunk", "hash", "boundary", "dedup", "frame", "commit", "manifest", "stream",
  "blake3", "fastcdc", "offset", "verify", "render", "timeline", "keyframe", "mdat",
  "atom", "encode", "segment", "delta", "rolling", "content", "address", "store",
];
const SAMPLE = Array.from({ length: 320 }, (_, i) => {
  const a = WORDS[(i * 7) % WORDS.length];
  const b = WORDS[(i * 13 + 5) % WORDS.length];
  const c = WORDS[(i * 5 + 11) % WORDS.length];
  return `${String(i + 1).padStart(4, "0")}  ${a} ${b} ${c} — dits finds a content-defined boundary near here, names the ${a} by its blake3 address, and stores it once.`;
}).join("\n");

// Init the wasm module exactly once across mounts.
let wasmReady: Promise<unknown> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = init();
  return wasmReady;
}

// Deterministic hue from a hash so identical chunks share a color (dedup view).
function hueFor(hash: string): number {
  let h = 0;
  for (let i = 0; i < 8; i++) h = (h * 31 + hash.charCodeAt(i)) % 360;
  return h;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function PlaygroundClient() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState(SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array>(() => new TextEncoder().encode(SAMPLE));
  const [profileKey, setProfileKey] = useState<keyof typeof Profile>("Demo");
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [diff, setDiff] = useState<{ reused: number; changed: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const prevHashes = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);

  useEffect(() => {
    let alive = true;
    ensureWasm()
      .then(() => alive && setReady(true))
      .catch((e) => alive && setInitError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  // Recompute chunks whenever the input bytes or profile change.
  const recompute = useCallback(
    (data: Uint8Array, key: keyof typeof Profile) => {
      if (!ready) return;
      const result = wasmChunk(data, Profile[key]) as ChunkRow[];

      // Capture the PREVIOUS hash set before we overwrite it: a chunk is
      // "reused" if its hash existed in the run before this one. Store that
      // verdict on each row so the table/strip read a stable value rather than
      // the ref we're about to mutate.
      const prev = prevHashes.current;
      const isFirst = firstRun.current;
      const rows: ChunkRow[] = result.map((c) => ({
        offset: c.offset,
        length: c.length,
        hash: c.hash,
        reused: !isFirst && prev.has(c.hash),
      }));

      if (!isFirst) {
        const reused = rows.filter((r) => r.reused).length;
        setDiff({ reused, changed: rows.length - reused });
      }
      firstRun.current = false;
      prevHashes.current = new Set(rows.map((r) => r.hash));
      setChunks(rows);
    },
    [ready],
  );

  // Debounce text edits; recompute files immediately.
  useEffect(() => {
    if (!ready) return;
    if (mode === "text") {
      const data = new TextEncoder().encode(text);
      const t = setTimeout(() => {
        setBytes(data);
        recompute(data, profileKey);
      }, 180);
      return () => clearTimeout(t);
    }
    recompute(bytes, profileKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, profileKey, ready, mode]);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setInitError(
          `That file is ${formatBytes(file.size)} — over the ${formatBytes(MAX_BYTES)} demo cap. Try a smaller one.`,
        );
        return;
      }
      setInitError(null);
      const buf = new Uint8Array(await file.arrayBuffer());
      firstRun.current = true; // a new file is a fresh baseline, not an edit
      setDiff(null);
      setMode("file");
      setFileName(file.name);
      setBytes(buf);
      recompute(buf, profileKey);
    },
    [profileKey, recompute],
  );

  const stats = useMemo(() => {
    const total = chunks.length;
    const seen = new Set<string>();
    let stored = 0;
    for (const c of chunks) {
      if (!seen.has(c.hash)) {
        seen.add(c.hash);
        stored += c.length;
      }
    }
    const original = bytes.length;
    const dedupPct = original > 0 ? (1 - stored / original) * 100 : 0;
    return { total, unique: seen.size, original, stored, dedupPct };
  }, [chunks, bytes]);

  if (initError && !ready) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 size-6 text-destructive" aria-hidden="true" />
        <p className="font-medium">The engine couldn&apos;t load in this browser.</p>
        <p className="mt-1 text-sm text-muted-foreground">{initError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border bg-card p-1" role="tablist" aria-label="Input mode">
          <button
            role="tab"
            aria-selected={mode === "text"}
            onClick={() => {
              firstRun.current = true;
              setDiff(null);
              setMode("text");
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "text" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" aria-hidden="true" /> Text
          </button>
          <button
            role="tab"
            aria-selected={mode === "file"}
            onClick={() => setMode("file")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "file" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="size-4" aria-hidden="true" /> File
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chunk-size profile">
          <span className="mr-1 text-xs text-muted-foreground">Profile</span>
          {PROFILES.map((p) => (
            <button
              key={p.key}
              onClick={() => setProfileKey(p.key)}
              title={p.sizes}
              aria-pressed={profileKey === p.key}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                profileKey === p.key
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      {mode === "text" ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="Text to chunk"
            className="h-56 w-full resize-y rounded-xl border bg-card p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Edit any line above — the chunk strip and the &ldquo;reused&rdquo; count update live.
            Everything runs locally; nothing is uploaded.
          </p>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void loadFile(f);
          }}
          className={`flex h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors ${
            dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/50"
          }`}
        >
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
            }}
          />
          <Upload className="size-7 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">{fileName ?? "Drop a file, or click to choose"}</p>
            <p className="text-sm text-muted-foreground">
              Up to {formatBytes(MAX_BYTES)}. Stays on your machine.
            </p>
          </div>
        </label>
      )}

      {/* Engine status */}
      {!ready && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading the engine…
        </div>
      )}

      {ready && chunks.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Chunks" value={String(stats.total)} />
            <Stat label="Unique" value={String(stats.unique)} />
            <Stat label="Stored / original" value={`${formatBytes(stats.stored)} / ${formatBytes(stats.original)}`} />
            <Stat label="Deduplicated" value={`${stats.dedupPct.toFixed(1)}%`} accent />
          </div>

          {/* Edit diff */}
          {diff && (
            <div className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
              <Sparkles className="size-4 text-brand" aria-hidden="true" />
              <span>
                Since your last change: <strong className="text-brand">{diff.reused} chunks reused</strong>,{" "}
                <strong>{diff.changed} changed</strong>
                {diff.reused + diff.changed > 0 && (
                  <> — {Math.round((diff.reused / (diff.reused + diff.changed)) * 100)}% survived the edit.</>
                )}
              </span>
            </div>
          )}

          {/* Chunk strip */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Chunk map (width = size, color = content)</span>
              <span>{stats.total} chunks</span>
            </div>
            <div className="flex h-12 w-full overflow-hidden rounded-lg border" role="img" aria-label={`${stats.total} chunks`}>
              {chunks.map((c, i) => (
                <div
                  key={`${c.offset}-${i}`}
                  title={`#${i + 1} · ${formatBytes(c.length)} · ${c.hash.slice(0, 12)}…${
                    diff ? (c.reused ? " · reused" : " · changed") : ""
                  }`}
                  style={{
                    width: `${Math.max((c.length / stats.original) * 100, 0.4)}%`,
                    backgroundColor: `hsl(${hueFor(c.hash)} 55% 55%)`,
                  }}
                  className={`h-full border-r border-background/60 last:border-r-0 ${
                    diff && !c.reused ? "ring-2 ring-inset ring-foreground" : ""
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Chunk list */}
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Offset</th>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 font-medium">BLAKE3</th>
                  <th className="px-4 py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {chunks.slice(0, 40).map((c, i) => {
                  const reused = c.reused ?? false;
                  return (
                    <tr key={`${c.offset}-${i}`} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{c.offset}</td>
                      <td className="px-4 py-2 font-mono">{formatBytes(c.length)}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        <span
                          className="mr-2 inline-block size-2.5 rounded-full align-middle"
                          style={{ backgroundColor: `hsl(${hueFor(c.hash)} 55% 55%)` }}
                          aria-hidden="true"
                        />
                        {c.hash.slice(0, 16)}…
                      </td>
                      <td className="px-4 py-2">
                        {diff ? (
                          <Badge variant={reused ? "secondary" : "outline"} className={reused ? "" : "text-brand"}>
                            {reused ? "reused" : "new"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {chunks.length > 40 && (
              <p className="px-4 py-2 text-xs text-muted-foreground">Showing first 40 of {chunks.length} chunks.</p>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            This is the real engine — the same FastCDC + BLAKE3 code the CLI runs, compiled to
            WebAssembly from{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">packages/dits-core</code>. Network
            sync, VFS, and locking are CLI/roadmap features, not part of this demo.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-brand" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
