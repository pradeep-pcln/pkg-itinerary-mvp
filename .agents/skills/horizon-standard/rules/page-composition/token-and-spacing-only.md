---
name: token-and-spacing-only
description: In page/route/layout files, use horizon tokens for color and spacing — no arbitrary Tailwind values, no hand-rolled CSS.
applies-to: page-composition
---

# Token and spacing only in page-composition files

## Rule

In page-composition files (`page.tsx`, `layout.tsx`, Remix routes, Next.js app segments), styling is restricted to:

- Horizon design tokens for color (`bg-background-base`, `text-content-primary`, etc.)
- Horizon spacing scale (`p-md`, `gap-lg`, `space-y-xs`, etc.)
- Horizon layout primitives (`Box`, `Stack`, `Flex`, `Grid`) where available

**Forbidden in page-composition files:**
- Arbitrary Tailwind values: `p-[13px]`, `text-[#1a2b3c]`, `mt-[2.5rem]`
- Hand-rolled CSS via `style={{ ... }}`
- One-off `cn()` calls embedding non-token classes
- New `tv()` variant definitions (those go in a `.variants.ts` paired with a component file — see `no-component-definition-in-route.md`)

## Why

Pages are the most-edited surface in any app. Every arbitrary value in a page is a future inconsistency: someone copies it to the next page with a slightly different number, and the design drifts. Tokens are the contract between design and engineering — bypass them in pages and you lose the contract everywhere.

The tokens are intentionally constrained. If a token doesn't exist for what you need, the answer is almost never "use an arbitrary value." The answer is usually "the visual design is wrong" or "this needs a new component, not a page-level styling exception."

## How to apply

- When auditing a page-composition file, grep for `\[.*\]` (Tailwind arbitrary value syntax) and `style={` and flag every match.
- When writing a new page, start from `Stack` / `Flex` / `Grid` for layout and horizon tokens for spacing.

## Counter-example (don't do this)

```tsx
// app/landing/page.tsx
export default function LandingPage() {
  return (
    <div className="p-[18px] mt-[3.25rem] bg-[#f7f7f7]">
      <h1 style={{ fontSize: '2.125rem', lineHeight: 1.15 }}>Welcome</h1>
    </div>
  )
}
```

## Right way

```tsx
import { Stack, Heading } from '@pcln/horizon'

export default function LandingPage() {
  return (
    <Stack p="md" mt="xl" bg="background-subtle">
      <Heading variant="display-md">Welcome</Heading>
    </Stack>
  )
}
```
