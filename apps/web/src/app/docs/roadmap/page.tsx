import { Metadata } from "next";
import { type ReactNode } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    Clock,
    Circle,
    AlertTriangle,
    FlaskConical,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Roadmap",
    description:
        "What works in Dits today and what is still roadmap, audited honestly and organized by importance.",
};

type State = "works" | "partial" | "experimental" | "roadmap" | "not-started";

const stateMeta: Record<
    State,
    { label: string; badge: "default" | "secondary" | "outline" | "destructive" }
> = {
    works: { label: "Works today", badge: "secondary" },
    partial: { label: "Partial", badge: "outline" },
    experimental: { label: "Experimental", badge: "outline" },
    roadmap: { label: "Roadmap", badge: "destructive" },
    "not-started": { label: "Not started", badge: "destructive" },
};

function Item({
    title,
    state,
    children,
}: {
    title: string;
    state: State;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold m-0 text-base">{title}</h3>
                    <Badge variant={stateMeta[state].badge}>{stateMeta[state].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground m-0">{children}</p>
            </div>
        </div>
    );
}

export default function RoadmapPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <DocPageHeader
                eyebrow="Project"
                title="Roadmap"
                description="An honest, importance-ordered audit of what Dits does today and what is still unbuilt. Dits is alpha (v0.1.5): the local-first engine works; networked sync, P2P, and any hosted service are roadmap."
            />

            <Callout type="warning" title="Source of truth" className="not-prose my-6">
                <code>docs/STATUS.md</code> and the repo&apos;s <code>ROADMAP.md</code> are
                authoritative. If anything here looks more finished than the code, trust those
                files. Networked <code>push</code>/<code>pull</code>/<code>fetch</code>/
                <code>sync</code>, P2P, and hosted services are <strong>not implemented</strong>.
            </Callout>

            <h2>Current status at a glance</h2>

            <div className="grid gap-4 md:grid-cols-3 my-8 not-prose">
                <Card className="border-success/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle className="h-5 w-5 text-success" />
                            Works today (local)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Content-defined chunking + dedup</li>
                            <li>BLAKE3-verified object store</li>
                            <li>Git-like local workflow</li>
                            <li>MP4/ISOBMFF structure awareness</li>
                            <li>Local locks, audit, repo stats</li>
                            <li>Local clone/push (filesystem)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-warning/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FlaskConical className="h-5 w-5 text-warning" />
                            Experimental / gated
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>FACR frame video engine (needs FFmpeg)</li>
                            <li>Photo edit/render pipeline</li>
                            <li>FUSE/VFS mount (feature-gated, local)</li>
                            <li>QUIC delta engine (<code>stream-demo</code> only)</li>
                            <li>Convergent encryption (local)</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                            Roadmap (not built)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Networked sync (push/pull/fetch)</li>
                            <li>Network clone, P2P</li>
                            <li>Hosted sync service (&quot;DitsHub&quot;)</li>
                            <li>REST API, official SDKs</li>
                            <li>GUI, IDE &amp; tool integrations</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Tier 0 — Launch blockers / honesty-critical</h2>
            <p className="text-sm text-muted-foreground">
                Things that don&apos;t work despite looking like they should, or that block someone
                from trying Dits.
            </p>
            <div className="space-y-4 my-6 not-prose">
                <Item title="Networked sync" state="roadmap">
                    <code>push</code>/<code>pull</code>/<code>fetch</code>/<code>sync</code> over a
                    network print placeholders and transfer no data (Phase 4b).
                </Item>
                <Item title="Network clone" state="roadmap">
                    <code>clone</code> works only against a local filesystem path, not a URL/remote.
                </Item>
                <Item title="Wire the QUIC delta engine into push/pull" state="roadmap">
                    A real, tested QUIC delta engine exists (<code>dits stream-demo</code>) but is
                    not connected to the porcelain. Highest-leverage networking task.
                </Item>
                <Item title="P2P (Wormhole)" state="roadmap">
                    <code>p2p</code> subcommands are scaffolding: no NAT traversal, no data transfer.
                </Item>
                <Item title="Install paths that don't exist yet" state="not-started">
                    No <code>curl | sh</code> installer, no <code>cargo install dits</code> (not on
                    crates.io), no Homebrew tap. Use npm/bun/pnpm, GitHub Releases, source, or Docker.
                </Item>
                <Item title="Prebuilt-binary platform coverage" state="partial">
                    npm targets darwin/linux/win32 × x64/arm64, but releases may not yet ship every
                    combination. Automate the full matrix in CI.
                </Item>
            </div>

            <h2>Tier 1 — Core product completeness</h2>
            <div className="space-y-4 my-6 not-prose">
                <Item title="restore: full conflict resolution" state="partial">
                    <code>restore</code> does not yet do full merge-conflict resolution.
                </Item>
                <Item title="gc: repack / compaction" state="partial">
                    Reference-counted sweep works; objects are not repacked/compacted yet.
                </Item>
                <Item title="FUSE/VFS mount in default builds" state="experimental">
                    Implemented but gated behind the <code>fuser</code> Cargo feature and local-only.
                </Item>
                <Item title="Remote on-demand hydration for VFS" state="roadmap">
                    The mount cannot fetch missing chunks from a remote (depends on networked sync).
                </Item>
                <Item title="Migration from Git LFS" state="roadmap">
                    No importer yet; LFS pointers vs. chunk manifests means re-chunking is required.
                </Item>
                <Item title="FACR → stable" state="experimental">
                    Frame-addressable video is FFmpeg-dependent and experimental; needs hardening,
                    broader codec coverage, and docs.
                </Item>
            </div>

            <h2>Tier 2 — Media &amp; advanced workflows</h2>
            <div className="space-y-4 my-6 not-prose">
                <Item title="Proxy / Hologram remote workflow" state="roadmap">
                    Local proxy generation works; <code>checkout --proxy</code> against server-side
                    originals depends on networking.
                </Item>
                <Item title="Tiered storage cloud backends (Deep Freeze)" state="roadmap">
                    Local <code>freeze</code>/<code>thaw</code> exist; S3/Glacier cold tiers and
                    cloud lifecycle are roadmap.
                </Item>
                <Item title="Convergent encryption hardening" state="partial">
                    Local encryption exists; key rotation/revocation and RBAC-managed keys are not done.
                </Item>
                <Item title="Video timeline diff/merge" state="not-started">
                    Semantic diff/merge of NLE projects (Premiere XML, DaVinci .drp, Final Cut).
                </Item>
                <Item title="More container formats" state="not-started">
                    Native handling for MXF, MKV, and others beyond MP4/MOV.
                </Item>
            </div>

            <h2>Tier 3 — Ecosystem &amp; hosted layer</h2>
            <div className="space-y-4 my-6 not-prose">
                <Item title="Hosted sync service (&quot;DitsHub&quot;)" state="roadmap">
                    A future, optional layer over the same open protocol, primarily for networked
                    sync. Not built — no SaaS, no marketplace, no pricing.
                </Item>
                <Item title="REST API + webhooks" state="roadmap">
                    Documented as design intent only; no server implements them today.
                </Item>
                <Item title="Official SDKs (Go / Python / JS / Rust)" state="not-started">
                    Not published; do not exist as packages.
                </Item>
                <Item title="GUI, mobile, IDE &amp; tool integrations" state="not-started">
                    Tauri desktop app, VS Code/JetBrains, Unreal/Unity, Premiere/Resolve plugins.
                </Item>
                <Item title="Cross-repository deduplication" state="not-started">
                    Shared chunk pool across repos at studio scale, with security boundaries.
                </Item>
            </div>

            <h2>Tier 4 — Site &amp; docs accuracy</h2>
            <div className="space-y-4 my-6 not-prose">
                <Item title="README corrected" state="works">
                    Fixed the broken installer claim, stale test counts (now 469), overstated
                    benchmarks, wrong links, and roadmap items shown as shipped.
                </Item>
                <Item title="Roadmap banners on web docs" state="roadmap">
                    Add &quot;roadmap / not implemented&quot; banners to API, deployment, and
                    p2p/remotes/vfs pages that still read as shipped.
                </Item>
                <Item title="Runnable example projects" state="not-started">
                    Add a top-level <code>examples/</code> with game-asset, dataset, and video/FACR
                    demos for community testing.
                </Item>
            </div>

            <h2>Mapping to the 9 engineering phases</h2>
            <p className="text-sm text-muted-foreground">
                Full detail in <code>docs/roadmap/phases.md</code>.
            </p>
            <div className="space-y-2 my-6 not-prose">
                {[
                    ["1 · The Engine", "works", "Local chunking/dedup, bit-for-bit checkout"],
                    ["2 · Structure Awareness", "works", "MP4/ISOBMFF atom handling"],
                    ["3 · Virtual File System", "experimental", "Implemented, feature-gated + local-only"],
                    ["3.5 · Git Parity", "works", "Local branch/merge/tag/stash/diff"],
                    ["3.6 · Hybrid Storage", "works", "Git for text, Dits for binary"],
                    ["4 · Collaboration & Sync", "roadmap", "Not implemented (placeholders)"],
                    ["5 · Conflict & Locking", "partial", "Local locks/gc/fsck ship; networked is roadmap"],
                    ["6 · The Hologram", "partial", "Local proxy gen ships; remote workflow is roadmap"],
                    ["7 · Creative Ecosystem", "roadmap", "Plugins, SDKs, tool integrations"],
                    ["8 · Deep Freeze", "partial", "Local freeze/thaw ship; cloud tiers are roadmap"],
                    ["9 · The Black Box", "partial", "Local encryption ships; RBAC/key mgmt is roadmap"],
                ].map(([name, state, desc]) => (
                    <div
                        key={name}
                        className="flex items-start gap-3 p-3 border rounded-lg text-sm"
                    >
                        {state === "works" ? (
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        ) : state === "roadmap" ? (
                            <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        ) : (
                            <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                            <span className="font-medium">{name}</span>
                            <span className="text-muted-foreground"> — {desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            <Callout type="tip" title="Want to help?" className="not-prose my-6">
                The highest-leverage tasks are wiring the existing QUIC delta engine into{" "}
                <code>push</code>/<code>pull</code>, finishing <code>restore</code>/<code>gc</code>,
                and adding runnable example repos. Open an issue on{" "}
                <a
                    href="https://github.com/byronwade/dits/issues"
                    className="underline"
                >
                    GitHub
                </a>
                .
            </Callout>
        </div>
    );
}
</content>
