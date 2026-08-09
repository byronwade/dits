# GitHub discovery and community growth

**Maturity:** Current

Maintainer playbook for turning qualified visitors into evaluators,
contributors, and returning followers without overstating the alpha.

> Last reviewed: 2026-08-08. Messaging follows [`positioning.md`](positioning.md),
> and capability claims follow [`docs/STATUS.md`](../STATUS.md).

## The funnel

```text
qualified visitor
  → understands Dits in five seconds
  → sees a real local alpha and explicit limits
  → stars, evaluates, or contributes
  → returns for verified releases and workflow evidence
```

Stars are a discovery and follow signal, not product validation. Optimize for
the right systems, storage, game-pipeline, virtual-production, VFX, and
developer-tool audiences rather than undifferentiated traffic.

## Repository conversion checklist

- [x] Category, tagline, alpha boundary, and 60-second quick start above the fold.
- [x] Dedicated 1280×640 social preview and honest status/CI/npm/license badges.
- [x] Current-versus-roadmap table and evidence-linked benchmark copy.
- [x] Root contributor and support guides, issue forms, PR template, and release-note categories.
- [x] Direct links to `good first issue`, `help wanted`, issue forms, security, and roadmap.
- [x] Remove temporary agent probes, patch payloads, and obsolete root benchmark scripts from the public storefront.
- [x] Publish a compact `/llms.txt` index and SoftwareSourceCode structured data for machine-assisted discovery.
- [ ] Apply the About description, homepage, topics, and social image in GitHub Settings.
- [ ] Enable GitHub private vulnerability reporting, then replace the public
      security contact fallback with the private advisory form.
- [ ] Enable GitHub Discussions only after a maintainer can seed and moderate it.
- [ ] Pin several genuinely small newcomer issues; do not label architectural epics as beginner work.
- [ ] Record a real 60–90 second terminal demo from the current CLI.

## Repository settings

Use the exact values in [`positioning.md#github-storefront`](positioning.md#github-storefront).
GitHub searches repository names, descriptions, and topics by default, so the
settings should contain the category words people actually use: version
control, large files, binary assets, Rust, media, game development, and virtual
production.

The repository social image is `.github/assets/dits-social-preview.png`. Upload
that file through GitHub Settings → General → Social preview. Committing the
file alone does not change the GitHub card.

At the 2026-08-08 review, the live repository exposed only `media`,
`version-control`, and `video`. Apply the full reviewed 15-topic set in
`positioning.md#github-storefront`; GitHub permits up to 20 topics, but a
focused set is more useful than filling every slot with weak synonyms.

## Demonstration ladder

Create evidence in this order:

1. **Terminal proof:** `init`, `add`, `commit`, `diff`, `checkout`, and `fsck`
   on disposable mixed text/binary content.
2. **Workflow proof:** one small game or virtual-production project with the
   corpus, commands, raw measurements, and failures disclosed.
3. **Recovery proof:** interrupted writes, corruption, reconstruction, and
   independent hashes.
4. **Media proof:** a bounded MP4/FACR/OTIO example that labels exact source,
   derived output, dependencies, and unsupported cases.
5. **Remote proof:** only after the repository format and remote protocol meet
   their roadmap gates.

One credible workflow is more shareable than a long speculative feature list.

## Reusable launch copy

### GitHub and social one-liner

> Dits is open-source, local-first version control for large media and binary
> assets: exact local history today, explainable media pipelines next.

### Show HN title

> Show HN: Dits – local-first version control for large media and binary assets

### Technical launch introduction

> I am building Dits, an open-source Rust VCS for projects where code lives
> beside large media and binary assets. The current alpha provides Git-shaped
> local history using FastCDC and BLAKE3-addressed storage, with verified local
> reconstruction paths. Network sync and the semantic media graph are roadmap,
> not shipped. I am looking for pipeline engineers, technical artists, and
> storage/VCS developers willing to challenge the format with real fixtures and
> failure cases.

### Short social post

> `final-v7-really-final` is not a history. Dits is an open-source Rust VCS for
> mixed code-and-media projects: chunked local history now, an explainable graph
> of source → edits → results next. Alpha, local-only, and built in public.

Every post should point to the canonical repository URL. Tailor the example to
the community instead of cross-posting identical promotional text everywhere.

## Release as a marketing event

Do not publish a release until its source version, tag, package version,
artifacts, docs, and status file agree. A release page should include:

1. the user-visible outcome in the title and first paragraph;
2. one real screenshot, terminal recording, or workflow artifact;
3. exact install or upgrade instructions for verified platforms;
4. checksums and a clear supported-platform table;
5. breaking changes, format implications, and recovery notes;
6. named contributor acknowledgments; and
7. links to the method, fixtures, raw benchmarks, and focused follow-up issues.

Generated release notes are categorized by `.github/release.yml`. Review them
before publication; automation does not guarantee truthful marketing.

## Community rhythm

- **Weekly:** triage issue forms, keep newcomer tasks small, and answer blocked evaluators.
- **Every two weeks:** publish one evidence artifact—fixture, failure report, architecture note, or reproducible benchmark.
- **Per release:** share one workflow outcome, not a dump of commit messages.
- **Monthly:** revisit the initial wedge and remove content that attracts the wrong audience.

If Discussions are enabled later, start with Announcements, Q&A, Design/RFCs,
and Show and Tell. Seed a welcome post, roadmap post, and one concrete workflow
question before linking the channel publicly.

## Measurement

Record these weekly because GitHub traffic retains a short rolling window:

- unique visitors and repository views;
- referring sites and popular content;
- full clones and release downloads;
- stars per qualified visitor;
- issue-form completion and first-time contributors;
- repeat evaluators providing a second fixture or report.

Use the data to improve comprehension and contribution friction. Do not turn
star counts, downloads, or unnamed testers into customer or reliability claims.

## Primary references

- [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [Repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [Social preview images](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [Community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
- [Good first issues](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/encouraging-helpful-contributions-to-your-project-with-labels)
- [Repository traffic](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)
