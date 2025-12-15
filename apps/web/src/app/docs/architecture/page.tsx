import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Layers, GitBranch, Globe } from "lucide-react";
import { ArchitectureDiagram } from "@/components/diagrams/architecture-diagram";
import { FileClassifierDiagram, FileClassifierCompact } from "@/components/diagrams/file-classifier-diagram";
import { DataFlowDiagram } from "@/components/diagrams/data-flow-diagram";
import { ChunkingPipelineDiagram } from "@/components/diagrams/chunking-pipeline-diagram";

import { generateMetadata as genMeta, generateArticleSchema, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
  title: "Architecture Overview - Dits Version Control System Architecture",
  description: "Understand the architecture of Dits version control system. Learn about the layered system design, core engine, transport layer, content addressing, and client interfaces.",
  canonical: "https://dits.dev/docs/architecture",
  keywords: [
    "dits architecture",
    "version control architecture",
    "content addressing architecture",
    "dits design",
    "system architecture",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Dits Architecture Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function ArchitecturePage() {
  const articleSchema = generateArticleSchema({
    headline: "Architecture Overview - Dits Version Control System Architecture",
    description: "Understand the architecture of Dits version control system. Learn about the layered system design, core engine, transport layer, content addressing, and client interfaces.",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: "Byron Wade",
    section: "Documentation",
    tags: ["architecture", "design", "system architecture", "technical"],
  });

  const collectionSchema = generateCollectionPageSchema({
    name: "Dits Architecture Documentation",
    description: "Collection of architecture documentation covering algorithms, data structures, internals, protocol, and security",
    url: "/docs/architecture",
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Documentation", url: "/docs" },
      { name: "Architecture", url: "/docs/architecture" },
    ],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "Architecture", url: "/docs/architecture" },
  ]);

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
      <h1>Architecture Overview</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits is built as a layered system with a core engine handling content
        management, transport layer for network operations, and client interfaces
        for different use cases.
      </p>

      <h2>High-Level Architecture</h2>
      <ArchitectureDiagram />

      <h2>Hybrid Storage System</h2>
      <p>
        Dits uses a <strong>hybrid storage model</strong> that intelligently routes files
        to the appropriate storage engine based on their type:
      </p>
      <FileClassifierDiagram />

      <h2>Core Components</h2>
      <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Content Store</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              The content-addressable storage layer handles chunking, hashing,
              deduplication, and compression of all repository data.
            </CardDescription>
            <Link href="/docs/architecture/data-structures" className="text-sm text-primary hover:underline mt-2 block">
              Learn about data structures →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Object Model</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Commits, trees, assets, and chunks form a directed acyclic graph
              (DAG) that represents repository history.
            </CardDescription>
            <Link href="/docs/architecture/data-structures" className="text-sm text-primary hover:underline mt-2 block">
              Learn about objects →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Reference System</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Branches, tags, and HEAD provide named pointers into the commit
              graph, enabling version navigation.
            </CardDescription>
            <Link href="/docs/concepts/branching" className="text-sm text-primary hover:underline mt-2 block">
              Learn about branches →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Transport Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              QUIC-based protocol for efficient chunk transfer with delta
              synchronization and resumable uploads.
            </CardDescription>
            <Link href="/docs/architecture/protocol" className="text-sm text-primary hover:underline mt-2 block">
              Learn about protocol →
            </Link>
          </CardContent>
        </Card>
      </div>

      <h2>The Chunking Pipeline</h2>
      <p>
        Binary and media files pass through Dits&apos; content-defined chunking pipeline
        for efficient storage and deduplication:
      </p>
      <ChunkingPipelineDiagram />

      <h2>Design Principles</h2>

      <h3>Content-Addressable Storage</h3>
      <p>
        All data in Dits is identified by its cryptographic hash (BLAKE3). This
        provides:
      </p>
      <ul>
        <li><strong>Automatic deduplication:</strong> Identical content is stored once</li>
        <li><strong>Data integrity:</strong> Corruption is immediately detectable</li>
        <li><strong>Immutability:</strong> Content cannot be changed without changing its address</li>
        <li><strong>Parallel verification:</strong> Multiple sources can be verified independently</li>
      </ul>

      <h3>Format-Aware Processing</h3>
      <p>
        Unlike generic version control, Dits understands the structure of media files:
      </p>
      <ul>
        <li><strong>Container parsing:</strong> MP4/MOV atoms are preserved intact</li>
        <li><strong>Keyframe alignment:</strong> Chunks align to video I-frames</li>
        <li><strong>Metadata extraction:</strong> Duration, codec, resolution indexed</li>
        <li><strong>Temporal awareness:</strong> Changes tracked by timecode, not just bytes</li>
      </ul>

      <h3>Efficient Synchronization</h3>
      <p>
        The transport layer minimizes data transfer:
      </p>
      <ul>
        <li><strong>Delta sync:</strong> Only missing chunks are transferred</li>
        <li><strong>Parallel streams:</strong> Multiple chunks transfer simultaneously</li>
        <li><strong>Resumable:</strong> Interrupted transfers continue where they stopped</li>
        <li><strong>Bandwidth adaptive:</strong> Adjusts to network conditions</li>
      </ul>

      <h2>Crate Structure</h2>
      <p>
        Dits is organized into several Rust crates:
      </p>

      <div className="not-prose my-6 overflow-x-auto">
        <div className="inline-block min-w-full rounded-lg border bg-card">
          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-muted px-4 py-2 font-semibold text-sm">Crate</div>
            <div className="bg-muted px-4 py-2 font-semibold text-sm">Purpose</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-core/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">Chunking, hashing, manifests, object model</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-parsers/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">ISOBMFF, NLE project file parsing</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-storage/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">Local and remote storage backends</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-protocol/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">Wire protocol, serialization</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-client/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">CLI implementation</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-server/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">REST API and QUIC server</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-vfs/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">FUSE virtual filesystem</div>

            <div className="bg-card px-4 py-2 font-mono text-sm">dits-sdk/</div>
            <div className="bg-card px-4 py-2 text-sm text-muted-foreground">Public Rust SDK</div>
          </div>
        </div>
      </div>

      <h2>Data Flow</h2>

      <h3>Adding a File</h3>
      <DataFlowDiagram variant="add" />

      <h3>Pushing Changes</h3>
      <DataFlowDiagram variant="push" />

      <h3>Cloning a Repository</h3>
      <DataFlowDiagram variant="clone" />

      <h2>Security Model</h2>
      <ul>
        <li>
          <strong>Authentication:</strong> JWT tokens with refresh, MFA support
        </li>
        <li>
          <strong>Authorization:</strong> Repository-level permissions (admin, write, read)
        </li>
        <li>
          <strong>Encryption at rest:</strong> Optional AES-256-GCM chunk encryption
        </li>
        <li>
          <strong>Encryption in transit:</strong> TLS 1.3 for all connections
        </li>
        <li>
          <strong>Integrity:</strong> All content verified by BLAKE3 hash
        </li>
      </ul>

      <h2>Detailed Documentation</h2>
      <ul>
        <li>
          <Link href="/docs/architecture/data-structures">Data Structures</Link> -
          Chunks, assets, commits, and manifests
        </li>
        <li>
          <Link href="/docs/architecture/algorithms">Algorithms</Link> -
          FastCDC, BLAKE3, keyframe alignment
        </li>
        <li>
          <Link href="/docs/architecture/protocol">Network Protocol</Link> -
          QUIC transport, delta sync, API
        </li>
        <li>
          <Link href="/docs/architecture/security">Security</Link> -
          Authentication, encryption, and access control
        </li>
      </ul>
    </div>
    </>
  );
}
