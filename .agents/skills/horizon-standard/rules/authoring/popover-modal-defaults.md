---
name: popover-modal-defaults
description: Popover-as-drawer is non-modal by default — no focus trap, outside tap dismisses. Use disablePointerDismissal={true} only for costly forms where accidental dismissal loses user data.
severity: SHOULD
ct: CT-29
applies-to: Popover
---

# Popover modal defaults

## Defaults (drawer mode)

When `Popover.Root` switches to drawer mode (coarse pointer + small viewport), it mounts
as `BaseDrawer.Root` with:

| Prop | Default | Behavior |
|------|---------|---------|
| `modal` | `false` | No focus trap, no scroll lock — background interactions remain live |
| `disablePointerDismissal` | `false` | Tapping outside closes the drawer — consistent with desktop Popover |

These defaults are intentional: Popover-as-drawer should behave like a Popover, not like
a Dialog. Background interactions stay live; outside tap dismisses.

## When to override `disablePointerDismissal`

Set `disablePointerDismissal={true}` when losing the drawer's in-progress state on an
accidental outside tap would be costly for the user:

```tsx
// ✅ Date picker — user may have partially selected a range; accidental dismiss loses progress
<Popover.Root disablePointerDismissal>
  <Popover.Popup>
    <Calendar mode='range' ... />
  </Popover.Popup>
</Popover.Root>

// ✅ Multi-step form — accidental dismiss loses form state
<Popover.Root disablePointerDismissal>
  ...
</Popover.Root>

// ❌ Filter chip popover — user tapping another chip should dismiss this one
<Popover.Root disablePointerDismissal>    {/* wrong — breaks chip-to-chip navigation */}
  <FilterChip ... />
</Popover.Root>
```

## Filter chip / tab pattern

For filter chips or tab-based popovers, leave `disablePointerDismissal` at its default
(`false`). When the user taps another chip:
1. The current drawer closes (outside-tap dismiss)
2. The new chip's popover opens

With `disablePointerDismissal={true}`, the current drawer stays open while the second
chip tap fires — creating an inconsistent multi-drawer state on mobile.

## `modal` override

Rarely needed. Only set `modal={true}` or `modal='trap-focus'` on a Popover if the
content requires the user to complete a mandatory flow before interacting with the page
(e.g., a blocking permission request). In practice, use `Dialog` for modal flows instead.

## Evidence

DX-1074 QA Round IV T4: "When the Popover is a drawer it shouldn't have focus trap by
default" and "The Chips are using popover but focus trap is true? I should be able to tap
on another chip with the drawer open." Root cause: `disablePointerDismissal` was `true`
by default, preventing outside-tap dismiss on mobile. Changed to `false` in DX-1074.
