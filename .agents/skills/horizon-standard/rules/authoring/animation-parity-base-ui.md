---
title: Animation parity with Base UI
applies_to: component authoring (variant popup/panel slots)
severity: warning
ct_pattern: CT-6.r.3 (existing, hardened)
captures: FM-4
---

# Animation parity with Base UI

If a Base UI primitive has documented entrance / exit animation classes in its published examples, the Horizon component MUST mirror them in `<Component>.variants.ts`.

Base UI uses a two-piece pattern:
- `data-[starting-style]:...` and `data-[ending-style]:...` define the FROM/TO transform/opacity states.
- A separate `transition-*` class interpolates between them.

If the second piece is missing, the data-state attrs flip instantly and the overlay pops in/out with no motion.

## What to do

When wiring up a Base UI overlay primitive's popup slot:

1. Read Base UI's docs example for the primitive (Drawer, Dialog, Popover).
2. Copy BOTH pieces — the `data-[starting-style]` / `data-[ending-style]` classes AND the `transition-*` class.
3. Tune duration / easing to match Horizon design tokens (typically `duration-300 ease-out` for overlays).
4. For directional drawers, add `transition-transform` so translate states interpolate.

## What NOT to do

- Don't copy `data-[starting-style]:translate-y-full` without `transition-transform`.
- Don't use `animation-*` keyframe classes when Base UI uses transition. They don't mix well.
- Don't override Base UI's animation timing without confirming with design — the speed is part of the spec.

## Verifier coverage

CT-6.r.3 (animation incomplete) — hardened by the dual-state screenshot protocol. The verifier captures closed→open transitions and detects "no motion" / abrupt show as a finding.

## DX-1074 example

- Drawer.Popup had `data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full` but no `transition-transform`. Result: drawer popped in / out instantly. Added `transition-transform duration-300 ease-out` to the popup slot.

## Base UI Drawer Animation Pattern

The following rules encode the exact Base UI Drawer swipe-gesture animation pattern. These are derived from DX-1074 Round 3 findings and apply to all drawer-leg popups in Horizon.

### Live-position transform

The live-position transform MUST use the CSS custom property that Base UI Drawer controls during swipe gestures:

```
[transform:translateY(var(--drawer-swipe-movement-y))]
```

This class MUST be present on the popup element for swipe gesture positioning to work. Do NOT use Tailwind `translate-y-*` utilities — they produce static CSS values that override `--drawer-swipe-movement-y` and break swipe gesture positioning.

### Enter / Exit states

- Enter: `data-[starting-style]:[transform:translateY(calc(100%+2px))]`
- Exit: `data-[ending-style]:[transform:translateY(calc(100%+2px))]`

The `+2px` accounts for sub-pixel rendering and prevents a 1px gap flash at the bottom edge during the exit animation.

### Tailwind translate utilities are FORBIDDEN on drawer popups

`translate-y-full` (or any Tailwind `translate-*` utility) MUST NOT be used on Base UI Drawer/Dialog-as-drawer/Popover-as-drawer popup elements. Tailwind generates a static `transform: translateY(100%)` which fights `--drawer-swipe-movement-y` at cascade specificity and breaks swipe gesture positioning.

### Swipe-responsive timing

The duration MUST scale with swipe activity:

- `data-[swiping]:duration-0` — instant (zero duration) during an active swipe gesture; prevents laggy tracking
- `data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]` — release snap duration scales with swipe velocity; fast swipes snap faster, slow swipes animate longer

### Easing and base duration

- Easing: `[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]`
- Base duration: `duration-[450ms]`

### Direction variants

The same pattern applies to `Dialog.drawerPopup` and `Popover.drawerPopup` (the drawer leg of adaptive components). Use the relevant CSS custom property for the drawer's axis:

- Bottom sheet (default): `--drawer-swipe-movement-y`
- Left/right drawer: `--drawer-swipe-movement-x`

Substitute the direction-appropriate CSS variable and change the transform axis accordingly (e.g. `translateX` for left/right drawers).

## Violation Examples

### WRONG — Tailwind translate utility (breaks swipe)

```tsx
// variants.ts — WRONG
drawerPopup: [
  // Tailwind class produces static transform: translateY(100%)
  // This overrides --drawer-swipe-movement-y and breaks swipe positioning
  'data-[starting-style]:translate-y-full',
  'data-[ending-style]:translate-y-full',
  'transition-transform duration-300 ease-out',
]
```

### RIGHT — CSS variable live-position transform

```tsx
// variants.ts — CORRECT
drawerPopup: [
  // Live-position: Base UI controls this variable during swipe
  '[transform:translateY(var(--drawer-swipe-movement-y))]',
  // Enter from below (fully off-screen + 2px gap buffer)
  'data-[starting-style]:[transform:translateY(calc(100%+2px))]',
  // Exit to below
  'data-[ending-style]:[transform:translateY(calc(100%+2px))]',
  // Zero duration while swiping (tracks finger exactly)
  'data-[swiping]:duration-0',
  // Release snap: scales with swipe velocity
  'data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*400ms)]',
  // Base animation
  'duration-[450ms]',
  '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
  'transition-transform',
]
```
