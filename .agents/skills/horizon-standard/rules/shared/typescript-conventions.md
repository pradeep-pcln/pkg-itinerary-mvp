---
title: TypeScript Conventions
impact: MEDIUM
tags: [typescript, types, imports, readonly]
applies-to: shared
---

# TypeScript Conventions

## `import type` for All Type-Only Imports

Always use `import type` when importing types, interfaces, and type aliases. This ensures they are erased at compile time for optimal bundling and tree-shaking:

```typescript
// ❌ Wrong
import { ComponentVariants } from './Component.variants'

// ✅ Correct
import type { ComponentVariants } from './Component.variants'

// ✅ Also correct — inline type specifier
import { componentVariants, type ComponentVariants } from './Component.variants'
```

## Derive Prop Types from VariantProps

Never manually redeclare prop types that mirror variant options. Always derive them:

```typescript
// ❌ Wrong — manual redeclaration drifts from variants
interface Props {
  size: 'sm' | 'md' | 'lg'
  color: 'primary' | 'secondary'
}

// ✅ Correct — derived from the source of truth
import type { VariantProps } from 'tailwind-variants'
export type ComponentVariants = VariantProps<typeof componentVariants>
```

## Discriminated Union Types for Mutually Exclusive Props

When a component has prop groups that are mutually exclusive, use discriminated unions with `never` to enforce correctness at the type level:

```typescript
type BadgeWithImage = BadgeVariants & { image: string; iconLeft?: never }
type BadgeWithIcon = BadgeVariants & { image?: never; iconLeft?: ValidGoogleSymbol }
type BadgeTextOnly = BadgeVariants & { image?: never; iconLeft?: never }

export type BadgeProps = BadgeWithImage | BadgeWithIcon | BadgeTextOnly
```

This prevents consumers from passing both `image` and `iconLeft` simultaneously.

## `Readonly<Props>` for Component Parameters

Always wrap the props type in `Readonly<>` in the component's function signature to prevent accidental mutation:

```typescript
export const Component = forwardRef<
  HTMLButtonElement,
  Readonly<ComponentProps & ComponentPropsWithoutRef<'button'>>
>(function Component({ children, ...props }, ref) {
  // ...
})
```

## `ComponentPropsWithoutRef` for HTML Passthrough

For **new components** that directly render a single HTML element, use `ComponentPropsWithoutRef<'element'>` (not `ComponentProps`) to enable HTML attribute passthrough while avoiding ref collisions with `forwardRef`:

```typescript
// ✅ New component rendering a single <button>
interface Props extends ComponentVariants, Omit<ComponentPropsWithoutRef<'button'>, 'type'> {}
```

**Do not retrofit existing components** with `ComponentPropsWithoutRef` during audits unless there's a concrete consumer need. Adding button/div DOM props to a component that composes with other Horizon components (e.g., `DrawerToPopover`, `BaseAutocomplete`) causes type conflicts — their DOM event handler signatures differ. The cascade through consumers can be significant.

**When `ComponentProps` is acceptable:** If an existing component uses `ComponentProps<'button'>` and works correctly, leave it. The ref "collision" with forwardRef is a type-level redundancy, not a runtime bug — TypeScript's `forwardRef` generic handles it.

## No Unnecessary Type Coercion

Avoid `as` casts and non-null assertions (`!`) unless absolutely required. SonarQube flags unnecessary type coercion. Prefer type narrowing through control flow:

```typescript
// ❌ Wrong
const value = data as string

// ✅ Correct
if (typeof data === 'string') {
  const value = data
}
```

## Everything in TypeScript

All files must use `.ts` or `.tsx` extensions. No `.js` or `.jsx` files in the Horizon codebase.

## `as const` for Lookup Tables

Use `as const` for static maps and lookup tables to get narrow literal types:

```typescript
const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
} as const
```
