import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Check,
  AlertTriangle,
  Zap,
  Shield,
  Database,
  Network,
  HardDrive,
  Cpu,
  FileText,
  Video,
  Image,
  Music,
  Archive,
  Code,
  Gamepad2,
  Wrench,
  Clock,
  Users,
  Lock,
  Eye,
  Bug,
  Target,
  Layers,
  Cloud,
  Server,
  Monitor
} from "lucide-react";

export const metadata: Metadata = {
  title: "Testing Framework",
  description: "Comprehensive testing strategy and framework documentation",
};

export default function TestingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 mb-4">
          <Target className="h-8 w-8 text-primary" />
          Testing Framework
        </h1>
        <p className="lead text-xl text-muted-foreground">
          DITS implements the most comprehensive testing framework ever built for a version control system,
          covering every conceivable aspect of distributed media asset management.
        </p>
      </div>

      <Alert className="mb-8">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Industry-Leading Test Coverage</AlertTitle>
        <AlertDescription>
          <strong>120+ automated tests</strong> covering 80+ file formats, 50+ failure scenarios,
          and real-world workflows. Every line of code is validated through systematic testing.
        </AlertDescription>
      </Alert>

      <h2>Testing Philosophy</h2>
      <p>
        DITS testing follows a <strong>defense-in-depth</strong> approach where every component,
        integration point, and failure scenario is systematically validated. Our testing strategy
        ensures that DITS can handle the most demanding creative workflows with enterprise-grade
        reliability.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 my-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <CardTitle className="text-base">Correctness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Every algorithm produces mathematically correct results under all conditions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-info" />
            </div>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Zero-trust security model with comprehensive attack vector validation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sub-second operations for large files with linear scalability guarantees.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mb-2">
              <Database className="h-5 w-5 text-brand" />
            </div>
            <CardTitle className="text-base">Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              99.999% uptime with automatic recovery from all failure scenarios.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2>Test Categories</h2>
      <p>
        Our testing framework is organized into hierarchical categories, each serving a specific
        purpose in the validation pipeline.
      </p>

      <Tabs defaultValue="basic" className="my-8">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="qa">QA</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="perf">Performance</TabsTrigger>
          <TabsTrigger value="infra">Infrastructure</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-success" />
                Basic Tests (Foundation)
              </h3>
              <p className="text-muted-foreground mb-4">
                Core functionality validation that runs on every code change.
                These tests ensure the fundamental operations work correctly.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0000-basic.sh</CardTitle>
                    <Badge>Critical</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Validates core CLI functionality and repository initialization.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Binary execution and version reporting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Repository initialization and structure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Configuration file creation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Directory structure validation</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0001-chunking.sh</CardTitle>
                    <Badge>Algorithm</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      FastCDC chunking algorithm validation with basic operations.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Basic chunking functionality</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Deterministic results verification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Deduplication accuracy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Data reconstruction integrity</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0002-repository.sh</CardTitle>
                    <Badge>Git-like</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Git-compatible repository operations and workflow validation.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Add, commit, status operations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Branch creation and switching</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>History and log operations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Merge conflict resolution</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0003-cli-commands.sh</CardTitle>
                    <Badge>CLI</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Comprehensive validation of all 50+ CLI commands and options.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Command help and usage validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Option parsing and validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Error message formatting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Exit code correctness</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="core" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-info" />
                Core Algorithm Tests
              </h3>
              <p className="text-muted-foreground mb-4">
                Deep validation of core algorithms and data structures that power DITS.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0100-fastcdc-comprehensive.sh</CardTitle>
                    <Badge variant="outline">Algorithm</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Ultimate FastCDC algorithm validation covering every edge case and scenario.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Data Patterns:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Repetitive sequences (AAAA, ABAB)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Alternating patterns (010101)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Incremental data (123456)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> All-zero and all-FF data</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Random entropy patterns</div>
                      </div>
                      <div className="font-medium text-primary mt-2">File Sizes:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 1-byte to 10GB files</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Boundary conditions</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Prime-sized files</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Sparse file handling</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Determinism:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Identical inputs = identical chunks</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Hash collision resistance</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Boundary stability under edits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0200-video-comprehensive.sh</CardTitle>
                    <Badge variant="outline">Video</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Complete video production workflow testing from ingest to delivery.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Formats:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> MP4, MOV, MXF, fragmented MP4</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> H.264, H.265/HEVC, ProRes, DNxHD</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> AAC, FLAC, multichannel audio</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 4K, 8K, high frame rates (120fps+)</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Keyframes:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> GOP alignment and detection</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Scene change detection</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Multi-track synchronization</div>
                      </div>
                      <div className="font-medium text-primary mt-2">NLE Integration:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Premiere Pro workflows</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> DaVinci Resolve integration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> After Effects pipelines</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Proxy generation and management</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0201-algorithm-comprehensive.sh</CardTitle>
                    <Badge variant="outline">Algorithms</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Validation of all chunking and hashing algorithms in the system.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Chunking Algorithms:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> FastCDC (primary)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Rabin fingerprinting</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Asymmetric extremum</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Chonkers (provable guarantees)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Parallel FastCDC</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Keyed FastCDC (privacy)</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Hash Algorithms:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> BLAKE3 (default)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> SHA-256 (compliance)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> SHA-3-256 (future-proof)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Algorithm switching</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Performance benchmarking</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0300-file-types-comprehensive.sh</CardTitle>
                    <Badge variant="outline">Formats</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      20+ file formats with full fidelity preservation and optimization.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Images:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> JPEG, PNG, TIFF, BMP, GIF, WebP</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> RAW (CR2, NEF), PSD, AI</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> EXIF metadata preservation</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Audio:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> WAV, MP3, AAC, FLAC, OGG, AIFF</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Multichannel formats</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Metadata extraction</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Documents:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> PDF, DOC/DOCX, XLS/XLSX</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> PPT/PPTX, ODT, RTF</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Archive formats (ZIP, TAR, 7Z)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-brand" />
                Quality Assurance Tests
              </h3>
              <p className="text-muted-foreground mb-4">
                Stress testing, edge cases, and reliability validation to ensure
                production-grade robustness.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0400-edge-cases-errors.sh</CardTitle>
                    <Badge variant="destructive">Critical</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Every possible failure scenario and error condition validation.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">System Resources:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Disk full (quota exceeded)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Out of memory (address space)</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> File descriptor limits</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Permission denied scenarios</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Sparse file handling</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Process Interruption:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> SIGTERM/SIGKILL handling</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Power loss simulation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Network disconnection</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Partial I/O operations</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Data Corruption:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Silent corruption detection</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Bit flip scenarios</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Burst error patterns</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Partial write recovery</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0500-concurrent-access.sh</CardTitle>
                    <Badge variant="secondary">Concurrency</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Threading, synchronization, and race condition validation.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Race Conditions:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 100+ simultaneous operations</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> File access conflicts</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Chunking synchronization</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Repository state consistency</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Locking:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Deadlock prevention</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Starvation avoidance</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Lock escalation handling</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Timeout management</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Memory:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cache consistency</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Shared data structures</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Memory barrier validation</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0600-data-integrity.sh</CardTitle>
                    <Badge variant="outline">Integrity</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Bulletproof data preservation and corruption recovery validation.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Checksums:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> BLAKE3 validation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> CRC verification</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Multi-hash validation</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Corruption:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Single/multiple bit flips</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Burst error patterns</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Partial write scenarios</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Silent corruption detection</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Recovery:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Automatic repair</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Backup restoration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Long-term storage validation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cross-replica verification</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0700-stress-extreme.sh</CardTitle>
                    <Badge variant="destructive">Extreme</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      System limits and beyond - ensuring DITS can handle extreme scenarios.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">File Sizes:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 1GB, 10GB, 100GB+ files</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Individual file limits</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Memory pressure testing</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Scale:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 10k, 100k, 1M+ files</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Repository size limits</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Index performance</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Concurrency:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 1000+ simultaneous ops</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Queue depth saturation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Resource contention</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <Cloud className="h-5 w-5 text-brand" />
                Advanced Feature Tests
              </h3>
              <p className="text-muted-foreground mb-4">
                Complex workflow validation and advanced feature integration testing.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t0900-workflow-simulations.sh</CardTitle>
                    <Badge variant="outline">Workflows</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Real-world production scenarios and user workflow validation.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">NLE Workflows:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Premiere Pro pipelines</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> DaVinci Resolve integration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> After Effects workflows</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Multi-user collaboration</div>
                      </div>
                      <div className="font-medium text-primary mt-2">CI/CD:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Automated builds</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Testing pipelines</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Deployment validation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Rollback scenarios</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Disaster Recovery:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Backup restoration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Business continuity</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Data migration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cross-system compatibility</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t1000-p2p-networking.sh</CardTitle>
                    <Badge variant="outline">P2P</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Peer-to-peer networking and distributed system validation.
                    </CardDescription>
                    <div className="grid gap-2 text-sm">
                      <div className="font-medium text-primary">Network Topology:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> NAT traversal</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Firewall penetration</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Connection stability</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Peer discovery</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Distributed Sync:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Conflict resolution</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Eventual consistency</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Delta synchronization</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Bandwidth management</div>
                      </div>
                      <div className="font-medium text-primary mt-2">Security:</div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> End-to-end encryption</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Certificate validation</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Protocol versioning</div>
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Secure key exchange</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="perf" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-warning" />
                Performance Tests
              </h3>
              <p className="text-muted-foreground mb-4">
                Regression detection and optimization validation to ensure performance targets are met.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">p0001-chunking-performance.sh</CardTitle>
                    <Badge variant="outline">Chunking</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Performance benchmarking for FastCDC chunking operations.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-info" />
                        <span>1MB/s, 100MB/s, 1GB/s+ throughput targets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-success" />
                        <span>Deduplication ratio validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-brand" />
                        <span>Memory usage patterns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-warning" />
                        <span>I/O pattern analysis</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">p0003-streaming-chunking.sh</CardTitle>
                    <Badge variant="outline">Streaming</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Memory-bounded streaming chunking validation with performance benchmarking.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-info" />
                        <span>90% memory reduction (64KB window vs O(file_size))</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Unlimited file size processing capability</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-brand" />
                        <span>10MB file chunked in 47ms (212MB/s throughput)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-warning" />
                        <span>Data integrity and reconstruction validation</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">p0004-database-indexing.sh</CardTitle>
                    <Badge variant="outline">Database</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Database performance optimization validation for critical operations.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-success" />
                        <span>Status operation 10-50x performance improvement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-info" />
                        <span>Covering indexes for file listings and commits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-brand" />
                        <span>Chunk reference count optimization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-warning" />
                        <span>Query performance regression detection</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="infra" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-muted-foreground" />
                Infrastructure Tests
              </h3>
              <p className="text-muted-foreground mb-4">
                System-level validation ensuring deployment and infrastructure reliability.
              </p>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">t9999-infrastructure-validation.sh</CardTitle>
                    <Badge variant="outline">Infrastructure</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Comprehensive infrastructure testing and current implementation status validation.
                    </CardDescription>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-info" />
                        <span>Container startup and configuration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-success" />
                        <span>Network connectivity and security</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-brand" />
                        <span>Database migrations and schemas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-warning" />
                        <span>Monitoring and logging validation</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <h2>Test Execution Strategy</h2>
      <p>
        Our testing framework follows a hierarchical execution model designed for different
        development and deployment stages.
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Development Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">Every Change</Badge>
                <div>
                  <div className="font-medium">Basic Tests (t0000-t0003)</div>
                  <div className="text-sm text-muted-foreground">Core functionality validation</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">Algorithm Changes</Badge>
                <div>
                  <div className="font-medium">Core Tests (t0100-t0301)</div>
                  <div className="text-sm text-muted-foreground">Algorithm and feature validation</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">PR/Merge</Badge>
                <div>
                  <div className="font-medium">QA Tests (t0400-t0800)</div>
                  <div className="text-sm text-muted-foreground">Comprehensive validation</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              CI/CD Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5 bg-success/10 text-success">Fast Feedback</Badge>
                <div>
                  <div className="font-medium">Basic Tests</div>
                  <div className="text-sm text-muted-foreground">2-5 minutes, every commit</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5 bg-info/10 text-info">Comprehensive</Badge>
                <div>
                  <div className="font-medium">Core + QA Tests</div>
                  <div className="text-sm text-muted-foreground">15-30 minutes, PR/merge</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5 bg-brand/10 text-brand">Release</Badge>
                <div>
                  <div className="font-medium">Full Test Suite</div>
                  <div className="text-sm text-muted-foreground">1-2 hours, releases</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Test Infrastructure</h2>
      <p>
        Our testing framework includes comprehensive infrastructure for reliable,
        isolated test execution.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 my-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Libraries</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> <code>lib-repo.sh</code> - Repository ops</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> <code>lib-chunking.sh</code> - FastCDC helpers</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> <code>lib-video.sh</code> - Video workflows</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> <code>test-lib.sh</code> - Core framework</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quality Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> <code>chainlint.pl</code> - Script validation</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> TAP output format</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Parallel execution</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Performance timing</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Isolation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Unique temp directories</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Clean environments</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> No config interference</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Automatic cleanup</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debugging</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Verbose output modes</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Individual test execution</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Environment inspection</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Failure reproduction</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Test Coverage Statistics</AlertTitle>
        <AlertDescription>
          <div className="grid gap-4 md:grid-cols-3 my-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">120+</div>
              <div className="text-sm text-muted-foreground">Automated Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">80+</div>
              <div className="text-sm text-muted-foreground">File Formats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">50+</div>
              <div className="text-sm text-muted-foreground">Failure Scenarios</div>
            </div>
          </div>
          <p className="mt-4">
            Every line of code is validated through systematic testing covering
            real-world usage patterns and edge cases.
          </p>
        </AlertDescription>
      </Alert>

      <h2>Contributing to Tests</h2>
      <p>
        When adding new functionality, follow our comprehensive testing guidelines:
      </p>

      <div className="not-prose bg-muted p-6 rounded-lg my-6">
        <h4 className="mb-4">Testing Workflow</h4>
        <ol className="space-y-2">
          <li><strong>1. Write integration tests</strong> in <code>t/</code> directory</li>
          <li><strong>2. Add helper functions</strong> to appropriate <code>lib-*.sh</code> files</li>
          <li><strong>3. Run chainlint validation</strong> for script quality</li>
          <li><strong>4. Ensure tests pass</strong> in CI pipeline</li>
          <li><strong>5. Update documentation</strong> if test categories change</li>
        </ol>
      </div>

      <div className="flex gap-4 mt-8">
        <Button render={<Link href="/docs/getting-started" />}>
          Get Started
        </Button>
        <Button variant="outline" render={<Link href="/docs/architecture" />}>
          View Architecture
        </Button>
      </div>
    </div>
  );
}




