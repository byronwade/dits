# Flagship docs page pattern

How to bring a docs page up to the byronwade/ui standard. Applied first to
`getting-started`, `concepts`, and `cli-reference` — use those as references.
This is a **re-layout**, not a rewrite: preserve all existing copy, links, and
code examples verbatim.

## 1. Page header — `DocPageHeader`

Replace the bare `<h1>` + `.lead` paragraph at the top of the page.

```tsx
import { DocPageHeader } from "@/components/doc-page-header";

<div className="prose dark:prose-invert max-w-none">
  <DocPageHeader
    eyebrow="Getting Started"        // the section / nav group
    title="Getting Started with Dits" // reuse the existing <h1> text
    description="…"                   // reuse the existing .lead text (drop its text-xl classes)
  />

  <h2>First section…</h2>
</div>
```

- `eyebrow`, `title`, `description` props only — do not invent new copy.
- The component is internally wrapped in `not-prose`; render it as the first
  child inside the `.prose` block.

## 2. Callouts — `Callout`

Replace every ad-hoc `<Alert>` block (and inline "Note:/Tip:/Warning:" prose).

```tsx
import { Callout } from "@/components/ui/callout";

<Callout type="warning" title="FUSE Requirements" className="not-prose my-4">
  …children verbatim from the old AlertDescription…
</Callout>
```

- **Always keep `not-prose` + the spacing (`my-4` / `my-6`)** the original Alert
  had — `Callout` forwards `className` but does NOT add `not-prose` itself, and
  callout bodies containing `<ul>`/`<code>` will inherit prose styling without it.
- `type` mapping used in the flagship pages:
  - `Info` icon → `type="note"`
  - `Lightbulb` icon → `type="tip"`
  - warning-tinted Alert → `type="warning"`
  - success / "production-ready" Alert → `type="important"`
- Pass the old `AlertTitle` text as `title`; move `AlertDescription` children in as-is.

## 3. Card grids for features / concepts / commands

Elevate raw `<div className="border rounded-lg p-4">` lists to `Card`.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

<div className="not-prose grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
  <Card>
    <CardHeader>
      <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
        <Video className="size-5 text-brand" />
      </div>
      <CardTitle className="text-base">Video Editor</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>…existing list items, verbatim…</li>
      </ul>
    </CardContent>
  </Card>
</div>
```

- To emphasize the "Dits" / preferred card, tint with the brand token:
  `<Card className="border-brand/40 bg-brand/5">` and `<CardTitle className="text-brand">`.
- The card grid wrapper stays `not-prose`. Card titles inside it are fine as
  `CardTitle` (not `<h2>/<h3>`) — see the TOC rule below.

## 4. TOC rule — keep section `<h2>`/`<h3>` in the prose flow

The docs layout auto-builds the "On this page" TOC from
`#doc-content .prose h2, #doc-content .prose h3`, **excluding any heading inside
`.not-prose`**. So:

- Section headings that introduce a block (e.g. the `<h2>` above a card grid)
  must be **direct children of `.prose`** — keep them OUTSIDE the `not-prose`
  wrapper, never bury them inside a Card.
- Card titles use `CardTitle` and live inside `not-prose` grids — intentionally
  absent from the TOC.
- Verify nothing regressed: `grep -c "<h2" page.tsx` and `grep -c "<h3" page.tsx`
  before and after — the prose-level heading count must not drop.

## 5. Tokens only — no hardcoded colors

Semantic tokens exclusively. No hex/`rgb()`/`hsl()`/named Tailwind palette
colors (`text-green-500`, `bg-blue-100`, etc.).

- Surfaces: `bg-card`, `bg-muted`, `bg-background`
- Borders: `border-border`, `border-brand/40`
- Text: `text-foreground`, `text-muted-foreground`, `text-brand`
- Brand accent: `bg-brand`, `text-brand`, `bg-brand/10` (single warm-green accent)
- Status: `text-info`, `text-success`, `text-warning`, `text-destructive`

Scan a page before committing:

```bash
grep -nE "#[0-9a-fA-F]{3,6}|\brgb\(|\bhsl\(|text-(gray|green|red|blue|amber|slate|zinc|emerald|pink|yellow|orange|purple)-[0-9]|bg-(gray|green|red|blue|slate|zinc|emerald|yellow|orange|purple)-[0-9]" page.tsx
```

Empty output = pass.

## 6. Leave intact

- SEO `<Script>` JSON-LD blocks and `export const metadata`.
- `CodeBlock` / `Tabs` code examples.
- Existing `Table` data and diagram components.
- After conversion, remove now-unused imports (`Alert*`, orphaned lucide icons).
