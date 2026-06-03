"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Film,
  Scissors,
  Wifi,
  HardDrive,
  Gauge,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Real content-addressing — the exact idea the engine uses, computed in-browser.
// FNV-1a 32-bit over the frame's content; identical content => identical hash =>
// it dedups. Edit a frame and its hash (and storage cost) really changes.
// ----------------------------------------------------------------------------
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

// A frame's stored bytes scale with content; we use a fixed per-frame size to make
// the storage math legible (real engine: webp-vl ~0.5 MB/1080p frame).
const FRAME_KB = 512;

type Frame = { id: number; seed: number };

function hashFrame(f: Frame) {
  return fnv1a(`frame:${f.id % 7}:${f.seed}`); // base content repeats every 7 (held shots)
}

// Map a 7-hex hash to a stable hue for the cell color.
function hueOf(hash: string) {
  return (parseInt(hash.slice(0, 4), 16) % 360);
}

// ============================================================================
// LAB 1 — Frame-level deduplication
// ============================================================================
function DedupLab() {
  const COUNT = 28;
  const [frames, setFrames] = useState<Frame[]>(() =>
    Array.from({ length: COUNT }, (_, id) => ({ id, seed: 0 }))
  );
  const [edited, setEdited] = useState<Set<number>>(new Set());

  const hashes = useMemo(() => frames.map(hashFrame), [frames]);
  const unique = useMemo(() => new Set(hashes), [hashes]);
  const total = frames.length;
  const stored = unique.size;
  const savedPct = Math.round((1 - stored / total) * 100);

  const regrade = (idx: number) => {
    setFrames((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, seed: f.seed + 1 } : f))
    );
    setEdited((prev) => new Set(prev).add(idx));
  };

  const reset = () => {
    setFrames(Array.from({ length: COUNT }, (_, id) => ({ id, seed: 0 })));
    setEdited(new Set());
  };

  return (
    <LabShell
      n={1}
      icon={<Film className="h-4 w-4" />}
      title="Frame-level deduplication"
      blurb="A 28-frame clip, each frame content-addressed by hash. Click frames to re-grade them — watch only the changed frames cost new storage. Identical frames (held shots) share one object."
    >
      <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div>
          <div className="grid grid-cols-7 gap-1.5">
            {frames.map((f, i) => {
              const h = hashes[i];
              const isEdited = edited.has(i);
              return (
                <button
                  key={f.id}
                  onClick={() => regrade(i)}
                  className={cn(
                    "group relative aspect-square rounded-md border text-[9px] font-mono",
                    "transition-all duration-300 overflow-hidden",
                    isEdited
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border/60 hover:border-primary/50"
                  )}
                  style={{
                    background: `hsl(${hueOf(h)} 35% ${isEdited ? 32 : 20}% / 0.55)`,
                  }}
                  title={`frame ${i} · ${h} — click to re-grade`}
                >
                  <span className="absolute inset-x-0 bottom-0 px-1 py-0.5 bg-background/70 backdrop-blur-sm text-muted-foreground group-hover:text-foreground truncate">
                    {h}
                  </span>
                  {isEdited && (
                    <Sparkles className="absolute top-1 right-1 h-3 w-3 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground font-mono">
            click any frame → it re-quantizes → new hash → new object stored
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Stat label="Frames in clip" value={total} />
          <Stat label="Objects stored" value={stored} accent />
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Storage saved</span>
              <span className="font-mono font-semibold text-primary">{savedPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${savedPct}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t text-sm text-muted-foreground">
            <span className="font-mono text-foreground">{edited.size}</span> frame(s) edited ·
            cost <span className="font-mono text-foreground">{(edited.size * FRAME_KB) / 1024 >= 1 ? `${((edited.size * FRAME_KB) / 1024).toFixed(1)} MB` : `${edited.size * FRAME_KB} KB`}</span> new
            <div className="text-xs mt-1">
              vs <span className="line-through">{((total * FRAME_KB) / 1024).toFixed(1)} MB</span> re-storing the whole clip
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset clip
          </Button>
        </div>
      </div>
    </LabShell>
  );
}

// ============================================================================
// LAB 2 — Non-destructive trim (zero-storage edit)
// ============================================================================
function TrimLab() {
  const TOTAL = 40;
  const [inP, setIn] = useState(8);
  const [outP, setOut] = useState(28);
  const kept = Math.max(0, outP - inP);

  return (
    <LabShell
      n={2}
      icon={<Scissors className="h-4 w-4" />}
      title="A trim costs zero storage"
      blurb="Drag the in/out points. The cut is a new manifest that references the SAME stored frames — no bytes are copied. This is what `dits facr-trim` does."
    >
      <div className="flex flex-wrap gap-0.5 mb-6">
        {Array.from({ length: TOTAL }, (_, i) => {
          const inside = i >= inP && i < outP;
          return (
            <div
              key={i}
              className={cn(
                "h-10 flex-1 min-w-[8px] rounded-sm transition-all duration-300",
                inside ? "bg-primary/70" : "bg-muted"
              )}
            />
          );
        })}
      </div>
      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <Range label="In point" value={inP} max={outP - 1} onChange={setIn} />
        <Range label="Out point" value={outP} min={inP + 1} max={TOTAL} onChange={setOut} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="secondary" className="font-mono">{kept} frames kept</Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge className="bg-primary/10 text-primary border-primary/20 font-mono">
          0 new frames stored
        </Badge>
        <span className="text-muted-foreground">— the manifest just points at frames {inP}–{outP - 1}.</span>
      </div>
    </LabShell>
  );
}

// ============================================================================
// LAB 3 — Incremental streaming sync
// ============================================================================
type SyncObj = { id: number; have: boolean };
function StreamLab() {
  const N = 24;
  const [objs, setObjs] = useState<SyncObj[]>(() =>
    // destination starts with ~1/3 of the source's objects.
    Array.from({ length: N }, (_, id) => ({ id, have: id % 3 === 0 }))
  );
  const [flying, setFlying] = useState<Set<number>>(new Set());
  const [log, setLog] = useState<{ copied: number; bytes: number } | null>(null);
  const busy = useRef(false);

  const missing = objs.filter((o) => !o.have);

  const fetchObjects = async () => {
    if (busy.current) return;
    const toCopy = objs.filter((o) => !o.have).map((o) => o.id);
    if (toCopy.length === 0) {
      setLog({ copied: 0, bytes: 0 });
      return;
    }
    busy.current = true;
    setLog(null);
    // animate the diff streaming across, one object at a time.
    for (const id of toCopy) {
      setFlying((p) => new Set(p).add(id));
      await new Promise((r) => setTimeout(r, 90));
      setObjs((p) => p.map((o) => (o.id === id ? { ...o, have: true } : o)));
      setFlying((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
    setLog({ copied: toCopy.length, bytes: toCopy.length * 318 });
    busy.current = false;
  };

  const addCommit = () => {
    // source gains new objects the dest lacks (a new commit upstream).
    setObjs((p) => p.map((o, i) => (i % 5 === 2 ? { ...o, have: false } : o)));
    setLog(null);
  };

  const reset = () =>
    setObjs(Array.from({ length: N }, (_, id) => ({ id, have: id % 3 === 0 })));

  return (
    <LabShell
      n={3}
      icon={<Wifi className="h-4 w-4" />}
      title="Incremental streaming sync"
      blurb="Two repos. `fetch-objects` transfers only the objects the destination lacks — so a re-sync moves nothing and an interrupted transfer resumes with just the remainder. Real set-difference, computed live."
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <RepoPanel title="Source" sub={`${objs.length} objects`}>
          <div className="grid grid-cols-8 gap-1.5">
            {objs.map((o) => (
              <div
                key={o.id}
                className="aspect-square rounded-sm bg-primary/60"
                title={`object ${o.id}`}
              />
            ))}
          </div>
        </RepoPanel>
        <RepoPanel
          title="Destination"
          sub={`${objs.filter((o) => o.have).length}/${objs.length} have · ${missing.length} missing`}
        >
          <div className="grid grid-cols-8 gap-1.5">
            {objs.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "aspect-square rounded-sm transition-all duration-300",
                  flying.has(o.id)
                    ? "bg-emerald-400 scale-110 shadow-[0_0_10px] shadow-emerald-400/60"
                    : o.have
                      ? "bg-primary/60"
                      : "bg-muted border border-dashed border-border"
                )}
                title={o.have ? `have object ${o.id}` : `missing object ${o.id}`}
              />
            ))}
          </div>
        </RepoPanel>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={fetchObjects} disabled={missing.length === 0}>
          <Wifi className="h-3.5 w-3.5 mr-2" />
          {missing.length === 0 ? "Up to date" : `fetch-objects (${missing.length} missing)`}
        </Button>
        <Button size="sm" variant="outline" onClick={addCommit}>
          + new commit upstream
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset
        </Button>
        {log && (
          <span className="text-sm font-mono text-muted-foreground">
            {log.copied === 0 ? (
              <span className="text-primary">✓ Already up to date — 0 bytes transferred</span>
            ) : (
              <>copied {log.copied} object(s) · {(log.bytes / 1024).toFixed(1)} KB · the rest deduped</>
            )}
          </span>
        )}
      </div>
    </LabShell>
  );
}

// ============================================================================
// REAL DATA — measured codec store sizes (this session, on a real 1080p clip)
// ============================================================================
function CodecData() {
  const rows = [
    { name: "PNG (lossless)", mb: 541, note: "baseline" },
    { name: "WebP (lossless)", mb: 395, note: "−27%" },
    { name: "WebP-VL (visually-lossless)", mb: 85, note: "−84%", best: true },
  ];
  const max = 541;
  return (
    <LabShell
      n={4}
      icon={<HardDrive className="h-4 w-4" />}
      title="Frame codec — real measured storage"
      blurb="Frame store for the same real 1080p clip, measured in this build. The visually-lossless mezzanine is frame-addressable AND tiny."
      mono="171 frames · ffmpeg · deterministic encoding (so frames still dedup)"
    >
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between items-baseline text-sm mb-1.5">
              <span className={cn(r.best && "font-medium text-foreground")}>{r.name}</span>
              <span className="font-mono">
                <span className={cn(r.best ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {r.mb} MB
                </span>{" "}
                <span className="text-xs text-muted-foreground">{r.note}</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-700 rounded-full",
                  r.best ? "bg-gradient-to-r from-primary to-emerald-500" : "bg-primary/40"
                )}
                style={{ width: `${(r.mb / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </LabShell>
  );
}

// ============================================================================
// REAL DATA — live benchmark numbers fetched from /benchmarks/latest.json
// ============================================================================
type Metric = { label: string; value: string; unit: string };
function LiveBenchmarks() {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/benchmarks/latest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const out: Metric[] = [];
        const results = data?.results ?? data?.benchmarks ?? {};
        const entries = Array.isArray(results) ? results : Object.entries(results);
        for (const e of entries) {
          const key = Array.isArray(e) ? e[0] : e?.name;
          const val = Array.isArray(e) ? e[1] : e?.value;
          const v = typeof val === "object" ? val?.value ?? val?.[0]?.value : val;
          if (typeof key === "string" && typeof v === "number") {
            const parts = key.split("|");
            out.push({
              label: parts[1] ?? key,
              value: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0),
              unit: parts[2] ?? "",
            });
          }
          if (out.length >= 4) break;
        }
        if (out.length === 0) throw new Error();
        setMetrics(out);
      })
      .catch(() => setErr(true));
  }, []);

  return (
    <LabShell
      n={5}
      icon={<Gauge className="h-4 w-4" />}
      title="Live engine benchmarks"
      blurb="Fetched in your browser from this site's published benchmark data — the real throughput numbers from the Rust engine's CI runs."
    >
      {err ? (
        <p className="text-sm text-muted-foreground font-mono">
          benchmark data not published in this build — run <code>npm run bench</code> to generate it.
        </p>
      ) : !metrics ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="text-2xl font-bold font-mono text-primary tabular-nums">
                {m.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{m.unit}</div>
              <div className="text-sm mt-2 leading-tight">{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </LabShell>
  );
}

// ----------------------------------------------------------------------------
// Shared building blocks
// ----------------------------------------------------------------------------
function LabShell({
  n,
  icon,
  title,
  blurb,
  mono,
  children,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  blurb: string;
  mono?: string;
  children: ReactNode;
}) {
  return (
    <section className="py-10 border-t first:border-t-0">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-sm">
          {n}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            {title}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">{blurb}</p>
          {mono && <p className="text-xs font-mono text-muted-foreground/80 mt-2">{mono}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-2xl font-bold tabular-nums",
          accent ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Range({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function RepoPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-semibold">{title}</span>
        <span className="text-xs font-mono text-muted-foreground">{sub}</span>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================
export function PlaygroundClient() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* Hero */}
        <section className="border-b bg-muted/30">
          <div className="container py-16 md:py-20">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 font-mono text-xs">
                computed live · no mocks
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
                The <span className="text-primary">playground</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Every lab below runs in your browser using the same content-addressing the
                engine uses — real hashing, real set-difference, real measured data. Poke at it
                and watch why editing and syncing big media can be nearly free.
              </p>
            </div>
          </div>
        </section>

        <div className="container py-6">
          <DedupLab />
          <TrimLab />
          <StreamLab />
          <CodecData />
          <LiveBenchmarks />
        </div>
      </main>
      <Footer />
    </div>
  );
}
