---
name: scrim-popup-header
description: PopupHeader.Root scrim prop for image/media overlays. PopupHeader.Scrim subcomponent is deleted. Drawer.Backdrop is a separate page-level scrim — not related.
severity: MUST
applies-to: PopupHeader, Dialog, Drawer, Popover
---

# Scrim and PopupHeader

## Rule

`PopupHeader.Root` accepts a `scrim` boolean prop. When `scrim={true}`, the header wraps its children in Horizon's `<Scrim isTop>` component and automatically applies contrast-appropriate styling to its sub-components:

- `PopupHeader.Title` receives `text-neutral-1` (white text for readability over image/media)
- `PopupHeader.Close` switches to `type='secondary'` (light button for contrast over image/media)

Consumers write just `<PopupHeader.Root scrim>` — no manual color overrides are needed:

```tsx
// ✓ CORRECT — scrim prop handles all contrast styling automatically
<PopupHeader.Root scrim>
  <PopupHeader.Content>
    <PopupHeader.Title asTitle={Dialog.Title}>
      Photo title
    </PopupHeader.Title>
  </PopupHeader.Content>
  <Dialog.Close render={<PopupHeader.Close />} />
</PopupHeader.Root>

// ✗ WRONG — manual color overrides are fragile and may drift from design tokens
<PopupHeader.Root>
  <PopupHeader.Content>
    <PopupHeader.Title asTitle={Dialog.Title} className='text-neutral-1'>
      Photo title
    </PopupHeader.Title>
  </PopupHeader.Content>
  <Dialog.Close render={<PopupHeader.Close type='secondary' />} />
</PopupHeader.Root>
```

## `PopupHeader.Scrim` is deleted — do not use

The `PopupHeader.Scrim` subcomponent has been **deleted** from the design system. Do not use it, reference it, or attempt to re-create it.

The `scrim` boolean prop on `PopupHeader.Root` is the permanent replacement. Any existing code referencing `PopupHeader.Scrim` must be migrated to `<PopupHeader.Root scrim>`.

## When to use `scrim`

The `scrim` prop is for overlays where the `PopupHeader` sits over an image or full-bleed media background — hero photos, map views, gallery overlays, or any situation where the header background is transparent or semi-transparent over a photograph.

Do NOT use `scrim` for standard overlays with solid background colors. The scrim darkens the header region to ensure text and button contrast — it is a visual treatment, not a generic dark-mode flag.

## `Drawer.Backdrop` is unrelated

`Drawer.Backdrop` is the page-level backdrop scrim that dims the content behind an open Drawer. It is rendered separately as a sibling of `Drawer.Viewport`, not inside `PopupHeader`:

```tsx
// Drawer.Backdrop structure — outside and unrelated to PopupHeader.scrim
<Drawer.Root>
  <Drawer.Trigger ... />
  <Drawer.Portal>
    <Drawer.Backdrop />          {/* page-level dim layer */}
    <Drawer.Viewport>
      <Drawer.Popup>
        <PopupHeader.Root scrim>  {/* header-level image scrim — unrelated */}
          ...
        </PopupHeader.Root>
      </Drawer.Popup>
    </Drawer.Viewport>
  </Drawer.Portal>
</Drawer.Root>
```

`Drawer.Backdrop` and `PopupHeader.Root scrim` are independent, non-conflicting concerns. Both may be present simultaneously — a Drawer with a full-bleed photo header would use both.

## DX-1074 note

`PopupHeader.Scrim` was removed during the Round 3 overlay architecture refactor. The `scrim` boolean prop was added to `PopupHeader.Root` as a simpler, more composable API that avoids adding an extra DOM wrapper sub-component.
