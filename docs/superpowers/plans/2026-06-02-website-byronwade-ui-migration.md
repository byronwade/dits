# Website byronwade/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the dits website (`apps/web`) to fully consume the byronwade/ui design system — Tailwind v4 + Base UI primitives from the live registry at `https://ui.byronwade.com` — then redesign key pages with byronwade/ui composites.

**Architecture:** Convert the build to Tailwind v4 (CSS-first, no `tailwind.config.ts`), install the foundation OKLCH token layer + Base UI components from the `@byronwade` registry into the project's owned component code, reconcile Radix→Base UI call-site API differences (chiefly `asChild`→`render`), preserve the hand-rolled `.prose`/app CSS, then redesign pages on composites.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`, `tw-animate-css`), Base UI (`@base-ui/react`), shadcn CLI v4, lucide-react v1, next-themes, recharts.

**No test framework exists in `apps/web`.** Per-task verification gates are therefore: `npx tsc --noEmit` (typecheck), `npm run build`, `npm run lint`, and explicit visual checks — not unit tests. These are real gates: a task is not done until its gate passes with the expected output.

**Working directory for all commands:** `apps/web` (i.e. `/Users/byronwade/dits/apps/web`) unless stated otherwise.

**Registry facts (verified live):**
- Base URL: `https://ui.byronwade.com`, namespace `@byronwade` → `https://ui.byronwade.com/r/{name}.json`
- `foundation` is `type: registry:base` with `cssVars` (light/dark/theme) — installs via `init`.
- `all` is an aggregator that pulls the whole catalog via `add`.

**The 13 components actually used** (everything else under `src/components/ui/` is unused dead code to delete):
`alert`(70 files), `code-block`(59, custom-keep), `card`(53), `table`(45), `badge`(22), `tabs`(17), `button`(11), `tooltip`(3), `sheet`(2), `sonner`(1), `dropdown-menu`(1), `breadcrumb`(1), `accordion`(1).

---

## File Structure

**Build/config layer** (one job: stand up Tailwind v4 + foundation tokens)
- Modify: `apps/web/package.json` — swap Tailwind v3 deps for v4, bump `lucide-react`.
- Modify: `apps/web/postcss.config.mjs` — use `@tailwindcss/postcss`.
- Delete: `apps/web/tailwind.config.ts` — v4 is CSS-first.
- Modify: `apps/web/components.json` — v4 conventions + `@byronwade` registry.
- Modify: `apps/web/src/app/globals.css` — foundation token layer (replaces lines 1–107) + preserved app CSS (lines 108–708, v4-converted).
- Modify: `apps/web/src/app/layout.tsx` — map foundation `--font-sans`/`--font-mono` to Geist vars.

**Primitive layer** (registry-owned code)
- Replace: `apps/web/src/components/ui/*` — Base UI primitives from `@byronwade/all`.
- Delete: the ~40 unused UI component files.
- Keep + re-token: `apps/web/src/components/ui/code-block.tsx`.

**Composite/page layer**
- Modify: `apps/web/src/components/*.tsx` (26 non-UI components) and `apps/web/src/app/**/page.tsx` (~80 pages) — reconcile APIs, then redesign key pages on composites.

**AI rule**
- Create: `apps/web/AGENTS.md` (or append to project `CLAUDE.md`) referencing installed `@byronwade/design-rules`.

---

## Task 1: Create migration branch and capture baseline

**Files:** none (git + build).

- [ ] **Step 1: Create the branch**

```bash
cd /Users/byronwade/dits
git checkout -b feat/byronwade-ui-migration
```

- [ ] **Step 2: Confirm the web app builds on the current (v3) stack first**

```bash
cd /Users/byronwade/dits/apps/web
npm install
npm run build
```
Expected: build succeeds (this is the green baseline we migrate away from). If it already fails, stop and report — do not migrate on top of a broken baseline.

- [ ] **Step 3: Commit the baseline marker**

```bash
cd /Users/byronwade/dits
git add -A
git commit -m "chore: baseline before byronwade/ui migration" --allow-empty
```

---

## Task 2: Switch the build to Tailwind v4

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/postcss.config.mjs`
- Delete: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Replace Tailwind v3 toolchain deps with v4**

```bash
cd /Users/byronwade/dits/apps/web
npm uninstall tailwindcss autoprefixer tailwindcss-animate
npm install -D tailwindcss@4 @tailwindcss/postcss
npm install tw-animate-css
npm install lucide-react@^1
```

NOTE: do NOT manually install `@base-ui/react` or `recharts@3` here — they are declared as npm `dependencies` in the registry items (verified: `button.json` → `@base-ui/react` + `class-variance-authority`; `chart.json` → `recharts`), so `shadcn add @byronwade/all` (Task 6) installs them automatically. Expect new entries to appear in `package.json` during Task 6; that's correct, not a mistake.

- [ ] **Step 2: Rewrite `postcss.config.mjs` for v4**

Replace the entire file with:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 3: Delete the v3 Tailwind config**

```bash
cd /Users/byronwade/dits/apps/web
rm -f tailwind.config.ts
```
(v4 reads config from CSS via `@theme`, so this file is obsolete.)

- [ ] **Step 4: Do NOT build yet**

The build will fail until `globals.css` is converted in Task 4. This task only changes the toolchain. Proceed to Task 3.

- [ ] **Step 5: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/package.json apps/web/package-lock.json apps/web/postcss.config.mjs
git rm apps/web/tailwind.config.ts
git commit -m "build: switch web app to Tailwind v4 toolchain"
```

---

## Task 3: Run foundation init, then register the @byronwade namespace

ORDER MATTERS: `shadcn init` **regenerates `components.json`**, so the registry namespace must be written AFTER init, not before — otherwise Task 6's `add @byronwade/all` fails with an unknown namespace. The CSS backup must happen BEFORE init, since init overwrites `globals.css`.

**Files:**
- Modify: `apps/web/components.json` (regenerated by init, then edited)
- Modify: `apps/web/src/app/globals.css` (token layer written by init)

- [ ] **Step 1: Back up the current app CSS (lines 108–end) BEFORE init overwrites globals.css**

```bash
cd /Users/byronwade/dits/apps/web
sed -n '108,$p' src/app/globals.css > /tmp/dits-app-css.css
wc -l /tmp/dits-app-css.css
```
Expected: ~600 lines captured. (`globals.css` lines 1–107 are the old v3 HSL token layer — discarded; lines 108–end are hand-rolled app CSS — `.container`, `.no-scrollbar`, `.hljs`/code styling, smooth-scroll, `.skip-link`, focus rings, `.tabular-nums`, `.overscroll-contain`, `@keyframes ellipsis`, and ~250 lines of `.prose` typography that 80 docs pages depend on — preserved in Task 4.)

- [ ] **Step 2: Run the foundation init to write the v4 token layer + base components.json**

```bash
cd /Users/byronwade/dits/apps/web
npx shadcn@latest init https://ui.byronwade.com/r/foundation.json
```
When prompted, accept overwriting `globals.css` (the token layer is what we want). This writes `@import "tailwindcss";`, `@import "tw-animate-css";`, the `:root`/`.dark` OKLCH tokens, the `@theme inline` mappings, the radius scale, house utilities (`bg-grid`, `glow-brand`, `text-gradient`, `shadow-card`, etc.), and a fresh `components.json`.

- [ ] **Step 3: Write the registry namespace + aliases into the init-generated `components.json`**

Overwrite `components.json` with (keeps New York style, v4 conventions, the registry namespace):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "@byronwade": "https://ui.byronwade.com/r/{name}.json"
  }
}
```

- [ ] **Step 4: Verify the namespace resolves**

```bash
cd /Users/byronwade/dits/apps/web
curl -s -o /dev/null -w "%{http_code}\n" https://ui.byronwade.com/r/foundation.json
```
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/components.json apps/web/src/app/globals.css
git commit -m "build: foundation init + register @byronwade namespace in components.json"
```

---

## Task 4: Reassemble globals.css — foundation tokens + preserved app CSS

Init (Task 3) wrote the foundation token layer into `globals.css` but discarded the hand-rolled app CSS. Re-append the backup from `/tmp/dits-app-css.css` and convert the few v3 remnants.

- [ ] **Step 1: Re-append the preserved app CSS, converting v3 remnants**

Append `/tmp/dits-app-css.css` to the END of the new `globals.css`, then fix these v3→v4 issues in the appended block:
- `@apply` directives still work in v4 in the main entry CSS — leave them.
- Any `@layer base { ... }` blocks still work — leave them.
- The code-block styling references `hsl(var(--code-background))`, `--code-foreground`, `--code-border`. These tokens no longer exist (foundation is OKLCH and has no `--code-*`). Add them back to the `:root` and `.dark` blocks in `globals.css`:

```css
:root {
  --code-background: oklch(0.205 0.006 72);
  --code-foreground: oklch(0.92 0.01 95);
  --code-border: oklch(0.27 0.006 72);
}
.dark {
  --code-background: oklch(0.18 0.006 72);
  --code-foreground: oklch(0.92 0.01 95);
  --code-border: oklch(0.27 0.006 72);
}
```
- Replace any remaining `hsl(var(--code-background))` usages in the appended CSS with `var(--code-background)` (OKLCH values are stored whole, not as HSL channels).
- Remove the duplicated `.dark pre code.hljs` rules only if they conflict; otherwise keep the hljs theme block verbatim — it is plain CSS and v4-safe.

- [ ] **Step 2: Build and verify CSS compiles**

```bash
cd /Users/byronwade/dits/apps/web
npm run build
```
Expected: build succeeds. If it fails on an unknown utility (e.g. an `@apply` referencing a class that no longer exists), fix that specific utility reference and re-run. Do not proceed until green.

- [ ] **Step 3: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/app/globals.css
git commit -m "style: preserve app + prose CSS, add --code-* tokens (v4)"
```

---

## Task 5: Wire Geist fonts to the foundation font tokens

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

The foundation maps `--font-sans → var(--font-sans)` and `--font-mono → var(--font-geist-mono)` in its `@theme`. The app already exposes `--font-geist-sans` and `--font-geist-mono` via `next/font`. Bridge them.

- [ ] **Step 1: Add the bridge in `globals.css` `@theme` (or `:root`)**

Ensure `globals.css` contains, after the foundation `@theme` block:

```css
:root {
  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;
}
```

- [ ] **Step 2: Confirm `layout.tsx` still applies the Geist variables on `<body>`**

`src/app/layout.tsx:106` already has `className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}`. Leave it. No code change needed beyond Step 1 if this line is intact; verify it is.

- [ ] **Step 3: Build**

```bash
cd /Users/byronwade/dits/apps/web && npm run build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "style: bridge Geist fonts to foundation --font-sans/--font-mono"
```

---

## Task 6: Install the byronwade/ui component catalog and delete unused components

**Files:**
- Replace: `apps/web/src/components/ui/{alert,card,table,badge,tabs,button,tooltip,sheet,sonner,dropdown-menu,breadcrumb,accordion}.tsx` (+ all transitive deps, libs, composites)
- Delete: the ~40 unused UI component files

- [ ] **Step 1: Add the whole catalog**

```bash
cd /Users/byronwade/dits/apps/web
npx shadcn@latest add @byronwade/all --overwrite
```
This installs all primitives (Base UI), libs (`utils`, `identity`), and composites (`hero-section`, `page-header`, `section`, `stat-card`, `metric-stat`, `status-pill`, `timeline-rail`, `event-timeline`, `bloom`, `bloom-dock`, `gauge`, etc.) into `components/ui/*` and `components/*`. `--overwrite` replaces the old shadcn primitives with the Base UI versions.

- [ ] **Step 2: Verify `lib/utils.ts` `cn` is intact (composites import it)**

```bash
cd /Users/byronwade/dits/apps/web
grep -n "export function cn" src/lib/utils.ts
```
Expected: one match. If `add` placed it elsewhere, reconcile the import path.

- [ ] **Step 3: Delete the unused UI components**

Delete ONLY the orphans byronwade/ui does **not** provide (these have no registry equivalent AND zero usage outside `src/components/ui/`). Every other component IS part of the catalog `@byronwade/all` just installed — keep those, since Option A is "fully consume the registry" and the redesign tasks will need inputs/avatars/separators/etc.:

```bash
cd /Users/byronwade/dits/apps/web/src/components/ui
rm -f alert-dialog.tsx button-group.tsx calendar.tsx carousel.tsx context-menu.tsx \
  drawer.tsx empty.tsx field.tsx form.tsx input-otp.tsx item.tsx kbd.tsx \
  menubar.tsx pagination.tsx resizable.tsx sidebar.tsx slider.tsx spinner.tsx
```
NOTE: do NOT delete `code-block.tsx`, `chart.tsx`, or any catalog component (`input`, `textarea`, `label`, `select`, `checkbox`, `switch`, `radio-group`, `popover`, `progress`, `skeleton`, `avatar`, `separator`, `aspect-ratio`, `scroll-area`, `collapsible`, `toggle`, `toggle-group`, `command`, `hover-card`, `navigation-menu`, `tooltip`, `sonner`, etc. — all provided by `@byronwade/all`). `chart.tsx` was overwritten by byronwade's recharts-v3 chart in Step 1; that's intended.

- [ ] **Step 4: Typecheck to find broken imports**

```bash
cd /Users/byronwade/dits/apps/web
npx tsc --noEmit 2>&1 | head -60
```
Expected: errors ONLY about Base UI API differences (Task 8/9 fixes these) and possibly lucide icon renames (Task 10). If an error says a deleted file is imported, restore that one file. Record the error list — it drives Tasks 8–10.

- [ ] **Step 5: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src/components apps/web/src/lib
git commit -m "feat: install @byronwade/ui catalog (Base UI), remove unused components"
```

---

## Task 7: Re-token the custom code-block component

**Files:**
- Modify: `apps/web/src/components/ui/code-block.tsx`

`code-block` is custom (highlight.js, no Radix/Base UI dependency). It survives the swap; only its color classes move onto foundation tokens.

- [ ] **Step 1: Replace hardcoded/old-token classes with foundation tokens**

In `code-block.tsx`, change container/text/border classes to:
- background → `bg-card` (or `var(--code-background)` where the inline code-bg is intended)
- text → `text-foreground` / `text-muted-foreground`
- borders → `border-border`
- copy-button hover → `hover:bg-muted`

Keep the `import "highlight.js/styles/github.css"` / `github-dark.css` imports and the `Check`/`Copy` lucide imports.

- [ ] **Step 2: Build**

```bash
cd /Users/byronwade/dits/apps/web && npm run build
```
Expected: success (or only pre-existing Task 8/9/10 errors elsewhere).

- [ ] **Step 3: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/components/ui/code-block.tsx
git commit -m "style: re-token code-block onto foundation tokens"
```

---

## Task 8: Reconcile `asChild` → `render` (Base UI) across all call sites

Radix's `asChild` does not exist in Base UI; the equivalent is the `render` prop. 15 files use `asChild`. The byronwade button auto-infers `nativeButton={false}` when `render` swaps in a non-button (e.g. a Next `<Link>`), so no extra prop is needed.

**Files (all in `apps/web/src`):**
`app/docs/layout.tsx`, `app/about/page.tsx`, `app/page.tsx`, `app/docs/testing/page.tsx`, `app/docs/api/sdks/page.tsx`, `app/docs/api/cicd/page.tsx`, `app/community/page.tsx`, `app/download/page.tsx`, `components/header.tsx`, `components/theme-toggle.tsx`, `components/seo-breadcrumb.tsx`, `components/docs/file-tree.tsx`, `components/benchmarks/benchmark-table.tsx`, `components/benchmarks/benchmark-metric-card.tsx`, `components/benchmarks/benchmark-comparison-chart.tsx`

- [ ] **Step 1: Transform the Button+Link pattern**

For every `<Button ... asChild>` wrapping a single child element, move the wrapped element into `render` (without its children) and keep the text/icon children inside `Button`. Example (`app/page.tsx`):

Before:
```tsx
<Button size="lg" asChild>
  <Link href="/download">Download dits</Link>
</Button>
```
After:
```tsx
<Button size="lg" render={<Link href="/download" />}>Download dits</Button>
```

- [ ] **Step 2: Transform other triggers (DropdownMenuTrigger, SheetTrigger, BreadcrumbLink, TooltipTrigger)**

Same rule — the wrapped element goes into `render`, inner content stays as children. Example (`components/theme-toggle.tsx`):

Before:
```tsx
<DropdownMenuTrigger asChild>
  <Button variant="ghost" size="icon">
    <Sun ... />
    <Moon ... />
    <span className="sr-only">Toggle theme</span>
  </Button>
</DropdownMenuTrigger>
```
After:
```tsx
<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
  <Sun ... />
  <Moon ... />
  <span className="sr-only">Toggle theme</span>
</DropdownMenuTrigger>
```

Example (`components/seo-breadcrumb.tsx`):
```tsx
<BreadcrumbLink render={<Link href={item.href} />}>{item.label}</BreadcrumbLink>
```

- [ ] **Step 3: Find any stragglers**

```bash
cd /Users/byronwade/dits/apps/web
grep -rn "asChild" src --include="*.tsx" | grep -v "src/components/ui/"
```
Expected: no output (all converted). If `src/components/ui/*` still shows `asChild`, that's a registry component bug — leave it (registry-owned); but the catalog should already use `render`.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/byronwade/dits/apps/web && npx tsc --noEmit 2>&1 | grep -i "aschild\|render" | head
```
Expected: no `asChild`/`render` type errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src
git commit -m "refactor: convert Radix asChild to Base UI render across call sites"
```

---

## Task 9: Reconcile the accordion API

**Files:**
- Modify: `apps/web/src/app/page.tsx` (the only `<Accordion>` user, ~line 568)

Base UI Accordion uses `openMultiple` (boolean), not Radix's `type="single" | "multiple"` + `collapsible`.

- [ ] **Step 1: Change the Accordion props**

Before:
```tsx
<Accordion type="single" collapsible className="w-full">
```
After (single-open, collapsible is Base UI default behavior):
```tsx
<Accordion openMultiple={false} className="w-full">
```
Leave `AccordionItem value=`, `AccordionTrigger`, `AccordionContent` as-is (export names and `value` match).

- [ ] **Step 2: Typecheck the file**

```bash
cd /Users/byronwade/dits/apps/web && npx tsc --noEmit 2>&1 | grep "page.tsx" | head
```
Expected: no accordion-related errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/app/page.tsx
git commit -m "refactor: convert accordion to Base UI openMultiple API"
```

---

## Task 10: Resolve lucide-react v1 icon renames and reach a clean build

**Files:** any `*.tsx` importing from `lucide-react` (117 import sites).

- [ ] **Step 1: Full typecheck to surface missing icon exports**

```bash
cd /Users/byronwade/dits/apps/web
npx tsc --noEmit 2>&1 | grep -iE "lucide|has no exported member" | head -40
```
Expected: a list (possibly empty) of icons that were renamed/removed in lucide v1.

- [ ] **Step 2: Fix each missing icon**

For each `has no exported member 'XIcon'` from `lucide-react`, find the v1 name. Check the installed package:

```bash
cd /Users/byronwade/dits/apps/web
grep -oE "export \{ default as [A-Za-z0-9]+ \}" node_modules/lucide-react/dist/lucide-react.d.ts 2>/dev/null | grep -i "<partial-name>"
```
Replace the import and all JSX usages of the old name with the v1 name. (Most icons are stable; watch for numbered aliases like `BarChart3`, `CheckCircle2`, and `Loader2Icon`.)

- [ ] **Step 3: Full build — the hard gate**

```bash
cd /Users/byronwade/dits/apps/web && npm run build && npm run lint
```
Expected: build AND lint succeed. This proves the entire site compiles on Tailwind v4 + Base UI + lucide v1. Do not proceed to redesign until this is green.

- [ ] **Step 4: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src
git commit -m "fix: resolve lucide-react v1 icon renames; site builds on byronwade/ui"
```

---

## Task 11: Visual baseline pass (light + dark)

**Files:** none (manual verification).

- [ ] **Step 1: Run the dev server and walk the key routes**

```bash
cd /Users/byronwade/dits/apps/web && npm run dev
```
Visit and eyeball in BOTH light and dark: `/`, a docs page (e.g. `/docs/getting-started`), `/download`, `/about`, `/community`. Confirm: prose typography renders, code blocks are styled, no unstyled (FOUC) regions, the green now reads as an accent and primary surfaces read neutral.

- [ ] **Step 2: Record findings**

Note any broken layouts/contrast issues — these become redesign inputs for Tasks 12–16. No commit (read-only step).

---

## Task 12: Redesign the global chrome (header, footer, theme-toggle, alpha-banner)

> Redesign tasks are creative. REQUIRED SUB-SKILL when executing each: `frontend-design:frontend-design`. Compose from byronwade/ui components and tokens only (per `@byronwade/design-rules`). No hardcoded colors.

**Files:**
- Modify: `apps/web/src/components/header.tsx`, `footer.tsx`, `theme-toggle.tsx`, `alpha-banner.tsx`, `skip-link.tsx`

- [ ] **Step 1: Re-skin header to tokens + house utilities**

Use `bg-background/80 backdrop-blur`, `border-border`, `text-foreground`/`text-muted-foreground`, brand accent via `text-brand`/`bg-brand` for the logo/active state. Keep the mobile `Sheet` (already `side="right"`). Replace any bespoke nav styling with token utilities.

- [ ] **Step 2: Re-skin footer + alpha-banner + skip-link** to tokens (`bg-card`, `border-border`, `text-muted-foreground`; alpha-banner uses `bg-warning/10 text-warning` per status pattern).

- [ ] **Step 3: Build + visual check**

```bash
cd /Users/byronwade/dits/apps/web && npm run build
```
Then `npm run dev` and confirm header/footer in light+dark.

- [ ] **Step 4: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src/components
git commit -m "design: re-skin global chrome on byronwade/ui tokens"
```

---

## Task 13: Redesign the home page with composites

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Replace the hero with `hero-section` / `centered-focal`**

Import from the installed composite path (`@/components/hero-section`) and rebuild the top fold using it. Keep the existing CTA Buttons (now `render={<Link/>}`).

- [ ] **Step 2: Convert feature/stat blocks to `stat-card` + `metric-stat`**, FAQ stays on `accordion` (already converted), section wrappers use `@/components/section`.

- [ ] **Step 3: Optionally add `bloom-dock`** for the floating nav/CTA if it fits the design (skip if it complicates mobile).

- [ ] **Step 4: Build + visual check** (`npm run build`, then dev server, light+dark).

- [ ] **Step 5: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/app/page.tsx
git commit -m "design: rebuild home page on byronwade/ui composites"
```

---

## Task 14: Redesign the docs shell

**Files:**
- Modify: `apps/web/src/app/docs/layout.tsx`, `apps/web/src/components/docs-sidebar.tsx`, `apps/web/src/components/seo-breadcrumb.tsx`

- [ ] **Step 1: Use `page-header` + `section`** for the docs content frame; keep the mobile `Sheet` (`side="left"`).

- [ ] **Step 2: Re-skin `docs-sidebar`** to tokens (`bg-sidebar`/`text-sidebar-foreground` if present in foundation, else `bg-card`/`text-muted-foreground`; active item `bg-brand/10 text-brand`). byronwade/ui has no sidebar primitive — this stays bespoke, just re-tokened.

- [ ] **Step 3: Build + visual check** on 2–3 docs routes (light+dark), confirm prose + sidebar.

- [ ] **Step 4: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src/app/docs apps/web/src/components/docs-sidebar.tsx apps/web/src/components/seo-breadcrumb.tsx
git commit -m "design: rebuild docs shell on byronwade/ui composites + tokens"
```

---

## Task 15: Redesign download / about / community pages

**Files:**
- Modify: `apps/web/src/app/download/page.tsx`, `apps/web/src/app/about/page.tsx`, `apps/web/src/app/community/page.tsx`

- [ ] **Step 1: Apply `page-header` + `section`** to each; convert metric/feature blocks to `stat-card`/`metric-stat`; use `status-pill` for badges/states; use `timeline-rail`/`event-timeline` for any roadmap/changelog content.

- [ ] **Step 2: Build + visual check** each page in light+dark.

- [ ] **Step 3: Commit**

```bash
cd /Users/byronwade/dits
git add apps/web/src/app/download apps/web/src/app/about apps/web/src/app/community
git commit -m "design: rebuild download/about/community on byronwade/ui composites"
```

---

## Task 16: Re-token the diagram and benchmark components

**Files:**
- Modify: `apps/web/src/components/diagrams/*.tsx` (4), `apps/web/src/components/docs/*.tsx` (6), `apps/web/src/components/benchmarks/*.tsx` (3)

- [ ] **Step 1: Replace any hardcoded colors with tokens**

```bash
cd /Users/byronwade/dits/apps/web
grep -rnE "#[0-9a-fA-F]{3,6}|rgb\(|hsl\(|text-(gray|green|red|blue|amber)-[0-9]" src/components/diagrams src/components/docs src/components/benchmarks
```
Replace each hit with the semantic token (`text-brand`, `bg-muted`, `border-border`, chart tokens `var(--chart-1..5)`, etc.). Benchmark charts: map recharts series colors to `var(--chart-N)`.

- [ ] **Step 2: Confirm the 3 benchmark tooltip users** still compile against the new `tooltip` (Base UI). If they use recharts' own tooltip via `chart.tsx`, leave that; only the byronwade `tooltip` import path matters.

- [ ] **Step 3: Build + visual check** of a docs page containing diagrams and the benchmarks page (light+dark).

- [ ] **Step 4: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web/src/components/diagrams apps/web/src/components/docs apps/web/src/components/benchmarks
git commit -m "design: re-token diagrams and benchmark components"
```

---

## Task 17: Install the design-rules and point the agent at them

**Files:**
- Create/modify: `apps/web/AGENTS.md` (and optionally `apps/web/CLAUDE.md`)

- [ ] **Step 1: Install the rule**

```bash
cd /Users/byronwade/dits/apps/web
npx shadcn@latest add @byronwade/design-rules
```
This drops the rule file (e.g. `.cursor/rules/byronwade-ui.mdc`).

- [ ] **Step 2: Reference it from `AGENTS.md`**

Create/append `apps/web/AGENTS.md` with:

```md
# byronwade/ui design system

This app consumes the @byronwade/ui design system. Follow the installed rule at
`.cursor/rules/byronwade-ui.mdc`: compose from installed components, style with semantic
tokens only (no hex/rgb/named/arbitrary colors), re-skin via `--brand` only.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/byronwade/dits
git add -A apps/web
git commit -m "docs: install @byronwade/design-rules and reference from AGENTS.md"
```

---

## Task 18: Final verification

**Files:** none.

- [ ] **Step 1: Clean install + build + lint**

```bash
cd /Users/byronwade/dits/apps/web
rm -rf .next
npm run build && npm run lint
```
Expected: both succeed.

- [ ] **Step 2: Grep for hardcoded colors in pages/components (should be empty)**

```bash
cd /Users/byronwade/dits/apps/web
grep -rnE "#[0-9a-fA-F]{3,6}|\brgb\(|\bhsl\(|text-(gray|green|red|blue|amber|slate|zinc)-[0-9]" src/app src/components --include="*.tsx" | grep -v "src/components/ui/"
```
Expected: no output (registry `ui/*` files are exempt; they're system-owned). Fix any hits.

- [ ] **Step 3: Full visual pass** — `/`, 3 docs routes, `/download`, `/about`, `/community` in light AND dark. Confirm the site reads as the byronwade/ui design language.

- [ ] **Step 4: Final commit / ready for PR**

```bash
cd /Users/byronwade/dits
git add -A
git commit -m "chore: final byronwade/ui migration verification" --allow-empty
```

---

## Self-Review notes (coverage map spec → tasks)

- Spec Phase 1 (toolchain v3→v4) → Tasks 2, 3.
- Spec Phase 2 (foundation tokens, fonts, preserve bespoke CSS) → Tasks 4, 5.
- Spec Phase 3 (registry components, delete unused, port code-block) → Tasks 6, 7.
- Spec Phase 4 (Radix→Base UI API reconciliation) → Tasks 8, 9, 10.
- Spec Phase 5 (full redesign with composites; 26 non-UI components) → Tasks 12–16.
- Spec Phase 6 (design-rules on-system) → Task 17.
- Spec Phase 7 (verify) → Tasks 11, 18.
- Spec success criteria 1–5 → Tasks 10/18 (build+lint), 6 (components), 18 (no hardcoded colors), 13–16 (composites), 17 (design-rules).
