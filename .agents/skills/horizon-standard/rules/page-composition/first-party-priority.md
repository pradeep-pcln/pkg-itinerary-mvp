---
name: first-party-priority
description: Prefer `@pcln/horizon-*` domain packages over generic `@pcln/horizon` primitives when a domain-specific component exists for the use case.
applies-to: page-composition
---

# First-party priority

## Rule

When importing a component for a page, follow this priority order. Use the first source that has a suitable component:

1. **The app's own domain package** — `@pcln/horizon-penny-components` for Penny, `@pcln/horizon-fly-components` for fly UX, `@pcln/horizon-hotel-listing-card` for hotel cards, etc. These embed domain-specific styling, behavior, and analytics hooks.
2. **A neighboring domain package** — if your domain doesn't have one, check whether another team already built the same shape (e.g. a generic `RateCallout`).
3. **`@pcln/horizon`** — the design system primitives. Use these to compose new components inside Authoring mode, not directly inside pages when a domain wrapper exists.
4. **Inline JSX from horizon primitives** — only when no domain package fits and the component is genuinely page-specific (and follows the no-component-definition-in-route rule).

## Why

Domain packages encode product-specific decisions (Penny's chat-bubble styling, fly's date-picker locale defaults, hotel listing's rate-table column logic). Reaching past them to compose from raw `@pcln/horizon` skips those decisions and produces visual or behavioral drift that is invisible to the developer until QA or production.

The component you're tempted to build inline probably exists. Check before composing.

## How to apply

- Before writing a new composition in a page, consult `references/horizon-package-reference.md` for the canonical map of horizon-consuming packages (foundation, domain, and legacy). For a fresh scan, run `rush list -p | grep horizon-` in pcln-web (or `pnpm ls @pcln/horizon-` in external repos).
- If the existing domain component is *almost* right but missing a feature, file a ticket against the package owner — don't fork inline.

## Counter-example (don't do this)

```tsx
// app/penny/page.tsx — composing Penny chat UI from raw horizon primitives
import { Box, Text, Stack } from '@pcln/horizon'

function ChatBubble({ message }: { message: string }) {
  return (
    <Box p="sm" bg="penny-bubble" rounded="lg">
      <Text variant="body">{message}</Text>
    </Box>
  )
}
```

## Right way

```tsx
// app/penny/page.tsx
import { ChatBubble } from '@pcln/horizon-penny-components'

// ... use ChatBubble directly; don't re-implement
```
