---
title: Accessibility
impact: HIGH
tags: [accessibility, a11y, aria, keyboard, focus]
applies-to: shared
---

# Accessibility

## Keyboard Accessibility

Visible, non-interactive elements MUST have keyboard accessibility. SonarQube flags elements that are visible and respond to user interaction (e.g., `onClick`) but lack keyboard support. Every clickable element must be reachable via Tab and activatable via Enter or Space.

### Navigation Patterns

- **Tab / Shift+Tab**: Move focus between interactive elements in DOM order
- **Arrow keys**: Navigate within composite widgets (lists, menus, tab bars, radio groups)
- **Escape**: Close overlays, modals, dropdowns, and tooltips
- **Enter / Space**: Activate the focused element (buttons, links, menu items)
- **Home / End**: Jump to first/last item in a list or menu

## ARIA Patterns for Horizon Components

### Dialogs and Modals

Horizon's `<Dialog>` wraps Base UI and handles ARIA automatically:

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Popup>
    <Heading tag="h2">Dialog Heading</Heading>
    <P>Dialog content</P>
    <Dialog.Close>
      <IconButton aria-label="Close dialog" icon="close" />
    </Dialog.Close>
  </Dialog.Popup>
</Dialog>
```

### Menus

Horizon's `<Menu>` wraps Base UI Menu with keyboard navigation built in:

```tsx
<Menu>
  <Menu.Trigger>
    <Button aria-haspopup="true">Menu Trigger</Button>
  </Menu.Trigger>
  <Menu.Popup>
    <Menu.Item>Option 1</Menu.Item>
    <Menu.Item>Option 2</Menu.Item>
  </Menu.Popup>
</Menu>
```

### Tooltips

```tsx
<Tooltip content="Tooltip content">
  <Button>Hover me</Button>
</Tooltip>
```

### Tabs

```tsx
<Tabs defaultValue="tab-1">
  <Tabs.List>
    <Tabs.Tab value="tab-1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab-2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab-1"><P>Panel 1 content</P></Tabs.Panel>
  <Tabs.Panel value="tab-2"><P>Panel 2 content</P></Tabs.Panel>
</Tabs>
```

## Focus Management

- **Trap focus in dialogs**: When a modal opens, focus must cycle within it. Tab from the last focusable element should return to the first, and Shift+Tab from the first should go to the last.
- **Restore focus on close**: When a dialog or overlay closes, return focus to the element that triggered it.
- **Auto-focus first interactive element**: When a dialog opens, focus the first interactive element (or the close button if no primary action exists).

## Touch Targets

All interactive elements must have a minimum touch target size of **44x44px**. This applies to buttons, links, form controls, and any tappable area. Use padding to increase the target area without changing visual size if needed.

## Screen Reader Considerations

- **Live regions**: Use `aria-live="polite"` for non-urgent updates (e.g., search results count) and `aria-live="assertive"` for critical alerts (e.g., form errors).
- **Meaningful labels**: Every interactive element must have an accessible name — via visible text, `aria-label`, or `aria-labelledby`. Avoid relying solely on visual indicators (icons without labels, color-only status).
- **Announce state changes**: When content changes dynamically (loading states, toggled sections), ensure screen readers are informed via live regions or focus management.

## What Base UI Handles Automatically

Base UI (the foundation of many Horizon components) provides built-in accessibility for:

- Focus trapping in Dialog/Modal
- Keyboard navigation in Menu, Select, Tabs, and Listbox
- Correct ARIA roles and attributes on rendered elements
- Proper `aria-expanded`, `aria-selected`, and `aria-controls` wiring

### What You Must Handle Manually

- Custom composite widgets not built on Base UI primitives
- `aria-label` and `aria-labelledby` values (content-specific, not inferrable)
- Live region announcements for async operations
- Keyboard shortcuts beyond standard widget patterns
- Skip navigation links for page-level landmarks
- Ensuring custom event handlers (e.g., `onClick` on a `<div>`) have keyboard equivalents — use Horizon semantic components (`<Button>`, `<PlainButton>`, `<A>`, `<PlainA>`) instead of raw HTML

## Color Contrast

**Never deviate from the Horizon palette.** The palette is designed for accessible contrast ratios. Do not introduce custom colors, hardcoded hex values, or arbitrary OKLCH values outside the token system. If a design calls for a color not in the palette, escalate to the design system team — do not work around it.
