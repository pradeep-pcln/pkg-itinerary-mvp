---
name: horizon-package-reference
description: Map of @pcln/* packages that consume @pcln/horizon — foundation packages, domain packages, and legacy packages. Snapshot + recipe for staying current.
---

# Horizon package reference

Two parts: (1) **recipe** for staying oriented as packages come and go (evergreen), and (2) **snapshot** of the current package landscape (dated; refresh when the rule-promotion gate fires for a new candidate package).

## Recipe — how to find horizon packages

### In pcln-web monorepo

```bash
# All packages that depend on horizon (foundation + consumers)
find react-components design-system -maxdepth 2 -name package.json -not -path '*/node_modules/*' \
  | xargs grep -l '"@pcln/horizon\|"@pcln/horizon-' \
  | xargs -I{} dirname {} \
  | xargs -I{} grep '"name"' {}/package.json
```

Or via Rush:

```bash
rush list -p | grep -E 'horizon|@pcln/' | sort
```

### In an external repo

```bash
npm ls @pcln/horizon @pcln/horizon-* 2>/dev/null
# Or scan package.json directly
```

## Naming conventions

| Pattern | Meaning |
| --- | --- |
| `@pcln/horizon` | Core design system primitives + theme |
| `@pcln/horizon-<utility>` (icons, messaging, data-table, storybook-preset-addon, component-boilerplate) | Foundation utilities — not domain-specific |
| `@pcln/horizon-<domain>-components` | Domain component bundle (fly, penny, plaza, customer-growth, map, package, rentalcar) |
| `@pcln/horizon-<domain>-<feature>` | Single-feature domain component (hotel-listing-card, hotel-rate-table, fly-date-picker, hotels-price-display, summary-of-charges, promos, search-form) |
| `@pcln/<name>` (no horizon prefix, depends on horizon) | Legacy package being modernized OR app-specific component that hasn't yet earned a horizon-* name |

## Which package owns what?

When you need to import a domain component:

1. **Match the domain** in the package name (`-fly-`, `-hotel-`, `-penny-`, `-rentalcar-`, `-package-`, etc.)
2. **Prefer the modern horizon-prefixed one** when both exist:
   - `@pcln/horizon-summary-of-charges` over `@pcln/summary-of-charges`
   - `@pcln/horizon-hotel-rate-table` over `@pcln/rate-table`
3. **For Plaza UI** specifically: the old name is `@pcln/snowflake`; the modern one is `@pcln/horizon-plaza-components`. See `/plaza` skill for the migration story.
4. **For Penny UI** specifically: `@pcln/horizon-penny-components` is the design-system-aligned package; `@pcln/penny-chat-bot` is the higher-level chat-bot product. See `/genai-svc` skill if you're working on the backend.

## Snapshot (current as of 2026-05-06)

To refresh, run the recipe above. New packages added since this date are not in the snapshot.

### Foundation (design-system/)

| Package | Purpose |
| --- | --- |
| `@pcln/horizon` | Core primitives, tokens, theme, tailwind-variants wrapper |
| `@pcln/horizon-icons` | Icon set |
| `@pcln/horizon-data-table` | Generic data-table primitive (composable for any domain) |
| `@pcln/horizon-component-boilerplate` | Scaffolding template for new horizon-* packages |
| `@pcln/horizon-storybook-preset-addon` | Storybook preset wiring for horizon projects |
| `@pcln/horizon-messaging` | React-email components — see separate `/horizon-messaging` skill |

### Domain packages — horizon-prefixed (react-components/)

| Package | Domain | Notes |
| --- | --- | --- |
| `@pcln/horizon-customer-growth-components` | Customer growth | |
| `@pcln/horizon-fly-components` | Fly | |
| `@pcln/horizon-fly-date-picker` | Fly | Domain-specific date picker (locale defaults, fly-specific behavior) |
| `@pcln/horizon-hotel-listing-card` | Hotel | |
| `@pcln/horizon-hotel-rate-table` | Hotel | |
| `@pcln/horizon-hotels-price-display` | Hotel | |
| `@pcln/horizon-map-components` | Maps | |
| `@pcln/horizon-package-components` | Vacation packages | |
| `@pcln/horizon-penny-components` | Penny chatbot UI | Design-system-aligned; pair with `@pcln/penny-chat-bot` for end-to-end chat |
| `@pcln/horizon-plaza-components` | Plaza (IDP) | See `/plaza` skill for stack context |
| `@pcln/horizon-promos` | Promotions | |
| `@pcln/horizon-rentalcar-components` | Rental car | |
| `@pcln/horizon-search-form` | Search forms (cross-domain) | |
| `@pcln/horizon-summary-of-charges` | Cross-domain | Modern replacement for `@pcln/summary-of-charges` |

### Horizon-consuming, not horizon-prefixed (react-components/)

These either pre-date horizon's naming convention, are app-specific component packages, or are products built on top of horizon:

| Package | Notes |
| --- | --- |
| `@pcln/ancillary-products` | Ancillary product UI |
| `@pcln/barclays-card-signup` | Barclays card signup flow |
| `@pcln/communication-bridge` | Cross-app messaging bridge |
| `@pcln/fly-seats-embed` | Fly seats embed |
| `@pcln/hotel-detail` | Hotel detail page components |
| `@pcln/penny-chat-bot` | Penny chat bot product UI (uses horizon-penny-components inside) |
| `@pcln/rate-table` | Legacy rate-table — prefer `@pcln/horizon-hotel-rate-table` for new work |
| `@pcln/snowflake` | Legacy Plaza components — prefer `@pcln/horizon-plaza-components` |
| `@pcln/summary-of-charges` | Legacy summary-of-charges — prefer `@pcln/horizon-summary-of-charges` |

## How this file decays

- New horizon-* package added → run recipe + add row to snapshot
- Legacy package deprecated → mark in snapshot ("deprecated; migrate to X")
- A domain folds into another → update notes column

The snapshot is intentionally dated. If a section seems stale, run the recipe — the live state always wins over this file. The recipe is evergreen; the snapshot is a convenience.
