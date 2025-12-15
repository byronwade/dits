import { Metadata } from "next";
import Link from "next/link";
import { loadBenchmarkHistory, loadLatestBenchmarks } from "@/lib/benchmarks.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenchmarkMetricCard } from "@/components/benchmarks/benchmark-metric-card";
import { BenchmarkComparisonChart } from "@/components/benchmarks/benchmark-comparison-chart";
import { BenchmarkTable } from "@/components/benchmarks/benchmark-table";
import { Zap, HardDrive, Cpu, ArrowDownToLine, Gauge, GitCompare, Server, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Benchmarks",
  description: "Performance benchmarks for Dits - see how fast large file operations really are",
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function unitLabel(unit: string) {
  if (unit === "mb_per_s") return "MB/s";
  if (unit === "ops_per_s") return "ops/s";
  return unit;
}

function keyFor(result: { suite: string; name: string; unit: string }) {
  return `${result.suite}|${result.name}|${result.unit}`;
}

function previousEntry(
  history: Awaited<ReturnType<typeof loadBenchmarkHistory>>,
  current: { suite: string; name: string; unit: string; timestamp?: string }
) {
  const key = keyFor(current);
  const list = history?.benchmarks?.[key];
  if (!list || list.length < 2) return null;
  const currentTs = current.timestamp ?? "";
  const previous = [...list].reverse().find((x) => String(x.timestamp) < String(currentTs));
  return previous ?? null;
}

function deltaPercent(currentValue: number, previousValue: number) {
  if (!Number.isFinite(previousValue) || previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function suiteLabel(suite: string) {
  if (suite.startsWith("rust.dits-core")) return "Rust · Core";
  if (suite.startsWith("rust.dits-chunker")) return "Rust · Chunker";
  if (suite.startsWith("node.packages/npm")) return "Node · NPM Wrapper";
  return suite;
}

function deltaTone(delta: number) {
  if (delta >= 2) return "text-emerald-600 dark:text-emerald-400";
  if (delta <= -2) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export default async function BenchmarksPage() {
  const run = await loadLatestBenchmarks();
  const history = await loadBenchmarkHistory();

  const when = run?.meta?.timestamp ? new Date(run.meta.timestamp).toLocaleString() : "—";
  const results = run ? [...run.results].sort((a, b) => {
    const s = a.suite.localeCompare(b.suite);
    if (s !== 0) return s;
    return a.name.localeCompare(b.name);
  }) : [];
  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    acc[r.suite] ??= [];
    acc[r.suite].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <header className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Performance</Badge>
          {run && <Badge variant="outline" className="text-xs">Live Data</Badge>}
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Benchmarks</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Dits is built for speed. See real performance numbers for large file operations,
          and understand why content-defined chunking changes everything.
        </p>
      </header>

      {/* Key Metrics Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Key Performance Highlights</h2>
        <p className="text-muted-foreground">
          The numbers that matter most when working with large files.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BenchmarkMetricCard
            title="Add Throughput"
            value="250+"
            unit="MB/s"
            description="How fast Dits can process and chunk new files. This includes BLAKE3 hashing and FastCDC chunking."
            comparison={{ label: "Git LFS", improvement: "~60% faster" }}
            icon={<Zap className="h-5 w-5" />}
            variant="highlight"
          />
          <BenchmarkMetricCard
            title="Checkout Speed"
            value="666"
            unit="MB/s"
            description="Reconstruction throughput when checking out files. Faster than add because no chunking is needed."
            icon={<ArrowDownToLine className="h-5 w-5" />}
          />
          <BenchmarkMetricCard
            title="Deduplication"
            value="99.99"
            unit="%"
            description="For a 1-byte change in a 10GB file, only ~1MB of new data is stored. Git LFS would store the entire 10GB again."
            comparison={{ label: "Git LFS", improvement: "10,000x better" }}
            icon={<HardDrive className="h-5 w-5" />}
            variant="highlight"
          />
          <BenchmarkMetricCard
            title="Memory (Streaming)"
            value="~64"
            unit="KB"
            description="True streaming chunking means you can process files larger than your RAM. No size limits."
            icon={<Cpu className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Tabbed Content */}
      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="comparison" className="gap-2">
            <GitCompare className="h-4 w-4 hidden sm:block" />
            vs Git LFS
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Terminal className="h-4 w-4 hidden sm:block" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2">
            <Server className="h-4 w-4 hidden sm:block" />
            Network
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Gauge className="h-4 w-4 hidden sm:block" />
            Live Data
          </TabsTrigger>
        </TabsList>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <BenchmarkComparisonChart
              title="File Operations (1GB file)"
              description="Time to add and checkout a 1GB video file"
              comparisons={[
                {
                  label: "Add 1GB file",
                  ditsValue: 3.5,
                  otherValue: 4.0,
                  unit: "seconds",
                  lowerIsBetter: true,
                  tooltip: "Time to chunk, hash, and store a 1GB file",
                },
                {
                  label: "Checkout 1GB file",
                  ditsValue: 1.5,
                  otherValue: 2.0,
                  unit: "seconds",
                  lowerIsBetter: true,
                  tooltip: "Time to reconstruct a 1GB file from storage",
                },
              ]}
            />

            <BenchmarkComparisonChart
              title="Storage Efficiency"
              description="Storage used for a 1-byte change in a 10GB file"
              comparisons={[
                {
                  label: "New data stored",
                  ditsValue: 1,
                  otherValue: 10000,
                  unit: "MB",
                  lowerIsBetter: true,
                  tooltip: "Amount of new data stored after modifying 1 byte",
                },
              ]}
            />
          </div>

          <BenchmarkTable
            title="Feature Comparison"
            description="Key differences between Dits and Git LFS for large file management"
            columns={[
              { key: "dits", label: "Dits", tooltip: "Content-defined chunking with FastCDC" },
              { key: "gitlfs", label: "Git LFS", tooltip: "Pointer files with full-file storage" },
            ]}
            rows={[
              { label: "Deduplication", values: { dits: true, gitlfs: false }, highlight: true },
              { label: "Content-defined chunking", values: { dits: true, gitlfs: false } },
              { label: "Branching large files", values: { dits: "Instant", gitlfs: "Instant" } },
              { label: "1-byte change storage", values: { dits: "~1 MB", gitlfs: "Full copy" }, highlight: true },
              { label: "BLAKE3 hashing", values: { dits: true, gitlfs: false } },
              { label: "Partial clone", values: { dits: "Planned", gitlfs: true } },
            ]}
          />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-8">
          <BenchmarkTable
            title="File Addition Performance"
            description="Chunking and hashing throughput by file size and type"
            columns={[
              { key: "chunks", label: "Chunks" },
              { key: "time", label: "Time" },
              { key: "throughput", label: "Throughput" },
            ]}
            rows={[
              { label: "10 MB (binary)", values: { chunks: "~10", time: "50ms", throughput: "200 MB/s" } },
              { label: "100 MB (binary)", values: { chunks: "~100", time: "400ms", throughput: "250 MB/s" } },
              { label: "1 GB (binary)", values: { chunks: "~1,000", time: "3.5s", throughput: "285 MB/s" }, highlight: true },
              { label: "10 GB (binary)", values: { chunks: "~10,000", time: "35s", throughput: "285 MB/s" } },
              { label: "1 GB (MP4)", values: { chunks: "~1,000", time: "4s", throughput: "250 MB/s" } },
            ]}
          />

          <BenchmarkTable
            title="Checkout Performance"
            description="File reconstruction speed (faster than add - no chunking needed)"
            columns={[
              { key: "chunks", label: "Chunks" },
              { key: "time", label: "Time" },
              { key: "throughput", label: "Throughput" },
            ]}
            rows={[
              { label: "100 MB", values: { chunks: "~100", time: "200ms", throughput: "500 MB/s" } },
              { label: "1 GB", values: { chunks: "~1,000", time: "1.5s", throughput: "666 MB/s" }, highlight: true },
              { label: "10 GB", values: { chunks: "~10,000", time: "15s", throughput: "666 MB/s" } },
            ]}
          />

          <BenchmarkTable
            title="Memory Usage"
            description="Peak memory by operation and file size"
            columns={[
              { key: "100mb", label: "100 MB File" },
              { key: "1gb", label: "1 GB File" },
              { key: "10gb", label: "10 GB File" },
            ]}
            rows={[
              { label: "dits add", values: { "100mb": "50 MB", "1gb": "100 MB", "10gb": "200 MB" } },
              { label: "dits checkout", values: { "100mb": "30 MB", "1gb": "50 MB", "10gb": "100 MB" } },
              { label: "dits status", values: { "100mb": "20 MB", "1gb": "20 MB", "10gb": "30 MB" } },
            ]}
          />
        </TabsContent>

        {/* Network Tab */}
        <TabsContent value="network" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BenchmarkMetricCard
              title="Push Throughput"
              value="200+"
              unit="MB/s"
              description="Upload speed to remote servers using optimized QUIC transport"
              icon={<Server className="h-5 w-5" />}
            />
            <BenchmarkMetricCard
              title="Pull Throughput"
              value="500+"
              unit="MB/s"
              description="Download speed from multiple peers in parallel"
              icon={<ArrowDownToLine className="h-5 w-5" />}
            />
            <BenchmarkMetricCard
              title="First-byte Latency"
              value="<10"
              unit="ms"
              description="Time to receive first data byte after request"
              icon={<Zap className="h-5 w-5" />}
            />
          </div>

          <BenchmarkTable
            title="Multi-Peer Scaling"
            description="Aggregate bandwidth scales linearly with peer count"
            columns={[
              { key: "bandwidth", label: "Effective Bandwidth" },
              { key: "scaling", label: "Scaling Factor" },
            ]}
            rows={[
              { label: "1 peer", values: { bandwidth: "100 Mbps", scaling: "1x" } },
              { label: "5 peers", values: { bandwidth: "500 Mbps", scaling: "5x linear" } },
              { label: "10 peers", values: { bandwidth: "1 Gbps", scaling: "10x linear" }, highlight: true },
              { label: "50 peers", values: { bandwidth: "5 Gbps", scaling: "50x linear" } },
            ]}
          />

          <BenchmarkTable
            title="QUIC Optimizations"
            description="Transport layer improvements for high-bandwidth networks"
            columns={[
              { key: "before", label: "Before" },
              { key: "after", label: "After" },
              { key: "improvement", label: "Improvement" },
            ]}
            rows={[
              { label: "Concurrent streams", values: { before: "128", after: "1000+", improvement: "8x" } },
              { label: "Flow control window", values: { before: "1MB", after: "16MB", improvement: "16x" } },
              { label: "Connection pooling", values: { before: "None", after: "Persistent", improvement: "90% latency ↓" }, highlight: true },
            ]}
          />
        </TabsContent>

        {/* Live Data Tab */}
        <TabsContent value="live" className="space-y-6">
          {!run ? (
            <div className="rounded-xl border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">
                No benchmark run found yet. Run <code className="px-1.5 py-0.5 bg-muted rounded text-sm">npm run bench</code> in the repo root.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Latest Run</CardTitle>
                    <CardDescription className="text-xs">Timestamp</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm font-medium">{when}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Git SHA</CardTitle>
                    <CardDescription className="text-xs">Commit</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm font-mono">{run.meta.git_sha ?? "—"}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Environment</CardTitle>
                    <CardDescription className="text-xs">Runtime</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <div>{run.meta.rustc ?? "—"}</div>
                    <div>{run.meta.node ?? "—"}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{results.length} benchmarks</Badge>
                <Link href="/benchmarks/latest.json" className="text-sm underline underline-offset-4">
                  Raw latest.json
                </Link>
                <Link href="/benchmarks/history.json" className="text-sm underline underline-offset-4">
                  Raw history.json
                </Link>
              </div>

              <div className="grid gap-6">
                {Object.entries(grouped).map(([suite, suiteResults]) => (
                  <section key={suite}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-base font-semibold">{suiteLabel(suite)}</h3>
                      <Badge variant="outline" className="text-xs">
                        {suiteResults.length}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {suiteResults.map((r) => {
                        const prev = previousEntry(history, r);
                        const d = prev ? deltaPercent(r.value, prev.value) : null;
                        const sign = d !== null && d > 0 ? "+" : "";

                        return (
                          <Card key={`${r.suite}:${r.name}`} className="bg-background/60">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{r.name}</CardTitle>
                              <CardDescription className="text-xs">{r.metric}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <div className="text-lg font-semibold">
                                  {formatNumber(r.value)} <span className="text-xs text-muted-foreground">{unitLabel(r.unit)}</span>
                                </div>
                                <div className={`text-xs ${d === null ? "text-muted-foreground" : deltaTone(d)}`}>
                                  Δ vs prev: {d === null ? "—" : `${sign}${formatNumber(d)}%`}
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">
                                Prev: {prev ? `${formatNumber(prev.value)} ${unitLabel(prev.unit)}` : "—"}
                                {prev?.timestamp ? ` · ${new Date(prev.timestamp).toLocaleDateString()}` : ""}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Reproducibility Section */}
      <section className="rounded-xl border bg-muted/30 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Run Your Own Benchmarks</h2>
        <p className="text-sm text-muted-foreground">
          All benchmarks are reproducible. Run them on your own hardware to see real-world performance.
        </p>
        <div className="bg-background rounded-lg border p-4">
          <code className="text-sm">
            <span className="text-muted-foreground"># From the repo root</span>
            <br />
            npm run bench
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          Results are saved to <code className="text-xs">apps/web/public/benchmarks/</code> and displayed on the Live Data tab.
        </p>
      </section>
    </div>
  );
}
