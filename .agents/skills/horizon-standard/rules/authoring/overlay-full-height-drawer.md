---
name: overlay-full-height-drawer
description: Search, filter, and date-picker drawers on mobile must use snapPoints={[1]} on Drawer.Root and height='full' on Drawer.Popup to open full-viewport instead of the default half-height.
severity: MUST
ct: CT-26
applies-to: Drawer, TravelerSelectionMobile, DatePickerMobile
---

# Full-height mobile drawer

## Rule

Drawers used for **search, date selection, traveler selection, or any mobile overlay
that requires substantial vertical space** must open full-height immediately.
This requires TWO props — one on `Drawer.Root`, one on `Drawer.Popup`:

```tsx
<Drawer.Root snapPoints={[1]}>         {/* single snap: 100% — removes default 50% stop */}
  ...
  <Drawer.Popup height='full'>         {/* h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] */}
```

## Why both are required

| Prop | What it controls | Without it |
|------|-----------------|-----------|
| `snapPoints={[1]}` on `Drawer.Root` | Snap point behavior — Base UI opens at the FIRST snap point | Default `[0.5, 1.0]` → drawer opens at 50% viewport height |
| `height='full'` on `Drawer.Popup` | Visual height of the panel | Without `height='full'` the popup is `h-fit` (content-sized) — a 100% snap point on a short panel does nothing useful |

Setting `height='full'` alone does NOT remove the 50% snap stop.
Setting `snapPoints={[1]}` alone gives a full-height snap target but the panel may be shorter than the viewport.

## Pattern

```tsx
// ✅ Full-height drawer — opens immediately at full viewport
<Drawer.Root
  open={isOpen}
  onOpenChange={handleClose}
  snapPoints={[1]}
>
  <Drawer.Portal>
    <Drawer.Backdrop />
    <Drawer.Viewport>
      <Drawer.Popup height='full'>
        <Drawer.Handle />
        <PopupHeader.Root>
          <Drawer.Title className='sr-only'>Search</Drawer.Title>
          <Drawer.Close render={<PopupHeader.Close aria-label='Close' />} />
        </PopupHeader.Root>
        <Drawer.Body>...</Drawer.Body>
      </Drawer.Popup>
    </Drawer.Viewport>
  </Drawer.Portal>
</Drawer.Root>

// ❌ Wrong — opens at 50% height first, requires second drag to full
<Drawer.Root open={isOpen} onOpenChange={handleClose}>
  <Drawer.Portal>
    <Drawer.Viewport>
      <Drawer.Popup>       {/* no height='full', no snapPoints override */}
```

## When NOT to use

Do NOT use `snapPoints={[1]}` when the drawer intentionally supports a half-height
preview state (e.g., a summary sheet that expands on user interaction). In that case
the default `[0.5, 1.0]` is correct.

## Evidence

DX-1074 QA Round IV T2: "TravelerSelection and DatePicker need to default to full
height drawers on mobile." Root cause: `Drawer.Popup` without `height='full'` + default
`snapPoints` opened at 50% height. Both `TravelerSelectionMobile` and `DatePickerMobile`
were missing both props.
