---
title: Component Anatomy
impact: HIGH
tags: [components, props, forwardRef, exports, jsdoc]
applies-to: authoring
---

# Component Anatomy

## One Export Per File

Each main component file must have exactly **one** named export. This is a React Fast Refresh requirement — violating it breaks hot-reload during development.

## Styling: Tailwind + tailwind-variants Only

- All styling goes through Tailwind utility classes and tailwind-variants
- Never use inline styles (`style={}`)
- Never use styled-components or CSS-in-JS
- Use `cn()` for class merging
- Use slot functions for multi-slot components

## Props Interface Pattern

The canonical Horizon props interface is built by **extending two upstream sources** — the variants and the underlying element/Base UI primitive — and then **selectively adding** Horizon-only props. Never hand-declare variant unions; their values live in `tv()` and must be derived via `VariantProps`.

### Raw HTML element (e.g. Button, Card)

```typescript
import type { ComponentPropsWithoutRef } from 'react'
import type { ButtonVariants } from './Button.variants'

export interface ButtonProps
  extends ButtonVariants, // ← variant axes derived from tv() — NOT hand-declared
    Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  // Horizon-only additions go here
  children: React.ReactNode
  loading?: boolean
}
```

### Base UI primitive wrapper (e.g. Dialog.Popup, Popover.Root)

Mirror Base UI's prop signature by extending the Base UI subpart's `.Props` directly. Combine with `VariantProps` for the Horizon styling axes:

```typescript
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'
import type { VariantProps } from 'tailwind-variants'
import { dialogVariants } from './Dialog.variants'

export interface DialogPopupProps
  extends Omit<BaseDialog.Popup.Props, 'className'>,
    VariantProps<typeof dialogVariants> {
  // Selectively-added Horizon overrides go here
  slots?: Partial<DialogVariantsSlots>
}
```

**Why both shapes share the same rule:** the variant axes (`size`, `tone`, `emphasis`, etc.) are the source of truth in `tv()`. Hand-declaring them in the props interface duplicates the union and lets the two drift silently. Always derive via `VariantProps`.

**When to add HTML passthrough:** Use `ComponentPropsWithoutRef` for components where consumers will need `aria-*`, `data-*`, `id`, or other HTML attributes. Omit props that conflict with your custom API (e.g., `type` on `<button>`, or any prop you intend to override).

**When NOT to retrofit:** Do not add `ComponentPropsWithoutRef` to existing components during audits if they compose with other Horizon components that have their own DOM prop types. Extending button DOM props alongside another component's DOM props causes type conflicts. Only add it when the component directly renders a single HTML element.

### Anti-pattern: hand-declared variant unions

```typescript
// ❌ Wrong — duplicates tv() values; drifts silently when variants change.
export interface ButtonProps {
  size?: 'sm' | 'md' | 'lg'        // values already declared in buttonVariants
  emphasis?: 'low' | 'high'        // ditto
  children: React.ReactNode
}

// ✅ Correct — variant axes derive from tv(); only Horizon-only props are written here.
export interface ButtonProps extends ButtonVariants, Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  children: React.ReactNode
  loading?: boolean
}
```

The .variants.ts file is the single source of truth for variant values. The props interface inherits via `extends ButtonVariants` (or `VariantProps<typeof buttonVariants>` inline) and never restates the union.

## forwardRef with Named Function

Always use a named function inside `forwardRef` — anonymous functions produce `<ForwardRef>` in DevTools instead of the component name.

## 3-Step Prop Handling

1. **Destructure** intentional props from rest (`...props`)
2. **Generate classes:** `cn(componentVariants(props), className)`
3. **Clean props:** `cleanProps(props, Object.keys(componentVariants.variants))` to strip variant props before DOM spread

### Always Preserve Rest Props Spread

Components must always forward `...props` (rest props) to the root element so consumers can pass `id`, `data-*`, `aria-*`, and other DOM attributes. This applies even when the component composes other React components rather than rendering raw HTML — the rest spread should flow through the composition chain to the eventual DOM element.

### Spread Ordering

Place `{...props}` **before** hardcoded attributes to prevent consumers from accidentally overriding internal props like `data-testid`, `ref`, or `className`:

```typescript
// ❌ Wrong — consumer props can override data-testid
<div ref={ref} className={classes} data-testid='my-component' {...props}>

// ✅ Correct — hardcoded attrs take precedence
<div {...domProps} ref={ref} className={classes} data-testid='my-component'>
```

## TSDoc on Source Is the Documentation Source of Truth

TSDoc/JSDoc comments **on the TypeScript source** are the canonical documentation surface. Storybook surfaces them via `react-docgen-typescript`; the Storybook MCP returns them; downstream component documentation inherits them.

Two places matter:

1. **Each prop in the props interface** — TSDoc above the field. Required for any prop that has non-obvious semantics, an enum-like union, or a deprecation note.
2. **The exported component** — JSDoc block above the `forwardRef` / function declaration, including the `@import` tag.

```typescript
export interface ButtonProps extends ButtonVariants, Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  /** The content to display inside the button */
  children: React.ReactNode
  /** Whether the button is in a loading state — shows a spinner and disables interaction */
  loading?: boolean
  /** Optional slot class overrides */
  slots?: Partial<ButtonVariantsSlots>
}

/**
 * `<Button>` is the primary interactive element for triggering actions.
 * Supports multiple variants (primary, secondary, etc.), sizes, and states (loading, disabled).
 * @import { Button } from '@pcln/horizon'
 */
export const Button = forwardRef<HTMLButtonElement, Readonly<ButtonProps>>(...)
```

**Where variant TSDoc lives:** variant axes (`size`, `emphasis`, `type`, etc.) are inherited via `extends ButtonVariants` and their values come from `tv()`. Per-axis prose intent is documented in the `.variants.ts` file as a comment above each variant block (or via `@param`-style TSDoc on the exported `ButtonVariants` alias). Do NOT hand-declare variant fields in the props interface just to attach TSDoc — that duplicates the union and drifts silently.

**Hard rule: NEVER** put prop descriptions in story-file `argTypes.<prop>.description` bodies — `react-docgen-typescript` does not read them, the MCP cannot return them, and they get out of sync with the source. Story-level prose (what THIS story demonstrates) belongs in `parameters.docs.description.story`.

## Mirror Base UI Prop Signatures

When wrapping a Base UI primitive (`@base-ui-components/react`), the Horizon component's prop API **must mirror Base UI's prop signature verbatim** for any prop that maps directly through to Base UI. Do not narrow, omit, or reshape the prop type — narrowing throws away Base UI's ergonomics and creates a teaching gap that surfaces every time a consumer hits the underlying capability.

Concrete example: Base UI's `Dialog.Root` `modal` prop is `boolean | 'trap-focus'`. Horizon's `Dialog.Root` MUST also expose `modal: boolean | 'trap-focus'` — not `modal: boolean`.

| Treatment | Allowed? |
|---|---|
| Mirror the signature exactly (`true \| false \| 'trap-focus'`) | ✅ Required |
| Add additional values that Horizon understands (extending the union) | ✅ Allowed when documented |
| Narrow to `boolean` and document the loss | ❌ Blocking |
| Omit the prop entirely from the wrapped surface | ❌ Blocking unless the wrapped component has a documented invariant that pins the underlying value |
| Rename the prop | ❌ Blocking — surface stays in lockstep with Base UI naming |

Where to look: every wrapped Base UI primitive (Dialog, Drawer, Popover, Menu, Select, AlertDialog, Tooltip, Combobox, Autocomplete, etc.) has a Base UI prop API documented at `.claude/skills/base-ui/references/components/<component>.md`. Diff Horizon's exported props against that reference whenever you author or audit one.

## Import Best Practices

- Always use `import type` for type-only imports (optimal bundling and tree-shaking)
- Use direct imports — never import from barrel files like `'.'` or `'./index'` (breaks react-docgen and tree-shaking)

## Barrel Re-export Convention

When moving types between files (e.g., moving a type to the variants file), parent barrels must re-export through child barrels — never reach into internal files:

```typescript
// ❌ Wrong — bypasses barrel, couples to internal file structure
export type { LayoutStyles } from './PennyHotelListingCard/PennyHotelListingCard.variants'

// ✅ Correct — re-exports through the barrel
export type { LayoutStyles } from './PennyHotelListingCard'
```

## Canonical Component Template

A Horizon component is a pair: `Component.variants.ts` declares the visual axes; `Component.tsx` extends those axes plus the underlying element (or Base UI subpart) and selectively adds Horizon-only props.

### `Component.variants.ts` — single source of truth for variant values

```typescript
import { type VariantProps } from 'tailwind-variants'
import { tv } from '../../variants/tv'

export const componentVariants = tv({
  slots: {
    root: 'inline-flex items-center justify-center font-medium',
  },
  variants: {
    size: {
      sm: { root: 'h-8 px-3 text-sm' },
      md: { root: 'h-10 px-4 text-base' },
      lg: { root: 'h-12 px-5 text-lg' },
    },
    emphasis: {
      low: { root: 'bg-primary-2 text-neutral-13' },
      high: { root: 'bg-primary-9 text-primary-1' },
    },
  },
  defaultVariants: { size: 'md', emphasis: 'low' },
})

export type ComponentVariants = VariantProps<typeof componentVariants>
export type ComponentVariantsSlots = typeof componentVariants.slots
```

### `Component.tsx` — raw element case

```typescript
import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { cleanProps, cn } from '../../utils'
import { componentVariants, type ComponentVariants } from './Component.variants'

export interface ComponentProps
  extends ComponentVariants, // ← variant axes from tv() — NOT hand-declared
    Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  children: React.ReactNode
  loading?: boolean
}

/**
 * Component description.
 * @import { Component } from '@pcln/horizon'
 */
export const Component = forwardRef<HTMLButtonElement, Readonly<ComponentProps>>(
  function Component({ children, className, ...props }, ref) {
    const classes = cn(componentVariants(props).root(), className)
    const domProps = cleanProps(props, Object.keys(componentVariants.variants))

    return (
      <button ref={ref} className={classes} {...domProps}>
        {children}
      </button>
    )
  }
)
```

### `Component.tsx` — Base UI primitive wrapper case

```typescript
import { Dialog as BaseDialog } from '@base-ui-components/react/dialog'
import { forwardRef } from 'react'
import type { VariantProps } from 'tailwind-variants'
import { cn } from '../../utils'
import { dialogVariants } from './Dialog.variants'

export interface DialogPopupProps
  extends Omit<BaseDialog.Popup.Props, 'className'>, // ← mirror Base UI signature
    VariantProps<typeof dialogVariants> {            // ← variant axes from tv()
  // selectively-added Horizon overrides
}

export const DialogPopup = forwardRef<HTMLDivElement, DialogPopupProps>(
  function DialogPopup({ size, className, ...props }, ref) {
    const { popup } = dialogVariants({ size })
    return <BaseDialog.Popup ref={ref} className={cn(popup(), className)} {...props} />
  }
)
```

## File Structure

```
ComponentName/
├── ComponentName.tsx           # Main export (single export)
├── ComponentName.components.tsx # 'use client' components (if needed, for Base UI)
├── ComponentName.variants.ts   # Tailwind-variants (all styling)
├── ComponentName.stories.tsx   # Storybook
├── ComponentName.spec.tsx      # Tests
├── ComponentName.testFixtures.tsx # Shared test data
└── index.ts                    # Barrel exports
```

## Compound Components: Subpart-per-File Layout

A **compound component** is one that exposes named subparts via the namespace API
(`Component.X`, `Component.Y`, etc. — e.g. `Breadcrumb.List`, `Module.Stats`,
`Carousel.DotButton`). Pick one of three layouts based on subpart weight:

### Layout A — Aggregator (`.components.tsx`)

A single `ComponentName.components.tsx` aggregator file. Use **only** when every
subpart is a thin pass-through wrapper around an upstream library (e.g. Base UI
re-exports). Reference: `Menu`.

### Layout B — Subfolder per subpart (preferred for non-trivial compound components)

Each subpart gets its own subfolder containing its component, and over time may
grow its own variants/stories/specs/fixtures. Reference: `Module`, `Breadcrumb`.

```
ComponentName/
├── ComponentName.tsx                    # Namespace assembly + main JSDoc
├── ComponentName.context.tsx            # Shared React context (if used) — needs 'use client'
├── ComponentName.variants.ts            # Shared tv() instance
├── ComponentName.stories.tsx            # Top-level stories
├── ComponentName.spec.tsx               # Top-level tests
├── Root/
│   └── ComponentNameRoot.tsx            # Single named export per file
├── <Subpart>/
│   ├── ComponentName<Subpart>.tsx       # Each subpart file owns its props interface
│   ├── ComponentName<Subpart>.variants.ts   # (optional) when subpart needs its own variants
│   ├── ComponentName<Subpart>.stories.tsx   # (optional) per-subpart stories
│   ├── ComponentName<Subpart>.spec.tsx      # (optional) per-subpart tests
│   └── ComponentName<Subpart>.testFixtures.ts # (optional) per-subpart fixtures
└── index.ts                             # Re-exports each subpart from its folder
```

**Reach for Layout B when any of the following is true:**
- 4+ substantive subparts (a "substantive" subpart has its own props interface
  and non-trivial render/JSDoc — not a 5-line spread)
- The combined `.components.tsx` would exceed ~200 lines
- Two or more subparts have meaningfully different prop shapes that consumers
  will need to discover independently

### Layout C — Flat per-subpart files

Same idea as Layout B but without per-subpart subfolders — files sit flat in the
parent directory: `Carousel/CarouselDotButton.tsx`,
`Carousel/CarouselControls.tsx`, etc. Reference: `Carousel`.

Use Layout C only when **none** of the subparts will ever grow their own
variants/specs/stories. Layout B is the default — it scales gracefully as
subparts mature.

### Subpart File Authoring Rules

Each subpart file in Layouts B/C must:
- Begin with `'use client'` if it uses any React client feature (state, refs,
  effects, context, or Base UI hooks/components). Context files (`*.context.tsx`)
  always need `'use client'` because `createContext`/`useContext` are
  client-only.
- Contain **one** named export — its component function — plus its `interface
  ...Props` (single export per file rule still applies).
- Import the shared context and variants from the parent folder
  (`../ComponentName.context`, `../ComponentName.variants`).
- Live in the namespace-assembly file (`ComponentName.tsx`) as
  `Component.Subpart = ComponentSubpart`. The assembly file imports each subpart
  by direct path (never via the barrel) and contains the main component JSDoc.

### Barrel Convention for Compound Components

The top-level `index.ts` re-exports each subpart from its own folder by direct
path — never via a per-subfolder `index.ts`:

```typescript
// ✅ Correct — direct path, matches Module pattern
export { BreadcrumbList, type BreadcrumbListProps } from './List/BreadcrumbList'

// ❌ Wrong — adds an empty subfolder barrel for no reason
export { BreadcrumbList } from './List'
```

### Where Variants Live: Shared vs Per-Subpart

A compound component can host its `tv()` instance in two places. Pick based on
how the variant axes flow, not on subpart count.

**Use a shared `ComponentName.variants.ts`** (single tv() with all subpart slots)
when **any** of the following is true:

- All subparts derive styles from the same variant axes (typically passed down
  via a shared React context from the Root).
- A single variant input touches multiple slots (e.g. `size: 'body2'` modifies
  `separator`, `icon`, `page`, `link`).
- There are compound variants spanning multiple subparts
  (e.g. `variant: 'display' + emphasis: 'bold'` modifies three slots).
- Two or more slots share the exact same base classes
  (e.g. `itemFixed: 'inline-flex shrink-0 items-center'` reused across 4
  subparts).

This is what `tv()` slots are designed for. Reference: `Breadcrumb` —
`size`/`emphasis`/`variant` cascade from `BreadcrumbContext` and the
`display + bold` compound rule lives in one block.

**Use per-subpart `ComponentName<Subpart>.variants.ts`** files (one tv() per
subpart, no top-level variants file) when **all** of the following are true:

- Each subpart owns independent variant axes that the others don't share
  (e.g. `ModuleStats` has `columns`/`display`; `ModuleFAQ` has different axes).
- There is no shared context cascading style inputs from a Root.
- There are no cross-subpart compound variants.

Reference: `Module` — each `Module<Subpart>/Module<Subpart>.variants.ts` is
self-contained.

**Heuristic:** if changing one variant input would force you to edit two or
more variant files in lockstep, the variants belong in **one** shared file.
