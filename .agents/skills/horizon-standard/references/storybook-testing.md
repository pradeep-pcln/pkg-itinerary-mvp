# Storybook Testing Conventions

Visual testing strategy, interaction tests, and Chromatic snapshot patterns for Horizon components.

## Contents

- [Visual Testing Strategy](#visual-testing-strategy)
- [Chromatic Snapshot Strategy](#chromatic-snapshot-strategy)
- [Interaction Tests](#interaction-tests)
- [Shared Test Fixtures](#shared-test-fixtures)
- [Testing Portaled Components](#testing-portaled-components)
- [Common Pitfalls](#common-pitfalls)
- [Accessibility-First Queries](#accessibility-first-queries)
- [Complete Test Story Example](#complete-test-story-example)

## Visual Testing Strategy

| Test Type | Use For | Don't Use For |
|---|---|---|
| **Chromatic Snapshots** | Visual styling, Tailwind classes, layout, spacing, variants | N/A — always use for visual |
| **Storybook Play Functions** | User interactions, multi-step flows, portal components | Simple event handler calls |
| **Unit Tests (`.spec.tsx`)** | Props forwarding, refs, callbacks, edge cases, render logic | Visual styling, CSS classes, layout |

**Key principle**: Tailwind doesn't compile in JSDOM. Never assert on CSS classes or computed styles in unit tests. Let Chromatic snapshots handle visual verification.

## Chromatic Snapshot Strategy

Snapshots are **disabled by default** and **finite** in our contract. Enable selectively:

- **`Snapshot` story**: Use `snapshotStoryDecorator` to maximize prop permutation coverage per snapshot
- **Complex demonstrations**: Enable on stories like `Emphasis` that need custom layouts
- **Interaction tests**: Enable when `play` functions produce important visual states
- **All other stories**: Leave snapshots disabled (default)

```tsx
// Enable snapshots selectively
parameters: { chromatic: { disableSnapshot: false } }
```

## Interaction Tests

### Imports

```tsx
import { expect, fn, within } from 'storybook/test'
```

Use `storybook/test`, NOT `@storybook/test`.

### Structure

```tsx
export const MyInteractiveStory: Story = {
  render: () => <MyComponent />,
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)

    const button = canvas.getByRole('button')
    await userEvent.click(button)
    await expect(button).toHaveTextContent('Clicked')
  },
}
```

### Configuration for Test Stories

```tsx
const meta: Meta = {
  title: 'Diagnostics/Overlays/DrawerWithSelect',
  tags: ['!autodocs'],
  parameters: {
    chromatic: { disableSnapshot: false },
    docs: {
      description: { component: 'Tests that Select works correctly inside Drawer.' },
    },
  },
}
```

## Shared Test Fixtures

Create `ComponentName.testFixtures.tsx` co-located with the component for reusable test data:

```tsx
// Select.testFixtures.tsx
export const sortOptions = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Lowest Price', value: 'lowest-price' },
  { label: 'Guest Rating + Number of Reviews', value: 'rating-reviews' },
]
```

Use in both stories and unit tests for single source of truth.

## Testing Portaled Components

Components using React portals (Dialog, Drawer, Popover, Select dropdowns) render into `document.body`, not the story's `canvasElement`.

### Portal Query Pattern

```tsx
play: async ({ canvasElement, userEvent }) => {
  const canvas = within(canvasElement)       // Story root elements
  const body = within(document.body)          // Portaled elements

  // 1. Trigger in canvas
  await userEvent.click(canvas.getByText('Open Drawer'))

  // 2. Find overlay in body (no name filter)
  const overlay = await body.findByRole('dialog')

  // 3. Interact inside overlay
  const selectTrigger = within(overlay).getByRole('combobox', { name: /sort by/i })
  await userEvent.click(selectTrigger)

  // 4. Nested portal content in body
  const option = await body.findByRole('option', { name: /lowest price/i })
  await userEvent.click(option)

  // 5. Verify
  await expect(selectTrigger).toHaveTextContent('Lowest Price')
}
```

### Query Reference

| Element Type | Query Location | Method | Example |
|---|---|---|---|
| Trigger button | `canvas` | `getByText` | `canvas.getByText('Open Dialog')` |
| Dialog/Drawer | `body` | `findByRole('dialog')` | No name filter |
| Button inside overlay | `within(overlay)` | `getByText` | `within(dialog).getByText('Actions')` |
| Select trigger | `within(overlay)` | `getByRole('combobox')` | `{ name: /sort by/i }` |
| Select option | `body` | `findByRole('option')` | `{ name: /price/i }` |
| Menu item | `body` | `findByRole('menuitem')` | `{ name: /edit/i }` |
| Tooltip | `body` | `findByText` | Role unreliable, use text |
| Popover content | `body` | `findByText` | No dialog role |

## Common Pitfalls

### Query dialogs without name filters

```tsx
// Bad — name filters are fragile
const dialog = await body.findByRole('dialog', { name: /dialog with select/i })

// Good — dialogs are unique enough
const dialog = await body.findByRole('dialog')
```

### Use getByText for button triggers in overlays

```tsx
// Bad — finds close button AND trigger
within(dialog).getByRole('button', { name: /open menu/i })

// Good — specific text match
within(dialog).getByText('Actions')
```

### Don't assert menu items after clicking

```tsx
// Bad — menu closes, element reference stale
await userEvent.click(editMenuItem)
await expect(editMenuItem).toBeInTheDocument() // Flaky!

// Good — assert before clicking
await expect(editMenuItem).toBeInTheDocument()
await userEvent.click(editMenuItem) // Click proves test passed
```

### Don't check dropdown close timing

```tsx
// Good — verify selection succeeded
await expect(selectTrigger).toHaveTextContent('Lowest Price')
// Don't check if dropdown closed — timing varies in CI
```

### Query tooltips by text, not role

```tsx
// Bad — tooltip role unreliable
await body.findByRole('tooltip')

// Good — text content
await body.findByText('This tooltip is inside a Dialog')
```

## Accessibility-First Queries

Prefer accessible queries. If they fail, it's likely an a11y issue in the component:

```tsx
// Good
canvas.getByRole('combobox', { name: /sort by/i })
body.findByRole('option', { name: /lowest price/i })

// Avoid
canvas.getByTestId('select-trigger')
```

**Decision tree for query failures:**
1. Accessibility query fails → investigate the component
2. Real a11y issue? → Fix the component (add aria-label, use semantic HTML)
3. Testing Library limitation? → Only then use alternative queries

## Complete Test Story Example

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, within } from 'storybook/test'
import { Button } from '../../components/Button'
import { Drawer } from '../../components/Drawer'
import { Select } from '../../components/Select'
import { sortOptions } from '../../components/Select/Select.testFixtures'

const meta: Meta = {
  title: 'Diagnostics/Overlays/DrawerWithSelect',
  tags: ['!autodocs'],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
}

export default meta
type Story = StoryObj

const DrawerWithSelectComponent = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
      <Drawer title='Drawer with Select' open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className='px-4 py-4'>
          <Select label='Sort by' placeholder='Choose sorting' menuItems={sortOptions} onChange={fn()} />
        </div>
      </Drawer>
    </>
  )
}

export const DrawerWithSelect: Story = {
  render: () => <DrawerWithSelectComponent />,
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    const body = within(document.body)

    await userEvent.click(canvas.getByText('Open Drawer'))

    const drawer = await body.findByRole('dialog')
    await expect(drawer).toBeInTheDocument()

    const selectTrigger = within(drawer).getByRole('combobox', { name: /sort by/i })
    await userEvent.click(selectTrigger)

    const option = await body.findByRole('option', { name: /lowest price/i })
    await userEvent.click(option)

    await expect(selectTrigger).toHaveTextContent('Lowest Price')
  },
}
```
