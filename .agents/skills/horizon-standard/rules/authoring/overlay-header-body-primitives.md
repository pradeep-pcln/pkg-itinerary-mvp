---
name: overlay-header-body-primitives
description: Overlay header and body content must use Horizon primitives. Never wrap overlay children in custom divs with padding/overflow/layout classes.
severity: MUST
ct: CT-27
applies-to: Dialog, Drawer, Popover, PopupHeader
---

# Overlay header and body primitives

## Rule

Overlay content must use the Horizon overlay primitives:

| What you're building | Use | Never use |
|---------------------|-----|-----------|
| Overlay header | `PopupHeader.Root` + `PopupHeader.Content` + `PopupHeader.Title` | `<div>` with manual padding/typography |
| Overlay scrollable body | `Dialog.Body` / `Drawer.Body` / `Popover.Body` | `<div className='overflow-y-auto'>`, `<ScrollArea>` |
| Overlay close button | `[Overlay].Close render={<PopupHeader.Close />}` | `<button onClick={onClose}>` |
| Overlay footer | `<ActionFooter>` | `<div className='sticky bottom-0'>` |

## Why primitives exist

`Dialog.Body` / `Drawer.Body` / `Popover.Body` are NOT just padding wrappers — they own the
Base UI inside-scroll pattern (`flex-1 min-h-0 overflow-y-auto`) that keeps the header and
footer sticky. A raw `<div>` with `overflow-y-auto` breaks sticky positioning on
`PopupHeader.Root` (which relies on being inside a flex container where the body is
`flex-1`).

`PopupHeader.Root` provides `min-h-14` for the close button anchor, sticky `top-0`
positioning, and `--popup-corner-t` / `--popup-corner-b` CSS variable wiring for border-radius
sync. A raw `<div>` header will have incorrect corner rounding, incorrect height, and
broken sticky behavior.

## Antipatterns

```tsx
// ❌ Custom header div — wrong padding, no corner rounding, breaks sticky layout
<Dialog.Popup>
  <div className='flex items-center justify-between p-4'>
    <h2>Title</h2>
    <button onClick={onClose}>✕</button>
  </div>
  <div className='overflow-y-auto p-4'>content</div>
</Dialog.Popup>

// ❌ Custom body div — breaks sticky header/footer
<Dialog.Popup>
  <PopupHeader.Root>...</PopupHeader.Root>
  <div className='overflow-y-auto p-4 flex-1'>content</div>  {/* no sticky contract */}
</Dialog.Popup>

// ❌ ScrollArea inside overlay body — double-scroll, wrong dimensions
<Dialog.Body>
  <ScrollArea>content</ScrollArea>
</Dialog.Body>
```

## Correct pattern

```tsx
// ✅ Full canonical composition
<Dialog.Popup size='md'>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title asTitle={Dialog.Title}>Settings</PopupHeader.Title>
    </PopupHeader.Content>
    <Dialog.Close render={<PopupHeader.Close aria-label='Close dialog' />} />
  </PopupHeader.Root>
  <Dialog.Body>
    <Dialog.Description>...</Dialog.Description>
    {/* content — no extra wrapper div */}
  </Dialog.Body>
  <ActionFooter shadow={false}>
    <Button type='primary'>Save</Button>
  </ActionFooter>
</Dialog.Popup>
```

## Migration from custom to primitives

1. Replace custom header `<div>` → `PopupHeader.Root` + `PopupHeader.Content` + `PopupHeader.Title`
2. Replace custom close `<button>` → `[Overlay].Close render={<PopupHeader.Close />}`
3. Replace custom body `<div className='overflow-y-auto ...'>` → `Dialog.Body` / `Drawer.Body` / `Popover.Body`
4. Remove inline padding from wrapper divs — `Dialog.Body` handles padding internally

## Evidence

DX-1074 QA Round IV T3: 8+ consumer packages used custom header/body divs instead of
Horizon primitives — PeerToPeerInfoDialog, PartnerReviewScore, Ancillary dialogs,
penny-chat HotelCheckoutModal. Symptoms: wrong padding, missing close buttons,
incorrect scrolling, broken sticky header/footer.

## See also

- [`horizon-upgrade` § v35-layout-primitive-discipline](../../../horizon-upgrade/rules/v35-layout-primitive-discipline.md) — codemod-facing mirror of this rule (Arch Rule #4): codemods must never emit hand-rolled overlay chrome.
- [`horizon-upgrade` § BR-DR14](../../../horizon-upgrade/references/v35-breakage-recipes.md) — consumer-side recipe for pre-v35 flat Drawer API on a v35 dep (TS2786).
