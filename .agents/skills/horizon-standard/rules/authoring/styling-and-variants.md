---
title: Styling and Variants
impact: HIGH
tags: [variants, tv, slots, styling, tailwind]
applies-to: authoring
---

# Styling and Variants

## tailwind-variants Is the Primary Styling Mechanism

All visual prop-to-style mappings go through tailwind-variants. The component JSX should contain minimal to no conditional class logic — that belongs in the variants file.

## Horizon Color Tokens Only

Use only color utilities backed by `design-system/horizon/src/tailwind-theme.css`.

Never use Tailwind's default color palettes in Horizon code, stories, tests, fixtures, or docs. This includes `gray-*`, `slate-*`, `zinc-*`, `stone-*`, `blue-*`, `red-*`, `green-*`, `yellow-*`, `pink-*`, `black`, and `white`.

Use Horizon semantic tokens instead:

| Intent | Use |
|---|---|
| Neutral surfaces, borders, body text | `neutral-*` |
| Primary/action blue | `primary-*` or `actionPrimary-*` |
| Error/destructive red | `error-*` or `actionCritical-*` |
| Success green | `success-*` or `benefit-*` |
| Warning/yellow | `caution-*` |
| White/black equivalents | `neutral-1` / `neutral-12` |

Examples:

```typescript
// ❌ Wrong — Tailwind default palette tokens are reset by Horizon
'border-gray-300 bg-blue-50 text-gray-600 text-white'

// ✅ Correct — Horizon theme tokens
'border-neutral-6 bg-primary-2 text-neutral-10 text-neutral-1'
```

Before finishing any Horizon styling change, scan the touched package:

```bash
rg "\\b(?:bg|text|border|ring|outline|decoration|divide|from|via|to|shadow|placeholder|accent|caret|stroke|fill)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)-[0-9]{0,3}\\b|\\b(?:bg|text|border|ring|outline|decoration|divide|from|via|to|shadow|placeholder|accent|caret|stroke|fill)-(?:black|white)\\b" design-system/horizon/src design-system/horizon-data-table/src
```

Any match is a blocking issue unless it is not a Tailwind utility class.

## Variants File Convention

All variants live in a dedicated `.variants.ts` file. Pass ALL variants as one object to `tv()`, imported from `src/variants/tv`.

### Canonical Variants Template

```typescript
import { type VariantProps } from 'tailwind-variants'
import { tv } from '../../variants/tv'

export const componentVariants = tv({
  slots: {
    root: 'flex items-center gap-2',
    trigger: 'bg-primary-1 rounded-xl border',
  },
  variants: {
    size: {
      sm: { root: 'text-sm', trigger: 'h-8 px-2' },
      md: { root: 'text-base', trigger: 'h-10 px-4' },
    },
  },
  compoundVariants: [],
  defaultVariants: { size: 'md' },
})

export type ComponentVariants = VariantProps<typeof componentVariants>
export type ComponentVariantsSlots = typeof componentVariants.slots
```

## Export Pattern (Must Follow Exactly)

```typescript
export type FooVariants = VariantProps<typeof fooVariants>
export type FooVariantsSlots = typeof fooVariants.slots
```

Always derive variant types from `VariantProps` — never redeclare prop types manually.

## Slots Pattern

Use slots for multi-element components. Each slot returns a class-generating function:

```typescript
const { root, trigger } = componentVariants({ size })
return (
  <div className={root()}>
    <button className={trigger()}>Click</button>
  </div>
)
```

## Compound Variants

Use compound variants for styling that depends on multiple prop combinations:

```typescript
compoundVariants: [
  { size: 'sm', color: 'primary', class: { root: 'font-bold' } },
]
```

## Anti-Patterns

### No inline conditional classes in JSX

```typescript
// ❌ Wrong — conditional logic belongs in variants
<div className={isActive ? 'bg-primary-1' : 'bg-neutral-1'}>

// ✅ Correct — use a variant
const classes = componentVariants({ active: isActive })
<div className={classes}>
```

### No inline styles

```typescript
// ❌ Wrong
<div style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>

// ✅ Correct
<div className="bg-neutral-11/80">
```

### No arrays for class definitions in slots

```typescript
// ❌ Wrong — arrays prevent prettier plugin sorting
slots: {
  root: ['flex', 'items-center', 'gap-2'],
}

// ✅ Correct — single string
slots: {
  root: 'flex items-center gap-2',
}
```

### No single-argument `cn()` passthrough

`cn(singleArg)` is a no-op — only use `cn()` when merging multiple class sources:

```typescript
// ❌ Wrong — cn() with one arg adds no value
<div className={cn(className)}>

// ✅ Correct — pass directly when no merging needed
<div className={className}>

// ✅ Correct — cn() merges multiple sources
<div className={cn(baseClasses(), className, slots.root)}>
```

### No plain CSS rgba()

```typescript
// ❌ Wrong
'bg-[rgba(0,0,0,0.8)]'

// ✅ Correct — Tailwind opacity modifier with Horizon tokens
'bg-neutral-11/80'
```

## Opacity

Always use Tailwind's opacity modifier syntax with Horizon design tokens: `bg-primary-1/50`, `text-neutral-11/80`. Never use raw `rgba()` or `opacity` utilities when the intent is color-with-alpha.

## Z-Index Discipline

Base UI primitives (`@base-ui-components/react`) manage stacking for their own portal layers — Dialog, Popover, Tooltip, Menu, AlertDialog all coordinate z-index internally. Adding ad-hoc `z-*` utility classes in component or story source on top of these primitives is a smell:

- Component source: ad-hoc `z-10`, `z-50`, `z-[9999]` etc. on overlay primitives or their slots is forbidden.
- Story source: same — stories must not paper over stacking issues with z-index hacks.
- Exception: a deliberate stacking conflict (e.g. fixed app chrome interacting with a portaled overlay) MAY require a `z-*` class. When it does, add a one-line comment explaining the conflict and the chosen value:
  ```tsx
  // z-50 — sits above sticky page header (#site-header is z-40)
  <div className='z-50'>
  ```
  No comment, no `z-*`. Verifier flags ad-hoc `z-*` on overlay primitives as `[z-index-smell]`.

```tsx
// ❌ Wrong — Base UI manages stacking; arbitrary z-index masks the real bug
<Dialog.Popup className='z-50 ...'>

// ✅ Correct — let the primitive handle it
<Dialog.Popup className='...'>
```
