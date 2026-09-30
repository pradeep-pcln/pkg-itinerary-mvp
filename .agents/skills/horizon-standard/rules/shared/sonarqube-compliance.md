---
title: SonarQube Compliance
impact: MEDIUM
tags: [sonarqube, static-analysis, code-quality]
applies-to: shared
---

# SonarQube Compliance

These are patterns SonarQube commonly flags in the pcln-web codebase. Follow these rules to avoid static analysis violations.

## No Unnecessary Type Coercion

Do not coerce values that are already the target type:

```typescript
// ❌ BAD
const name = String(props.name) // props.name is already a string
const isActive = !!props.active // props.active is already a boolean

// ✅ GOOD
const name = props.name
const isActive = props.active
```

## No Hooks Outside Component Functions

Hooks cannot be called in story render functions directly. Extract stateful logic to a named render component:

```typescript
// ❌ BAD: hook in story render function
export const WithState: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false) // SonarQube flags this
    return <Component {...args} open={open} />
  },
}

// ✅ GOOD: extract to a component
function WithStateRender(args: ComponentProps) {
  const [open, setOpen] = useState(false)
  return <Component {...args} open={open} />
}
export const WithState: Story = {
  render: (args) => <WithStateRender {...args} />,
}
```

## Keyboard Accessibility for Visible Elements

Visible, non-interactive elements with event handlers (e.g., `onClick` on a `<div>`) must have keyboard accessibility. Prefer semantic HTML elements (`<button>`, `<a>`) or add `role`, `tabIndex`, and `onKeyDown` handlers.

## Modern Language Features

Use optional chaining and nullish coalescing:

```typescript
// ❌ BAD
const value = obj && obj.nested && obj.nested.prop
const fallback = value !== null && value !== undefined ? value : 'default'

// ✅ GOOD
const value = obj?.nested?.prop
const fallback = value ?? 'default'
```

## Namespaced Global Functions

Use namespaced versions of global functions:

```typescript
// ❌ BAD
parseInt('42', 10)
isNaN(value)

// ✅ GOOD
Number.parseInt('42', 10)
Number.isNaN(value)
```

## globalThis Over window

Use `globalThis` for cross-environment compatibility:

```typescript
// ❌ BAD
window.location.href

// ✅ GOOD
globalThis.location.href
```

## for...of Over forEach

Prefer `for...of` for iterating arrays:

```typescript
// ❌ BAD
items.forEach((item) => {
  process(item)
})

// ✅ GOOD
for (const item of items) {
  process(item)
}
```

## No Nested Ternaries

Replace nested ternary operators with lookup tables:

```typescript
// ❌ BAD
const value = size === 'sm' ? 'small' : size === 'md' ? 'medium' : 'large'

// ✅ GOOD
const sizeMap = { sm: 'small', md: 'medium', lg: 'large' } as const
const value = sizeMap[size || 'md']
```

## Keep Complexity Low

- Extract complex conditional logic into named functions
- Use lookup tables instead of long if/else chains
- Keep functions focused — one responsibility per function
- Aim for low cyclomatic complexity and cognitive load
