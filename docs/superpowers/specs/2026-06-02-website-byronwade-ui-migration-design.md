# Migrate the dits website to the byronwade/ui design system

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Scope:** `apps/web` (the dits marketing + docs site)

## Summary

Fully adopt the **byronwade/ui** design system — a namespaced shadcn registry served at
`https://ui.byronwade.com` (namespace `@byronwade`) — as the design foundation for the dits
website. This is a full registry consumption ("Option A"): migrate the build to Tailwind v4,
install the foundation token layer and Base UI primitives from the registry, then redesign the
key pages using byronwade/ui composites and house utilities.

This is the "correct" path the registry is built for: the consuming project owns the copied
component code, and future updates flow in via `shadcn add @byronwade/*`.

## Why this is smaller than it looks

The stack mismatch is real (current site is Tailwind v3 + Radix; byronwade/ui is Tailwind v4 +
Base UI), but the actual component surface is narrow. Although ~102 files import from
`@/components/ui`, only **13 distinct components are actually used**:

| Component | Files using it | byronwade/ui equivalent |
|---|---|---|
| `alert` | 70 | `@byronwade/alert` |
| `code-block` | 59 | **none — custom, keep & re-token** |
| `card` | 53 | `@byronwade/card` |
| `table` | 45 | `@byronwade/table` |
| `badge` | 22 | `@byronwade/badge` |
| `tabs` | 17 | `@byronwade/tabs` |
| `button` | 11 | `@byronwade/button` |
| `tooltip` | 3 | `@byronwade/tooltip` |
| `sheet` | 2 | `@byronwade/sheet` |
| `sonner` | 1 | `@byronwade/sonner` |
| `dropdown-menu` | 1 | `@byronwade/dropdown-menu` |
| `breadcrumb` | 1 | `@byronwade/breadcrumb` |
| `accordion` | 1 | `@byronwade/accordion` |

The remaining ~40 installed UI components (`alert-dialog`, `calendar`, `carousel`,
`context-menu`, `drawer`, `form`, `menubar`, `pagination`, `resizable`, `sidebar`, `slider`,
`spinner`, `input-otp`, `kbd`, `empty`, `field`, `item`, `button-group`, …) are **unused dead
code** and will be deleted rather than ported.

`code-block` is custom (built on `highlight.js`, **no Radix dependency**) — it stays and only
needs its color classes moved to byronwade/ui tokens.

## Key design consequence: primary vs brand

byronwade/ui's foundation defines `--primary` as a **near-black neutral** (`oklch(0.235 …)`)
and puts the warm-green accent in a separate `--brand` token. The current dits site uses the
olive-green AS the primary. After migration, the green becomes an **accent** (`bg-brand`,
`text-brand`, rings, the first chart line, success), and primary surfaces/buttons read neutral.
This is the intended byronwade/ui look and is accepted as part of the redesign. Re-skinning the
whole system later is a one-variable change (`--brand`).

## Registry facts (verified live)

- `https://ui.byronwade.com/r/foundation.json` → `200`, `type: registry:base`, has `cssVars`
  (44 light tokens + dark + `@theme` mappings).
- `https://ui.byronwade.com/r/button.json` → `200`.
- `https://ui.byronwade.com/r/all.json` → `200` (aggregator: pulls the whole catalog).
- Namespace to register in `components.json`: `"@byronwade": "https://ui.byronwade.com/r/{name}.json"`.

## Architecture / phases

### Phase 1 — Build toolchain: Tailwind v3 → v4
- Replace `tailwindcss` v3 + `autoprefixer` + `tailwindcss-animate` with Tailwind v4
  (`tailwindcss@4`, `@tailwindcss/postcss`, `tw-animate-css`).
- Rewrite `postcss.config.mjs` to use `@tailwindcss/postcss`.
- **Delete `tailwind.config.ts`** — v4 is CSS-first; the `dits` brand palette and token color
  mappings move into `globals.css` `@theme` (any genuinely-needed custom colors are re-declared
  there).
- Update `components.json`: keep `style`, set Tailwind v4 conventions (no config path / css-first),
  add the `@byronwade` registry entry.
- Bump `lucide-react` 0.468 → v1 (major) and align `next` 16.0.8 → 16.2.6 if needed for v4 / Base
  UI compatibility. Audit lucide icon imports for renamed icons.

### Phase 2 — Foundation token layer
- Run `npx shadcn@latest init https://ui.byronwade.com/r/foundation.json` (or merge the
  foundation `cssVars` blocks manually) so `globals.css` carries the OKLCH `:root`/`.dark` token
  layer, `@theme` mappings, the radius scale (`--radius-sm`…`--radius-4xl`), and house utilities
  (`bg-grid`, `bg-grid-lines`, `glow-brand`, `text-gradient`, `text-gradient-brand`,
  `mask-fade-x`, `full-bleed`, `shadow-float`, `shadow-card`, `scrollbar-thin`).
- Preserve the existing Geist font wiring (`--font-geist-sans` / `--font-geist-mono`) by mapping
  the foundation's `--font-sans` / `--font-mono` to the Geist CSS vars in `layout.tsx`.
- Keep `next-themes` `attribute="class"` dark-mode setup (foundation dark tokens key off `.dark`).
- Migrate any still-needed bespoke tokens from the old `globals.css` (e.g. `--code-*`) into the
  v4 token layer.

### Phase 3 — Components from the registry
- `npx shadcn@latest add @byronwade/all` to install the Base UI primitives, composites, libs
  (`utils`, `identity`), and house components into `components/ui/*` and `components/*`.
- Delete the ~40 unused old UI components.
- Port `code-block.tsx`: keep the highlight.js logic, swap its color classes to byronwade/ui
  tokens (`bg-card`/`bg-muted`, `text-foreground`, `border-border`, etc.).

### Phase 4 — API reconciliation (Radix → Base UI)
- Reconcile prop/import differences at the call sites of the 13 used components. Highest-churn:
  `sheet`, `dropdown-menu`, `tooltip`, `accordion` (Base UI part APIs differ from Radix). Lowest:
  `alert`, `card`, `badge`, `table` (mostly className-compatible).
- This is contained to roughly 8 files plus the high-fan-out but className-only swaps for
  `alert`/`card`/`table`/`badge`.

### Phase 5 — Full page redesign with composites
- Rebuild the key pages on byronwade/ui composites + house utilities:
  - **Home** — `hero-section` / `centered-focal`, `stat-card`, `metric-stat`, `bloom-dock`.
  - **Docs shell** — `page-header`, `section`; re-skin the bespoke `docs-sidebar` to tokens
    (byronwade/ui has no sidebar primitive).
  - **Download / About / Community** — `page-header`, `section`, `stat-card`, `status-pill`,
    `timeline-rail` / `event-timeline` where they fit.
- Update the 26 non-UI components (`header`, `footer`, `docs-sidebar`, `theme-toggle`,
  `alpha-banner`, benchmark cards/charts, diagrams) to tokens/composites.

### Phase 6 — Keep AI on-system
- Install `@byronwade/design-rules` and reference it from the web app's `CLAUDE.md` / `AGENTS.md`
  so future UI edits stay on-system (tokens only, compose from installed components).

### Phase 7 — Verify
- `next build` clean, `next lint` clean.
- Dark + light visual pass on home, a docs page, download, about, community.
- Spot-check the highest-fan-out components (`alert`, `card`, `table`) render correctly across pages.

## Components / boundaries

- **Build/config layer** — `postcss.config.mjs`, `components.json`, `package.json`,
  `globals.css`, `layout.tsx`. One clear job: stand up Tailwind v4 + the foundation token layer.
- **Primitive layer** — `components/ui/*` from the registry. Owned, copied code; extended via CVA
  variants + `cn()`, never one-off call-site color overrides.
- **Composite/page layer** — `components/*` and `app/**/page.tsx`. Consume primitives/composites;
  hold no hardcoded colors.
- **`code-block`** — the one retained bespoke primitive; isolated, no Base UI / Radix dependency.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Base UI ≠ Radix APIs (sheet/dropdown/tooltip/accordion) | Contained to ~8 files; reconcile per-component in Phase 4 with a build between each. |
| `lucide-react` v1 major bump renames icons | Audit all lucide imports; fix renamed icons. |
| `next` 16.0.8 vs registry's 16.2.6 | Align version if v4/Base UI compat requires it. |
| Foundation `init` overwrites `globals.css` | We *want* a clean token layer; migrate the few bespoke tokens (`--code-*`) forward by hand. |
| Visual shift (green primary → neutral primary + green accent) | Accepted, intended byronwade/ui look; documented above. |
| Unused-component deletion hides a real usage | Deletion gated on the verified zero-usage grep; `next build` catches any missed import. |

## Out of scope

- The dits **CLI** (`apps/cli`) and any non-`apps/web` package.
- Re-skinning the brand to a non-green accent (possible later via `--brand`, not part of this work).
- Adding new product features or pages beyond redesigning existing ones.

## Success criteria

1. `apps/web` builds and lints clean on Tailwind v4 with the byronwade/ui foundation.
2. All 13 used components are byronwade/ui registry components (Base UI), plus the re-tokenized
   `code-block`; the ~40 unused components are gone.
3. `globals.css` carries only foundation tokens + the few migrated bespoke tokens — no hardcoded
   colors in pages/components.
4. Home, docs, download, about, and community are redesigned with byronwade/ui composites and read
   as the byronwade/ui design language in both light and dark.
5. `@byronwade/design-rules` is installed and referenced so future edits stay on-system.
