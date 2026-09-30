---
name: overlay-close-only
description: Pattern for rendering a close button in an overlay that has no visible heading text. PopupHeader.Root guarantees the close button is always visible regardless of title presence.
severity: MUST
ct: CT-25
applies-to: Dialog, Drawer, Popover, PopupHeader
---

# Overlay close-only header

## Rule

An overlay that has **no visible heading text** must still render a close button.
Use `PopupHeader.Root` + `[Overlay].Title className='sr-only'` + the standard close wiring.
**Never** omit the close button because there is no title.

## Why

`PopupHeader.Close` is `absolute top-3 right-3 z-[4]` — it renders at the top-right corner
of `PopupHeader.Root` regardless of whether `PopupHeader.Content` or `PopupHeader.Title`
are present. `PopupHeader.Root` always reserves `min-h-14` height so the button is always
accessible. Without `PopupHeader.Root`, the close button has no layout anchor and may be
invisible or incorrectly positioned.

## Pattern

```tsx
// ✅ Correct — close button always renders, accessible name for screen readers
<Dialog.Popup>
  <PopupHeader.Root>
    <Dialog.Title className='sr-only'>Accessible dialog name</Dialog.Title>
    <Dialog.Close render={<PopupHeader.Close aria-label='Close dialog' />} />
  </PopupHeader.Root>
  <Dialog.Body>
    {/* content without visible heading */}
  </Dialog.Body>
</Dialog.Popup>

// ❌ Wrong — omitting PopupHeader.Root means no close button
<Dialog.Popup>
  <Dialog.Body>
    {/* no close button at all */}
  </Dialog.Body>
</Dialog.Popup>

// ❌ Wrong — Dialog.Close outside PopupHeader.Root is not correctly positioned
<Dialog.Popup>
  <Dialog.Title className='sr-only'>...</Dialog.Title>
  <Dialog.Close render={<PopupHeader.Close />} />   {/* floats in flow, wrong position */}
  <Dialog.Body>...</Dialog.Body>
</Dialog.Popup>
```

## Same pattern for Drawer and Popover

```tsx
// Drawer
<Drawer.Popup>
  <Drawer.Handle />
  <PopupHeader.Root>
    <Drawer.Title className='sr-only'>Accessible name</Drawer.Title>
    <Drawer.Close render={<PopupHeader.Close aria-label='Close' />} />
  </PopupHeader.Root>
  <Drawer.Body>...</Drawer.Body>
</Drawer.Popup>

// Popover (in drawer mode)
<Popover.Popup>
  <PopupHeader.Root>
    <Popover.Title className='sr-only'>Accessible name</Popover.Title>
    <Popover.Close render={<PopupHeader.Close aria-label='Close popover' />} />
  </PopupHeader.Root>
  <Popover.Body>...</Popover.Body>
</Popover.Popup>
```

## Accessibility

`[Overlay].Title className='sr-only'` is required for screen-reader accessibility.
It provides an accessible name for the overlay without visual text. Without it,
axe-core's `dialog-name` rule fires. Do NOT omit the title element entirely —
`className='sr-only'` is the correct compromise.

## Evidence

DX-1074 QA Round IV T1: "If a heading gets no text does the close button still show?"
Root cause: consumers omitted `PopupHeader.Root` when no visible title was needed,
leaving no close button. Summary-of-charges, penny-map-top-bar, status-dialog, Horizon DS
stories all exhibited this gap.
