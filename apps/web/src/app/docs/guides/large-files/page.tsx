import { Metadata } from "next";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/ui/code-block";
import { Video, Image, FileArchive, Zap, HardDrive, Settings, Check, X } from "lucide-react";

import { generateMetadata as genMeta, generateArticleSchema, generateHowToSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
    title: "Large Files Guide - Best Practices for Managing Video, Images & Binary Assets",
    description: "Best practices for managing large files with Dits. Learn how to efficiently handle video, images, 3D models, and other binary assets to maximize storage efficiency and performance.",
    canonical: "https://dits.dev/docs/guides/large-files",
    keywords: [
        "large files",
        "video files",
        "binary assets",
        "file management",
        "storage optimization",
        "large file version control",
    ],
    openGraph: {
        type: "article",
        images: [
            {
                url: "/dits.png",
                width: 1200,
                height: 630,
                alt: "Large Files Guide",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
    },
});

export default function LargeFilesPage() {
    const articleSchema = generateArticleSchema({
        headline: "Large Files Guide - Best Practices for Managing Video, Images & Binary Assets",
        description: "Best practices for managing large files with Dits. Learn how to efficiently handle video, images, 3D models, and other binary assets.",
        datePublished: "2024-01-01",
        dateModified: new Date().toISOString().split("T")[0],
        author: "Byron Wade",
        section: "Documentation",
        tags: ["large files", "video", "binary assets", "best practices"],
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Documentation", url: "/docs" },
        { name: "Guides", url: "/docs/guides" },
        { name: "Large Files", url: "/docs/guides/large-files" },
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
            <h1>Working with Large Files</h1>
            <p className="lead text-xl text-muted-foreground">
                Dits is designed for large files. Learn best practices for video, images,
                3D models, and other binary assets to maximize storage efficiency and performance.
            </p>

            <Alert className="not-prose my-6">
                <Zap className="h-4 w-4" />
                <AlertTitle>No Special Configuration Needed</AlertTitle>
                <AlertDescription>
                    Unlike Git LFS, Dits handles large files natively. Just add and commit
                    files normally - Dits automatically chunks and deduplicates them.
                </AlertDescription>
            </Alert>

            <h2>File Types</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-red-500" />
                            Video
                        </CardTitle>
                        <CardDescription>
                            .mov, .mp4, .avi, .mxf, .r3d
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>GOP-aligned chunking</li>
                            <li>Frame-level dedup</li>
                            <li>Streaming playback</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Image className="h-5 w-5 text-green-500" />
                            Images
                        </CardTitle>
                        <CardDescription>
                            .psd, .tiff, .raw, .exr, .dpx
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Layer-aware chunking</li>
                            <li>Proxy generation</li>
                            <li>Metadata preservation</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileArchive className="h-5 w-5 text-blue-500" />
                            3D/Game
                        </CardTitle>
                        <CardDescription>
                            .fbx, .uasset, .blend, .unity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Binary-aware chunking</li>
                            <li>Mesh deduplication</li>
                            <li>Texture reuse</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Chunking Configuration</h2>

            <p>
                Dits automatically selects optimal chunk sizes, but you can tune for your
                specific content:
            </p>

            <CodeBlock
                language="toml"
                code={`# dits.toml - per-repository settings

[chunking]
# Default settings for most files
algorithm = "fastcdc"
min_size = "16KB"
avg_size = "64KB"
max_size = "256KB"

# Override for specific file types
[chunking.video]
patterns = ["*.mov", "*.mp4", "*.mxf"]
min_size = "256KB"
avg_size = "1MB"
max_size = "4MB"

[chunking.images]
patterns = ["*.psd", "*.tiff", "*.exr"]
min_size = "64KB"
avg_size = "256KB"
max_size = "1MB"`}
            />

            <h2>Workflow: Video Production</h2>

            <CodeBlock
                language="bash"
                code={`# Initial setup
$ dits init
$ dits add footage/*.mov
$ dits commit -m "Add raw footage"

# Dits shows efficient storage
$ dits status
Repository size: 45.2 GB
Unique chunks: 234,567
Deduplication ratio: 23.4%

# Generate proxies for editing
$ dits proxy create footage/*.mov --profile preview
Creating proxies...
  footage/scene01.mov -> proxies/scene01_preview.mov (1080p, H.264)
  footage/scene02.mov -> proxies/scene02_preview.mov
Done. Saved 42.1 GB in proxy storage.

# Commit proxies
$ dits add proxies/
$ dits commit -m "Add preview proxies"

# Team member clones (fast!)
$ dits clone --filter blob:none https://server/project
# Only metadata downloaded - instant

# Mount for instant access
$ dits mount /mnt/project
# All files appear, stream on demand`}
            />

            <h2>Workflow: Game Development</h2>

            <CodeBlock
                language="bash"
                code={`# Track only source assets, ignore builds
$ cat .ditsignore
Build/
Library/
Temp/
*.exe

# Add source assets
$ dits add Assets/
$ dits commit -m "Add game assets"

# Check texture reuse
$ dits dedup-stats Assets/Textures/
Analyzed 456 textures:
  Total size: 12.3 GB
  Unique data: 8.7 GB (29.3% savings)
  Shared chunks: 1,234
  Identical files: 12

# Find duplicate textures
$ dits find-duplicates Assets/
Exact duplicates:
  grass_01.png = grass_old.png (23 MB)
  rock_normal.png = stone_normal.png (45 MB)

Similar textures (>90% match):
  wood_01.png ~ wood_02.png (87% similar)`}
            />

            <h2>Sparse Checkout</h2>

            <p>Work with just the files you need:</p>

            <CodeBlock
                language="bash"
                code={`# Clone metadata only
$ dits clone --filter blob:none https://server/huge-project
Cloning into 'huge-project'...
Receiving metadata... done.
Repository size: 2.3 TB (available on demand)

# Enable sparse checkout
$ cd huge-project
$ dits sparse-checkout init --cone

# Choose what to download
$ dits sparse-checkout set \\
    scripts/ \\
    assets/textures/characters/ \\
    assets/models/characters/

# Check what's downloaded
$ dits sparse-checkout list
scripts/
assets/textures/characters/
assets/models/characters/

# Rest of files are placeholders
$ ls assets/environments/
# Shows files but they're not downloaded yet

# Access downloads on demand
$ cat assets/environments/level1/readme.txt
# File content streams automatically`}
            />

            <h2>VFS Mount</h2>

            <p>The most seamless way to work with large repos:</p>

            <CodeBlock
                language="bash"
                code={`# Mount repository as virtual drive
$ dits mount /mnt/project

# Files appear instantly
$ ls /mnt/project
assets/  footage/  project.prproj  README.md

# Open in your NLE - files stream on demand
$ open /mnt/project/project.prproj

# Check what's cached locally
$ dits cache-stats
Cache: 12.5 GB / 50 GB
Hot files: project.prproj, footage/scene01.mov
Hit rate: 94.2%

# Prefetch for offline work
$ dits prefetch footage/scene01.mov footage/scene02.mov
Prefetching 2 files (4.5 GB)...
Done.`}
            />

            <h2>Storage Optimization</h2>

            <div className="grid gap-4 md:grid-cols-2 my-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            Local Storage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CodeBlock
                            language="bash"
                            code={`# Clean up unused chunks
dits gc

# Aggressive cleanup
dits gc --aggressive

# Show what would be removed
dits gc --dry-run`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Remote Storage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CodeBlock
                            language="bash"
                            code={`# Move cold data to archive tier
dits storage tier \\
  --path footage/2022/ \\
  --tier archive

# Check storage distribution
dits storage stats`}
                        />
                    </CardContent>
                </Card>
            </div>

            <h2>Best Practices</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Do&apos;s</h3>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Use proxies for daily editing, full-res for final delivery</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Organize assets by project/version for better chunking</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Use sparse checkout for partial access to huge repos</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Mount with VFS for streaming access</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Run <code>dits gc</code> periodically to clean up</li>
                </ul>

                <h3 className="font-semibold mt-6 mb-4">Don&apos;ts</h3>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Don&apos;t store generated/rendered files (add to .ditsignore)</li>
                    <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Don&apos;t commit the same file with different names</li>
                    <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Don&apos;t recompress videos before committing</li>
                    <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Don&apos;t forget to push proxies for team access</li>
                </ul>
            </div>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/advanced/video">Video Features</Link> - Video-specific features</li>
                <li><Link href="/docs/advanced/proxies">Proxy Files</Link> - Low-res previews</li>
                <li><Link href="/docs/cli/vfs">VFS Commands</Link> - Virtual filesystem</li>
                <li><Link href="/docs/advanced/storage-tiers">Storage Tiers</Link> - Hot/cold storage</li>
            </ul>
        </div>
        </>
    );
}
