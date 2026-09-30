---
title: Testing Strategy
impact: MEDIUM
tags: [testing, vitest, testFixtures, chromatic]
applies-to: testing
---

# Testing Strategy

## Guiding Principle

Aim for high coverage, but do NOT assert on visual details like class names. Chromatic snapshots handle visual regression far better than unit test assertions on CSS classes or styles.

## Test Fixtures Pattern

Every component should have a `.testFixtures.tsx` file that exports named prop objects and helper functions. These fixtures are shared between `.stories.tsx` and `.spec.tsx` files, keeping test data DRY and ensuring every scenario is tested rigorously in both contexts.

Fixtures are composable — build complex scenarios from simple base fixtures.

### Example

```typescript
// Button.testFixtures.tsx
import type { ButtonProps } from './Button'

export const defaultButtonProps: ButtonProps = { children: 'Button Text' }

export const buttonWithIconsProps: ButtonProps = {
  children: 'With Icons',
  iconLeft: 'search',
  iconRight: 'arrow_forward',
}

export const disabledButtonProps: ButtonProps = {
  ...defaultButtonProps,
  disabled: true,
}
```

### Usage in Tests

```typescript
// Button.spec.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'
import { defaultButtonProps, disabledButtonProps } from './Button.testFixtures'

test('renders button text', () => {
  render(<Button {...defaultButtonProps} />)
  expect(screen.getByRole('button')).toHaveTextContent('Button Text')
})

test('disabled button is not clickable', () => {
  render(<Button {...disabledButtonProps} />)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

### Usage in Stories

```typescript
// Button.stories.tsx
import { defaultButtonProps, buttonWithIconsProps } from './Button.testFixtures'

export const Default: Story = { args: defaultButtonProps }
export const WithIcons: Story = { args: buttonWithIconsProps }
```

## Vitest + Testing Library Patterns

- Use `render()` with test fixture props
- Query by **role, label, and text** — not by class name or test ID
- Prefer `screen.getByRole()`, `screen.getByText()`, `screen.getByLabelText()`
- Use `userEvent` for simulating user interactions (clicks, typing, keyboard)

## What to Test in Unit Tests

### Behavior

- Event handlers fire correctly
- State changes produce expected output
- Conditional rendering based on props

### Accessibility

- Correct roles are present
- Labels are associated with controls
- Keyboard interactions work as expected

### Edge Cases

- Empty or undefined props
- Boundary values (min/max)
- Missing optional props

## What Chromatic / Storybook Covers (Don't Duplicate)

- Visual appearance and pixel-level layout
- Class names and style application
- Responsive rendering across viewports
- Hover, focus, and active visual states

## Interaction Tests in Storybook

Use play functions for user flow testing. These run in the browser context and are verified by Chromatic:

```typescript
export const Interactive: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button')
    await userEvent.click(button)
    await expect(canvas.getByText('Clicked')).toBeVisible()
  },
}
```

## Running Tests

When running vitest from agents or scripts:

- **Targeted runs**: Pass explicit file paths, not patterns through the shell (pipe characters get interpreted). Use `npx vitest run path/to/Component.spec.tsx` instead of `rushx test -- "Pattern"`.
- **Skip coverage on targeted runs**: Use `npx vitest run` directly (not `rushx test` which adds `--coverage`). Coverage spawns extra worker threads and is unnecessary for spot checks — CI handles coverage.
- **Orphan prevention**: Vitest forks worker threads that can survive if the parent process is killed. After running tests, verify no orphaned vitest workers remain: `pgrep -f "vitest" | wc -l`. If any are found, clean up with `pkill -f "node.*vitest [0-9]"`.
- **Prefer `--pool=forks`** over threads for better cleanup behavior when tests are run by agents.

## Mock Patterns

Avoid mocking Horizon internals. If a test requires mocking a Horizon component or utility, that is a signal that the test boundary is wrong — test at a higher level or restructure the component.

## Accessibility Is First-Class in Stories

A11y is mandatory for every story. The Storybook a11y addon runs against each story and violations are blocking findings.

Single allowed exception: **color-contrast violations where the contrast ratio is >4 but <4.5 (WCAG AA)** are tracked separately as planned remediation. Every other axe-core failure is blocking.

Do not silence rules in `parameters.a11y.config.rules` without explicit user approval — silenced rules are a finding by themselves.

Authoritative story-side rule lives in `rules/testing/storybook-conventions.md` § "Accessibility in Stories".

## Use Horizon Components in Tests AND Test Fixtures

The "Use Horizon components over raw HTML" rule (`rules/authoring/composition-patterns.md`) applies inside `.spec.tsx` and `.testFixtures.tsx` too. Test fixtures that render plain `<p>` / `<h2>` / `<div>` for content drift away from how consumers will actually use the component. Mirror real consumer composition in fixtures: Heading / P / Span / Caption / Button / IconButton / etc.
