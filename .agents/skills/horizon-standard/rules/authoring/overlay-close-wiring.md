---
name: overlay-close-wiring
description: PopupHeader.Close is a styled button only — no close logic. Always wrap in Dialog.Close/Drawer.Close/Popover.Close render prop. InteractionTest stories must exercise close.
severity: MUST
ct: CT-23
applies-to: Dialog, Drawer, Popover, PopupHeader
---

# Overlay close wiring

## Rule

`PopupHeader.Close` is a **styled button only** — it renders an X icon button but has NO close logic wired. It will not close any overlay by itself.

## How to wire close behavior

Wrap `PopupHeader.Close` in the overlay's Close component using the render prop pattern. The Close component handles the event; `PopupHeader.Close` provides the styled trigger:

```tsx
// Dialog
<Dialog.Close render={<PopupHeader.Close />} />

// Drawer
<Drawer.Close render={<PopupHeader.Close />} />

// Popover
<Popover.Close render={<PopupHeader.Close />} />
```

Props forwarded by the consumer (e.g. `aria-label`, `data-testid`) belong on the Close wrapper, not on `PopupHeader.Close` directly, unless the prop is a visual styling prop specific to `PopupHeader.Close`:

```tsx
<Dialog.Close
  aria-label='Close dialog'
  data-testid='close-btn'
  render={<PopupHeader.Close />}
/>
```

## NEVER place `PopupHeader.Close` bare in an overlay

```tsx
// ✗ WRONG — clicking this has no effect; overlay does not close
<Dialog.Popup>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title asTitle={Dialog.Title}>Title</PopupHeader.Title>
    </PopupHeader.Content>
    <PopupHeader.Close aria-label='Close' />   {/* bare — no close logic */}
  </PopupHeader.Root>
</Dialog.Popup>

// ✓ CORRECT
<Dialog.Popup>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title asTitle={Dialog.Title}>Title</PopupHeader.Title>
    </PopupHeader.Content>
    <Dialog.Close aria-label='Close' render={<PopupHeader.Close />} />
  </PopupHeader.Root>
</Dialog.Popup>
```

## InteractionTest story requirement

Every `InteractionTest` story for Dialog, Drawer, and Popover MUST include a play function that:

1. Opens the overlay (clicks the trigger or uses controlled state)
2. Confirms the overlay is in the document (`toBeInTheDocument()`)
3. Clicks the `PopupHeader.Close` button (by `data-testid` or `aria-label`)
4. Asserts the overlay is no longer in the document (`not.toBeInTheDocument()`)

This proves the close wiring is correct end-to-end. A play function that only tests "open" behavior without testing close leaves half the interaction unverified.

```tsx
export const InteractionTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(document.body)  // Dialog portals render outside canvasElement

    // Open
    await userEvent.click(canvas.getByRole('button', { name: /open/i }))
    const dialog = await body.findByRole('dialog')
    await expect(dialog).toBeInTheDocument()

    // Close via PopupHeader.Close
    const closeBtn = body.getByTestId('close-btn')
    await userEvent.click(closeBtn)
    await expect(dialog).not.toBeInTheDocument()
  },
}
```

## Why this matters

`PopupHeader.Close` was originally designed as a self-contained close button. During DX-1074 Round 3 design review, it was clarified that the component architecture splits styling (PopupHeader.Close) from behavior (Dialog.Close / Drawer.Close / Popover.Close) via Base UI's render prop pattern. This separation means overlays can be closed by any trigger, not just the X button, while the X button's visual appearance is always consistent.
