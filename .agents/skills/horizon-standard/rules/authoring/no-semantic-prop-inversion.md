---
title: No semantic prop inversion (overlay close-buttons)
applies_to: overlay close-button subparts (Tooltip, PopupHeader.Close, Dialog.Close, Drawer.Close, Popover.Close)
severity: blocking
ct_pattern: CT-15
captures: FM-5
---

# No semantic prop inversion (overlay close-buttons)

Overlay close-button subparts MUST pass the parent overlay's semantic props through to their inner button unchanged. Inverting `emphasis`, `palette`, `tone`, or any other prop is a design anti-pattern.

## What this means

If the parent overlay has `emphasis='bold'`, its close button is also `emphasis='bold'`. If `'regular'`, also `'regular'`. Pass-through, not invert.

```tsx
// Correct — pass-through
<IconButton emphasis={emphasis} ... />

// Wrong — inverted intent
<IconButton emphasis={emphasis === 'bold' ? 'regular' : 'bold'} ... />
```

## Why

Designers choose a single emphasis per overlay. The close affordance is part of that visual emphasis — flipping it produces a button the designer never approved.

If contrast is the real concern (close icon needs to remain visible on dark surface), address it via design tokens (a `closeButton` slot with surface-aware colors) rather than a ternary on the user's prop.

## Scope (intentional)

This rule applies ONLY to the overlay close-button set:
- `Tooltip` (BasePopover.Close render prop)
- `PopupHeader.Close`
- `Dialog.Close`
- `Drawer.Close`
- `Popover.Close`

Generic "no prop inversion anywhere" is too broad — there are legitimate cases for inverting a prop in derived computations. The overlay close-button case is special because it's the most visible "designer intent" interface.

## What to do when refactoring a close-button

1. Look for ternary patterns on `emphasis` / `palette` / `tone` / `type` inside the close-button render.
2. Replace with a direct pass-through (`emphasis={emphasis}`).
3. If contrast suffers, file a follow-up to add a surface-aware token to the close slot in the variants config — don't restore the inversion.

## Verifier coverage

CT-15 — scoped to the five components above. Blocking. False-positive risk is low because the scope is hardcoded.

## DX-1074 example

- Tooltip close button: `emphasis={emphasis === 'bold' ? 'regular' : 'bold'}` was inverting the designer's intent. Fixed to `emphasis={emphasis}`.
