import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import {
  Film,
  Scale,
  FileVideo,
  Binary,
  HardDrive,
  Terminal,
  Network,
  ShieldCheck,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  generateMetadata as genMeta,
  generateFAQSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Dits FAQ — Version Control for Video & Large Files",
  description:
    "Honest answers about Dits for media: how content-defined chunking and BLAKE3 dedup work on video, photos, 3D, and game assets; how it compares to Git LFS, Dropbox, a NAS, and Perforce; the virtual filesystem and locking; and what ships today vs. the roadmap.",
  canonical: "https://dits.dev/faq",
  keywords: [
    "dits faq",
    "video version control",
    "large file version control",
    "git lfs alternative",
    "perforce alternative",
    "content-defined chunking",
    "virtual filesystem media",
    "creative asset version control",
  ],
  openGraph: {
    type: "article",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits FAQ" }],
  },
  twitter: { card: "summary_large_image" },
});

// ============================================================================
// DATA
// ============================================================================

type Faq = { question: string; answer: string };
type Category = { id: string; title: string; icon: typeof Film; faqs: Faq[] };

const CATEGORIES: Category[] = [
  {
    id: "basics",
    title: "The basics",
    icon: Film,
    faqs: [
      {
        question: "What is Dits?",
        answer:
          "Dits is open-source, Git-like version control built for large media — video, photos, 3D, and game assets — instead of code. It splits every file into content-defined chunks, addresses each chunk by its BLAKE3 hash, and stores each unique chunk once. So you get real commits, branches, and history over multi-gigabyte files, and you only store and move what actually changed.",
      },
      {
        question: "Who is it for?",
        answer:
          "Video editors, photographers, 3D artists, game developers — anyone whose 'version control' today is a folder of final_v3.mp4 files in Dropbox. If your projects are big, binary, and constantly revised, Dits gives them the history and deduplication that Git gave code.",
      },
      {
        question: "How is this different from regular Git?",
        answer:
          "Git is brilliant for text and miserable for big binaries — it stores a full copy of every version and can't diff inside a video. Dits keeps Git's mental model (commits, branches, history) but rebuilds the storage layer around content-defined chunking and large-file streaming, with a virtual filesystem and binary locking on top. Same workflow, built for the heavy stuff.",
      },
      {
        question: "Is it really free and open source?",
        answer:
          "Yes — Dits is open source under the MIT license. No usage limits, no file-size caps, no account required, and you can self-host everything on your own infrastructure.",
      },
      {
        question: "Do I need to know Git to use it?",
        answer:
          "It helps, because the commands deliberately mirror Git (init, add, commit, status, diff, log, branch, checkout). But the concepts are intuitive even if you've never touched Git — you're saving versions of a project and able to jump back to any of them.",
      },
      {
        question: "What's the difference between Dits for media and Dits for AI?",
        answer:
          "Same engine, different heaviest files. This surface — Dits for media — versions video, photos, and creative assets. Dits for AI points the identical content-addressed engine at model weights, datasets, and research data. Improvements to the core benefit both.",
      },
    ],
  },
  {
    id: "compare",
    title: "How it compares",
    icon: Scale,
    faqs: [
      {
        question: "How does Dits compare to Git LFS?",
        answer:
          "Git LFS stores each version of a file as a complete copy — five versions of a 10 GB video is 50 GB. Dits uses content-defined chunking, so those versions share their unchanged pieces and take far less space. LFS also re-uploads the whole file on every change; Dits's content-addressed store is designed so sync only moves the changed chunks (that networked sync engine is still in development).",
      },
      {
        question: "Why not just use Dropbox or Google Drive?",
        answer:
          "Cloud drives sync files, they don't version projects. They store a fresh full copy on every change, have no real history of what changed or why, and can't deduplicate the 95% of a file that stayed the same. Dits gives you commits, diffs, and history while storing only the delta.",
      },
      {
        question: "Why not a NAS or shared drive?",
        answer:
          "A NAS is great storage but knows nothing about versions — you still end up with manual naming conventions and 'who overwrote my edit?' Dits adds content-addressed history and binary locking on top, and can use a NAS or S3 as its backing store.",
      },
      {
        question: "How does it compare to Perforce / Helix Core?",
        answer:
          "Perforce is the incumbent for big-binary teams, but it's centralized, proprietary, and priced accordingly, and dedup needs explicit setup. Dits is open-source, distributed, content-addressed, and deduplicates automatically across versions — the open alternative for teams that only use Perforce because Git couldn't handle their files.",
      },
      {
        question: "How is it different from rsync or Syncthing?",
        answer:
          "Those move and mirror bytes between machines; they don't give you versioned history, commits, or the ability to check out a past state of a project. Dits is a version control system — sync is one feature, not the whole product.",
      },
      {
        question: "How does it compare to Frame.io or a media asset manager?",
        answer:
          "Those are review, sharing, and cataloging layers — they sit on top of your files. Dits is the version control underneath: the source of truth for what changed, when, and how to reconstruct any past version efficiently. They're complementary, not competitors.",
      },
      {
        question: "Why not just rename files (final_v3.mp4)?",
        answer:
          "Because renaming is a versioning system with no history, no diff, no dedup, and no answer to 'which one actually shipped?' Every 'version' is another full copy on disk. Dits replaces the naming convention with real commits while storing only what changed.",
      },
    ],
  },
  {
    id: "formats",
    title: "File types & formats",
    icon: FileVideo,
    faqs: [
      {
        question: "What file types does Dits support?",
        answer:
          "Any file type. It's especially optimized for video (MP4, MOV, MXF), 3D assets (FBX, OBJ, Blender, USD), game projects (Unity, Unreal), and creative tools (PSD, Premiere and Resolve projects) — but the universal chunker handles anything.",
      },
      {
        question: "How well does it work with video specifically?",
        answer:
          "Video is the flagship case. Dits understands MP4/MOV container structure — it chunks the media payload separately from metadata and can align chunk boundaries to keyframes, so a small edit touches a few chunks instead of the whole file, and metadata-only changes barely cost anything.",
      },
      {
        question: "What about RAW photos and PSDs?",
        answer:
          "Both work. PSDs change many bytes when you tweak a layer, but content-defined chunking still captures the unchanged layers, and shared structure across versions and exports dedupes. RAW sets dedupe well because originals never change — only your edits and derivatives version on top.",
      },
      {
        question: "3D assets — Blender, FBX, OBJ, USD?",
        answer:
          "Supported. Large scene files chunk and dedupe; the best results come from referenced (rather than embedded) assets, so shared models and textures are stored once across scenes. Dits is tested across these formats.",
      },
      {
        question: "Game projects — Unity and Unreal?",
        answer:
          "Yes — large binary game assets are a core use case. Because they're not mergeable, Dits leans on content-defined chunking to store only changed regions, plus file locking to prevent two people clobbering the same asset.",
      },
      {
        question: "What about audio sessions?",
        answer:
          "They work like any other project files — large session files and sample libraries chunk and dedupe, and unchanged stems or samples are stored once across versions.",
      },
      {
        question: "What is keyframe alignment / atom awareness?",
        answer:
          "For video, Dits parses the container (e.g. MP4 atoms) and tries to place chunk boundaries on keyframes. That keeps each chunk independently decodable, improves deduplication after edits, and means changing a clip's metadata doesn't force a re-store of the whole thing.",
      },
    ],
  },
  {
    id: "dedup",
    title: "How chunking & dedup work",
    icon: Binary,
    faqs: [
      {
        question: "How does content-defined chunking work?",
        answer:
          "Instead of cutting files at fixed offsets, Dits uses a rolling hash (FastCDC) to choose boundaries based on the content itself. So when you insert or delete data in the middle of a file, only the chunks near the change shift — the rest keep their hashes and dedupe. Each chunk is addressed by its BLAKE3 hash.",
      },
      {
        question: "How much storage will I actually save?",
        answer:
          "It depends on your content and edit patterns, so we won't quote one magic number. The mechanism is simple: anything two versions share is stored once. Iterative video edits, revision-heavy projects, and reused assets see the biggest wins; a library of totally unrelated files sees the least.",
      },
      {
        question: "What happens if I trim or edit the middle of a video?",
        answer:
          "Only the affected chunks change. Trim the start and roughly the changed region re-stores; tweak a few seconds in the middle and you pay for a few chunks, not the whole multi-gigabyte file. The unchanged remainder keeps its existing chunks.",
      },
      {
        question: "Does re-encoding or transcoding dedupe?",
        answer:
          "Honestly, not much — a full re-encode changes nearly every byte, so the new render shares little with the old one. Dits still versions it with full history and integrity; it just can't dedupe bytes that genuinely changed. Where it shines is edits and metadata changes, not whole-file re-encodes.",
      },
      {
        question: "When does dedup NOT help?",
        answer:
          "When a change rewrites the whole file: re-encoding, recompressing, or an export that touches every byte. You still get version history, integrity-checked storage, and dedup against related files — just not against the previous full render. We'd rather be upfront than overpromise.",
      },
      {
        question: "What is FACR (frame-addressable video)?",
        answer:
          "FACR is an experimental, frame-level representation that lets Dits diff and dedupe video at the granularity of individual frames rather than byte ranges — so two cuts that share footage can share frames directly. It's early and labeled experimental; you can try it today with `dits facr-demo`.",
      },
    ],
  },
  {
    id: "vfs",
    title: "Virtual filesystem & big files",
    icon: HardDrive,
    faqs: [
      {
        question: "What is the virtual filesystem (VFS)?",
        answer:
          "Dits can mount a repository as a normal drive (FUSE on macOS/Linux, Dokany/WinFSP on Windows). You see the full project structure instantly, and when you open a file, Dits fetches just the chunks it needs and reconstructs it on demand — no full download required.",
      },
      {
        question: "Can I work with files bigger than my disk?",
        answer:
          "That's exactly what the mount enables: the repository can be far larger than local disk, and files hydrate on access while a cache keeps recent ones fast. You browse and open what you need without materializing everything.",
      },
      {
        question: "What's the maximum file size?",
        answer:
          "There's no hard limit. Dits streams chunking so memory stays bounded regardless of size, and files past 100 GB have been tested successfully.",
      },
      {
        question: "How do proxies / 'hologram' editing work?",
        answer:
          "Dits can generate and check out lower-res proxies so you can edit smoothly without the full-resolution source, then relink to originals later. Proxy generation and checkout work today; the fuller on-the-fly 'hologram' experience (Phase 6) is on the roadmap.",
      },
      {
        question: "Does it work with my NLE — Premiere, Resolve, Final Cut?",
        answer:
          "Yes. Because the VFS mount makes a Dits repo look like an ordinary folder, any application that reads files works unchanged — Premiere, DaVinci Resolve, Blender, Unity, Unreal, and more. Deeper, plugin-level integrations are a later roadmap phase.",
      },
    ],
  },
  {
    id: "workflow",
    title: "Workflow & commands",
    icon: Terminal,
    faqs: [
      {
        question: "What commands does it use?",
        answer:
          "The Git-familiar set — dits init, add, commit, status, diff, log, branch, checkout, merge, stash, tag — plus media-specific ones for proxies, mounting, and video. If you know Git, you're productive on day one.",
      },
      {
        question: "How do I start a project?",
        answer:
          "Run `dits init` in your project folder, `dits add .` to stage your files, and `dits commit -m \"Initial\"`. That's it — you now have a versioned project, and every future commit stores only what changed.",
      },
      {
        question: "How do I see what changed between versions?",
        answer:
          "`dits log` shows history and `dits diff` compares versions — for media, that means showing which chunks (and, with FACR, which frames) changed rather than a meaningless byte dump. You can see how much of an asset actually moved between cuts.",
      },
      {
        question: "Can I branch and merge?",
        answer:
          "Yes — branching, merging, tags, and stash all work (Git parity is complete). For text-like project files, normal merging applies; for binary assets that can't be merged, you use locking to avoid conflicts instead.",
      },
      {
        question: "How do I undo or go back to an old cut?",
        answer:
          "Check out any past commit, branch, or tag to restore that exact state byte-for-byte (`dits checkout`), or use restore/reset to roll specific files back. Your full history is always recoverable as long as the commit exists.",
      },
      {
        question: "Does it integrate with my existing Git repo?",
        answer:
          "Yes — Dits uses a hybrid model that keeps text in Git and large binaries in the Dits chunk store, so you can run them side by side. Many teams keep code in Git and media in Dits in the same project.",
      },
    ],
  },
  {
    id: "teams",
    title: "Teams, locking & sync",
    icon: Network,
    faqs: [
      {
        question: "Can multiple people work on the same project?",
        answer:
          "Yes. Dits uses a commit history like Git, and for binary assets that can't be auto-merged it adds explicit locking so two people don't overwrite each other. The seamless multi-machine experience depends on the networked sync engine, which is in active development.",
      },
      {
        question: "How does locking work for binary files?",
        answer:
          "Run `dits lock <file>` before you edit a non-mergeable asset and others see it as read-only until you unlock. It's the standard way to prevent binary conflicts. Local locking works today; fully server-coordinated multi-user locking is being finalized.",
      },
      {
        question: "Is there networked sync today?",
        answer:
          "Local operations and local clone/push work today. The networked delta-sync engine over QUIC (push/pull/fetch across the internet, resumable transfers) is on the roadmap and in active development — those network commands are currently scaffolding, and we say so rather than implying they're done.",
      },
      {
        question: "Can I self-host a server?",
        answer:
          "That's the intended model — the protocol and formats are open and self-hostable, with S3-compatible storage backends. The hosted convenience layer (Ditshub) is optional; everything it does is possible on infrastructure you control.",
      },
      {
        question: "Is there P2P sharing?",
        answer:
          "It's on the roadmap — clients sharing chunks directly without always going through a server. It's part of the sync design but not shipped yet; today, sync is local and self-hosted.",
      },
      {
        question: "What does a 100-person team workflow look like?",
        answer:
          "The intended shape: one editor pushes a small project delta plus only the changed assets, everyone else pulls instantly, and source media stays local or cached so it's fetched once and reused. The local model and locking exist today; the instant team experience depends on the networked sync engine in development.",
      },
    ],
  },
  {
    id: "security",
    title: "Storage, safety & security",
    icon: ShieldCheck,
    faqs: [
      {
        question: "Where is my data stored?",
        answer:
          "Locally by default — Dits is local-first and works fully offline. For remotes you can use S3-compatible backends or self-hosted storage like MinIO. Nothing leaves your machine unless you explicitly push.",
      },
      {
        question: "Is my data encrypted?",
        answer:
          "The engine supports convergent encryption (AES-256-GCM), which keeps chunks confidential while still allowing deduplication. And because it's local-first, the strongest guarantee is simple: your files don't go anywhere unless you send them.",
      },
      {
        question: "How does it prevent corruption?",
        answer:
          "Every chunk is addressed by its BLAKE3 hash and verified on read — if bytes don't match the hash, Dits detects it and restores from another copy. Checksum verification is mandatory and can't be silently skipped, so silent corruption doesn't slip through.",
      },
      {
        question: "Can I recover deleted files or old versions?",
        answer:
          "Yes — as long as the commit exists you can check it out and get those files back byte-for-byte. Chunks are reference-counted and only garbage-collected when nothing points to them, so history stays intact until you intentionally prune.",
      },
      {
        question: "Does it phone home or require an account?",
        answer:
          "No. The open-source core needs no account and no network connection to work — init, commit, diff, branch, and checkout are all local. You only connect when you choose to sync.",
      },
    ],
  },
  {
    id: "status",
    title: "Status & roadmap",
    icon: Rocket,
    faqs: [
      {
        question: "Is it production-ready?",
        answer:
          "It's in active development and honest about it. The local engine — chunking, dedup, byte-exact checkout, MP4 structure awareness, the VFS mount, and Git-parity history — works today; networked sync, P2P, and the full hologram and frame engine are in progress. Great for early adopters; check the roadmap before depending on a specific feature.",
      },
      {
        question: "What works today vs. what's on the roadmap?",
        answer:
          "Working today: local chunking/dedup with byte-exact checkout, MP4 atom-aware handling, the FUSE/WinFSP virtual filesystem, Git parity (branch/merge/tags/stash), hybrid Git+Dits storage, proxy checkout, and local clone/push. Roadmap: networked QUIC delta sync, P2P sharing, the full hologram proxy experience, and the FACR frame engine (experimental today). Roadmap items are labeled throughout.",
      },
      {
        question: "How do I install it?",
        answer:
          "One line via the install script, or Homebrew, npm/bun/pnpm, Cargo, or a prebuilt binary from GitHub Releases. Then run `dits init` in any project to get started — see the Download page for all options.",
      },
      {
        question: "How do I contribute or follow progress?",
        answer:
          "Dits is developed in the open on GitHub — follow the repo, open issues, and join discussions. There's a long list of genuinely open problems, so design ideas, prototypes, and research are as welcome as code.",
      },
    ],
  },
];

const allFaqs: Faq[] = CATEGORIES.flatMap((c) => c.faqs);

// ============================================================================
// PAGE
// ============================================================================

export default function FaqPage() {
  const faqSchema = generateFAQSchema(allFaqs);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "FAQ", url: "/faq" },
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="faq-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />
      <main id="main-content" className="flex-1 pt-[104px]">
        {/* ================================================================ */}
        {/* HERO */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[420px] glow-brand" />
          </div>

          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 font-mono text-xs uppercase tracking-widest text-brand">
                FAQ
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Questions, answered{" "}
                <span className="text-gradient-brand">honestly</span>
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
                What Dits does for video and large files, where chunk dedup wins
                and where it doesn&apos;t, how it stacks up against Git&nbsp;LFS,
                Dropbox, a NAS, and Perforce — and an honest line between what
                works today and what&apos;s on the roadmap.
              </p>
            </div>

            {/* category quick-nav */}
            <nav
              aria-label="FAQ categories"
              className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2"
            >
              {CATEGORIES.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                >
                  <cat.icon className="h-3.5 w-3.5 text-brand" />
                  {cat.title}
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CATEGORIES */}
        {/* ================================================================ */}
        <section className="border-t py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl space-y-16">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} id={cat.id} className="scroll-mt-[120px]">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                      <cat.icon className="h-5 w-5 text-brand" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{cat.title}</h2>
                  </div>
                  <Accordion multiple className="w-full">
                    {cat.faqs.map((faq, i) => (
                      <AccordionItem
                        key={`${cat.id}-${i}`}
                        value={`${cat.id}-${i}`}
                        className="border-b"
                      >
                        <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-5 text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* STILL HAVE QUESTIONS */}
        {/* ================================================================ */}
        <section className="border-t bg-muted/30 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Still have a question?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
                The fastest way to a real answer is the source and the people
                building it. See how it works, try the playground, or ask in the
                open on GitHub.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/how-it-works" />}>
                  How it works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={
                    <Link
                      href="https://github.com/byronwade/dits/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <GithubIcon className="mr-2 h-4 w-4" />
                  Ask on GitHub
                </Button>
              </div>

              <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
                <Card className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-1 font-semibold">Try it live</h3>
                  <p className="text-sm text-muted-foreground">
                    The{" "}
                    <Link href="/playground" className="text-brand underline-offset-4 hover:underline">
                      playground
                    </Link>{" "}
                    runs the real engine in your browser.
                  </p>
                </Card>
                <Card className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-1 font-semibold">See the numbers</h3>
                  <p className="text-sm text-muted-foreground">
                    <Link href="/benchmarks" className="text-brand underline-offset-4 hover:underline">
                      Benchmarks
                    </Link>{" "}
                    for the data and cost saved.
                  </p>
                </Card>
                <Card className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-1 font-semibold">Dits for AI</h3>
                  <p className="text-sm text-muted-foreground">
                    Same engine, for{" "}
                    <Link href="/ai" className="text-brand underline-offset-4 hover:underline">
                      models &amp; datasets
                    </Link>
                    .
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
