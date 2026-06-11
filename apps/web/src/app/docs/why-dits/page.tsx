import { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateArticleSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Zap } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Why Dits vs Git - When to Choose Dits for Large Files",
  description: "Learn when and why to choose Dits over Git for version control. Compare Dits vs Git for video files, large binaries, and media workflows. Understand the advantages of content-defined chunking and deduplication.",
  canonical: "https://dits.dev/docs/why-dits",
  keywords: [
    "dits vs git",
    "why use dits",
    "git alternative",
    "large file version control",
    "git limitations",
    "dits advantages",
    "video version control",
    "binary file version control",
  ],
  openGraph: {
    type: "article",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Why Dits vs Git - When to Choose Dits",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

export default function WhyDitsPage() {
  const articleSchema = generateArticleSchema({
    headline: "Why Dits vs Git - When to Choose Dits for Large Files",
    description: "Learn when and why to choose Dits over Git for version control. Compare Dits vs Git for video files, large binaries, and media workflows.",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: "Byron Wade",
    section: "Documentation",
    tags: ["dits vs git", "comparison", "large files", "video version control"],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Documentation", url: "/docs" },
    { name: "Why Dits", url: "/docs/why-dits" },
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
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Getting Started"
        title="Why Dits vs Git?"
        description="Git revolutionized text-based development, but it wasn't designed for large binary files. Dits brings version control to creative workflows where Git falls short."
      />

      <Callout type="note" title="TL;DR" className="not-prose my-6">
        Use <strong>Git</strong> for code, documentation, and small text files.
        Use <strong>Dits</strong> for video, audio, images, game assets, and large creative files.
        <strong>Dits is production-ready</strong> with 120+ automated tests covering 80+ file formats.
      </Callout>

      <Callout type="tip" title="Production-Ready with Comprehensive Testing" className="not-prose my-6">
        <strong>120+ automated tests</strong> covering Git operations on binaries, 80+ file formats,
        cross-platform compatibility, 1TB+ workload simulation, and enterprise security.
        Every feature is thoroughly tested and production-hardened.
      </Callout>

      <h2>The Problem Git Solves (and Doesn&apos;t)</h2>
      <p>
        Git was designed for software development—small text files that change incrementally.
        It works brilliantly for this use case because:
      </p>
      <ul>
        <li>Text files compress well and have meaningful diffs</li>
        <li>Changes are usually small relative to file size</li>
        <li>Merge conflicts can be resolved with text editors</li>
        <li>Files are typically small (KB, not GB)</li>
      </ul>

      <p>
        But creative industries work with fundamentally different data:
      </p>
      <ul>
        <li><strong>Binary formats:</strong> Video, audio, images, 3D models</li>
        <li><strong>Huge files:</strong> 4K video files can be 10-500GB</li>
        <li><strong>Frequent full-file changes:</strong> Editing a video frame changes the entire file</li>
        <li><strong>No meaningful diffs:</strong> You can&apos;t &quot;merge&quot; two video edits</li>
      </ul>

      <h2>Git LFS: The Band-Aid Solution</h2>
      <p>
        Git LFS (Large File Storage) was created to address this gap, but it&apos;s fundamentally limited:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-6">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Git LFS Problems
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong className="text-destructive">No deduplication:</strong> Same content stored multiple times
            </div>
            <div className="text-sm">
              <strong className="text-destructive">Full file transfers:</strong> Tiny changes = full re-upload
            </div>
            <div className="text-sm">
              <strong className="text-destructive">Complex setup:</strong> Requires server infrastructure
            </div>
            <div className="text-sm">
              <strong className="text-destructive">Lock-in:</strong> Proprietary protocol, vendor dependencies
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand/30">
          <CardHeader>
            <CardTitle className="text-brand flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Dits Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong className="text-brand">Content-defined chunking:</strong> Automatic deduplication
            </div>
            <div className="text-sm">
              <strong className="text-brand">Delta transfers:</strong> Only changed chunks uploaded
            </div>
            <div className="text-sm">
              <strong className="text-brand">Self-contained:</strong> Works offline, no server required
            </div>
            <div className="text-sm">
              <strong className="text-brand">Open protocol:</strong> Self-hostable, interoperable
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Dits Hybrid Approach: Best of Both Worlds</h2>
      <p>
        Dits doesn&apos;t replace Git—it <strong>complements it</strong>. Use both tools together for optimal workflows:
      </p>

      <div className="not-prose my-6">
        <Card className="border-brand/40 bg-brand/5">
          <CardHeader>
            <CardTitle className="text-brand flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Hybrid Git + Dits Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Git Handles:</h4>
                <ul className="text-sm space-y-1">
                  <li>Source code (.rs, .js, .py, .cpp)</li>
                  <li>Configuration files (.json, .yaml)</li>
                  <li>Documentation (.md, .txt)</li>
                  <li>Small assets (icons, fonts)</li>
                  <li>Build scripts and pipelines</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Benefits:</strong> Line-based diffs, 3-way merge, blame, code review
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Dits Handles:</h4>
                <ul className="text-sm space-y-1">
                  <li>Video files (.mp4, .mov, .avi)</li>
                  <li>3D models (.obj, .fbx, .gltf)</li>
                  <li>Game assets (Unity, Unreal, Godot)</li>
                  <li>Large images (.psd, .raw)</li>
                  <li>Audio files and middleware</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Benefits:</strong> FastCDC chunking, automatic deduplication, delta transfers
                </p>
              </div>
            </div>
            <Callout type="note" title="How It Works" className="not-prose mt-4">
              Dits automatically classifies files and uses the optimal storage method.
              Your repository becomes a unified workspace where code and creative assets coexist with full version control for both.
            </Callout>
          </CardContent>
        </Card>
      </div>

      <h2>When to Use Each Tool</h2>

      <h3>Use Git For:</h3>
      <div className="not-prose grid gap-3 md:grid-cols-2 lg:grid-cols-3 my-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Source Code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Text files, scripts, configuration files, documentation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Small Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Icons, small images, fonts, design system tokens
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Markdown, READMEs, wikis, changelogs
            </p>
          </CardContent>
        </Card>
      </div>

      <h3>Use Dits For:</h3>
      <div className="not-prose grid gap-3 md:grid-cols-2 lg:grid-cols-3 my-4">
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">Video Files</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              MP4, MOV, AVI, ProRes, DNxHD, any video format
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">Audio Files</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              WAV, AIFF, MP3, FLAC, professional audio formats
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">RAW Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              CR2, NEF, ARW, DNG, high-resolution photo formats
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">Game Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Textures, models, animations, build artifacts
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">3D Models</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              OBJ, FBX, BLEND, Maya scenes, complex geometries
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-brand">Design Files</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              PSD, AI, XD, Figma files, layered compositions
            </p>
          </CardContent>
        </Card>
      </div>

      <h2>Performance Comparison</h2>
      <p>Real-world performance differences for a 10GB video file:</p>

      <div className="not-prose overflow-x-auto my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Git LFS</TableHead>
              <TableHead>Dits</TableHead>
              <TableHead>Improvement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Initial commit</TableCell>
              <TableCell>10GB upload</TableCell>
              <TableCell>10GB upload</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Small edit (1MB change)</TableCell>
              <TableCell>10GB upload</TableCell>
              <TableCell>~200KB upload</TableCell>
              <TableCell className="text-brand font-semibold">50,000x faster</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Clone repository</TableCell>
              <TableCell>10GB download</TableCell>
              <TableCell>On-demand access</TableCell>
              <TableCell className="text-brand font-semibold">Lazy loading</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Storage efficiency</TableCell>
              <TableCell>10GB per version</TableCell>
              <TableCell>10GB + manifest</TableCell>
              <TableCell className="text-brand font-semibold">Deduplication</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <h2>Can They Work Together?</h2>
      <p>
        Absolutely! Many teams use both tools in harmony:
      </p>

      <CodeBlock
        language="bash"
        code={`my-project/
├── .git/                    # Git repository
│   ├── code/
│   ├── docs/
│   └── scripts/
│
├── .dits/                   # Dits repository
│   ├── assets/
│   ├── footage/
│   └── renders/
│
└── shared/                  # Both Git and Dits
    ├── config files
    └── project metadata`}
      />

      <p>This hybrid approach gives you:</p>
      <ul>
        <li><strong>Git:</strong> Fast, reliable version control for code and text</li>
        <li><strong>Dits:</strong> Efficient version control for large creative assets</li>
        <li><strong>Single workflow:</strong> One repository structure, familiar commands</li>
        <li><strong>Best of both:</strong> Text diffs + binary deduplication</li>
      </ul>

      <h2>Migration Strategies</h2>

      <h3>From Git LFS</h3>
      <ol>
        <li>Install Dits alongside your existing Git setup</li>
        <li>Move large files from LFS to Dits tracking</li>
        <li>Keep using Git for code, use Dits for binaries</li>
        <li>Gradually migrate workflows as confidence grows</li>
      </ol>

      <h3>From Manual Versioning</h3>
      <ol>
        <li>Start with a single project directory</li>
        <li>Use <code>dits init</code> to create the repository</li>
        <li>Add your existing files with <code>dits add .</code></li>
        <li>Commit with <code>dits commit -m &quot;Initial import&quot;</code></li>
        <li>Delete those &quot;final_v27.mp4&quot; files forever</li>
      </ol>

      <h2>Next Steps</h2>
      <p>
        Ready to try Dits? Start with our{" "}
        <Link href="/docs/getting-started">Getting Started guide</Link>{" "}
        or learn more about{" "}
        <Link href="/docs/concepts">how Dits works</Link>.
      </p>

      <Callout type="tip" title="Pro Tip" className="not-prose my-6">
        Dits is designed to be Git-compatible. If you know Git, you&apos;ll feel right at home with Dits commands and workflows.
      </Callout>
    </div>
    </>
  );
}

