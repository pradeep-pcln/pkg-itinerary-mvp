---
title: Quality Checklist
impact: HIGH
tags: [checklist, quality, pre-publish]
applies-to: shared
---

# Quality Checklist

Pre-publish checklist for any Horizon-based component or feature. This is the gate before code review.

## Component Anatomy
- [ ] Single export per main component file (React Fast Refresh)
- [ ] forwardRef to appropriate DOM element with named function
- [ ] JSDoc with description and `@import` tag
- [ ] Direct imports only (no barrel file imports like `'.'`)

## Composition
- [ ] Prefers composition over boolean prop proliferation
- [ ] Uses Horizon components (`<Heading>`, `<P>`, `<Span>`, `<A>`, `<Button>`) over raw HTML
- [ ] `<span>` only used for inline substrings within another text element

## Styling
- [ ] All styling in `.variants.ts` via `tv()` — no inline conditional classes or styles
- [ ] Color utilities use Horizon theme tokens only; no Tailwind default palettes (`gray-*`, `blue-*`, `red-*`, `black`, `white`, etc.)
- [ ] Variant types exported: `VariantProps<typeof variants>` and `typeof variants.slots`
- [ ] Single strings for class definitions (no arrays)
- [ ] Opacity via Tailwind modifiers (`bg-neutral-11/80`), no `rgba()`

## TypeScript
- [ ] `import type` for all type-only imports
- [ ] Props extend variant types + HTML element types
- [ ] `Readonly<Props>` for component parameters
- [ ] No unnecessary type coercion

## Layout
- [ ] Container queries preferred over media queries (unless viewport-dependent)
- [ ] No z-index without justification and developer approval
- [ ] `isolate` preferred for stacking context (not `position: relative` hacks)
- [ ] Grid vs flex decision considered with parent container effects in mind

## Accessibility
- [ ] Keyboard navigable (if interactive)
- [ ] ARIA attributes where needed
- [ ] Focus management for overlays
- [ ] Touch targets >= 44x44px

## Storybook
- [ ] Mobile stories present (if component uses container queries, media queries, or viewport units)
- [ ] JSX-based stories (not snapshotStoryDecorator)
- [ ] Interaction tests where feasible
- [ ] No manual args unless react-docgen-typescript can't infer
- [ ] children/node props hidden from Controls

## Testing
- [ ] testFixtures file shared between stories and specs
- [ ] No class name assertions (Chromatic handles visual regression)
- [ ] Behavior, accessibility, and edge cases covered

## SonarQube
- [ ] No hooks outside component functions
- [ ] Namespaced functions (Number.parseInt, etc.)
- [ ] globalThis over window
- [ ] for...of over forEach
- [ ] Low cyclomatic complexity

## Package
- [ ] No duplicated horizon dependencies (unless directly imported)
- [ ] Tailwind CSS imports follow convention
- [ ] type: module with appropriate rig
