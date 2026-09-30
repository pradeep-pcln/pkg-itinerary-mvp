---
name: fix-recipes
description: Concrete fix recipes for common audit findings. Use during fix-mode to apply the right transformation.
---

# Horizon component fix recipes

When the auditor produces findings, fix-mode applies one of these recipes per finding `id`. Each recipe specifies what to change and how, with a code transformation example.

## Recipe format

```
## <recipe-id> (matches finding id)

**Symptom**: what the audit flagged

**Fix**: the transformation, with before/after code

**Verification**: what to check after the fix
```

## Recipes

### missing-variants-file

**Symptom**: Component has styling logic (multiple Tailwind classes, conditional className, or compoundVariants-shaped patterns) but no sibling `.variants.ts` file.

**Fix**: Extract styling into a `tv()` definition.

Before:
```tsx
// Foo.tsx
export function Foo({ size = 'md', selected }: Props) {
  return (
    <div
      className={cn(
        'rounded-md p-md',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-md',
        selected && 'bg-background-emphasis'
      )}
    />
  )
}
```

After:
```tsx
// Foo.variants.ts
// In pcln-web monorepo, prefer Horizon's tv wrapper at @pcln/horizon's variants barrel.
// In external repos, import directly from 'tailwind-variants'.
import { tv } from 'tailwind-variants'

export const fooVariants = tv({
  slots: { root: 'rounded-md p-md' },
  variants: {
    size: { sm: { root: 'text-sm' }, md: { root: 'text-md' } },
    selected: { true: { root: 'bg-background-emphasis' } },
  },
  defaultVariants: { size: 'md', selected: false },
})

export type FooVariantsSlots = typeof fooVariants.slots
```

```tsx
// Foo.tsx
import { fooVariants, type FooVariantsSlots } from './Foo.variants'

export function Foo({ size, selected, slots }: Props) {
  const { root } = fooVariants({ size, selected })
  return <div className={cn(root(), slots?.root)} />
}
```

**Verification**: typecheck green; visual-verifier reports no token mismatches.

### missing-slots-type-export

**Symptom**: `tv()` defines slots but no `*VariantsSlots` type exported.

**Fix**: Add the type export at the bottom of the variants file.

```ts
// at end of <Component>.variants.ts
export type <Component>VariantsSlots = typeof <component>Variants.slots
```

**Verification**: consumers can now type their own slot overrides.

### missing-button-override-api

**Symptom**: Component renders `<button>` but doesn't accept `className`, `buttonClassName`, `slots`, or `ref`.

**Fix**: Add the four required props per the Button override API contract.

Before:
```tsx
export function MyButton({ children }: Props) {
  return <button className={someClasses}>{children}</button>
}
```

After:
```tsx
import { forwardRef } from 'react'
import { cn } from 'tailwind-variants'
import { myButtonVariants, type MyButtonVariantsSlots } from './MyButton.variants'

interface Props {
  children: React.ReactNode
  className?: string
  buttonClassName?: string
  slots?: Partial<MyButtonVariantsSlots>
}

export const MyButton = forwardRef<HTMLButtonElement, Props>(function MyButton(
  { children, className, buttonClassName, slots, ...rest },
  ref
) {
  const { root, button } = myButtonVariants()
  return (
    <span className={cn(root(), className, slots?.root)}>
      <button ref={ref} className={cn(button(), buttonClassName, slots?.button)} {...rest}>
        {children}
      </button>
    </span>
  )
})
```

**Verification**: consumers can apply custom classes to outer wrapper, button itself, or any slot.

### arbitrary-tailwind-value

**Symptom**: Class string contains `\[.*\]` syntax (e.g. `p-[13px]`, `text-[#1a2b3c]`).

**Fix**: Replace with horizon token. If no token matches, the design itself needs review — file a ticket against the design team rather than introducing an arbitrary value.

```diff
- <Box className="p-[14px] bg-[#f7f7f7]" />
+ <Box p="md" bg="background-subtle" />
```

**Verification**: visual-verifier reports no regressions; tokens render same/intended values.

### inline-style-attribute

**Symptom**: `style={{ ... }}` present in component.

**Fix**: Move to variants if styling logic, or remove if the same effect can be achieved via Tailwind utilities.

**Verification**: no `style={` remains in the component; visual-verifier passes.

### any-type

**Symptom**: `: any` appears in component props, return type, or variants.

**Fix**: Replace with the precise type. For variant props, derive from `tv()`:

```ts
import { tv, type VariantProps } from 'tailwind-variants'

const fooVariants = tv({ /* ... */ })

export type FooVariants = VariantProps<typeof fooVariants>

interface Props extends FooVariants {
  // your other props
}
```

**Verification**: `tsc --noEmit` reports no new errors.

### component-defined-in-route

**Symptom**: A non-trivial component is defined inline in a `page.tsx`/`layout.tsx`/route file.

**Fix**: Extract to `<route-dir>/components/<ComponentName>.tsx` with sibling `.variants.ts`. The extracted file falls under Authoring mode — apply all authoring rules there.

**Verification**: route file no longer defines the component; component file passes audit.

### overlay-shadow-invisible

**Symptom**: An overlay component (Dialog, Drawer, Popover, Tooltip) has a `drop-shadow-*` utility AND `clip-path` on the same element. The shadow renders invisibly at runtime — CSS composites filter before clip, so the shadow is clipped back to zero.

**Fix**: Remove `clip-path` from the element that carries `drop-shadow-*`. Use one of these alternatives for corner masking:

```tsx
// ❌ WRONG — clip-path kills the shadow
slots: { popup: 'drop-shadow-overlay-md [clip-path:inset(0_round_1rem)]' }

// ✅ OPTION A — rounded-* + overflow-clip (preferred for uniform corners)
slots: { popup: 'drop-shadow-overlay-md rounded-2xl overflow-clip' }

// ✅ OPTION B — CSS variable corner rounding (Horizon overlay pattern)
// popup sets --popup-corner-t/b; PopupHeader.Root and ActionFooter read them
slots: { popup: 'drop-shadow-overlay-md [--popup-corner-t:var(--radius-2xl,1rem)] [--popup-corner-b:var(--radius-2xl,1rem)]' }

// ✅ OPTION C — move clip-path to a child wrapper only
slots: {
  popup: 'drop-shadow-overlay-md',
  popupInner: '[clip-path:inset(0_round_1rem)]',
}
```

**Verification**: Inspect element in Chrome DevTools → Elements → Computed → confirm `filter: drop-shadow(...)` is present and shadow is visually visible against a contrasting background.

### promotion-candidate

**Symptom**: An app-internal component is used in 2+ apps or 3+ routes within one app.

**Fix**: Do NOT auto-fix. Open a finding with severity `warning` and recommend the target horizon-* package. Promotion needs its own ticket and review.

**Verification**: finding logged; no inline change made.

## When the finding doesn't match a recipe

Some findings are too project-specific to template. In that case:
1. Write the fix manually
2. After applying, capture a new recipe entry here if the pattern is likely to recur
3. The rule-promotion gate (in SKILL.md) handles the case where the same finding shows up in 3+ audits — escalate to a rule rather than just adding more recipes
