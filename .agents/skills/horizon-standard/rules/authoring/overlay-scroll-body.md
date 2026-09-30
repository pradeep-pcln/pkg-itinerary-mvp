---
name: overlay-scroll-body
description: Overlay body regions use Dialog.Body/Drawer.Body/Popover.Body — never raw ScrollArea. Encodes the Base UI inside-scroll pattern.
severity: MUST
ct: CT-22
applies-to: Dialog, Drawer, Popover, any overlay using scrollable body content
---

# Overlay scroll body

## Rule

Overlay body regions that need scrolling MUST use `<Dialog.Body>`, `<Drawer.Body>`, or `<Popover.Body>` sub-components. Never use raw `<ScrollArea>` directly in overlay stories or consumers.

These sub-components wrap `ScrollArea` with the correct Base UI inside-scroll classes automatically. Consumers write the sub-component and get correct scroll behavior; they do not configure ScrollArea internals themselves.

## The Base UI inside-scroll pattern

This is the underlying pattern encoded by the Body sub-components. Reference this when authoring or reviewing the sub-components themselves (not for consumers — consumers use the Body sub-component):

**Root element:** `flex min-h-0 overflow-hidden`

**Viewport element:** `h-auto flex-1 min-h-0` — NOT `h-full`

**Why `h-full` is wrong on a ScrollArea viewport inside an overlay:**

CSS only resolves `height: 100%` against a parent whose height is *explicitly set* — not flex-computed. In Storybook iframes and SSR rendering contexts, `h-full` cascades past the flex item to the `document.body`, making the viewport equal to the full iframe/page body height. The viewport height equals the content height, so scrolling never engages. The inside-scroll fix (`h-auto flex-1 min-h-0` on viewport + `flex overflow-hidden` on root) ensures the viewport grows to fill the flex container and clips properly.

## The sticky layout pattern

The canonical overlay layout using scrollable body:

```
PopupHeader (sticky top)
  ↓
{Overlay}.Body (fills remaining space, scrolls)
  ↓
ActionFooter (sticky bottom)
```

Rules:
- Exactly ONE sticky header (`PopupHeader`) and/or ONE sticky footer (`ActionFooter`) per overlay popup.
- Do not add additional sticky-positioned elements inside the body scroll region — they escape the scroll container's stacking context.
- `{Overlay}.Body` fills the remaining space between header and footer via `flex-1`.

## Violation examples

```tsx
// ✗ WRONG — raw ScrollArea in overlay story
<Dialog.Popup>
  <PopupHeader.Root>...</PopupHeader.Root>
  <ScrollArea dialogBody className='flex-1'>
    <p>Content that needs scrolling...</p>
  </ScrollArea>
  <ActionFooter>...</ActionFooter>
</Dialog.Popup>

// ✓ CORRECT — Dialog.Body sub-component
<Dialog.Popup>
  <PopupHeader.Root>...</PopupHeader.Root>
  <Dialog.Body>
    <p>Content that needs scrolling...</p>
  </Dialog.Body>
  <ActionFooter>...</ActionFooter>
</Dialog.Popup>

// ✓ CORRECT — Drawer
<Drawer.Popup>
  <PopupHeader.Root>...</PopupHeader.Root>
  <Drawer.Body>
    <p>Content that needs scrolling...</p>
  </Drawer.Body>
  <ActionFooter>...</ActionFooter>
</Drawer.Popup>

// ✓ CORRECT — Popover
<Popover.Popup>
  <PopupHeader.Root>...</PopupHeader.Root>
  <Popover.Body>
    <p>Content that needs scrolling...</p>
  </Popover.Body>
  <ActionFooter>...</ActionFooter>
</Popover.Popup>
```

## DX-1074 note

Introduced in Round 2 when `Dialog.Body`, `Drawer.Body`, and `Popover.Body` sub-components were added to the design system. All story-level `<ScrollArea dialogBody|drawerBody|popoverBody>` usages were replaced. This rule codifies that replacement as a permanent standard — the raw ScrollArea variant props are considered an implementation detail, not a consumer API.

## See also

- [`horizon-upgrade` § BR-DR13](../../../horizon-upgrade/references/v35-breakage-recipes.md) — consumer-side recipe for `vi.mock` objects missing the `Body` sub-component after v35 migration.
