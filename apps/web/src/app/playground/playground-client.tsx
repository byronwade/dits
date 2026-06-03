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
const EGRESS_USD_PER_GB = 0.09; // S3-class egress — same figure the benchmarks use

type ChunkRow = {
  offset: number;
  length: number;
  hash: string;
  /** Not yet in the store (a previous saved version) → Dits must send it. */
  isNew: boolean;
};

const PROFILES: { key: keyof typeof Profile; label: string; sizes: string }[] = [
  { key: "Demo", label: "Demo", sizes: "1 / 4 / 16 KB" },
  { key: "Project", label: "Project", sizes: "4 / 16 / 64 KB" },
  { key: "Default", label: "Default", sizes: "16 / 64 / 256 KB" },
  { key: "Media", label: "Media", sizes: "64 / 256 KB / 1 MB" },
];

const SCALES: { key: string; label: string; bytes: number | null }[] = [
  { key: "actual", label: "Actual", bytes: null },
  { key: "500mb", label: "500 MB", bytes: 500 * 1024 * 1024 },
  { key: "2gb", label: "2 GB", bytes: 2 * 1024 * 1024 * 1024 },
  { key: "10gb", label: "10 GB", bytes: 10 * 1024 * 1024 * 1024 },
];

// A sample big & varied enough to produce many chunks under the Demo profile, so
// editing one line visibly changes only the chunk around it while the rest stay
// byte-identical. Variation matters: FastCDC places boundaries from content, so
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

function formatUsd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

type Ledger = { saves: number; normal: number; dits: number; history: number[] };

export function PlaygroundClient() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState(SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array>(() => new TextEncoder().encode(SAMPLE));
  const [profileKey, setProfileKey] = useState<keyof typeof Profile>("Demo");
  const [scaleKey, setScaleKey] = useState("2gb");
  const [chunks, setChunks] = useState<ChunkRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [ledger, setLedger] = useState<Ledger>({ saves: 0, normal: 0, dits: 0, history: [] });
  const [justSaved, setJustSaved] = useState(false);

  // The "store" — chunk hashes already committed by a prior saved version.
  // Anything not in here is new work Dits would have to send on the next save.
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
    setLedger({ saves: 0, normal: 0, dits: 0, history: [] });
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

  // What the CURRENT (unsaved) version would cost to ship.
  const pending = useMemo(() => {
    const original = bytes.length;
    const seen = new Set<string>();
    let storedUnique = 0; // unique chunk bytes in this version (intra-file dedup)
    let newUnique = 0; // unique chunk bytes NOT already in the store (Dits must send)
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
    // Dits ships only chunks it doesn't already have; a normal tool ships the whole file.
    const ditsSend = newUnique;
    const normalSend = original;
    const multiple = ditsSend > 0 ? normalSend / ditsSend : normalSend > 0 ? Infinity : 1;
    const savedPct = normalSend > 0 ? (1 - ditsSend / normalSend) * 100 : 0;
    return { original, total, unique: seen.size, storedUnique, ditsSend, normalSend, multiple, savedPct, changedChunks, reusedChunks };
  }, [chunks, bytes]);

  const isFirstSave = ledger.saves === 0;

  const saveVersion = useCallback(() => {
    // Commit every current chunk hash to the store; tally this save.
    const next = new Set(store.current);
    for (const c of chunks) next.add(c.hash);
    store.current = next;
    setLedger((l) => ({
      saves: l.saves + 1,
      normal: l.normal + pending.normalSend,
      dits: l.dits + pending.ditsSend,
      history: [...l.history, pending.ditsSend].slice(-24),
    }));
    // Mark everything as known now (no longer "new").
    setChunks((cs) => cs.map((c) => ({ ...c, isNew: false })));
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1400);
  }, [chunks, pending.normalSend, pending.ditsSend]);

  // Scale the measured ratio to a real-world project size for tangible dollars.
  const scale = SCALES.find((s) => s.key === scaleKey) ?? SCALES[0];
  const factor = scale.bytes && pending.original > 0 ? scale.bytes / pending.original : 1;
  const costNormal = (pending.normalSend * factor) / 1e9 * EGRESS_USD_PER_GB;
  const costDits = (pending.ditsSend * factor) / 1e9 * EGRESS_USD_PER_GB;
  const ledgerMultiple = ledger.dits > 0 ? ledger.normal / ledger.dits : ledger.normal > 0 ? Infinity : 1;
  const ledgerCostNormal = (ledger.normal * factor) / 1e9 * EGRESS_USD_PER_GB;
  const ledgerCostDits = (ledger.dits * factor) / 1e9 * EGRESS_USD_PER_GB;

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
              {/* Vs a normal tool */}
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{isFirstSave ? "Your first upload" : "If you save now"}</h3>
                  <Badge className="bg-brand text-brand-foreground">
                    {pending.multiple === Infinity ? "∞" : `${pending.multiple.toFixed(pending.multiple >= 10 ? 0 : 1)}×`} less
                  </Badge>
                </div>

                <Meter label="A normal tool re-sends the whole file" tone="muted" valueLabel={formatBytes(pending.normalSend)} pct={100} />
                <div className="h-2" />
                <Meter
                  label="Dits sends only what changed"
                  tone="brand"
                  valueLabel={formatBytes(pending.ditsSend)}
                  pct={pending.normalSend > 0 ? Math.max((pending.ditsSend / pending.normalSend) * 100, 1.5) : 0}
                />

                {/* Cost at scale */}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Cost to ship, at project scale</span>
                  <Segmented
                    small
                    ariaLabel="Project scale"
                    value={scaleKey}
                    onChange={setScaleKey}
                    options={SCALES.map((s) => ({ value: s.key, label: s.label }))}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <CostCell label="Normal" value={formatUsd(costNormal)} tone="muted" />
                  <CostCell label="Dits" value={formatUsd(costDits)} tone="brand" />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {scale.bytes
                    ? `Same edit ratio applied to a ${scale.label} project, at $${EGRESS_USD_PER_GB}/GB egress. `
                    : `Real bytes from your input, at $${EGRESS_USD_PER_GB}/GB egress. `}
                  Big media wins even bigger — see the{" "}
                  <a href="/benchmarks" className="text-brand underline-offset-2 hover:underline">benchmarks</a>.
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
                {justSaved ? "Version saved" : isFirstSave ? "Save first version" : "Save this version"}
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
                    Save a version, edit a line, save again — and watch a normal tool&apos;s upload bill run away from Dits&apos;s.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Normal sent</div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums">{formatBytes(ledger.normal)}</div>
                        <div className="text-xs text-muted-foreground">{formatUsd(ledgerCostNormal)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Dits sent</div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums text-brand">{formatBytes(ledger.dits)}</div>
                        <div className="text-xs text-brand">{formatUsd(ledgerCostDits)}</div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-brand/10 px-3 py-2 text-sm">
                      <strong className="text-brand">
                        {ledgerMultiple === Infinity ? "∞" : `${ledgerMultiple.toFixed(ledgerMultiple >= 10 ? 0 : 1)}×`} less data
                      </strong>{" "}
                      over {ledger.saves} {ledger.saves === 1 ? "save" : "saves"} — {formatUsd(Math.max(ledgerCostNormal - ledgerCostDits, 0))} saved.
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
  pending: { total: number; changedChunks: number; reusedChunks: number; ditsSend: number; normalSend: number; multiple: number };
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
          chunks are stored once. Save this as version&nbsp;1, then edit a line — only the chunk you touch will change.
        </>
      ) : pending.changedChunks === 0 ? (
        <>No change yet — all <strong>{pending.total} chunks</strong> match the saved version, so Dits would send <strong className="text-brand">nothing</strong>.</>
      ) : (
        <>
          You changed <strong>{pending.changedChunks}</strong> of <strong>{pending.total}</strong> chunks — FastCDC re-found the
          boundaries by content, so <strong className="text-brand">{survived}% survived</strong>. Dits ships just the{" "}
          {pending.changedChunks} changed {pending.changedChunks === 1 ? "chunk" : "chunks"} (
          <strong>{formatBytes(pending.ditsSend)}</strong>); a normal tool re-sends the whole {formatBytes(pending.normalSend)}.
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

function CostCell({ label, value, tone }: { label: string; value: string; tone: "brand" | "muted" }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone === "brand" ? "border-brand/30 bg-brand/5" : "border-border bg-muted/30"}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums ${tone === "brand" ? "text-brand" : ""}`}>{value}</div>
    </div>
  );
}

function SaveBars({ history }: { history: number[] }) {
  const max = Math.max(...history, 1);
  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Dits upload per save</div>
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
  const [tab, setTab] = useState<"how" | "why" | "honest">("how");
  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-1">
        {(["how", "why", "honest"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "honest" ? "The honest part" : t === "how" ? "How it works" : "Why it works"}
          </button>
        ))}
      </div>
      <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {tab === "how" && (
          <p>
            Dits runs your bytes through <strong className="text-foreground">FastCDC</strong>, which scans a rolling fingerprint
            and cuts a boundary whenever the <em>content</em> hits a marker — not at fixed offsets. Each piece is hashed with{" "}
            <strong className="text-foreground">BLAKE3</strong> and named by that hash. Two pieces with the same bytes get the same
            name, so they&apos;re stored exactly once. Edit a line and the boundaries around it re-settle locally — every other
            chunk keeps its name, so the store already has it. That&apos;s the same engine the CLI uses, compiled to WebAssembly.
          </p>
        )}
        {tab === "why" && (
          <p>
            Fixed-size blocks break the moment you insert or delete a byte: everything after the edit shifts and re-hashes, so a
            &ldquo;normal&rdquo; tool re-sends the whole file. Content-defined boundaries move <em>with</em> the content, so an
            insertion only disturbs the chunk it lands in. On a 4 GB render, changing one frame touches a few hundred KB — Dits
            ships those; a normal tool ships all 4 GB. Multiply that by every save, every teammate, every day.
          </p>
        )}
        {tab === "honest" && (
          <p>
            This won&apos;t help when the bytes genuinely change everywhere — a full re-encode or re-export rewrites the whole
            file, so there&apos;s little to reuse (the benchmarks show that case at ~0% too). The wins are in the common loop:
            trims, metadata, color tweaks, re-saves, and frame-level edits. And on tiny text the ratios are modest; the dramatic
            numbers come from large media, which the <a href="/benchmarks" className="text-brand underline-offset-2 hover:underline">benchmarks</a> measure directly.
          </p>
        )}
      </div>
    </div>
  );
}
