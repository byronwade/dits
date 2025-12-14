import { Metadata } from "next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Zap, Settings, Database, Cpu, Clock, LineChart } from "lucide-react";

export const metadata: Metadata = {
    title: "Performance Tuning",
    description: "Optimize Dits for maximum performance with tuning guides and best practices",
};

export default function PerformancePage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Performance Tuning</h1>
            <p className="lead text-xl text-muted-foreground">
                Optimize Dits for maximum performance in your specific use case.
                Learn about tuning chunking algorithms, storage backends, and network settings.
            </p>

            <Alert className="not-prose my-6">
                <Zap className="h-4 w-4" />
                <AlertTitle>Performance First</AlertTitle>
                <AlertDescription>
                    Dits is designed to be fast by default. These tuning options are for
                    advanced users who need to optimize for specific workloads.
                </AlertDescription>
            </Alert>

            <h2>Chunking Performance</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-primary" />
                            Chunk Size Optimization
                        </CardTitle>
                        <CardDescription>
                            Balance between deduplication and overhead
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Smaller chunks increase deduplication but add metadata overhead.
                            Larger chunks reduce overhead but may miss deduplication opportunities.
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Small files (&lt;1MB)</span>
                                <code className="text-xs">4KB-16KB chunks</code>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Large files (&gt;100MB)</span>
                                <code className="text-xs">64KB-256KB chunks</code>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Video/Media</span>
                                <code className="text-xs">1MB-4MB chunks</code>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Algorithm Selection
                        </CardTitle>
                        <CardDescription>
                            Choose the right chunking algorithm
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <strong className="text-sm">Fixed-size chunking</strong>
                                <p className="text-xs text-muted-foreground">
                                    Fastest, best for static content
                                </p>
                            </div>
                            <div>
                                <strong className="text-sm">Content-defined chunking</strong>
                                <p className="text-xs text-muted-foreground">
                                    Better deduplication, handles insertions well
                                </p>
                            </div>
                            <div>
                                <strong className="text-sm">FastCDC</strong>
                                <p className="text-xs text-muted-foreground">
                                    Recommended default - balanced performance
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <h2>Storage Backend Tuning</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Local Storage Optimization</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium mb-2">Filesystem Choices</h4>
                        <ul className="text-sm space-y-1">
                            <li><strong>XFS:</strong> Best for large files and high concurrency</li>
                            <li><strong>ext4:</strong> Good general purpose choice</li>
                            <li><strong>Btrfs:</strong> Built-in compression and snapshots</li>
                            <li><strong>ZFS:</strong> Maximum data integrity</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">I/O Settings</h4>
                        <ul className="text-sm space-y-1">
                            <li>Use SSD/NVMe for hot data</li>
                            <li>Enable write caching</li>
                            <li>Tune I/O scheduler for workload</li>
                            <li>Consider RAID for throughput</li>
                        </ul>
                    </div>
                </div>
            </div>

            <h2>Configuration Examples</h2>

            <h3>High-Performance Configuration</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# dits.toml - High performance settings
[chunks]
algorithm = "fastcdc"
min_size = "32KB"
avg_size = "64KB" 
max_size = "256KB"
parallel_workers = 8

[storage]
type = "local"
path = "/fast-ssd/dits"
cache_size = "8GB"
write_buffer = "256MB"

[network]
max_connections = 1000
buffer_size = "4MB"
compression = "lz4"

[cache]
enabled = true
size = "4GB"
eviction = "lru"`}</code></pre>

            <h3>Low-Memory Configuration</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# dits.toml - Memory-constrained settings
[chunks]
algorithm = "fixed"
size = "64KB"
parallel_workers = 2

[storage]
type = "local"
cache_size = "256MB"
write_buffer = "32MB"

[cache]
enabled = true
size = "512MB"
aggressive_eviction = true`}</code></pre>

            <h2>Monitoring Performance</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Latency Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Chunk read/write time</li>
                            <li>Hash computation time</li>
                            <li>Network round-trip</li>
                            <li>Database query time</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            Throughput Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>MB/s upload rate</li>
                            <li>MB/s download rate</li>
                            <li>Chunks processed/sec</li>
                            <li>Deduplication ratio</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5 text-primary" />
                            Resource Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>CPU utilization</li>
                            <li>Memory consumption</li>
                            <li>Disk I/O wait</li>
                            <li>Network bandwidth</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Benchmarking</h2>

            <p>Use the built-in benchmarking tool to measure performance:</p>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Run comprehensive benchmark
dits benchmark --all

# Test specific operations
dits benchmark --chunking --file large-file.bin
dits benchmark --network --remote origin
dits benchmark --storage --size 10GB`}</code></pre>

            <Alert className="not-prose my-6">
                <LineChart className="h-4 w-4" />
                <AlertTitle>Performance Profiling</AlertTitle>
                <AlertDescription>
                    Enable the built-in profiler with <code>dits --profile</code> to identify
                    bottlenecks in your specific workflow.
                </AlertDescription>
            </Alert>
        </div>
    );
}
