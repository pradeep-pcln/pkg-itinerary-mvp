---
title: Storybook Conventions
impact: HIGH
tags: [storybook, stories, chromatic, interaction-tests]
applies-to: testing
---

# Storybook Conventions

## Story Planning (Do This First)

Before writing any stories, enumerate the visually distinct states the component can render. This is a planning step, not an implementation step — get the list right before writing code.

**Identify all visual variants by asking:**
1. What prop combinations produce visually different output? (variants, sizes, emphasis)
2. What conditional UI exists? (split actions vs single CTA, bookmark present vs absent)
3. What layout modes exist? (stacked vs tiled, desktop vs mobile)
4. What edge cases have distinct visuals? (empty state, loading, error)

**Then map each to a story type:**

| Visual state | Story type | Snapshot? |
|---|---|---|
| All key variants in one view | **Snapshot** (consolidated JSX) | Yes — this is the Chromatic capture |
| Interactive playground | **Playground** | No |
| User interaction flow | Named story + `play` function | No (unless play produces a visual state worth capturing) |
| Stateful behavior (toggle, form) | Named story with extracted component | No |

**The Snapshot story must capture every visually distinct state.** If a variant exists but isn't in the Snapshot story, Chromatic can't catch regressions on it. A visual state without a snapshot is an unprotected visual state.

## Required Stories

Every component must have at minimum:
1. **Playground** (always first) — full Controls panel, no snapshot
2. **Snapshot** (second) — consolidated JSX rendering all key visual variants in one story

**Overlay components — static-panel pattern (DO NOT omit).** For `Dialog`, `Drawer`, `Modal`, `Popover`, `AlertDialog`, and `Tooltip`, do NOT render the actual `<Component.Root defaultOpen>` in a Snapshot. Each portal mounts to `document.body`; multiple portals stack; only the last is visible to Chromatic, and the test runner often raises a "Component error" mid-capture. Instead, write a static-panel `Snapshot` that mimics the popup chrome with a `<div>` (rounded surface + Title heading + body + ActionFooter shape) — NO `Root` / NO `Portal`. Reference impls in `design-system/horizon/src/components/{Dialog,AlertDialog,Popover,Tooltip}/*.stories.tsx` (`SnapshotPanel` / `AlertSnapshotPanel` / `PopoverSnapshotPanel` / `TooltipSnapshotPanel`).

Skipping Snapshot entirely for overlays is the legacy fallback; static-panel is the v35 expectation. The reasoning: overlay variants (sizes, tones, with/without arrow) need Chromatic snapshot coverage just like any other component, and the static-panel pattern gives Chromatic a deterministic capture without portal stacking.

### Snapshot Story Pattern

Write Snapshot stories as explicit JSX with labeled sections. Each section renders a distinct visual variant:

```tsx
export const Snapshot: Story = {
  tags: ['!autodocs'],
  parameters: { chromatic: { disableSnapshot: false } },
  render: () => (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Default</h3>
        <Component {...defaultFixtures} />
      </div>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>With Icon</h3>
        <Component {...defaultFixtures} icon='search' />
      </div>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Disabled</h3>
        <Component {...defaultFixtures} disabled />
      </div>
    </div>
  ),
}
```

**Rules for Snapshot stories:**
- Import fixtures from `.testFixtures.tsx` — don't inline mock data
- Label each section with an `<h3>` so the snapshot is self-documenting
- Include every visually distinct state identified in the planning step
- Use `tags: ['!autodocs']` to exclude from docs
- Only this story (and Emphasis if needed) gets `disableSnapshot: false`

## Desktop and Mobile Stories — Mobile Twin Required

If a component cares about viewport size (uses container queries, media queries, viewport units, `useShouldUseDrawer`-style hooks, adaptive layouts, or any responsive behavior), **every desktop story MUST have a mobile twin** and **every desktop snapshot MUST have a mobile snapshot**.

Mobile proxy: **iPhone 12 (390×844)**. The Storybook viewport addon's `mobile1` preset works; for container-query components, a `w-[390px]` decorator works.

| Component renders identically across viewports? | Mobile twin? |
|---|---|
| Yes (Button, Badge, Chip, Heading, Span) | Not required |
| No (responsive layouts, adaptive overlays, container queries, etc.) | **Required — twin story + twin Chromatic snapshot** |

Missing mobile twins for viewport-aware components is a **blocking** finding.

### Container Query Components (Preferred)

For responsive components using container queries, wrap mobile stories in a container with a width constraint:

```tsx
export const Mobile: Story = {
  decorators: [
    (Story) => (
      <div className="w-[390px]">
        <Story />
      </div>
    ),
  ],
  parameters: { chromatic: { disableSnapshot: false } },
}
```

### Media Query / Screen-Oriented Components

For the rare case where a component uses media queries instead of container queries, use Storybook viewports.

**Storybook 10 API — important:** preselect a viewport via `globals.viewport.value`. `parameters.viewport.defaultViewport` only registers the option as available; it does NOT preselect on story load (that was the SB7/8 pattern and is silently no-op in SB10):

```tsx
export const MobileViewport: Story = {
  // ✅ SB10 — preselects iPhone 12 viewport on load
  globals: {
    viewport: { value: 'iphone12', isRotated: false },
  },
  parameters: {
    chromatic: { disableSnapshot: false },
  },
}

// ❌ SB7/8 — does NOT preselect in SB10
// parameters: { viewport: { defaultViewport: 'iphone12' } }
```

If your story already has other globals (e.g. `TOUCH_CAPABILITY_GLOBAL`), merge into one `globals` object.

Container queries are preferred over media queries in most cases.

## Args and Controls

Only add `args` manually when `react-docgen-typescript` cannot infer them — it handles most props automatically. Before adding an arg, check if you actually need to.

Props that accept `ReactNode`, `children`, or complex node types should be **hidden** from the Controls panel, not manually configured:

```tsx
argTypes: {
  children: { table: { disable: true } },
}
```

## Interaction Tests — First-Class Coverage

Interaction tests are first-class. Components that render functional behavior (open/close, focus management, hover, keyboard nav, drag, snap-points) MUST have play-function coverage on the named story that demonstrates the behavior. Don't waste play functions on pure visual variants — but DO test actual functional behavior.

When authoring or auditing stories, **actively scan for interaction-test opportunities**:

| Component class | Natural interaction tests |
|---|---|
| Overlays (Dialog/Drawer/Popover/AlertDialog) | Trigger opens; Escape closes (inert on AlertDialog); backdrop click closes (inert on AlertDialog); Tab cycle within Popup; Close button focuses Trigger on dismissal; hover delay (Popover with `openOnHover`); drag dismissal / snap-point assertions (Drawer) |
| Form controls | Value change; validation; clear; type-and-suggest |
| Navigation primitives | Hover trigger; active state; keyboard navigation |

A component whose stories are entirely visual with NO play functions on functional stories is missing functional coverage and is a blocking finding in audit mode.

Interaction stories do NOT need snapshots enabled unless the play function produces a visual state worth capturing (e.g., an open dropdown mid-flow).

Use `expect` from `storybook/test`. Mock callbacks with `fn()` from `storybook/test`.

## Test Fixtures

Share test data between stories and unit tests via `.testFixtures.tsx` files. Import fixtures in both `.stories.tsx` and `.spec.tsx` to keep things DRY.

## Story Titles

Use the package name as prefix for Universal Storybook grouping:

```typescript
const meta: Meta<typeof Component> = {
  title: 'horizon-plaza-components/ComplianceBadge',
}
```

## Figma Design Links

Include Figma links in story parameters for design cross-referencing:

```typescript
parameters: {
  design: { type: 'figma', url: '...' },
}
```

## Documentation — TSDoc on Source, Not Story Meta

Storybook + the Storybook MCP read prop documentation via **`react-docgen-typescript`** parsing **TSDoc/JSDoc comments on the component's TypeScript source** (the `interface`/`type` declaration and the exported component's JSDoc block). They do NOT read prose put into Storybook `meta`/`argTypes.<prop>.description` bodies.

Consequence:

- **Component prop documentation** lives as TSDoc comments on the props interface fields and on the exported component. This is the canonical source — Storybook surfaces it; the MCP returns it; downstream components inherit it.
- **NEVER** put prop documentation in `argTypes.<prop>.description` bodies in the story file. It looks redundant in Storybook and is invisible to the MCP.
- Story-level prose (what THIS story demonstrates) belongs in `parameters.docs.description.story` — that is the only narrative text Storybook reads from the story file.

```tsx
// ✅ Correct — TSDoc on the prop, picked up by react-docgen-typescript
export interface DialogPopupProps {
  /**
   * Modality of the dialog.
   * - `true` (default): traps focus and renders a blocking backdrop.
   * - `'trap-focus'`: traps focus but does NOT block interaction outside.
   * - `false`: no focus trap, no backdrop.
   */
  modal?: boolean | 'trap-focus'
}

// ❌ Wrong — invisible to MCP; redundant in Storybook UI
argTypes: {
  modal: { description: 'Modality of the dialog...' },
}
```

Other rules:

- Story meta should include `tags: ['autodocs']` for auto-generated docs.
- For snapshot-only stories: use `tags: ['!autodocs']` and `parameters: { chromatic: { disableSnapshot: false } }`.
- `parameters.docs.description.story` is the right place to document what THIS story demonstrates (e.g., "Drawer in `coarse` pointer mode with all snap points").

## Layout Components in Stories (Overlays)

Stories for overlay components (Dialog, Drawer, Popover, AlertDialog, Modal) MUST use Horizon's layout primitives for chrome:

| Concern | Required component |
|---|---|
| Title + description + close button | `PopupHeader` (with subparts `.Title`, `.Description`, `.Close`) |
| Sticky bottom action bar | `ActionFooter` |
| Header + scrollable body + footer composition | `PopupLayout` |

Hand-rolled header/footer is allowed ONLY when the story is explicitly demonstrating a custom header/footer pattern, and the story name MUST say so (e.g. `CustomHeaderDemo`, `WithoutPopupHeader`). Default stories must use the layout primitives.

Rationale: stories are the canonical reference designers and consumers copy from. Hand-rolled chrome teaches the wrong pattern and makes regressions in the layout primitives invisible.

## ScrollArea for Growable Content

Story content that can grow (long lists, dynamic body copy, overflow demos) MUST be wrapped in `ScrollArea`. Never use raw `overflow-y-auto`, `overflow-auto`, or hand-rolled scroll containers in stories.

Same exception: a story explicitly demoing custom scroll behavior may opt out, and the story name must indicate this (e.g. `CustomScrollContainer`).

## Overlay Stories: `defaultOpen`, Not `open`

Stories that present an overlay (Dialog/Drawer/Popover/AlertDialog) in its open state at story load **MUST** use **`defaultOpen={true}`** — the uncontrolled API — never `open={true}` (controlled).

Reason: bare `open={true}` is a controlled binding without a state setter, so the close button, Escape, and backdrop click all become no-ops. The overlay cannot be dismissed and the story is broken for interaction testing.

```tsx
// ❌ Wrong — close button is a no-op; Escape is a no-op
<Dialog.Root open>
  <Dialog.Popup>...</Dialog.Popup>
</Dialog.Root>

// ✅ Correct — uncontrolled, fully interactive
<Dialog.Root defaultOpen>
  <Dialog.Popup>...</Dialog.Popup>
</Dialog.Root>
```

Use the controlled API (`open` + `onOpenChange`) only when the story actually demonstrates programmatic open/close — and in that case the `onOpenChange` setter must be wired.

This is a **blocking** finding in audit mode.

## Drawer + Popover Default = No Scrim

The default story for **Drawer** and **Popover** is **without a scrim/backdrop**. With-scrim is the **opt-in exception**, and the story name MUST signal it (e.g. `WithScrim`, `ScrimVariant`).

| Component | Default behavior | Opt-in for scrim |
|---|---|---|
| `Drawer.Root` | omit `Drawer.Backdrop` | render `Drawer.Backdrop` in `WithScrim` story |
| `Popover.Root` | omit `Popover.Backdrop` | render `Popover.Backdrop` in `WithScrim` story |
| `Dialog.Root` | renders `Dialog.Backdrop` (modal default) | n/a — Dialog is modal by default |
| `AlertDialog.Root` | renders `AlertDialog.Backdrop` (modal, inert) | n/a |

A bare default Drawer/Popover story showing a scrim without an opt-in name signal is a blocking finding.

## Long Scrolling Stories: Single Footer, Contained Scroll

Stories named `LongScrolling*`, `WithLongContent`, or any story whose purpose is to demonstrate scroll behavior MUST satisfy:

1. Scrollable content is **contained inside `ScrollArea`** with `dialogBody`/`drawerBody` slot — content does NOT escape the popup bounds.
2. The popup uses `flex flex-col` with bounded `max-height` so the body region scrolls while the chrome stays put.
3. **Exactly one** `ActionFooter`. A floating button rendered alongside a sticky `ActionFooter` is the "belt and suspenders" anti-pattern — flag both occurrences.
4. The sticky-PopupHeader + ScrollArea-body + sticky-ActionFooter triad must be visible while scrolling — header pinned at top, footer pinned at bottom, body scrolling between them.

Failing any of these is a blocking finding.

## Adaptive / Side-by-Side Demos: No Height-Fill

Stories that statically render multiple modes side-by-side (e.g., `AdaptiveDemo` with a `fine`-pointer panel next to a `coarse`-pointer panel, in a CSS grid) MUST prevent the wrapper from stretching to a tall fixed height. Empty space below content is misleading — it makes a small Drawer in a tall grid cell look like a giant Drawer.

Use `items-start` (or `place-items-start`) on the grid container, and let each panel size to its content. Do not force `h-full`/`min-h-screen`/large fixed heights on the wrapper.

```tsx
// ❌ Wrong — empty stretch space misrepresents the component
<div className="grid grid-cols-2 h-[1400px] items-stretch">

// ✅ Correct — content-sized cells; no misleading whitespace
<div className="grid grid-cols-2 items-start gap-6">
```

This is a blocking finding when the story compares overlays/popups whose visual weight depends on intrinsic height.

## Accessibility in Stories

A11y is **mandatory** in every story. The Storybook a11y addon runs against each story; violations are blocking findings in audit and verifier mode.

Single allowed exception: **color-contrast violations where the contrast ratio is >4 but <4.5 (WCAG AA)** are tracked separately as planned remediation and may be ignored for the current scope. Every other axe-core failure (focusable-content, label-associations, landmark-roles, button-name, keyboard-navigation, etc.) is blocking.

Verifier protocol: read the Storybook `Accessibility` panel results per story (or via the a11y MCP if available) and report each non-exempt violation. Do not silence rules in story `parameters.a11y.config.rules` without explicit user approval — silenced rules are a finding by themselves.

## Canonical Story Template

```typescript
import { fn } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Component } from './Component'
import { defaultProps } from './Component.testFixtures'

const meta: Meta<typeof Component> = {
  title: 'Components/Category/Component',
  component: Component,
  tags: ['autodocs'],
  parameters: {
    component: Component,
    design: { type: 'figma', url: '...' },
  },
  argTypes: {
    className: { table: { disable: true } },
    onClick: { control: false },
  },
  args: { ...defaultProps, onClick: fn() },
}
export default meta
type Story = StoryObj<typeof meta>

/** Interactive playground with full Controls panel. */
export const Playground: Story = {}

/** Consolidated visual snapshot of all key variants. */
export const Snapshot: Story = {
  tags: ['!autodocs'],
  parameters: { chromatic: { disableSnapshot: false } },
  render: () => (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Default</h3>
        <Component {...defaultProps} onClick={fn()} />
      </div>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Variant B</h3>
        <Component {...defaultProps} variant='b' onClick={fn()} />
      </div>
    </div>
  ),
}

/** Tests user interaction flow. */
export const Interactive: Story = {
  play: async ({ canvas, args }) => {
    const element = canvas.getByRole('button')
    await userEvent.click(element)
    await expect(args.onClick).toHaveBeenCalled()
  },
}
```
