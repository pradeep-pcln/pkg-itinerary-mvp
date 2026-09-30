---
title: className routing discipline
applies_to: subparts that consume composite components (IconButton-backed Close subparts, ScrollArea-backed bodies, etc.)
severity: blocking
ct_patterns: CT-6.r.2 (existing, hardened), CT-17
captures: FM-9, FM-3 (compound-variant collision)
---

# className routing discipline

When a Horizon subpart wraps a composite primitive (`IconButton`, `Button`, `ScrollArea`), it MUST route positioning utility classes (`absolute`, `fixed`, `sticky`) to the DOM node that's supposed to be positioned — usually the outermost element.

When a primitive's variant prop name collides with a native HTML attribute (`type` on `Button` colliding with HTML `type='button'`), the component MUST normalize the incoming prop before passing it to the variants function — otherwise compound rows silently fail to match and the component renders without a palette.

## Two related discipline problems

### A. Positioning className lands on the wrong wrapper

Composite primitives like `IconButton` have layered DOM:

```html
<button>                     ← outermost; receives `buttonClassName`
  <div class='tap-space' />
  <div class='wrapper'>      ← inner wrapper; receives `className`
    <icon />
  </div>
</button>
```

If a subpart passes `'absolute top-3 right-3'` via `className`, it lands on the INNER wrapper. The button itself stays in flex flow and collapses to 0×0 because its only content was yanked out of flow.

**Fix**: route positioning classes via `buttonClassName` (or whatever the primitive calls "outermost wrapper").

### B. Variant prop collides with HTML attribute

If a primitive has a variant prop named `type`, and the user (or Base UI's render prop) passes HTML `type='button'`, tailwind-variants tries to match `type='button'` against the variant key set — none match. `defaultVariants.type` is NOT applied because `type` is "explicitly set" to an invalid value. The compound row for the intended default doesn't fire. The component renders with only base-slot styles → invisible.

**Fix**: at the top of the component, extract the incoming variant-collision prop and discard it if its value is NOT in the variant key set. Pass `undefined` so `defaultVariants` kicks in.

```tsx
const { type: incomingType, ...restProps } = props
const variantType =
  incomingType !== undefined && variantTypes.includes(incomingType)
    ? incomingType
    : undefined

const styles = componentVariants({ ...restProps, type: variantType })
```

## What to do

When authoring a subpart or primitive:

1. Inspect the primitive's DOM structure. Identify which DOM node `className` lands on. If you need positioning, route it explicitly via the primitive's documented "outer element" prop (e.g. `buttonClassName`).
2. If your variants config has a prop name that collides with an HTML attribute, add a normalization guard at the component level (see Button.tsx for the canonical pattern).
3. Add a spec regression test that confirms the className landed on the right element.

## Verifier coverage

- CT-6.r.2 (existing) — flags incorrect positioning context (e.g. `position: relative` on the wrong element).
- CT-17 — flags compound-variant configs with no row matching when all variant props are unset (catches the collision case).

Both blocking.

## DX-1074 examples

- PopupHeader.Close: `closeButton()` was routed via `className` → landed on `IconButton`'s inner wrapper → button collapsed to 0×0. Fixed to route via `buttonClassName`.
- Button: bare `<Button>` rendering as ghost text when used as a Base UI `<Dialog.Trigger>` render-prop child, because Base UI injected HTML `type='button'` and collided with Button's variant `type`. Fixed by normalizing `incomingType` against `buttonTypes` before passing to `buttonVariants`.
