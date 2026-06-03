import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  Scale,
  Binary,
  Layers,
  Database,
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
  title: "Dits for AI — FAQ: Versioning Models, Datasets & Research Data",
  description:
    "Honest answers about Dits for AI: how content-defined chunking and BLAKE3 dedup work on model weights, checkpoints, datasets, genomics, geospatial, and simulation data; how it compares to Git LFS, Xet, DVC, and S3; what ships today vs. what's on the roadmap.",
  canonical: "https://dits.dev/ai/faq",
  keywords: [
    "dits for ai faq",
    "model weight versioning",
    "checkpoint deduplication",
    "dataset version control",
    "git lfs alternative",
    "hugging face xet vs dits",
    "dvc alternative",
    "content-addressed storage",
    "research data versioning",
  ],
  openGraph: {
    type: "article",
    images: [{ url: "/dits.png", width: 1200, height: 630, alt: "Dits for AI — FAQ" }],
  },
  twitter: { card: "summary_large_image" },
});

// ============================================================================
// DATA
// ============================================================================

type Faq = { question: string; answer: string };
type Category = { id: string; title: string; icon: typeof Boxes; faqs: Faq[] };

const CATEGORIES: Category[] = [
  {
    id: "basics",
    title: "The basics",
    icon: Boxes,
    faqs: [
      {
        question: "What is Dits for AI?",
        answer:
          "Dits for AI is content-addressed version control for the heaviest, least version-controlled data in machine learning and research — model weights, checkpoints, training datasets, and the scientific data behind them. It splits every artifact into content-defined chunks, addresses each chunk by its BLAKE3 hash, and stores each unique chunk once. You get real commits, diffs, and lineage over multi-gigabyte files instead of a folder full of model-final-v3.safetensors.",
      },
      {
        question: "Is this only for AI, or for scientific data too?",
        answer:
          "Both. AI is the sharpest example of a much wider problem: any field whose most valuable data is large, binary, and constantly re-versioned. The same engine handles genomic reads, geospatial rasters, simulation output, and microscopy stacks. If your data is big, changes incrementally, and currently lives in a bucket with version numbers in the filename, Dits is built for it.",
      },
      {
        question: "How is it related to Dits for media?",
        answer:
          "It is the same open-core engine pointed at a different set of enormous files. Dits for media versions video, photos, and 3D assets; Dits for AI versions models, datasets, and research data. Identical primitives (chunks, manifests, commits), different heaviest files. Nothing is forked — improvements to the engine benefit both surfaces.",
      },
      {
        question: "Who is it for?",
        answer:
          "ML engineers tracking checkpoints and fine-tunes, data teams versioning training sets, research labs that need reproducible data lineage, and platform teams tired of paying full storage and bandwidth for files that barely changed. If you have ever asked 'which weights actually shipped?' or 'which exact dataset produced this result?', that is the gap Dits closes.",
      },
      {
        question: "Do I need to know Git?",
        answer:
          "It helps but is not required. The commands mirror Git — add, commit, diff, log, branch, checkout — so anyone comfortable with Git is productive immediately. The mental model is the same; only the size and type of the files are different.",
      },
    ],
  },
  {
    id: "compare",
    title: "How it compares",
    icon: Scale,
    faqs: [
      {
        question: "How is this different from Git LFS?",
        answer:
          "Git LFS stores a complete copy of every version of a large file — change one layer of a 30 GB checkpoint and you store all 30 GB again. Dits chunks files and stores only the chunks that actually changed, deduplicated across every file and version. It also verifies every read against its BLAKE3 hash, where LFS just trusts the pointer.",
      },
      {
        question: "How does it compare to Hugging Face Xet?",
        answer:
          "Xet pioneered content-defined chunking for model and dataset storage, and Dits builds on the same foundation (FastCDC + BLAKE3 over a content-addressed store). Where Dits aims to go further is two addressing layers beyond exact-match: similarity-addressing (dedupe near-duplicate samples and re-encodes) and derivation-addressing (store the recipe for a reproducible artifact instead of its bytes). Those are on the roadmap, and clearly labeled as such.",
      },
      {
        question: "How does it compare to DVC?",
        answer:
          "DVC versions data by storing file-level pointers in Git and the bytes in a remote cache — dedup is per-file, not sub-file. Dits dedupes at the chunk level across everything, so a dataset that grows by appending shards, or a model and its quantized variant, share storage automatically. Dits is also a first-class store with integrity-verified reads, rather than a layer that orchestrates Git plus a bucket.",
      },
      {
        question: "What about LakeFS and other 'Git for data' tools?",
        answer:
          "Those give you Git-like branching over object storage, which is genuinely useful for workflow. Dits's difference is the storage substrate itself: content-defined chunking with sub-file dedup and byte-exact, hash-verified reconstruction. Think of LakeFS as versioning the catalog and Dits as versioning the bytes efficiently underneath.",
      },
      {
        question: "Why not just keep everything in S3?",
        answer:
          "You can — Dits can even use S3 as its chunk backend. But plain S3 stores a new object on every write and has no idea that two checkpoints or two dataset snapshots are 99% identical. You pay full storage and full transfer for changes that are a fraction of the bytes, and you get no commits, diffs, or lineage. Dits adds those on top of (or instead of) the bucket.",
      },
      {
        question: "How does it compare to Perforce?",
        answer:
          "Perforce is centralized, proprietary, and priced accordingly; dedup requires explicit setup. Dits is open-source, distributed, content-addressed, and deduplicates automatically across versions. For teams that adopted Perforce only because Git could not handle their binaries, Dits is the open alternative.",
      },
      {
        question: "Why not my cloud provider's bucket versioning?",
        answer:
          "Bucket versioning keeps a full copy per version — it is a safety net, not efficient version control. It cannot diff, cannot show lineage across related artifacts, and bills you for every full copy. Dits stores only the delta and gives you real history.",
      },
    ],
  },
  {
    id: "dedup",
    title: "Does dedup actually work on my data?",
    icon: Binary,
    faqs: [
      {
        question: "Does chunk dedup actually work on model weights?",
        answer:
          "It depends entirely on how the weights changed. Where it wins big: a base model vs. its fine-tune, a model vs. its quantized or LoRA variant, and appended or partially-edited artifacts — these share large runs of identical bytes. Where plain byte-level chunking struggles is two consecutive training checkpoints, because a gradient step nudges almost every weight a little and the bytes change nearly everywhere.",
      },
      {
        question: "So checkpoints every N steps won't dedupe?",
        answer:
          "Honestly, not well with byte-level chunking alone — diffuse float updates defeat it. You still get full commit history, integrity, and dedup against base models and variants, but consecutive checkpoints are the hard case. Tensor-aware chunking that survives diffuse updates is on the roadmap, and we label it as roadmap everywhere rather than implying it works today.",
      },
      {
        question: "What about safetensors, GGUF, or PyTorch .pt files?",
        answer:
          "They are all just files to the content store — Dits chunks and dedupes them the same way. Formats with stable layout (like safetensors) tend to dedupe better across variants than opaque pickled formats, because identical tensors land in identical byte ranges. Format-aware parsing that understands tensor boundaries directly is the roadmap improvement.",
      },
      {
        question: "Does it help with datasets and shards?",
        answer:
          "Yes — datasets are often the best case. Adding samples, appending shards, or re-snapshotting a set that mostly stayed the same dedupes extremely well, because the unchanged shards produce identical chunks and are stored once. You keep every version of the dataset without paying for it more than once.",
      },
      {
        question: "Does it work for genomics data (BAM/CRAM/FASTQ/VCF)?",
        answer:
          "As universal files, yes — they chunk and dedupe today. Dedup pays off where versions share structure: re-aligning against the same reference, appending samples to a cohort, or re-running a pipeline that changes only part of the output. The honest caveat is the same as elsewhere — a transform that perturbs the whole file (such as re-compressing an entire archive) dedupes poorly, and format-aware parsing for genomic containers is roadmap, not shipped.",
      },
      {
        question: "Geospatial rasters and point clouds (GeoTIFF/COG/LAS)?",
        answer:
          "Tiled and pyramided formats are a good fit: when only some tiles or zoom levels change between versions, the untouched tiles dedupe away. Point-cloud and mosaic updates that append or revise regions also benefit. Whole-file recompression is the weak case, as always.",
      },
      {
        question: "Simulation and HPC output (HDF5/NetCDF/Zarr/Parquet)?",
        answer:
          "Chunked array formats like Zarr and Parquet are well-suited because they are already laid out as independent blocks — appending timesteps or revising a subset of chunks dedupes cleanly. Monolithic HDF5/NetCDF files dedupe well when edits are localized and less well when a write touches the whole file.",
      },
      {
        question: "When does dedup NOT help?",
        answer:
          "When a change perturbs the entire file: re-encoding or re-compressing a whole archive, an encryption pass over everything, or a training step that nudges every float. In those cases you still get history, integrity, and dedup against related artifacts — just not against the immediately-previous full version. We would rather tell you that up front than imply magic.",
      },
    ],
  },
  {
    id: "addressing",
    title: "The three addressing layers",
    icon: Layers,
    faqs: [
      {
        question: "What are the three addressing layers?",
        answer:
          "Three ways to give data an address. L1 Exact: address a chunk by the BLAKE3 hash of its bytes — identical bytes stored once. L2 Similar: address near-duplicates by a perceptual or semantic fingerprint and store a small delta against the closest existing chunk. L3 Derived: address a reproducible artifact by its recipe (data refs + config + seed) and recompute it on demand instead of storing the bytes.",
      },
      {
        question: "Which layers work today?",
        answer:
          "L1, exact content-addressing, ships today on the open engine — chunking, dedup, integrity-verified reads, and byte-exact reconstruction. L2 (similarity) and L3 (derivation) are the roadmap that takes Dits past the exact-match ceiling every other tool is built on. They are labeled as roadmap throughout the site.",
      },
      {
        question: "What is derivation-addressing / recompute?",
        answer:
          "If an artifact is reproducible — a quantized model from a base, a LoRA from (data + config + seed), a cache from a deterministic build — you can store the few-hundred-byte recipe instead of the terabytes of output, and recompute it when needed. It trades storage for compute on artifacts that are cheap to regenerate. This is L3, and it is on the roadmap.",
      },
    ],
  },
  {
    id: "storage",
    title: "Storage, bandwidth & cost",
    icon: Database,
    faqs: [
      {
        question: "How much storage will I actually save?",
        answer:
          "It depends on your edit patterns, and we won't quote a universal number. The mechanism: anything two versions share is stored once. Teams with many variants of a base model, slowly-growing datasets, or appended shards see the largest wins; teams storing only diffuse, unrelated checkpoints see the least. The honest framing is 'you stop paying for the bytes that didn't change.'",
      },
      {
        question: "What's the difference between logical and physical size?",
        answer:
          "Logical size is what you think you have — the sum of every file's size. Physical size is what is actually stored after dedup — the unique chunks. Dits reports both, so you can see your real footprint. For repos with shared structure, physical can be a fraction of logical.",
      },
      {
        question: "Does syncing cost full bandwidth?",
        answer:
          "That is the point of content-addressing: sync transfers only chunks the other side is missing, and resumes where it dropped. Moving a checkpoint between nodes that already share 90% of the bytes uploads only the 10% delta. Note the networked sync engine is in active development; the content-addressed store it builds on works today.",
      },
      {
        question: "Where are the chunks actually stored?",
        answer:
          "Locally by default — Dits is local-first and works fully offline. For remotes, it supports S3-compatible backends (and self-hosted MinIO), with metadata coordinated separately. Your bytes can stay entirely on infrastructure you control.",
      },
    ],
  },
  {
    id: "workflow",
    title: "Workflow & integration",
    icon: Terminal,
    faqs: [
      {
        question: "What commands does it use?",
        answer:
          "The Git-familiar set: dits init, add, commit, status, diff, log, branch, checkout, and more. If you can use Git, you can use Dits — the difference is what is underneath, not the interface.",
      },
      {
        question: "How do I version a dataset?",
        answer:
          "Point Dits at the dataset directory, then add and commit it. Each new snapshot commits again; unchanged shards dedupe automatically and only new or changed data is stored. You get a full, diffable history of the dataset and can check out any past version byte-for-byte.",
      },
      {
        question: "Can I hook it into my training loop?",
        answer:
          "Yes — commit checkpoints and dataset versions as part of your pipeline the same way you would script Git. Because commits are content-addressed, each one pins the exact data and artifacts that produced a result, which is what makes a run reproducible later.",
      },
      {
        question: "How do I migrate from DVC or Git LFS?",
        answer:
          "The data models differ (LFS and DVC use pointers; Dits uses chunk manifests), so migration means re-importing files into Dits so they can be chunked. First-class migration tooling is on the roadmap; today you import the files and Dits takes over chunking and dedup from there.",
      },
      {
        question: "Does it track lineage and reproducibility?",
        answer:
          "That is a core reason it exists. Every commit references content by hash, so the history is tamper-evident: a commit tells you exactly which bytes of data and which artifacts existed at that point. 'Which dataset produced this model?' becomes a question with a precise answer instead of a guess.",
      },
      {
        question: "Can I diff two checkpoints or dataset versions?",
        answer:
          "Yes. Dits compares manifests to show which chunks changed between versions — so you can see, at a glance, how much of an artifact actually changed, and track it across runs, variants, and shards rather than just storing more copies.",
      },
    ],
  },
  {
    id: "scale",
    title: "Sync, scale & teams",
    icon: Network,
    faqs: [
      {
        question: "Is there networked sync today?",
        answer:
          "The content-addressed store, local commits, and byte-exact reconstruction work today. Networked delta sync over QUIC (push/pull/fetch across machines) is on the roadmap and in active development — the current network commands are scaffolding, and we say so rather than implying they are done.",
      },
      {
        question: "Multi-node and multi-region?",
        answer:
          "That is the target for the sync engine: move only deltas between nodes, registries, and regions, and resume on drop. The design is content-addressed end to end so the same chunk is never shipped twice. Available once networked sync lands; today the savings are real for local and single-store workflows.",
      },
      {
        question: "Can it back a model or dataset registry?",
        answer:
          "That is a natural fit — a content-addressed store is exactly what a registry wants underneath, so variants and versions share storage. It is part of where the hosted layer is headed; the open engine gives you the substrate today.",
      },
      {
        question: "How does it handle concurrent edits to the same file?",
        answer:
          "Like Git, Dits uses a commit DAG; for binary files that cannot be merged, it supports explicit locking so two people do not clobber the same artifact. Lock a file before editing and others see it as read-only until you are done.",
      },
      {
        question: "How big can a repo or file get?",
        answer:
          "There is no hard file-size limit — the engine streams chunking so memory stays bounded, and files past 100 GB have been tested. Repos scale with your storage; dedup means the physical footprint grows with unique content, not with the number of versions.",
      },
    ],
  },
  {
    id: "security",
    title: "Security, privacy & licensing",
    icon: ShieldCheck,
    faqs: [
      {
        question: "Is it open source?",
        answer:
          "Yes. Dits is open-core: the CLI, engine, formats, and protocol are open, inspectable, and self-hostable — the same engine behind Dits for media. An optional hosted layer adds managed storage and compute, but everything it does is possible with the self-hosted core.",
      },
      {
        question: "Is it self-hostable? Does my data leave my infrastructure?",
        answer:
          "Fully self-hostable and local-first. You can init, commit, diff, and check out entirely offline; nothing is uploaded unless you configure a remote. Your weights and datasets never have to leave infrastructure you control — which matters for proprietary models and regulated data.",
      },
      {
        question: "Is data encrypted?",
        answer:
          "The engine supports convergent encryption (AES-256-GCM), which preserves dedup while keeping chunks confidential. Full client-side encryption with role-based key management is a later roadmap phase; for now, the most important guarantee is that local-first means data does not leave your machine unless you send it.",
      },
      {
        question: "Can it run air-gapped or meet compliance needs?",
        answer:
          "Local-first and self-hostable makes air-gapped operation straightforward — no account or phone-home is required to use the core. Content addressing also gives tamper-evident history, which helps with audit and provenance requirements. Specific compliance certifications would sit with the hosted offering, not the open core.",
      },
      {
        question: "What does it cost?",
        answer:
          "The open-core engine is free and open-source — run it locally or self-host with no account. The optional hosted layer (managed storage, cloud compute for recompute-heavy workflows, collaboration) is where paid plans live, on the same open protocol so you are never locked in.",
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
          "It is early, and honest about it. The local content engine — chunking, dedup, integrity, local history — works today; networked sync, tensor-aware chunking, and the similarity and derivation layers are in progress. Treat it as a strong foundation for early adopters, not a finished hosted product, and check the roadmap before depending on a specific feature.",
      },
      {
        question: "What works today vs. what's on the roadmap?",
        answer:
          "Working today: content-addressed storage with BLAKE3 verification, FastCDC chunking and exact dedup, byte-exact reconstruction, and local commit/checkout/diff/log. Roadmap: networked delta sync, tensor-aware chunking, similarity-addressing (L2), and derivation/recompute (L3). Every roadmap item is labeled as such across the site.",
      },
      {
        question: "How do I follow progress or contribute?",
        answer:
          "Dits is developed in the open on GitHub — follow the repo, open issues, and join discussions. The open-problems list is long and genuinely unsolved, so research, prototypes, and design ideas are as welcome as code.",
      },
      {
        question: "How do I get early access?",
        answer:
          "Use the 'Request early access' link on the AI page, or just clone the open-source engine from GitHub and start locally today — no account needed. Early adopters who share workloads and feedback directly shape the roadmap.",
      },
    ],
  },
];

const allFaqs: Faq[] = CATEGORIES.flatMap((c) => c.faqs);

// ============================================================================
// PAGE
// ============================================================================

export default function AiFaqPage() {
  const faqSchema = generateFAQSchema(allFaqs);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Dits for AI", url: "/ai" },
    { name: "FAQ", url: "/ai/faq" },
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
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
                What Dits for AI does, where chunk dedup wins and where it
                doesn&apos;t, how it stacks up against Git&nbsp;LFS, Xet, DVC, and
                S3 — and an honest line between what works today and what&apos;s on
                the roadmap.
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
                building it. Read how it works, or ask in the open on GitHub.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/ai/how-it-works" />}>
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
                  <h3 className="mb-1 font-semibold">Read the engine</h3>
                  <p className="text-sm text-muted-foreground">
                    <Link href="/ai/how-it-works" className="text-brand underline-offset-4 hover:underline">
                      The honest breakdown
                    </Link>{" "}
                    of the three addressing layers.
                  </p>
                </Card>
                <Card className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-1 font-semibold">See the numbers</h3>
                  <p className="text-sm text-muted-foreground">
                    <Link href="/ai/benchmarks" className="text-brand underline-offset-4 hover:underline">
                      Benchmarks
                    </Link>{" "}
                    for what dedup and delta sync save.
                  </p>
                </Card>
                <Card className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-1 font-semibold">Dits for media</h3>
                  <p className="text-sm text-muted-foreground">
                    Same engine, for{" "}
                    <Link href="/" className="text-brand underline-offset-4 hover:underline">
                      video &amp; large files
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
