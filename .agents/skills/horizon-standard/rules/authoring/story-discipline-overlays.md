---
title: Story discipline — overlays
applies_to: overlay component stories (Dialog, Drawer, Popover, AlertDialog, Modal, Tooltip)
severity: blocking
ct_patterns: CT-12, CT-13, CT-14, CT-18, CT-19, CT-20, CT-21, CT-22, CT-23, CT-24
captures: FM-3, FM-6, FM-7
---

# Story discipline — overlays

Stories for overlay primitives demonstrate a designer-validated FLOW, not just an open state. Every story is a working interaction.

## Required of every overlay story

### 1. The trigger must be inside the initial 1440×900 viewport

Story decorators that anchor content to a canvas edge (`items-end`, `min-h-[2000px]`) push the trigger off-screen. The trigger is the user's entrypoint; an off-screen trigger is an invisible story.

**Allowed**: `flex min-h-dvh items-center justify-center`, `items-start pt-4`, content-sized stages.
**Disallowed**: `items-end` (unless the story is a sticky-bottom mock), `min-h-[XXXXpx]` with content anchored low.

### 2. `defaultOpen` REQUIRES a re-open path

A story that uses `defaultOpen` (or seeds parent state to `true`) without a re-open path is "dead" after the first close — the reviewer can't see the closed→open transition.

**Use `OverlayStoryWithReopen`** (from `Dialog.testFixtures.tsx`) — owns controlled state, renders a "Re-open" button when the overlay closes.

**Allowed pattern**:
```tsx
render: (args) => (
  <OverlayStoryWithReopen
    renderOverlay={(open, setOpen) => (
      <Dialog.Root {...args} open={open} onOpenChange={setOpen}>
        <Dialog.Trigger render={<Button type='secondary'>Open</Button>} />
        ...
      </Dialog.Root>
    )}
  />
)
```

**Disallowed**: bare `<Dialog.Root defaultOpen>...</Dialog.Root>` without a trigger AND without controlled state.

### 3. Mobile / coarse-touch adaptive stories must set `touchCapability: 'coarse'`

Adaptive overlays (Dialog, Drawer, Popover) consult `useShouldUseDrawer`. The viewport leg consults real `matchMedia`; the pointer leg consults the Storybook `TOUCH_CAPABILITY_GLOBAL`. Without setting it to `'coarse'`, mobile-viewport stories render as centered dialogs instead of bottom-sheet drawers.

```tsx
import { TOUCH_CAPABILITY_GLOBAL } from '../../storybook/withTouchCapability'

const mobileGlobals = {
  [TOUCH_CAPABILITY_GLOBAL]: 'coarse',
  viewport: { value: 'iphone12', isRotated: false },
}
```

### 4. Overlay-trigger Buttons annotate `type='secondary'`

Stories for overlay triggers MUST set `type='secondary'` explicitly:
```tsx
<Dialog.Trigger render={<Button type='secondary'>Open dialog</Button>} />
```

This documents the designer's intent (overlay triggers use the secondary palette), separately from the Button component's compound-variant defaults.

### 5. Scrolling-content story required

For every overlay that supports a bounded popup, include at least one story that demonstrates scroll behavior — long-enough content to require scrolling — at the primary size. Validates the canonical sticky-PopupHeader / sticky-ActionFooter pattern.

### 6. Static snapshot panels must not use `asTitle={X.Component}` (CT-19)

The canonical snapshot pattern renders a static `<div>` panel (no `Component.Root`/Portal) to avoid multi-portal overlap on `document.body`. Inside these panels, `PopupHeader.Title` must be used WITHOUT `asTitle`:

```tsx
// ✗ throws: Dialog.Title calls useDialogStore() — no Dialog.Root context
<PopupHeader.Title asTitle={Dialog.Title}>{title}</PopupHeader.Title>

// ✓ plain heading, same visual, no context required
<PopupHeader.Title>{title}</PopupHeader.Title>
```

`asTitle` is only valid inside a live Root context (where the Title must wire its `id` into the overlay's `aria-labelledby`). Static panels are purely visual — the wiring is irrelevant.

`PopupHeader.Close` is safe in static panels — it is a standalone `IconButton` with no context dependency.

### 7. Interaction play functions: use `toBeInTheDocument()` for portaled overlays (CT-18)

Base UI overlays use entrance/exit animation. On open, `data-[starting-style]` applies `opacity-0 scale-95`. `toBeVisible()` from `@testing-library/jest-dom` returns `false` when `getComputedStyle(element).opacity === '0'`, which holds during the animation in a real browser (Chromatic).

```tsx
// ✗ fails mid-animation in Chromatic's real Chrome
await expect(dialog).toBeVisible()

// ✓ confirms mounted without depending on computed opacity
await expect(dialog).toBeInTheDocument()
```

Use `toBeInTheDocument()` for open-state assertions. Use `toBeVisible()` only if you specifically need to assert the animation has settled (and add appropriate waiting).

### 8. Interaction test stories must use the canonical close control (CT-21)

A story whose purpose is to test close behavior must close via `PopupHeader.Close` — the standard close affordance in the design system — not via a `Dialog.Close`/`Drawer.Close` button injected into the content area. Content-area close buttons are non-standard composition.

**Wrong:**
```tsx
<Dialog.Popup>
  <Dialog.Title>...</Dialog.Title>
  <Dialog.Close render={<Button data-testid='close-btn'>Close</Button>} />
</Dialog.Popup>
```

**Correct:**
```tsx
<Dialog.Popup>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title asTitle={Dialog.Title}>...</PopupHeader.Title>
    </PopupHeader.Content>
    <Dialog.Close aria-label={dialogCloseLabel} data-testid='close-btn' render={<PopupHeader.Close />} />
  </PopupHeader.Root>
  <Dialog.Body>...</Dialog.Body>
</Dialog.Popup>
```

### 9. Overlay body must use `Dialog.Body` / `Drawer.Body` / `Popover.Body` (CT-21)

Never use raw `<ScrollArea dialogBody|drawerBody|popoverBody>` directly in stories or consumer code. The `Body` sub-component (`Dialog.Body`, `Drawer.Body`, `Popover.Body`) is the canonical scrollable body region. It encapsulates the correct variant, `flex-1`, and the official Base UI inside-scroll layout (`flex min-h-0 overflow-hidden` root + `h-auto flex-1 min-h-0` viewport).

**Root cause of `h-full` viewport failure (recorded DX-1074):** The base `ScrollArea.Viewport` has `h-full` (`height: 100%`). CSS only resolves `height: 100%` against a parent whose height is *explicitly set* — not flex-computed. In Storybook iframes and SSR contexts, `h-full` cascades past the flex item to the document body, making the viewport the full page height. Scrolling never engages. The fix (`h-auto flex-1 min-h-0` on viewport + `flex overflow-hidden` on root) is encoded in `ScrollArea.variants.ts` body variants and this is why `Dialog.Body` (not raw `ScrollArea`) is the required API.

## Verifier coverage

CT-12 (bare defaultOpen), CT-13 (trigger offscreen), CT-14 (missing coarse touch), CT-18 (toBeVisible mid-animation), CT-19 (asTitle in static panel), CT-20 (Tooltip trigger tab stop), CT-21 (content-area close button / raw ScrollArea body), CT-22 (JSX in description / snapshot ordering / Drawer defaultOpen trigger), CT-23 (PopupHeader.Close bare / InteractionTest close missing), CT-24 (popup-corner-radius CSS variable missing). Blocking.

## DX-1074 examples

- Dialog: 13 stories converted to `OverlayStoryWithReopen`; mobile Sizes set `coarse`.
- Drawer: Playground decorator changed from `items-end` to `items-start pt-4`.
- Popover: TouchDrawer + new `Controlled` story.
- Round 2: `Dialog.Body`/`Drawer.Body`/`Popover.Body` sub-components introduced; all `<ScrollArea dialogBody|drawerBody|popoverBody>` story usages replaced. `InteractionFinePointer` updated to use `PopupHeader.Close`. `AdaptiveDemo` removed.
- Round 3: JSX-in-description escaping enforced, snapshot ordering standardized, Drawer defaultOpen trigger requirement added.

### 10. JSX in story description text must be escaped (CT-22.s)

Any `<ComponentName />` or `<Component prop>` reference in story `description` strings must be wrapped so the JSX compiler treats it as text, not an element:

```tsx
// ✗ WRONG — JSX compiler parses <Drawer.Trigger /> as a real React element
parameters: {
  docs: {
    description: {
      story: 'Use <Drawer.Trigger /> to open the drawer.',
    },
  },
},

// ✓ CORRECT — template literal (JSX-safe string context)
parameters: {
  docs: {
    description: {
      story: `Use <Drawer.Trigger /> to open the drawer.`,
    },
  },
},

// ✓ ALSO CORRECT — JSX expression wrapping
parameters: {
  docs: {
    description: {
      story: <>{'Use <Drawer.Trigger /> to open the drawer.'}</>,
    },
  },
},
```

Unescaped JSX in description text is parsed and executed by the JSX compiler. The component renders as a real React element, causing crashes or unexpected DOM output in the Storybook docs panel.

### 11. Snapshot story ordering

Snapshot stories MUST be the last export in every story file. No story may be declared after the snapshot export.

**Adaptive components** (Dialog, Popover that render as Drawer on mobile) need TWO snapshot stories:
- `SnapshotDesktop` — captures the fine-pointer / large-viewport leg
- `SnapshotMobile` — captures the coarse-pointer / small-viewport (drawer) leg; must set `touchCapability: 'coarse'` and the appropriate viewport global

**Non-adaptive components** need a single `Snapshot` story.

```tsx
// ✗ WRONG — story declared after snapshot
export const Snapshot: Story = { ... }
export const WithLongContent: Story = { ... }  // blocked — must come before Snapshot

// ✓ CORRECT — snapshot(s) last
export const WithLongContent: Story = { ... }
export const Snapshot: Story = { ... }

// ✓ CORRECT — adaptive component with two snapshots, both last
export const WithLongContent: Story = { ... }
export const SnapshotDesktop: Story = { ... }
export const SnapshotMobile: Story = { ... }
```

### 12. Drawer `defaultOpen` stories require a `<Drawer.Trigger>` sibling

Every story that uses `defaultOpen` on a Drawer (or seeds controlled state to open) MUST include a `<Drawer.Trigger>` sibling element so the overlay can be re-opened after the user dismisses it.

This extends CT-12 (bare `defaultOpen` without re-open path) to Drawer stories specifically, where `OverlayStoryWithReopen` may not always be used and a `<Drawer.Trigger>` in the story composition is the alternative acceptable pattern.

```tsx
// ✗ WRONG — no way to re-open after dismiss
<Drawer.Root defaultOpen>
  <Drawer.Popup>...</Drawer.Popup>
</Drawer.Root>

// ✓ CORRECT — Trigger present; user can re-open
<Drawer.Root defaultOpen>
  <Drawer.Trigger render={<Button type='secondary'>Open drawer</Button>} />
  <Drawer.Popup>...</Drawer.Popup>
</Drawer.Root>

// ✓ ALSO CORRECT — OverlayStoryWithReopen (preferred for complex flows)
render: (args) => (
  <OverlayStoryWithReopen
    renderOverlay={(open, setOpen) => (
      <Drawer.Root {...args} open={open} onOpenChange={setOpen}>
        <Drawer.Trigger render={<Button type='secondary'>Open</Button>} />
        ...
      </Drawer.Root>
    )}
  />
)
