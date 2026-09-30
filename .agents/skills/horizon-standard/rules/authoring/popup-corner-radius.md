---
name: popup-corner-radius
description: Overlay popups set --popup-corner-t/--popup-corner-b CSS variables. PopupHeader and ActionFooter read these for border-radius — never hardcode rounded-* on sub-components.
severity: MUST
ct: CT-24
applies-to: Dialog, Drawer, Popover, AlertDialog, PopupHeader, ActionFooter
---

# Popup corner radius

## Rule

Every overlay popup element MUST set two CSS custom properties that control the corner radius for all sub-components:

```css
--popup-corner-t: var(--radius-2xl, 1rem)   /* top corners */
--popup-corner-b: var(--radius-2xl, 1rem)   /* bottom corners */
```

These are set on the popup element itself via inline style or a Tailwind arbitrary property. **Never add `clip-path` to overlay popup elements** — `clip-path` on the same element as `filter: drop-shadow` clips the shadow output, making the shadow invisible (DX-1074 Round 4).

```tsx
// In the popup slot's className or style:
'[--popup-corner-t:var(--radius-2xl,1rem)]'
'[--popup-corner-b:var(--radius-2xl,1rem)]'
```

Sheet-style drawers (bottom sheet) may use different top and bottom values:

```tsx
// Bottom sheet: top corners rounded, bottom corners flush (extends to screen edge)
'[--popup-corner-t:var(--radius-2xl,1rem)]'
'[--popup-corner-b:0px]'
```

## Sub-component behavior

`PopupHeader.Root` reads `--popup-corner-t` for its top border-radius. It MUST NOT use hardcoded `rounded-t-*`, `rounded-tl-[Xpx]`, or `rounded-tr-[Xpx]` Tailwind utilities.

`ActionFooter` reads `--popup-corner-b` for its bottom border-radius. It MUST NOT use hardcoded `rounded-b-*` utilities.

If `--popup-corner-t` or `--popup-corner-b` is absent, the sub-components fall back to `0` (no rounding). Always set both variables on the popup element.

## Why CSS variables — no clip-path on popup elements

**Critical:** Horizon overlay popups use `filter: drop-shadow(…)` for elevation. CSS `clip-path` on the same element as `filter` clips the filter's output — the shadow is invisible. Do NOT add `clip-path` to any popup element.

Corner rounding is owned per sub-component via CSS variables:
- `PopupHeader.Root` rounds its own top corners via `--popup-corner-t`
- `ActionFooter` rounds its own bottom corners via `--popup-corner-b`
- The popup's own `bg-*` is clipped by `rounded-*` (border-radius clips own background only, not children's backgrounds)

This is also compositing-safe: `sticky + z-index` and `backdrop-blur` create compositing layers that can escape `clip-path` visual clipping. The CSS variable approach makes each sub-component responsible for its own corners — compositing-safe AND shadow-safe.

Using `--popup-corner-t`/`--popup-corner-b` ensures popup corners always stay in sync across all sub-components.

## Violation examples

```tsx
// ✗ WRONG — clip-path on popup kills the drop-shadow
<Dialog.Popup className='drop-shadow-overlay-lg [clip-path:inset(0_round_1rem)]'>
  ...
</Dialog.Popup>

// ✗ WRONG — hardcoded rounded-t-2xl on PopupHeader may drift from popup corner radius
<Dialog.Popup className='[--popup-corner-t:var(--radius-2xl,1rem)]'>
  <PopupHeader.Root className='rounded-t-2xl'>  {/* don't override — variants already read the var */}
    ...
  </PopupHeader.Root>
</Dialog.Popup>

// ✓ CORRECT — CSS variables, no clip-path
<Dialog.Popup className='rounded-2xl drop-shadow-overlay-lg [--popup-corner-t:var(--radius-2xl,1rem)] [--popup-corner-b:var(--radius-2xl,1rem)]'>
  <PopupHeader.Root>  {/* reads --popup-corner-t automatically */}
    ...
  </PopupHeader.Root>
  <ActionFooter>  {/* reads --popup-corner-b automatically */}
    ...
  </ActionFooter>
</Dialog.Popup>
```

## DX-1074 history

**Round 3:** CSS variables introduced because `clip-path` on sticky/compositing-layer sub-components produced visual bleed. Sub-components now own their corners.

**Round 4:** `clip-path` removed entirely from popup slots after discovering that `clip-path` on the same element as `filter: drop-shadow` clips the shadow output. The CSS variable architecture already handled all visual rounding, making `clip-path` redundant.
