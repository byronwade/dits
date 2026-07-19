export const PRODUCT_POSITIONING = {
  category: "Open, local-first version control for large media and asset pipelines.",
  tagline: "Version the source. Explain every result.",
  description:
    "Dits gives mixed code-and-media projects Git-shaped local history with chunked, content-addressed storage. Exact local workflows work today; semantic media and team sync are roadmap.",
  version: "v0.1.5 alpha",
} as const;

export const PRODUCT_LAYERS = [
  {
    title: "Exact source history",
    status: "Current",
    description:
      "Commits, branches, tags, manifests, and byte-exact local reconstruction for mixed text and binary workspaces.",
  },
  {
    title: "Media-aware storage",
    status: "Current + experimental",
    description:
      "Content-defined chunking, content-addressed objects, MP4-aware code, integrity checks, and early proxy and VFS paths.",
  },
  {
    title: "Reproducible asset graph",
    status: "Experimental",
    description:
      "Explicit edits, dependencies, frames, timelines, and renditions instead of treating every output as an unrelated blob.",
  },
  {
    title: "Open collaboration protocol",
    status: "Roadmap",
    description:
      "Verified object exchange, resumable transfer, atomic refs, identity, authorization, and lock leases across interchangeable transports.",
  },
] as const;

export const CURRENT_CAPABILITIES = [
  "Local repository initialization, add, commit, history, branch, merge, tag, diff, and checkout workflows",
  "FastCDC chunking and BLAKE3-addressed local object storage",
  "Hybrid handling for text and large binary assets",
  "Byte-exact local reconstruction and integrity-oriented reads",
  "MP4 structure-aware code plus experimental FACR, photo, proxy, and VFS paths",
] as const;

export const CURRENT_LIMITATIONS = [
  "Alpha software: evaluate on disposable or independently backed-up projects",
  "Network push, pull, fetch, sync, and network clone do not transfer repository data",
  "P2P, QUIC transport, a hosted service, public SDKs, and NLE plug-ins are not shipped",
  "FACR, photo edit logs, proxies, VFS, and broad media compatibility remain experimental",
] as const;

export const PRODUCT_MILESTONES = [
  {
    name: "Credibility and data safety",
    state: "Now",
    summary: "Crash-safe writes, recovery, compatibility fixtures, and truthful docs.",
  },
  {
    name: "Stable format and scale",
    state: "Next",
    summary: "Versioned deterministic objects, bounded-memory ingest, packs, indexes, and trees.",
  },
  {
    name: "Semantic media",
    state: "Research",
    summary: "Source, edit, dependency, timeline, and rendition records proven on real workflows.",
  },
  {
    name: "Verified collaboration",
    state: "Later",
    summary: "A transport-independent remote CAS protocol with atomic refs and recovery tests.",
  },
] as const;

export const MEASURED_BENCHMARKS = [
  {
    name: "BLAKE3 hashing",
    value: "1,809.96 MB/s",
    detail: "1 MiB input, 200 iterations",
  },
  {
    name: "FastCDC chunking",
    value: "991.76 MB/s",
    detail: "32 MiB input, 5 iterations",
  },
  {
    name: "SHA-256 hashing",
    value: "348.37 MB/s",
    detail: "1 MiB input, 100 iterations",
  },
] as const;

export const CORE_FAQS = [
  {
    question: "What is Dits?",
    answer:
      "Dits is an open, local-first version-control system for large media and asset pipelines. The current alpha focuses on exact local history and chunked content-addressed storage.",
  },
  {
    question: "Who is it for first?",
    answer:
      "The initial wedge is small and mid-sized game and virtual-production teams that already use Git-shaped workflows beside large binary assets. Post-production and VFX are the next expansion path.",
  },
  {
    question: "How is this different from Git LFS or Xet?",
    answer:
      "Git LFS externalizes whole large objects, while Dits chunks binary content. Xet already combines Git, content-defined chunking, a CAS, and deduplication, so those primitives are not Dits's unique claim. Dits is betting on connecting exact history to explicit media edits, dependencies, and renditions.",
  },
  {
    question: "Can my team push and pull today?",
    answer:
      "No. Local repositories work today, but network push, pull, fetch, sync, network clone, and P2P transfer are not implemented. Collaboration comes after the object format and protocol pass their safety gates.",
  },
  {
    question: "Is Dits safe for production?",
    answer:
      "No. Dits is alpha software. Try it on disposable or independently backed-up projects, verify checkout results, and report failures with reproducible fixtures.",
  },
  {
    question: "Is Dits open source?",
    answer:
      "Yes. The repository is dual-licensed under Apache-2.0 OR MIT. The intended model keeps the local engine, durable format, and core protocol open.",
  },
] as const;
