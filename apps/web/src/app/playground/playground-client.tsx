"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import init, { chunk as wasmChunk, Profile } from "@/wasm/dits/dits_wasm.js";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  AlertTriangle,
  Save,
  RotateCcw,
  ArrowDown,
  Info,
} from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB cap to keep the main thread responsive

type ChunkRow = {
  offset: number;
  length: number;
  hash: string;
  /** Not yet in the local in-memory store created by this demo session. */
  isNew: boolean;
};

const PROFILES: { key: keyof typeof Profile; label: string; sizes: string }[] = [
  { key: "Demo", label: "Demo", sizes: "1 / 4 / 16 KB" },
  { key: "Project", label: "Project", sizes: "4 / 16 / 64 KB" },
  { key: "Default", label: "Default", sizes: "16 / 64 / 256 KB" },
  { key: "Media", label: "Media", sizes: "64 / 256 KB / 1 MB" },
];

// A sample big and varied enough to produce many chunks under the Demo profile,
// making identity changes visible after a controlled edit. Variation matters:
// FastCDC places boundaries from content, so
// repetitive text would collapse into a few max-size chunks and hide the effect.
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

let wasmReady: Promise<unknown> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = init();
  return wasmReady;
}

function hueFor(hash: string): number {
  let h = 0;
  for (let i = 0; i < 8; i++) h = (h * 31 + hash.charCodeAt(i)) % 360;
  return h;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type Ledger = {
  saves: number;
  newBytes: number;
  reusedBytes: number;
  history: number[];
};

export function PlaygroundClient() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState(SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array>(() => new TextEncoder().encode(SAMPLE));
  const [profileKey, setProfileKey] = useState<keyof typeof Profile>("Demo");
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [ledger, setLedger] = useState<Ledger>({
    saves: 0,
    newBytes: 0,
    reusedBytes: 0,
    history: [],
  });
  const [justSaved, setJustSaved] = useState(false);

  // The "store" — chunk hashes recorded by a prior version in this browser session.
  // Anything not in here is new to this local in-memory store.
  const store = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    ensureWasm()
      .then(() => alive && setReady(true))
      .catch((e) => alive && setInitError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const recompute = useCallback(
    (data: Uint8Array, key: keyof typeof Profile) => {
      if (!ready) return;
      const result = wasmChunk(data, Profile[key]) as { offset: number; length: number; hash: string }[];
      const known = store.current;
      setChunks(
        result.map((c) => ({
          offset: c.offset,
          length: c.length,
          hash: c.hash,
          isNew: !known.has(c.hash),
        })),
      );
    },
    [ready],
  );

  // Live recompute: debounce text edits, recompute files immediately.
  useEffect(() => {
    if (!ready) return;
    if (mode === "text") {
      const data = new TextEncoder().encode(text);
      const t = setTimeout(() => {
        setBytes(data);
        recompute(data, profileKey);
      }, 160);
      return () => clearTimeout(t);
    }
    recompute(bytes, profileKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, profileKey, ready, mode]);

  const resetSession = useCallback(() => {
    store.current = new Set();
    setLedger({ saves: 0, newBytes: 0, reusedBytes: 0, history: [] });
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setInitError(`That file is ${formatBytes(file.size)} — over the ${formatBytes(MAX_BYTES)} demo cap. Try a smaller one.`);
        return;
      }
      setInitError(null);
      const buf = new Uint8Array(await file.arrayBuffer());
      resetSession();
      setMode("file");
      setFileName(file.name);
      setBytes(buf);
      recompute(buf, profileKey);
    },
    [profileKey, recompute, resetSession],
  );

  // Exact local object-store accounting for the current unsaved version.
  const pending = useMemo(() => {
    const original = bytes.length;
    const seen = new Set<string>();
    let storedUnique = 0; // unique chunk bytes in this version (intra-file dedup)
    let newUnique = 0; // unique chunk bytes not already in this demo session's store
    let changedChunks = 0;
    for (const c of chunks) {
      if (seen.has(c.hash)) continue;
      seen.add(c.hash);
      storedUnique += c.length;
      if (c.isNew) {
        newUnique += c.length;
        changedChunks += 1;
      }
    }
    const total = chunks.length;
    const reusedChunks = total - chunks.filter((c) => c.isNew).length;
    const reusedUnique = Math.max(storedUnique - newUnique, 0);
    return {
      original,
      total,
      unique: seen.size,
      storedUnique,
      newUnique,
      reusedUnique,
      changedChunks,
      reusedChunks,
    };
  }, [chunks, bytes]);

  const isFirstSave = ledger.saves === 0;

  const saveVersion = useCallback(() => {
    // Commit every current chunk hash to the store; tally this save.
    const next = new Set(store.current);
    for (const c of chunks) next.add(c.hash);
    store.current = next;
    setLedger((l) => ({
      saves: l.saves + 1,
      newBytes: l.newBytes + pending.newUnique,
      reusedBytes: l.reusedBytes + pending.reusedUnique,
      history: [...l.history, pending.newUnique].slice(-24),
    }));
    // Mark everything as known now (no longer "new").
    setChunks((cs) => cs.map((c) => ({ ...c, isNew: false })));
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1400);
  }, [chunks, pending.newUnique, pending.reusedUnique]);

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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-float">
      {/* App toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-2 items-center justify-center">
            <span className={`size-2 rounded-full ${ready ? "bg-brand" : "bg-warning"} ${ready ? "" : "animate-pulse"}`} />
          </span>
          <span className="text-sm font-semibold">Dits engine</span>
          <Badge variant="outline" className="hidden gap-1 text-[11px] sm:inline-flex">
            WebAssembly · local
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Input mode"
            value={mode}
            onChange={(v) => {
              if (v === "text") resetSession();
              setMode(v as "text" | "file");
            }}
            options={[
              { value: "text", label: "Text", icon: FileText },
              { value: "file", label: "File", icon: Upload },
            ]}
          />
          <Segmented
            ariaLabel="Chunk-size profile"
            value={profileKey}
            onChange={(v) => setProfileKey(v as keyof typeof Profile)}
            options={PROFILES.map((p) => ({ value: p.key, label: p.label, title: p.sizes }))}
          />
          <button
            onClick={resetSession}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
          </button>
        </div>
      </div>

      {/* Body: workspace + value inspector */}
      <div className="grid gap-px bg-border lg:grid-cols-[1.15fr_1fr]">
        {/* LEFT — workspace */}
        <div className="space-y-4 bg-card p-4">
          {mode === "text" ? (
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                aria-label="Text to chunk"
                className="h-56 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" aria-hidden="true" />
                Edit any line — watch which chunks change, then{" "}
                <strong className="text-foreground">Save</strong> to bank the difference. Nothing is uploaded.
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
                <p className="text-sm text-muted-foreground">Up to {formatBytes(MAX_BYTES)}. Stays on your machine.</p>
              </div>
            </label>
          )}

          {/* Chunk map */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Chunk map — width = size, outline = new since last save</span>
              <span>{pending.total} chunks</span>
            </div>
            <div
              className="flex h-12 w-full overflow-hidden rounded-lg border border-border"
              role="img"
              aria-label={`${pending.total} chunks, ${pending.changedChunks} new since last save`}
            >
              {chunks.length === 0 && ready ? (
                <div className="flex w-full items-center justify-center text-xs text-muted-foreground">no chunks yet</div>
              ) : (
                chunks.map((c, i) => (
                  <div
                    key={`${c.offset}-${i}`}
                    title={`#${i + 1} · ${formatBytes(c.length)} · ${c.hash.slice(0, 12)}…${c.isNew ? " · NEW" : " · reused"}`}
                    style={{
                      width: `${Math.max((c.length / Math.max(pending.original, 1)) * 100, 0.5)}%`,
                      backgroundColor: `hsl(${hueFor(c.hash)} 55% 55%)`,
                    }}
                    className={`h-full border-r border-background/60 transition-all last:border-r-0 ${
                      !isFirstSave && c.isNew ? "ring-2 ring-inset ring-foreground" : ""
                    }`}
                  />
                ))
              )}
            </div>
          </div>

          {/* Narration */}
          <Narration pending={pending} isFirstSave={isFirstSave} ready={ready} />

          {/* Chunk table (collapsible) */}
          {chunks.length > 0 && (
            <details className="group rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium">
                <span>Per-chunk detail</span>
                <ArrowDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="max-h-72 overflow-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Offset</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2 font-medium">BLAKE3</th>
                      <th className="px-4 py-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunks.slice(0, 60).map((c, i) => (
                      <tr key={`${c.offset}-${i}`} className="border-b border-border last:border-0">
                        <td className="px-4 py-1.5 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-1.5 font-mono text-muted-foreground">{c.offset}</td>
                        <td className="px-4 py-1.5 font-mono">{formatBytes(c.length)}</td>
                        <td className="px-4 py-1.5 font-mono text-xs">
                          <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: `hsl(${hueFor(c.hash)} 55% 55%)` }} aria-hidden="true" />
                          {c.hash.slice(0, 16)}…
                        </td>
                        <td className="px-4 py-1.5">
                          {isFirstSave ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Badge variant={c.isNew ? "outline" : "secondary"} className={c.isNew ? "text-brand" : ""}>
                              {c.isNew ? "new" : "reused"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chunks.length > 60 && <p className="px-4 py-2 text-xs text-muted-foreground">Showing first 60 of {chunks.length} chunks.</p>}
              </div>
            </details>
          )}
        </div>

        {/* RIGHT — value inspector */}
        <div className="space-y-4 bg-card p-4">
          {!ready ? (
            <div className="flex h-full items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading the engine…
            </div>
          ) : (
            <>
              {/* Exact local object reuse */}
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {isFirstSave ? "First local version" : "Current local reuse"}
                  </h3>
                  <Badge variant="secondary">
                    {pending.reusedChunks} of {pending.total} chunks reused
                  </Badge>
                </div>

                <Meter
                  label="New unique bytes"
                  tone="brand"
                  valueLabel={formatBytes(pending.newUnique)}
                  pct={
                    pending.storedUnique > 0
                      ? (pending.newUnique / pending.storedUnique) * 100
                      : 0
                  }
                />
                <div className="h-2" />
                <Meter
                  label="Exact bytes already present locally"
                  tone="muted"
                  valueLabel={formatBytes(pending.reusedUnique)}
                  pct={
                    pending.storedUnique > 0
                      ? (pending.reusedUnique / pending.storedUnique) * 100
                      : 0
                  }
                />
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  These values describe exact chunk identities inside this browser
                  session. They are not repository, media-workflow, storage-cost,
                  or network-transfer benchmarks.
                </p>
              </div>

              {/* Save action */}
              <button
                onClick={saveVersion}
                disabled={chunks.length === 0}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                  justSaved ? "bg-brand/15 text-brand" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Save className="size-4" aria-hidden="true" />
                {justSaved
                  ? "Local version recorded"
                  : isFirstSave
                    ? "Record first local version"
                    : "Record this local version"}
              </button>

              {/* Cumulative session */}
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">This session</h3>
                  <span className="text-xs text-muted-foreground">
                    {ledger.saves} {ledger.saves === 1 ? "save" : "saves"}
                  </span>
                </div>
                {ledger.saves === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Record a version, make a controlled edit, and record it again
                    to see which exact chunks retain their identities.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          New unique bytes
                        </div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums">
                          {formatBytes(ledger.newBytes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Reused exact bytes
                        </div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums text-brand">
                          {formatBytes(ledger.reusedBytes)}
                        </div>
                      </div>
                    </div>
                    {ledger.history.length > 1 && <SaveBars history={ledger.history} />}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* How this works */}
      <HowItWorks />
    </div>
  );
}

/* ---------------------------------- parts --------------------------------- */

function Narration({
  pending,
  isFirstSave,
  ready,
}: {
  pending: {
    total: number;
    changedChunks: number;
    reusedChunks: number;
    newUnique: number;
  };
  isFirstSave: boolean;
  ready: boolean;
}) {
  if (!ready) return null;
  if (pending.total === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        Type something above to see the engine split it into content-defined chunks.
      </p>
    );
  }
  const survived = pending.total > 0 ? Math.round((pending.reusedChunks / pending.total) * 100) : 0;
  return (
    <p className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm leading-relaxed">
      {isFirstSave ? (
        <>
          The engine split your input into <strong>{pending.total} chunks</strong>, each named by its BLAKE3 hash. Identical
          chunks are stored once. Record version&nbsp;1, then edit a line and
          observe which chunk identities change.
        </>
      ) : pending.changedChunks === 0 ? (
        <>
          No change yet — all <strong>{pending.total} chunks</strong> match
          the recorded local version, so this session would add{" "}
          <strong className="text-brand">no new chunk bytes</strong>.
        </>
      ) : (
        <>
          You changed <strong>{pending.changedChunks}</strong> of <strong>{pending.total}</strong> chunks — FastCDC re-found the
          boundaries by content, so <strong className="text-brand">{survived}% retained the same identity</strong>. The local
          session would add {pending.changedChunks} new {pending.changedChunks === 1 ? "chunk" : "chunks"} (
          <strong>{formatBytes(pending.newUnique)}</strong> of unique bytes).
        </>
      )}
    </p>
  );
}

function Meter({ label, valueLabel, pct, tone }: { label: string; valueLabel: string; pct: number; tone: "brand" | "muted" }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold tabular-nums ${tone === "brand" ? "text-brand" : "text-foreground"}`}>{valueLabel}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${tone === "brand" ? "bg-brand" : "bg-muted-foreground/40"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function SaveBars({ history }: { history: number[] }) {
  const max = Math.max(...history, 1);
  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        New unique bytes per recorded version
      </div>
      <div className="flex h-12 items-end gap-1">
        {history.map((v, i) => (
          <div
            key={i}
            title={`Save ${i + 1}: ${formatBytes(v)}`}
            className="flex-1 rounded-sm bg-brand/70"
            style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
  ariaLabel,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; title?: string; icon?: React.ComponentType<{ className?: string }> }[];
  ariaLabel: string;
  small?: boolean;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-lg border border-border bg-background p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              small ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
            } ${active ? "bg-brand/12 text-brand" : "text-muted-foreground hover:text-foreground"}`}
          >
            {Icon ? <Icon className="size-3.5" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function HowItWorks() {
  const [tab, setTab] = useState<"how" | "observe" | "limits">("how");
  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-1">
        {(["how", "observe", "limits"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "how" ? "How it works" : t === "observe" ? "What to observe" : "Limits"}
          </button>
        ))}
      </div>
      <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {tab === "how" && (
          <p>
            Dits runs your bytes through <strong className="text-foreground">FastCDC</strong>, which scans a rolling fingerprint
            and cuts a boundary whenever the <em>content</em> hits a marker — not at fixed offsets. Each piece is hashed with{" "}
            <strong className="text-foreground">BLAKE3</strong> and named by that hash. Two pieces with the same bytes get the same
            name, so they&apos;re stored exactly once. After an edit, any chunk that
            retains the same bytes also retains its identity and can be recognized
            by this session&apos;s local store. That&apos;s the same chunking and hashing
            engine the CLI uses, compiled to WebAssembly.
          </p>
        )}
        {tab === "observe" && (
          <p>
            Record the sample, change a small region, and compare the chunk map.
            Exact matches keep the same BLAKE3 identity; changed regions produce
            new identities. Try different files and profiles to see where
            content-defined boundaries do and do not preserve reuse.
          </p>
        )}
        {tab === "limits" && (
          <p>
            This browser demonstration records no repository, commit, media-edit
            intent, cost, or network behavior. Compression, encryption, and
            re-encoding can change bytes throughout a file and leave little exact
            reuse. See the <a href="/benchmarks" className="text-brand underline-offset-2 hover:underline">benchmark boundaries</a>{" "}
            before drawing performance conclusions.
          </p>
        )}
      </div>
    </div>
  );
}
