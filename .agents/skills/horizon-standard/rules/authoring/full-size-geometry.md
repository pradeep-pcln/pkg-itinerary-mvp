---
title: Full-size geometry mirrors peer sizes
applies_to: component variants (full, edge, fullscreen, max sizes)
severity: warning
ct_pattern: CT-16
captures: FM-8
---

# Full-size geometry mirrors peer sizes

"Full" / `edge` / `fullscreen` size variants of an overlay popup MUST share the same geometry tokens (border-radius, clip-path, edge inset) as their peer sizes. Diverging produces visual glitches: flat corners on a "full" popup, edge bleed where every other size has a scrim peek.

## What "shared geometry" means

For an overlay popup with `sm`, `md`, `lg`, `full` sizes:

- All sizes share the same `rounded-*` token (e.g. `rounded-2xl`).
- All sizes share the same `[clip-path:inset(...)]` token (so sticky-bg children clip to the rounded corners).
- All sizes mirror their `max-h-[calc(100dvh-16px)]` constraint with a matching `max-w-[calc(100dvw-16px)]` (8px scrim peek on every edge).
- "Full" is NOT an exception — it's the size that bleeds furthest, but it still observes the 8px-from-edge contract.

## What to do

When defining a `full` (or equivalent) size variant in `<Component>.variants.ts`:

1. Inherit `rounded-*` from the base popup slot. Don't override to `rounded-none`.
2. Inherit `[clip-path:inset(...)]` from the base popup slot. Don't override to `[clip-path:none]`.
3. Set both width AND height bleed using the same calc pattern:
   ```ts
   full: {
     popup: 'h-[calc(100dvh-16px)] w-[calc(100dvw-16px)] max-h-[calc(100dvh-16px)] max-w-[calc(100dvw-16px)]'
   }
   ```
4. For drawer-mode peers (`drawerPopup`), keep the rounded-top corners (drawers anchor to bottom of viewport).

## What NOT to do

- Don't use `rounded-none` to "make it feel full-screen". Designers use the rounded shape as a popup-vs-app-shell visual signal.
- Don't use `w-[100dvw]` / `h-[100dvh]` (no edge inset). Always subtract 16px.
- Don't set `[clip-path:none]` to "let content bleed". The clip-path is what makes sticky-bg children (PopupHeader) clip to the rounded corners.

## Verifier coverage

CT-16 — compares the `full` size's geometry tokens against the base popup slot AND the peer sizes. Emits `[full-size-shared-geometry]` for divergence.

## DX-1074 example

- Dialog `size.full` was setting `rounded-none [clip-path:none]` + no `max-w-` mirror. Result: flat corners + edge bleed. Fixed to inherit `rounded-2xl` + `clip-path` and set `max-w-[calc(100dvw-16px)]`.
