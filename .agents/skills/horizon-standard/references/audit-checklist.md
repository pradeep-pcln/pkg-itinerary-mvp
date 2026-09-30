---
name: audit-checklist
description: Per-component audit checklist — what to check, in what order, with severity for each finding type. References point to actual rule files in this skill.
---

# Horizon component audit checklist

A flat list of checks the audit mode applies to a single component. Each check produces zero or one finding. Severity is fixed per check.

The checklist is the index the auditor walks. Prescriptive substance lives in the rule files cross-referenced below.

## File anatomy (rules/authoring/component-anatomy.md)

| Check | Severity |
| --- | --- |
| Component is in its own `.tsx` file | blocking |
| Sibling `.variants.ts` exists when component has any styling logic | blocking |
| File exports a single primary component (named export, not default unless it's a route) | warning |
| File length < 200 lines | nit |

## Variants and slots (rules/authoring/styling-and-variants.md, rules/authoring/component-anatomy.md)

| Check | Severity |
| --- | --- |
| `tv()` definition exports a `*VariantsSlots` type | blocking |
| Component prop type `slots?: Partial<*VariantsSlots>` present where slots are exposed | blocking |
| Components rendering `<button>` accept `className`, `buttonClassName`, `slots`, and `ref` per the Button override API contract | blocking |
| Slot merging follows `cn(slot(), className, slotClassName, slots.slot)` pattern | warning |
| No arbitrary Tailwind values in variants (`p-[13px]`, `text-[#abc]`) | warning |

## Styling (rules/page-composition/token-and-spacing-only.md applies in page-composition mode; rules/authoring/styling-and-variants.md applies in authoring mode)

| Check | Severity |
| --- | --- |
| Colors use horizon tokens (no inline hex/rgb/oklch) | blocking |
| Spacing uses horizon scale (no arbitrary px/rem values) | warning |
| No `style={{ ... }}` inline CSS | warning |
| No raw Tailwind arbitrary-value syntax `\[.*\]` | warning |

## TypeScript (rules/shared/typescript-conventions.md)

| Check | Severity |
| --- | --- |
| No `any` type in component props or return type | blocking |
| Component is `forwardRef`-typed when it accepts a `ref` prop | blocking |
| Variant prop types derived from `tv()` (`VariantProps<typeof variants>`) not hand-written | warning |

## Accessibility (rules/shared/accessibility.md)

| Check | Severity |
| --- | --- |
| Interactive elements have appropriate ARIA labeling | blocking |
| Keyboard navigation works for all interactive states | blocking |
| Focus management correct (no focus traps, focus visible) | warning |
| Touch target size meets minimum | warning |

## Code quality (rules/shared/sonarqube-compliance.md, rules/shared/quality-checklist.md)

| Check | Severity |
| --- | --- |
| No SonarQube blocker/critical issues | blocking |
| Pre-publish quality checklist items satisfied | warning per item |

## Testing (rules/testing/storybook-conventions.md, rules/testing/testing-strategy.md)

| Check | Severity |
| --- | --- |
| Sibling `.stories.tsx` exists for components in `react-components/horizon-*/` packages | warning |
| Stories follow the planned variant matrix (Snapshot story captures every visually distinct state) | warning |
| Snapshot/Controls exclusion rules respected for non-deterministic stories | nit |
| For full CSF deep-dive (file structure, decorators, argTypes, anti-patterns), see `references/storybook-csf.md` | reference only |

## Edit discipline (rules/shared/edit-discipline.md)

| Check | Severity |
| --- | --- |
| Component file appears stable (not in active edit churn — git log shows < 5 commits in last 30 days touching the file outside refactors) | nit |

## Promotion candidate (rules/page-composition/escalating-to-package.md)

| Check | Severity |
| --- | --- |
| Component used in 2+ apps or 3+ routes within one app — promotion candidate | warning |

## Figma parity (rules/authoring/figma-token-parity.md, rules/authoring/figma-types-as-variants.md)

| Check | Severity |
| --- | --- |
| Every token in `<Component>.variants.ts` matches the canonical Figma variable (CT-10) | blocking |
| Every "Types" row in the Figma frame is represented as a variant prop or documented prop combination (CT-11) | warning |
| Component has an entry in `references/figma-frame-map.md` | warning |

## Story discipline — overlays (rules/authoring/story-discipline-overlays.md)

| Check | Severity |
| --- | --- |
| Overlay stories using `defaultOpen` have a re-open path (controlled state + sibling Re-open trigger via `OverlayStoryWithReopen`, OR sibling `Component.Trigger`) (CT-12) | blocking |
| Overlay trigger renders inside the initial 1440×900 viewport — no `items-end` decorator pushing trigger off-screen (CT-13) | blocking |
| Mobile / coarse-touch adaptive stories set `parameters.touchCapability: 'coarse'` (or `TOUCH_CAPABILITY_GLOBAL` equivalent) (CT-14) | blocking |
| Overlay-trigger `<Button>` elements annotate `type='secondary'` | warning |
| Primary overlay component has at least one story demonstrating scrolling content | warning |

## Animation parity (rules/authoring/animation-parity-base-ui.md)

| Check | Severity |
| --- | --- |
| Variants config copying Base UI's `data-[starting-style]` / `data-[ending-style]` classes ALSO includes the corresponding `transition-*` class to interpolate between them (CT-6.r.3 hardened) | warning |

## Semantic prop pass-through (rules/authoring/no-semantic-prop-inversion.md)

| Check | Severity |
| --- | --- |
| Overlay close-button subparts (Tooltip, PopupHeader.Close, Dialog.Close, Drawer.Close, Popover.Close) pass parent `emphasis` / `palette` / `tone` props through unchanged — no ternary inversion (CT-15) | blocking |

## Full-size geometry (rules/authoring/full-size-geometry.md)

| Check | Severity |
| --- | --- |
| `full` / `edge` / `fullscreen` size variants inherit `rounded-*` and `[clip-path:inset(...)]` from peer sizes (CT-16) | warning |
| `full` size mirrors `max-h-[calc(100dvh-16px)]` with matching `max-w-[calc(100dvw-16px)]` (CT-16) | warning |

## className routing (rules/authoring/className-routing-discipline.md)

| Check | Severity |
| --- | --- |
| Positioning utility classes (`absolute`, `fixed`, `sticky`) route to the primitive's outermost element via the documented "outer wrapper" prop (e.g. `buttonClassName`), not the inner `className` (CT-6.r.2 hardened) | blocking |
| Components with a variant prop name that collides with an HTML attribute (`type`, `role`, `form`) normalize the incoming prop before passing to the variants function (CT-17) | blocking |

## Output

For each check that fails, write a finding entry to the JSON sidecar (see SKILL.md → Audit completion gates). Severity drives the audit's pass/fail verdict per the rule-promotion gate (3+ recurrence escalates).
