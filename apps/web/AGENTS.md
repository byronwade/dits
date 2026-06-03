# byronwade/ui design system

This app consumes the **@byronwade/ui** design system (a namespaced shadcn registry at
https://ui.byronwade.com, registered as `@byronwade` in `components.json`).

Follow the installed rule at `.cursor/rules/byronwade-ui.mdc`. Core constraints:
- Compose from installed components (`@/components/ui/*` primitives, `@/components/*` composites); add missing ones with `npx shadcn@latest add @byronwade/<name>`.
- Style with SEMANTIC TOKENS ONLY — no hex/rgb/hsl/named/arbitrary colors. Surfaces `bg-background`/`bg-card`; text `text-foreground`/`text-muted-foreground`; brand accent `bg-brand`/`text-brand`; state `text-success`/`text-warning`/`text-destructive`; data-viz `var(--chart-1..5)`.
- The whole system re-skins from one variable (`--brand`).
- Base UI primitives use the `render` prop (not Radix `asChild`).
