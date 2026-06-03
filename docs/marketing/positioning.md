# Dits Positioning — editors first, developers close behind

*A pitch grounded in what the engine actually does today, with the frame-level future as the headline roadmap. Lead with the real, hard-to-copy capabilities — not the network layer (still scaffolding).*

---

## The one-liner

**Git for footage.** Version control built for video and large media — where a tiny edit doesn't cost a full re-upload, where you can see *which frames changed* between two cuts, and where your 2 TB project clones in seconds as working proxies.

## Who it's for

**Primary: video editors, post houses, and solo creators.** People drowning in `final_v27.mp4`, passing 100 GB project folders through cloud drives, with no real history of what changed or what shipped.

**Secondary: developers of asset-heavy projects** — game studios, ML dataset teams, 3D/design shops — who want a content-addressed, embeddable Rust engine and a Git-shaped CLI for binaries.

## Why now / why us — the three things that already work and are hard to copy

1. **Proxy-native checkout.** Clone a massive project and get lightweight working proxies immediately; pull full-resolution media on demand. You edit at proxy speed and never wait on a full sync. *(Built.)*

2. **Structure-aware media.** Dits parses MP4/MOV at the box level and versions metadata separately from media payload — a metadata or container change costs almost nothing instead of re-storing the whole file. *(Built: deconstruct/reconstruct with offset-table patching.)*

3. **NLE projects diff like code.** FCPXML / Premiere XML get true line-level diff, merge, and blame via the Git engine, while the heavy payload dedups via chunking. Your timeline history reads like a commit log. *(Built: hybrid Git+Dits storage.)*

On top of that: content-addressed integrity (BLAKE3 verified on read), convergent encryption, and byte-exact reconstruction. The foundation is trustworthy and tested.

## The headline roadmap — frame-level version control (FACR)

This is the "revolutionize the industry" line, and it's grounded in a working prototype, not a slogan:

> **Re-grade 150 frames of a 1,000-frame clip and Dits stores 150 frames — not 1,000.**

Dits is building a **frame-addressable canonical representation**: every frame is independently decodable and content-addressed, a clip is an ordered manifest of frame references, and edits are recorded as a non-destructive log over those frames. The payoff:
- **True visual diff:** `dits diff --visual` shows exactly which frames (and regions) changed between two versions.
- **Frame-granular dedup:** trims, reorders, inserts, and grades only store what actually changed.
- **Photos too:** RAW edits become a versioned, content-addressed edit log over the original.

Try the dedup core today: `dits facr-demo --frames 1000 --regrade 150`.

The honest caveat we lead with internally (and won't hide from technical users): the byte-exact economics hold when Dits owns the edit (or imports your EDL/OTIO timeline). Opaque external re-exports fall back to perceptual matching + residual coding. That's *why* Dits is building a non-destructive editing/import model, not just chunking whatever an NLE emits.

## What we deliberately do **not** lead with (yet)

- **P2P / cloud sync / QUIC transport.** It's scaffolding today. We will not pitch it as shipped. Local-first media versioning is compelling on its own, and honesty here is a feature, not a weakness.

## Messaging guardrails

- Never imply network sync, P2P, or QUIC delta transfer work today.
- "Frame-level diff" is described as experimental/roadmap with a runnable demo, not GA.
- Claims about MP4 round-trip fidelity are scoped to tested formats until golden-file tests on real footage land.

## The tagline bank

- *Git for everything too big, too binary, and too expensive to keep re-uploading.*
- *Version your footage, not your filenames.*
- *See which frames changed. Store only those.*
