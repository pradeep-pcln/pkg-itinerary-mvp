---
title: Composition Patterns
impact: HIGH
tags: [composition, components, horizon-components, module]
applies-to: authoring
---

# Composition Patterns

## Core Principle: Prefer Composition Over Complexity

Always prefer composing multiple focused components over adding complexity to a single component. If a component is growing large or accumulating many conditional branches, split it into composable sub-components.

## Module: The Reference Exemplar

The Module component is the canonical example of composition done right.

### Namespace API Pattern

Expose sub-components as properties on a parent namespace:

```typescript
<Module.Layout heading="Title" subheading="Subtitle">
  <Module.Stats stats={data} />
  <Module.FAQ items={faqItems} />
</Module.Layout>
```

### Wrapper Factory Pattern

Each sub-component owns its variant logic and wraps a shared layout component (`ModuleLayout`):

```typescript
export const ModuleStats = forwardRef<HTMLElement, ModuleStatsProps>(
  function ModuleStats({ stats, maxColumns, children, ...sectionProps }, ref) {
    const { gridWrapper, grid, statItem } = moduleStatsVariants({ columns, display })
    const defaultContent = <div className={gridWrapper()}>...</div>
    return <ModuleLayout ref={ref} {...sectionProps}>{children ?? defaultContent}</ModuleLayout>
  }
)
```

### Slots-Based Composition

Use named slots for flexible content areas: `heading`, `subheading`, `image`, `background`, `children`. This lets consumers replace any section without modifying the component internals.

## Use Horizon Components Over Raw HTML — Components, Tests, AND Stories

Always reach for Horizon components instead of raw HTML elements. **This rule applies in component source, tests, AND stories.** Stories are the canonical example library — hand-rolled HTML in a story teaches the wrong pattern to every consumer that copies it.

| Instead of | Use |
|---|---|
| `<h1>`-`<h6>` | `<Heading as='h1' textStyle='heading1' />` (etc.) |
| `<p>` | `<P palette='neutral' shade='10' textStyle='body3' />` |
| `<span>` | `<Span textStyle='...' />` (exception: inline substrings within another text element) |
| `<small>` / fine print `<p>` | `<Caption />` |
| `<a>` | `<A>` or `<PlainA>` |
| `<button>` | `<Button>` / `<IconButton>` for icon-only |
| Cards / surfaces (`<div className='shadow rounded'>`) | `<Card>` / `<Module>` |
| Scrollable bodies (`<div className='overflow-y-auto'>`) | `<ScrollArea>` (with `dialogBody` / `drawerBody` slot for overlays) |

**Typography + palette discipline:** when reaching for any text component, use Horizon `textStyle` tokens from the typography scale and Horizon palette/shade tokens — never raw Tailwind text-size or text-color utilities. The component family + token system is the authoritative typography surface; bypassing it produces visual drift.

This ensures consistent styling, accessibility defaults, and design-token adherence across the system. Plain HTML for content-bearing elements in any of: component source, `.spec.tsx`, `.testFixtures.tsx`, `.stories.tsx` is a regression finding.

Exceptions: genuinely-content-semantic non-decorative tags (`<section>`, `<article>` when the meaning matters), and layout-only `<div>` containers that wrap Horizon children.

## Overlay Header / Description / Footer Visual Contract

Overlay primitives (Dialog, Drawer, AlertDialog, Popover) must satisfy this contract — both component source and stories:

### Popup container
- `Dialog.Popup` / `Drawer.Popup` / `AlertDialog.Popup` MUST set `overflow-hidden` on the rounded container so corner radius clips header and footer chrome. Without `overflow-hidden`, header/footer backgrounds bleed past the rounded corners and the popup looks square.
- Popup uses `flex flex-col` with bounded `max-height` so sticky chrome works and the body scrolls while header/footer stay pinned.

### Header (`PopupHeader`)
- Uniform **`p-2`** (8px) padding on the header container — symmetric on all four sides.
- The Title and (optional) Description are **stacked column-wise** beneath each other, never as siblings in a flex row.
- The Close button is **top-aligned** to the title row, not vertically centered against the entire header block. Visual treatment: primary palette, emphasis bold, with shadow.

### Description placement
- The Dialog/Drawer/AlertDialog Description (Base UI's `*.Description` slot) is the **first child of the scroll body** (inside the `ScrollArea` with `dialogBody`/`drawerBody` slot) — it is **NOT** inside `PopupHeader`.
- Rationale: descriptions can be long. When forced into the header, they push the close button down, break the flex-row vs flex-col layout, and visually merge with the heading. Placing them as the first body child keeps the header tight and lets descriptions scroll with the body.

### Footer (`ActionFooter`)
- Stuck to the **bottom** of the popup via the sticky-bottom pattern — not floating mid-frame.
- Exactly **one** ActionFooter per popup. A floating button + sticky footer is the "belt and suspenders" anti-pattern.
- `tone='frosted'` requires a non-opaque popup background to work; against an opaque popup, use the default tone with a top border.

Failing any of these is blocking in component source (`.tsx`, `.variants.ts`) and in stories.

## React Keys

- Use stable, unique identifiers as keys (IDs, slugs) — never array indices unless the list is static and never reordered
- Keys must be set on the outermost element returned in a `.map()` call

## When to Split vs Keep Together

**Split into sub-components when:**
- A section has its own variant logic
- A block of JSX is reused in multiple places
- The component file exceeds ~200 lines of JSX
- Distinct visual regions map to distinct concerns

**Keep together when:**
- The markup is simple and linear
- Splitting would create single-use components with no independent logic
- The "sub-component" would just pass all props through unchanged

## Splitting a Compound Component Across Files

Once a compound component (one that exposes a namespace API like `Module.Stats`,
`Breadcrumb.List`, `Carousel.DotButton`) accumulates multiple substantive
subparts, it should be split into **one file per subpart** — not crammed into a
single `.components.tsx` aggregator.

The full layout, threshold rules (4+ substantive subparts OR >200 lines OR
divergent prop shapes), and per-subpart authoring requirements (`'use client'`
placement, imports, namespace assembly file, barrel convention) live in
`component-anatomy.md` under **Compound Components: Subpart-per-File Layout**.

**Pattern reference points:**
- `Module/` — subfolder per subpart, each with its own `Module<Subpart>.variants.ts` (independent axes, no shared cascade)
- `Breadcrumb/` — subfolder per subpart, but a **single shared** `Breadcrumb.variants.ts` (axes cascade via context + cross-slot compound variants)
- `Carousel/` — flat per-subpart files (acceptable when subparts won't grow)
- `Menu/` — single `.components.tsx` aggregator (only when subparts are thin Base UI re-exports)

For the rule on choosing shared vs per-subpart variants files, see
`component-anatomy.md` § **Where Variants Live: Shared vs Per-Subpart**.
