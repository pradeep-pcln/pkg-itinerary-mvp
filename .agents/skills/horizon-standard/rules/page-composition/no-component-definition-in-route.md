---
name: no-component-definition-in-route
description: Don't define new components inside route/page/layout files — extract to a sibling components/ directory with its own .tsx + .variants.ts pair.
applies-to: page-composition
---

# No component definition in route files

## Rule

A route, page, or layout file (`page.tsx`, `layout.tsx`, Remix route component, Next.js app segment) **composes** components — it does not **define** them.

If you find yourself writing a function that returns JSX with horizon primitives composed inside, and that function is reused or has structural complexity (>20 lines, multiple variant branches, conditional styling), extract it.

**Extract to:**
```
<route-dir>/components/<ComponentName>.tsx
<route-dir>/components/<ComponentName>.variants.ts
```

The extracted component file falls under **Authoring mode** — full authoring rules apply (separate file, variants sibling, slot type export, etc.).

## Exceptions

A trivial inline element is fine — these stay in the route:
- A single horizon component with no styling logic: `<Button>Submit</Button>`
- A single passthrough wrapper used once: `<Box>{children}</Box>`

The litmus test: if the JSX subtree has its own variant logic, conditional styling, or appears more than once in this route, it's a component. Extract it.

## Why

Components defined inside routes accumulate styling shortcuts (because they're "just one-off") and never get tests, stories, or proper variant tables. Six months later the same shape exists in three other routes, each slightly different. Extraction at definition time prevents the divergence.

This also keeps page-composition files small and readable — pages should describe layout intent, not component anatomy.

## How to apply

- When reviewing a page file, scan for any function (named or arrow) that returns JSX. If the JSX has more than one horizon primitive plus styling logic, recommend extraction.
- When extracting, place the component in `<route-dir>/components/` (not the global components dir) — it stays local until the escalation rule (`escalating-to-package.md`) suggests promoting it to a horizon-* package.

## Counter-example (don't do this)

```tsx
// app/checkout/page.tsx
function PriceBox({ price, isOnSale }: { price: number; isOnSale: boolean }) {
  return (
    <Box p="md" bg={isOnSale ? 'sale-bg' : 'background-subtle'}>
      <Text variant={isOnSale ? 'sale-emphasis' : 'body'}>${price}</Text>
    </Box>
  )
}

export default function CheckoutPage() { /* ... uses PriceBox ... */ }
```

## Right way

```tsx
// app/checkout/page.tsx
import { PriceBox } from './components/PriceBox'

export default function CheckoutPage() { /* ... uses PriceBox ... */ }

// app/checkout/components/PriceBox.tsx
import { tv, type VariantProps } from 'tailwind-variants'
import { Box, Text } from '@pcln/horizon'
import { priceBoxVariants, type PriceBoxVariantsSlots } from './PriceBox.variants'

// ... full component with variants, slot exports, etc.

// app/checkout/components/PriceBox.variants.ts
export const priceBoxVariants = tv({ /* ... */ })
export type PriceBoxVariantsSlots = typeof priceBoxVariants.slots
```
