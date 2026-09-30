---
title: Layout Patterns
impact: HIGH
tags: [layout, grid, flex, z-index, container-queries]
applies-to: authoring
---

# Layout Patterns

## Prefer CSS Grid

Use CSS Grid for dynamic responsive layouts and multi-column content. Grid excels at two-dimensional layouts where items need to align both horizontally and vertically.

Nested flexes cause cascading styling issues. Always consider what parent containers might do to your layout before choosing flex. A flex child inside a flex parent can produce unexpected sizing and wrapping behavior.

### Grid vs Flex Decision

| Use Grid when | Use Flex when |
|---------------|---------------|
| Two-dimensional alignment needed | Single-axis flow (row or column) |
| Repeated items in columns/rows | Navigation bars, button groups |
| Content cards, stats, FAQ grids | Simple stacking or inline layout |
| You need `gap` + auto-fill/minmax | Items should wrap naturally |

### Module Component as Reference

The Module component (`design-system/horizon/src/components/Module/`) demonstrates the recommended pattern:
- **Flex** for layout structure (slots) — one-dimensional flow of named regions
- **Grid** for child content (stats, FAQ, selling points) — two-dimensional alignment of repeated items

```typescript
// ModuleLayout.variants.ts — flex for structure
slots: {
  root: '@container relative flex w-full justify-center',
  contentSlot: 'relative flex flex-col gap-8 @2xl:gap-12',
}

// ModuleStats.variants.ts — grid for child content
slots: {
  grid: 'grid gap-4',
}
variants: {
  columns: {
    2: { grid: 'grid-cols-2' },
    3: { grid: 'grid-cols-2 @2xl:grid-cols-3' },
    4: { grid: 'grid-cols-2 @2xl:grid-cols-4' },
  },
}
```

When the decision between grid and flex is unclear, prompt the developer with the pros and cons of each approach for their specific use case before proceeding.

## Stacking Context with `isolate`

**Always prefer `isolate`** for creating stacking context. Do not use `position: relative` or other hacks that create stacking context as a side effect.

```typescript
// ❌ BAD: position: relative as stacking context hack
slots: { root: 'relative' }  // Creates stacking context as side effect

// ✅ GOOD: explicit isolate
slots: { root: 'isolate' }   // Clear intent, no layout side effects
```

## Z-Index Discipline

- Only use `z-index` when absolutely necessary
- Try to solve layering with pseudo-elements (`::before`, `::after`) or composition first
- Many Horizon components already use `isolate` — check before adding z-index
- If you choose to use a z-index, you **MUST** justify it to the developer and ask for permission before applying it

Decision tree:
1. Can composition solve it? (render order, nesting) → Do that
2. Can `isolate` contain the stacking context? → Use `isolate`
3. Can pseudo-elements handle the layering? → Use `::before`/`::after`
4. None of the above work → Propose z-index with justification, get approval

## CSS Compositing: `clip-path` and `filter: drop-shadow()` MUST NOT share an element

**MUST NOT** place `clip-path` on the same element as `filter: drop-shadow()`.

CSS applies filter effects **before** clipping. When both appear on the same element, the drop-shadow is composited first and then `clip-path` clips it back to the element's bounding box — making the shadow completely invisible. This is silent: the code typechecks and lints clean, but the shadow disappears at runtime.

```tsx
// ❌ WRONG — clip-path silently kills the drop-shadow
slots: { popup: 'drop-shadow-overlay-md clip-path-[inset(0_round_24px)]' }

// ✅ CORRECT — clip-path on a child wrapper; shadow on the outer element
slots: {
  popup: 'drop-shadow-overlay-md',     // shadow on outer
  popupInner: '[clip-path:inset(0_round_24px)]',  // clip on child
}

// ✅ ALSO CORRECT — use overflow-hidden/overflow-clip for corner masking
slots: { popup: 'drop-shadow-overlay-md rounded-2xl overflow-clip' }
```

**Where this bites:** overlay components (Dialog, Drawer, Popover, Tooltip) that need both a drop shadow for elevation AND rounded corners via clip-path. Use `rounded-*` + `overflow-clip` on the popup slot for corner rounding; reserve `clip-path` for elements that do NOT carry a `drop-shadow-*` filter.

**Evidence:** DX-1074 QA Rounds I–VI — all six overlay types had invisible shadows caused by this compositing conflict. Fixed by removing `clip-path` from popup slots and using `overflow-clip` + CSS variable corner rounding (`--popup-corner-t/b`) instead.

## Prefer Container Queries Over Media Queries

Container queries are the **default choice** in Horizon. Media queries are the exception.

### Container Query Conventions

- Use `@container` with `@2xl` breakpoints (672px container width)
- For mobile stories in Storybook, use a container with `w-[390px]` arbitrary value
- Media queries are only appropriate for truly viewport-dependent cases (e.g., the Hero component which must respond to the full viewport)
- When unsure whether to use container or media queries, **default to container queries**

### Responsive Typography

Use container queries for responsive typography. For example, a heading that renders as `heading2` on mobile should scale to `heading1` at the `@2xl` container breakpoint.
