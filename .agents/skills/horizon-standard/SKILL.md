---
name: horizon-standard
description: >
  Authoritative standard for authoring UI components with Priceline's Horizon design system.
  Use when building, reviewing, or modifying any UX that imports @pcln/horizon — including
  design-system/horizon itself, react-apps, react-components, and horizon-* packages. Covers
  component anatomy, composition patterns, tailwind-variants styling, TypeScript conventions,
  accessibility, Storybook stories, testing strategy, SonarQube compliance, layout patterns,
  and package setup. Also provides audit and fix commands: "audit [component] against
  horizon-standard" to check compliance, "fix [component] to meet horizon-standard" to
  remediate, or invoke without a target to discover and prioritize components. Triggers on
  any file importing @pcln/horizon, .stories.tsx files, .variants.ts files, component packages
  with horizon in dependencies, or requests to audit/fix/review components against Horizon
  standards. Does NOT apply to horizon-messaging (react-email — separate skill).
allowed-tools: >
  Read Write Edit Glob Grep Agent Bash(ls:*) Bash(git:*)
  mcp__Horizon_Storybook_MCP__Local___preview-stories
  mcp__Horizon_Storybook_MCP__Local___run-story-tests
  mcp__Horizon_Storybook_MCP__Local___get-documentation
  mcp__Horizon_Storybook_MCP__Local___list-all-documentation
  mcp__Horizon_Storybook_MCP__Local___get-storybook-story-instructions
  mcp__claude-in-chrome__*
compatibility: >
  Requires Horizon Storybook MCP (Local) for visual verification, with Chrome DevTools MCP as a
  fallback; SonarQube MCP for static analysis is optional. Invoke as "audit
  [component-name-or-description]", or blank for discovery mode. Auto-trigger paths and import
  patterns are listed under "When this skill auto-triggers" in the body — they moved out of this
  field because the skill uploader caps it at 500 characters.
---

# Horizon Standard

The authoritative standard for authoring UI components at Priceline using the Horizon design system. Applies universally — whether you're building components inside `design-system/horizon/` or in any consuming package.

**Exclusion:** `horizon-messaging` uses react-email with different conventions — see the `horizon-messaging` skill instead.

## When this skill auto-triggers

Moved here verbatim from the `compatibility` frontmatter field, which the skill uploader caps at 500
characters. No trigger was changed.

**Layer 1 — `pcln-web` monorepo paths**

```
design-system/horizon/src/components/**/*
react-components/horizon-*/**/*
react-apps/**/*.{tsx,ts,variants.ts,stories.tsx}
node-apps/*/web/**/*.{tsx,ts}
node-apps/penny-a2a-svc/**/*.tsx
**/*.variants.ts
**/*.stories.tsx
```

**Layer 2 — generic, fires in any repo**

- a file imports `@pcln/horizon` or `@pcln/horizon-*`
- the nearest `package.json` declares `@pcln/horizon` or `@pcln/horizon-*` in `dependencies` or
  `peerDependencies`
- a `*.{tsx,jsx}` file whose sibling `package.json` declares a horizon dependency

## Contents

- [Quick Reference](#quick-reference)
- [Rule Categories](#rule-categories)
  - [Component Authoring](#component-authoring-2-rules)
  - [Styling](#styling-2-rules)
  - [Code Quality](#code-quality-3-rules)
  - [Testing & Storybook](#testing--storybook-3-rules)
  - [Infrastructure](#infrastructure-2-rules)
- [Audit & Fix Mode](#audit--fix-mode)
- [Key Resources](#key-resources)

## Quick Reference

| Task | Rule |
|------|------|
| Creating or modifying a component | `authoring/component-anatomy.md`, `authoring/composition-patterns.md` |
| Splitting a compound component (many subparts) into multiple files | `authoring/component-anatomy.md` § Compound Components: Subpart-per-File Layout |
| Deciding shared vs per-subpart variants files | `authoring/component-anatomy.md` § Where Variants Live: Shared vs Per-Subpart |
| Styling with tailwind-variants | `authoring/styling-and-variants.md` |
| Layout decisions (flex vs grid, z-index) | `authoring/layout-patterns.md` |
| Overlay drop-shadow is invisible / not rendering | `authoring/layout-patterns.md` § CSS Compositing — `clip-path` and `filter: drop-shadow()` MUST NOT share an element |
| TypeScript patterns and type imports | `shared/typescript-conventions.md` |
| Accessibility requirements | `shared/accessibility.md` |
| Writing Storybook stories | `testing/storybook-conventions.md` |
| Unit tests and testFixtures | `testing/testing-strategy.md` |
| Testing with real overlay components (no mocks) | `testing/no-overlay-mocks.md` |
| SonarQube compliance | `shared/sonarqube-compliance.md` |
| Authoring a horizon-* package | `authoring/package-setup.md` |
| Onboarding an app to horizon | `setup/package-dependencies.md` |
| Pre-publish quality gate | `shared/quality-checklist.md` |

## Mode Detection

The skill operates in one of four modes. Mode is selected once per invocation based on the file in focus or the user's explicit command.

| Signal | Mode |
| --- | --- |
| File defines a component using horizon primitives (anywhere — package or app) | **Authoring** |
| File is `page.tsx` / `layout.tsx` / Remix route / Next.js app segment composing already-built components | **Page composition** |
| User invokes `audit` or `fix` command | **Audit/Fix** |
| User invokes `setup` OR project missing horizon wiring OR project missing Storybook MCP | **Setup** (may chain into target mode after) |

Page composition is the narrow case: route-level orchestration of already-built components. Anything that *defines* a new component — including app-internal components in `react-apps/<app>/components/` — is Authoring.

### Mode-to-rule loading

| Mode | Rules loaded |
| --- | --- |
| Authoring | `rules/shared/` + `rules/authoring/` + `rules/testing/` |
| Page composition | `rules/shared/` + `rules/page-composition/` |
| Audit/Fix | `rules/shared/` + `rules/authoring/` + `rules/testing/` + `references/audit-*.md` (depending on the target file's nature) |
| Setup | `rules/setup/` only |

### Storybook MCP precheck

On any invocation in a horizon-using project, run a precheck for Storybook MCP configuration. If missing, surface a one-step setup prompt referencing `rules/setup/storybook-mcp.md` and offer to run it before continuing the user's actual task. Non-blocking — the user may defer.

## Rule Categories

### Component Authoring (2 rules)
- `authoring/component-anatomy.md` — File structure, single export, forwardRef, props, cn/cleanProps, JSDoc
- `authoring/composition-patterns.md` — Composition over complexity, Horizon components over raw HTML, Module exemplar

#### Button Override API Contract
Any component that renders a `<button>` element **must** expose all of the following — no exceptions:

| Prop | Type | Merges onto |
|------|------|-------------|
| `className` | `string?` | outermost element |
| `buttonClassName` | `string?` | `<button>` element |
| `slots` | `Partial<ComponentVariantsSlots>?` | per-slot class overrides |
| `ref` | `forwardRef<HTMLButtonElement>` | `<button>` element |

**Merging pattern** (follow `IconButton` exactly):
```tsx
const buttonClasses = cn(buttonSlot(), className, buttonClassName, slots.buttonSlot)
```

Missing any of these is a **blocking audit failure**. Consumers cannot apply custom styles without them, and the gap is invisible until they hit it in production (see DX-805).

#### Variant Slots Type Export
Every `tv()` call that defines `slots` must export its slots type:
```ts
// variants file
export type ComponentVariantsSlots = typeof componentVariants.slots

// component file — slots prop typed as:
slots?: Partial<ComponentVariantsSlots>
```
Missing this export is a **blocking audit failure** — it prevents consumers from typing their own slot overrides.

### Styling (2 rules)
- `authoring/styling-and-variants.md` — tv() system, slots, compound variants, variant type exports, anti-patterns
- `authoring/layout-patterns.md` — Grid vs flex, container queries over media queries, z-index discipline, isolate

#### Horizon Color Tokens Only

All color utilities in Horizon code, stories, tests, fixtures, and docs must use tokens from `design-system/horizon/src/tailwind-theme.css`.

Never use Tailwind default palette utilities such as `gray-*`, `slate-*`, `zinc-*`, `stone-*`, `blue-*`, `red-*`, `green-*`, `black`, or `white`. Horizon resets the default palette with `--color-*: initial`, so these classes are invalid even when they look familiar.

Use Horizon families instead: `neutral-*`, `primary-*`, `actionPrimary-*`, `actionCritical-*`, `success-*`, `error-*`, `benefit-*`, `caution-*`, etc. Treat any default-palette match as a blocking issue unless it is not a Tailwind utility class.

### Code Quality (3 rules)
- `shared/typescript-conventions.md` — import type, VariantProps derivation, discriminated unions, Readonly
- `shared/sonarqube-compliance.md` — Type coercion, hooks placement, namespaced functions, modern syntax
- `shared/accessibility.md` — ARIA, keyboard nav, focus management, touch targets, Base UI defaults

### Testing & Storybook (3 rules)
- `testing/storybook-conventions.md` — Story planning, required stories, snapshot strategy
- `testing/testing-strategy.md` — Visual testing strategy, Chromatic snapshots, play functions, portals, testFixtures
- `testing/no-overlay-mocks.md` — **Never mock overlay components** — use real components with matchMedia stub; Select interaction patterns

For full CSF (Component Story Format) deep-dive — file structure, decorators, render functions, argTypes, anti-patterns — see `references/storybook-csf.md`.

#### Story Planning (Do This First)

Before writing stories, enumerate every visually distinct state the component can render — variants, conditional UI (split actions vs single CTA, bookmark present vs absent), layout modes, edge cases. Map each to a story type. **The Snapshot story must capture every visually distinct state.** A visual state without a snapshot is an unprotected visual state.

#### Story File Template

Every `.stories.tsx` follows CSF. Required in meta: `component` in `parameters` (for `propNameDecorator`), `fn()` for callbacks in `args`.

Every component must have at minimum:
1. **Playground** story (always first) — full Controls panel, no snapshot
2. **Snapshot** story — consolidated JSX rendering all key visual variants in one labeled layout, `chromatic: { disableSnapshot: false }`

Omit Snapshot for overlay components (Dialog, Modal, Drawer) where portals cause issues.

#### Chromatic Snapshot Strategy

Snapshots are **disabled by default** and **finite** in our contract. Enable selectively on `Snapshot`, `Emphasis`, and interaction test stories. Leave all other stories with snapshots disabled.

#### Visual Testing Strategy

| Test Type | Use For | Don't Use For |
|---|---|---|
| **Chromatic Snapshots** | Visual styling, Tailwind classes, layout, variants | N/A — always use for visual |
| **Storybook Play Functions** | User interactions, multi-step flows, portals | Simple event handler calls |
| **Unit Tests (`.spec.tsx`)** | Props forwarding, refs, callbacks, edge cases | Visual styling, CSS classes, layout |

Tailwind doesn't compile in JSDOM. Never assert on CSS classes in unit tests.

#### Snapshot / Controls Exclusion Rule

Props that must **never** appear in the snapshot matrix or controls panel:

| Prop category | Props | Mechanism |
|---|---|---|
| Style escape hatches | `className`, `buttonClassName`, `slots` | `PROPS_TO_SKIP` in `src/storybook/sortPropKeys.ts` (global); `table: { disable: true }` in `argTypes` |
| Callback/event handlers | `onClick`, `onToggle`, any `on*` | `control: false` in `argTypes`; wire with `fn()` in `args` for interaction tests |

**Rule:** When adding `buttonClassName`, `slots`, or a new callback prop, immediately add `argTypes` exclusions. Do NOT wait for Chromatic to flag a snapshot size change.

```tsx
argTypes: {
  buttonClassName: { table: { disable: true } },
  onToggle: { control: false },
},
args: {
  onToggle: fn(),
},
```

`PROPS_TO_SKIP` for universal escape hatches; `argTypes` for component-specific callbacks.

### Infrastructure (2 rules)
- `authoring/package-setup.md` — Component package authoring conventions: rig, rslib, "type": "module", scripts, Tailwind imports for packages
- `shared/quality-checklist.md` — Pre-publish checklist covering all standards

### App onboarding (loaded in Setup mode — see `rules/setup/`)
- `setup/fresh-app-onboarding.md` — Orchestrator for wiring horizon into a fresh app
- `setup/package-dependencies.md` — Required and recommended package.json entries
- `setup/tailwind-v4-theme.md` — Tailwind v4 theme wiring (monorepo + external)
- `setup/storybook-mcp.md` — Storybook MCP configuration

## Audit & Fix Mode

Triggered by user commands `audit [component]` or `fix [component] to meet horizon-standard`, or by invoking the skill without a target (Discovery mode).

### Targeted audit (single component)

1. Load: `rules/shared/` + `rules/authoring/` + `rules/testing/` + `references/audit-checklist.md` + `references/audit-template.md`
2. Read the component file, its variants file (if any), and its story file (if any)
3. Apply the audit checklist; record findings with severity (blocking, warning, nit)
4. If the component has stories, dispatch the **visual-verifier** subagent (see `references/subagents/visual-verifier.md`)
5. Produce the audit report (see "Audit completion gates" below)

### Discovery mode (no target)

Dispatch the **discovery-scanner** subagent (see `references/subagents/discovery.md`) to scan the codebase, score candidates, and return a ranked list. Present the top 10 to the user with severity highlights.

### Batch audit (multiple components)

When discovery returns N>1 components or the user names multiple targets, dispatch the **batch-auditor** subagent (see `references/subagents/batch-auditor.md`) which fans out parallel per-component audits.

### Visual verification protocol

For any component with stories, run the **visual-verifier** subagent. It drives Storybook MCP (or Chrome DevTools MCP fallback) to render each variant and compare against horizon design tokens. Output: pass/fail per variant, screenshot paths, token mismatch list.

### Audit completion gates

Every audit produces two artifacts. Audits are not considered complete until both writes succeed.

1. **Per-component report** at `.pcln-ai-output/horizon-standard/YYYY-MM-DD_ComponentName-audit.md` (markdown, human-readable). Format follows `references/audit-template.md`.
2. **Per-component sidecar** at `.pcln-ai-output/horizon-standard/YYYY-MM-DD_ComponentName-audit.json` (machine-readable, structured findings). Schema:

   ```json
   {
     "component": "string",
     "componentPath": "string",
     "auditDate": "YYYY-MM-DD",
     "findings": [
       { "id": "string", "severity": "blocking|warning|nit", "rule": "string (rule file path)", "message": "string", "evidence": "string (file:line)" }
     ]
   }
   ```

3. **Running summary upsert** in `horizon-standard-audit.md` at the project root (or the closest ancestor that already has one). One row per audited component with date, score, top issues, and link to the per-component report.

### Rule-promotion gate

Before re-logging a finding, search the running summary and recent JSON sidecars for the same finding `id`. If the finding has appeared in **3 or more** component audits, escalate it:

- Open a new rule file under `rules/<mode>/<finding-id>.md` capturing the prescription, OR
- Add a CLAUDE.md note in the offending package's directory

Re-logging without escalation is a workflow failure. The audit log is the input; rule additions are the output. The flywheel turns only if the gate is enforced.

To check recurrence count for a finding `id`, the user can run this manually outside the skill (the skill's narrow Bash allowlist intentionally doesn't permit `jq`/`xargs`/`wc` — keeps the skill safe; recurrence audits are a deliberate user action):

```bash
ls .pcln-ai-output/horizon-standard/*.json 2>/dev/null \
  | xargs -I{} jq --arg id "<finding-id>" '.findings[] | select(.id == $id)' {} 2>/dev/null \
  | wc -l
```

The skill itself reads JSON sidecars via the `Read` tool when checking recurrence as part of its audit-mode flow.

## Key Resources

- **Module component**: `design-system/horizon/src/components/Module/` — composition exemplar
- **Button component**: `design-system/horizon/src/components/Button/` — standard anatomy exemplar
- **tv() instance**: `design-system/horizon/src/variants/tv.ts`
- **Utilities**: `design-system/horizon/src/utils/` (cn, cleanProps)
- **Tailwind theme**: `design-system/horizon/src/tailwind.css`
- **Storybook preset**: `design-system/horizon-storybook-preset-addon/`
- **Base UI skill**: `.agents/skills/base-ui/` — authority on Base UI usage
- **Horizon skill**: `.agents/skills/horizon/` — Horizon infrastructure and tooling
- **Storybook skill**: `.agents/skills/storybook/` — Storybook infrastructure (ports, SB9/SB10, federation, project config)
