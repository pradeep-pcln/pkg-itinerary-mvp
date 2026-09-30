---
title: No Overlay Mocks
impact: HIGH
tags: [testing, vitest, overlay, Dialog, Drawer, Popover, Tooltip, matchMedia]
applies-to: testing
---

# No Overlay Mocks

## Rule

**Never mock `@pcln/horizon` overlay components** (Dialog, Drawer, Popover, Tooltip, PopupHeader)
in spec/test files. Use the real components with a `matchMedia` stub in `test/setup.ts`.

### Why

Horizon overlay mocks:
1. Silently break when the overlay API changes — mocks don't catch TS errors from prop renames,
   removed slots, or namespace API migrations.
2. Miss real behavior: portal rendering, conditional mounting, animation callbacks (`onOpenChangeComplete`),
   Base UI event handling (pointer events on Select items), and `useShouldUseDrawer` responsive logic.
3. Require constant maintenance — every DX-1074-style migration must touch every mock in every consumer.
4. Give false confidence — a mock that works bears no relation to whether the real component works.

## Required Setup

### `test/setup.ts` — matchMedia stub (jsdom only)

jsdom provides no `window.matchMedia` implementation. Without it, `useShouldUseDrawer` and
`useResponsiveDrawerDirection` crash. Stub it once in the package's test setup file:

```ts
// test/setup.ts
import { vi } from 'vitest'

// Stub matchMedia for Horizon overlay hooks.
// (pointer: coarse) controls useShouldUseDrawer — false keeps overlays in Desktop mode (Popup/Dialog).
// max-width query intentionally returns false so isMobile=false in all tests; use setReactResponsive
// helper when you specifically need mobile behavior.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes('pointer: coarse') ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

> For desktop-only consumers that never test mobile behavior, this stub is sufficient.

### `setReactResponsive` helper — when you need mobile tests

If a spec needs to toggle mobile/desktop rendering:

```ts
// helpers.ts
import { vi } from 'vitest'

export type Breakpoint = 'desktop' | 'mobile'

export function setReactResponsive(breakpoint: Breakpoint): () => void {
  // (pointer: coarse) drives useShouldUseDrawer.
  // max-width:767px intentionally always false — keep isMobile=false so overlays use
  // Desktop Popup path (not Drawer portal, which requires async Base UI mount in jsdom).
  const isCoarse = breakpoint === 'mobile'
  const mock = vi.fn((query: string) => ({
    matches: query.includes('pointer: coarse') ? isCoarse : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: mock })
  return () => {
    vi.restoreAllMocks()
  }
}
```

**Critical:** scoping `(pointer: coarse)=true` without setting `max-width:767px=true` keeps
`useShouldUseDrawer()=false`. This is intentional — the Base UI Drawer portal uses async
`mounted` state that jsdom cannot synchronously hydrate, so `getByRole` queries fail in
Drawer-mode tests.

## Interacting with Select-Based Components

After DX-1074, `@pcln/horizon` `TimePicker` and other Horizon Select wrappers use
`@base-ui-components/react` Select. Options are only rendered in the portal **when the
dropdown is open**. The trigger renders with `role="combobox"`.

```ts
// ❌ Wrong — options not in DOM until dropdown is open
await user.click(screen.getByText('3:00 PM'))

// ✅ Correct — open Select first, then click the option
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(screen.getByRole('combobox'))   // opens the Select dropdown
await user.click(screen.getByText('3:00 PM'))    // now the option is in the portal DOM
```

**Use `userEvent.click`, not `fireEvent.click`, for Select interactions.**
Base UI `Select.Item` uses pointer events (`onPointerDown`/`onPointerUp`) for item selection —
`fireEvent.click` dispatches only a synthetic `click` event and does not trigger `onValueChange`.
`userEvent.click` simulates the full pointer event sequence and works correctly.

## `getComputedStyle` Stub

jsdom's `getComputedStyle` returns empty strings for all properties by default. Horizon
overlays (and Base UI's `tabbable`) inspect `visibility`, `display`, `position`, and CSS
transitions. Stub the relevant properties to avoid false "element not focusable" failures:

```ts
// test/setup.ts
import { vi } from 'vitest'

globalThis.getComputedStyle = vi.fn().mockImplementation(() => {
  const style: Record<string, string> = {
    visibility: 'visible',
    display: 'block',
    position: 'static',
    transform: 'none',
    transitionDuration: '0s',
    transitionProperty: 'none',
    transitionDelay: '0s',
    animationDuration: '0s',
    animationDelay: '0s',
  }
  return {
    ...style,
    getPropertyValue: (prop: string) => style[prop] ?? '',
  }
})
```

> Only add this stub if tests fail with `tabbable` or focus-related errors. Many packages
> don't need it if they don't exercise focus management.

## Detecting Overlay Content in Tests

Real Horizon overlays render content in a Base UI portal (appended to `document.body`).
Prefer these queries after opening the overlay:

| What to find | Query |
|---|---|
| Overlay container | `screen.getByRole('dialog')` |
| Select dropdown trigger | `screen.getByRole('combobox')` |
| Popover content | `screen.getByRole('dialog')` or `await screen.findByText('...')` |
| Drawer content | `await screen.findByRole('dialog')` (async — Base UI mounts asynchronously) |

## Anti-Patterns

```ts
// ❌ Mocking the entire overlay module
vi.mock('@pcln/horizon', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // ...
}))

// ❌ Mocking individual overlay components
vi.mock('@pcln/horizon', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Popover: { Root: ..., Trigger: ..., Popup: ... },
  }
})

// ❌ Using fireEvent.click on a Base UI Select item
fireEvent.click(screen.getByText('3:00 PM'))

// ❌ Querying for Select options before opening the dropdown
screen.getByText('3:00 PM')  // throws — options are not in DOM until dropdown opens
```

## References

- `references/fix-recipes.md` — matchMedia setup recipes
- DX-1074: migration that introduced real-component testing across 30+ consumer packages;
  root cause analysis for Select-based TimePicker test failures documented in session history
