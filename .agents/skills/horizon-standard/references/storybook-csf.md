# Storybook CSF Reference

Code patterns and templates for writing `.stories.tsx` files in Horizon components.

> **For prescriptive rules** (what stories are required, story-planning methodology, snapshot strategy decisions): see `rules/testing/storybook-conventions.md`. This reference is the cookbook — the "how" — not the "what."

## Contents

- [Story File Structure](#story-file-structure)
- [Subcomponents (Compound Components)](#subcomponents-compound-components)
- [Decorators](#decorators)
- [Snapshot Stories](#snapshot-stories)
- [Render Functions and React Hooks](#render-functions-and-react-hooks)
- [ArgTypes Strategy](#argtypes-strategy)
- [Snapshot and Controls Exclusion](#snapshot-and-controls-exclusion)
- [Story Naming Conventions](#story-naming-conventions)
- [JSDoc with @summary](#jsdoc-with-summary)
- [Anti-Patterns](#anti-patterns)

## Story File Structure

Every `.stories.tsx` file follows CSF (Component Story Format):

```tsx
import type { Args, Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EmphasisGrid } from '../../storybook'
import type { ButtonProps } from './Button'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Buttons & Forms/Buttons/Button',
  component: Button,
  parameters: {
    component: Button, // Required for propNameDecorator
    design: {
      type: 'figma',
      url: 'https://www.figma.com/proto/...',
    },
  },
  args: { onClick: fn(), children: 'Button', type: 'primary' },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>
```

### Title Hierarchy

Pattern: `'[Project]/[Category]/[Subcategory]/[Component]'`

Examples:
- `'Components/Buttons & Forms/Buttons/Button'`
- `'Components/Content & Media/Table'`
- `'Foundations/Color'`
- `'Components/Overlays/Dialog'`

### Required Stories

For the requirement (Playground + Snapshot, with overlay-component exception), see `rules/testing/storybook-conventions.md` § "Required Stories". This reference shows how to *implement* them; the rule prescribes which ones must exist.

## Subcomponents (Compound Components)

For compound components — overlay primitives, table primitives, card patterns,
etc. — declare paired exports in `meta.subcomponents` so the SB10 components
manifest lists them as part of the parent's API:

```tsx
import { Dialog } from './Dialog'
import { OverlayFooter, PrimaryActionButton, SecondaryActionButton } from '../OverlayFooter/OverlayFooter'

const meta = {
  title: 'Components/Containers & Layouts/Dialog/Dialog',
  component: Dialog,
  subcomponents: { OverlayFooter, PrimaryActionButton, SecondaryActionButton },
} satisfies Meta<typeof Dialog>
```

What lands in the components manifest:
- A primary `Dialog` entry with full prop API
- A `subcomponents` block on Dialog listing `OverlayFooter`,
  `PrimaryActionButton`, `SecondaryActionButton` with their own prop APIs

For when to declare subcomponents (and when NOT to — e.g., generic
utilities, slot-prop wrappers), see `rules/testing/storybook-conventions.md`
§ "Subcomponents — Compound Components".

## Decorators

Use shared decorators from `@pcln/horizon/storybook` — never create one-off decorators in story files.

| Decorator | Scope | Purpose |
|---|---|---|
| `propNameDecorator` | **Global** | Renders prop demonstrations from `parameters.propName` |
| ~~`snapshotStoryDecorator`~~ | ~~Per-story~~ | **Deprecated** — use JSX Snapshot stories instead |
| `emphasisDecorator` | Per-story | Shows components in different emphasis contexts |
| `gridDecorator` | Per-story | Grid layout with value labels |
| `whiteLabelPartnerDecorator` | **Global** | Applies partner themes |
| `a11yMainDecorator` | **Global** | Wraps story in `<main>` for a11y |

### propNameDecorator Parameters

| Parameter | Type | Purpose |
|---|---|---|
| `propName` | `string` | Prop to demonstrate (auto-renders all variants) |
| `additionalPropNames` | `string[]` | Cross-product with additional props |
| `additionalProps` | `object[]` | Extra static props to apply to each variant |

### Boolean Props Pattern

Default to `false` and show `true` via `additionalProps` for clear labeling:

```tsx
export const Disabled: Story = {
  args: { disabled: false },
  parameters: {
    propName: 'palette',
    additionalProps: [{ disabled: true }],
  },
}
```

## Snapshot Stories

### JSX Snapshot (Standard Approach)

Write Snapshot stories as explicit JSX with labeled sections. Each section renders a distinct visual variant. This is the primary approach — it gives full control over what gets captured and is self-documenting:

```tsx
export const Snapshot: Story = {
  tags: ['!autodocs', '!manifest'], // ← BOTH tags required; see conventions § Snapshot Tag Policy
  parameters: { chromatic: { disableSnapshot: false } },
  render: () => (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Default</h3>
        <Component {...defaultFixtures} />
      </div>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>With Icon</h3>
        <Component {...defaultFixtures} icon='search' />
      </div>
      <div className='flex flex-col gap-4'>
        <h3 className='text-heading5'>Disabled</h3>
        <Component {...defaultFixtures} disabled />
      </div>
    </div>
  ),
}
```

**The Snapshot story must capture every visually distinct state.** If a variant, layout mode, or conditional UI path produces different visual output, it belongs in this story. A visual state without a snapshot is an unprotected visual state.

Snapshot stories are excluded from both autodocs and the SB10 manifest
(`['!autodocs', '!manifest']`) — they're Chromatic captures, not
agent-facing usage examples.

### Complex Prop Stories

Some props need dedicated snapshot treatment beyond the consolidated Snapshot:

```tsx
export const Emphasis: Story = {
  tags: ['!autodocs', '!manifest'], // multi-variant snapshot → exclude from manifest
  parameters: { chromatic: { disableSnapshot: false } },
  render: (args: Readonly<Args>) => (
    <EmphasisGrid component={Button} args={args as ButtonProps} types={buttonTypes} />
  ),
}
```

## Render Functions and React Hooks

### Rule: Never call hooks in render functions

Storybook `render` functions are not React components. Extract hook logic:

```tsx
const WithRefComponent = (args: Partial<AutocompleteProps>) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return <Autocomplete {...args} inputRef={ref} />
}

export const WithRef: Story = {
  render: (args) => <WithRefComponent {...args} />,
}
```

Same rule applies to decorators:

```tsx
const DrawerDecorator = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  return <Drawer open={isOpen}>{children}</Drawer>
}

decorators: [
  (Story) => <DrawerDecorator><Story /></DrawerDecorator>,
]
```

### Common Patterns

**Stateful components:**

```tsx
const StatefulComponent = (args: Partial<Props>) => {
  const [value, setValue] = useState(args.initialValue)
  return <Component {...args} value={value} onChange={setValue} />
}
```

**Ref-based components:**

```tsx
const RefComponent = (args: Partial<Props>) => {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return <Component {...args} ref={ref} />
}
```

### Extract Common Decorators

When multiple stories share wrapper styling, extract to a function:

```tsx
const withWideContainer = (Story: StoryFn) => (
  <div className='w-94 bg-primary-12 p-12'>
    <Story />
  </div>
)

export const Default: Story = {
  decorators: [withWideContainer],
}
```

## ArgTypes Strategy

### Three-Tier Approach

1. **Auto-generated** from `react-docgen-typescript` — handles union types, booleans, strings, numbers, enums
2. **Global argTypes** in preset (`children`, `className`)
3. **Local argTypes** only when overriding (rare)

Start with NO manual argTypes. Add overrides only if auto-generation doesn't suffice.

### Strong Typing for Better Controls

```tsx
// Generates select control
interface Props { size: 'small' | 'medium' | 'large' }

// Generates text control (avoid)
interface Props { size: string }
```

### TypeScript Fixes for Required Props

```tsx
// Explicitly pass required props in custom renders
<IconButton {...args} type={type} iconName={args.iconName} />
```

## Snapshot and Controls Exclusion

Props that must **never** appear in the snapshot matrix or controls panel — they produce meaningless visual rows and inflate Chromatic snapshot height.

| Prop category | Props | Mechanism |
|---|---|---|
| Style escape hatches | `className`, `buttonClassName`, `slots` | Listed in `PROPS_TO_SKIP` in `src/storybook/sortPropKeys.ts` (global); also `table: { disable: true }` in `argTypes` if autodocs bloat is observed |
| Callback/event handlers | `onClick`, `onToggle`, and any `on*` prop | `control: false` in `argTypes`; wire with `fn()` in `args` for interaction tests only |

**Rule:** When adding `buttonClassName`, `slots`, or a new callback prop to a component, immediately add the corresponding `argTypes` exclusion to the meta. Do NOT wait for Chromatic to flag a snapshot size change.

```tsx
// In meta — required for any component with override API props
argTypes: {
  buttonClassName: { table: { disable: true } },   // style escape hatch
  onToggle: { control: false },                     // callback — fn() in args handles interaction tests
},
args: {
  onToggle: fn(),  // still wired for play() tests
},
```

Adding a new prop to `PROPS_TO_SKIP` requires a PR to `design-system/horizon` — prefer `argTypes` for component-specific callbacks, `PROPS_TO_SKIP` for universal escape hatches (`buttonClassName` was added in DX-805).

## Story Naming Conventions

- **Required**: `Playground` (first), `Snapshot` (second, consolidated JSX)
- **Props**: Named after the prop (`Type`, `Size`, `Disabled`)
- **Special cases**: Descriptive (`FullWidth`, `Emphasis`)
- **JIRA references**: Suffix for issues (`LoadingBugFix_UXPT1234`)

## JSDoc with `@summary`

Every exported story needs a JSDoc comment with a description **and** a
`@summary` tag. The SB10 manifest emits `@summary` (when present) to
the agent as a one-line hook; without it, the agent gets a truncation
of the description, which is often unhelpful.

```tsx
/**
 * The `size` prop sets the visual size of the button. Use `large` for
 * primary call-to-action contexts, `medium` for inline actions, and
 * `small` for dense layouts.
 *
 * @summary controls the visual size of the button
 */
export const Size: Story = {
  parameters: { propName: 'size' },
}
```

Format guide:

| Block | Purpose |
|---|---|
| First paragraph | What the story demonstrates **and why you would use it** (not just "this is the X story") |
| `@summary` | A short hook — single phrase, lowercase, no period. The manifest serves this verbatim. |

For component-level JSDoc with `@import` + `@summary`, see
`rules/authoring/component-anatomy.md` § "JSDoc as Documentation Source
of Truth".

## Anti-Patterns

- Manual JSX prop mapping when `propNameDecorator` can handle it
- Manual argTypes for auto-generated props
- One-off decorators in story files (use shared decorators from `@pcln/horizon/storybook`)
- Enabling snapshots on every story
- Testing CSS classes in unit tests (Tailwind doesn't compile in JSDOM)
- **Multi-concept feature stories** (`SizesAndVariants`, `EveryState`) — these belong in `Snapshot` (excluded from the manifest), not as named feature stories that agents will treat as canonical usage examples
- **Snapshot stories without `'!manifest'`** — kitchen-sink renders that get fed to agents as "this is how to use the component"
- **Description-only JSDoc on stories** — without `@summary` the agent sees a truncated description, which is rarely a useful hook
- **Inferring props from naming conventions** — never write `color='primary'` without confirming via MCP that the component actually accepts a `color` prop with `'primary'` as a value

### propNameDecorator Debug Checklist

If `propNameDecorator` renders nothing, check in order:

1. `propNameDecorator` is first in global decorators array (`.storybook/preview.tsx`)
2. `component` parameter is set in story meta `parameters`
3. `propName` parameter matches an actual component prop name
4. Component has a TypeScript interface with the prop
5. No TypeScript errors in the story file
