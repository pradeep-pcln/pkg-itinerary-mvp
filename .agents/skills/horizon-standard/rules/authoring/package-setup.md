---
title: Package Setup
description: Component package authoring conventions — rig, rslib, type:module, scripts, Tailwind imports for packages. For app-level onboarding, see `setup/package-dependencies.md`.
applies-to: authoring
impact: MEDIUM
tags: [package, dependencies, tailwind, fonts, rig]
---

# Package Setup

> **Scope:** This rule applies when authoring a `horizon-*` component package (lives under `react-components/horizon-*/`). For onboarding a *consuming app* to horizon, use `rules/setup/package-dependencies.md` instead.

## Dependencies

Do not duplicate direct dependencies of `@pcln/horizon` unless you are importing that dependency directly in your source code. npm doppelgangers (multiple copies of the same package in the dependency tree) cause bundle bloat and subtle runtime bugs.

## Module Configuration

Component packages should be `"type": "module"`. This is currently achieved via rslib using the `horizon-stack` or `hybrid-stack` rig.

### Standard Scripts and Phases

Model your scripts and phases from the horizon package, excluding `module-fed` and `transform-theme` which are horizon-specific. The following should all be standard across component packages:
- Storybook commands (`storybook`, `build-storybook`)
- `publint` for package validation
- `rslib inspect` for build inspection

Everything must be written in TypeScript.

## Tailwind CSS Setup

Component packages must configure Tailwind CSS as follows:

```css
@import 'tailwindcss';
@import '@pcln/horizon/tailwind.css';

@source '../node_modules/@pcln/horizon/dist';
@source './';
```

Importing `tailwind.css` from horizon includes Tailwind itself, the theme configuration, and CSS rules for iconography.

## Font Loading Patterns

### Apps

Inject `materialSymbolsUrl` and `montserratUrl` from `@pcln/horizon` via `<head>` tags. This saves approximately 5000kb of webfont icons by only loading what is needed at runtime.

Apps must **NOT**:
- Import `montserrat.css` or `material-fonts.css` directly
- Use `montserrat.css` or `material-fonts.css` files in any way

### Storybooks

Model the horizon pattern for font loading in Storybook:

```typescript
// .storybook/preview.tsx
import '@pcln/horizon-storybook-preset-addon/storybook.css'
import '../src/tailwind.css'
```

Fonts are auto-injected by the preset addon's `previewHead` — no manual font loading is needed.

## Package Structure

Component packages follow this directory structure:

```
react-components/horizon-your-components/
├── package.json
├── src/
│   ├── components/
│   │   └── ComponentName/
│   │       ├── ComponentName.tsx
│   │       ├── ComponentName.variants.ts
│   │       ├── ComponentName.stories.tsx
│   │       ├── ComponentName.spec.tsx
│   │       ├── ComponentName.testFixtures.tsx
│   │       └── index.ts
│   ├── index.ts
│   └── tailwind.css
├── .storybook/
│   ├── main.tsx
│   └── preview.tsx
└── chromatic.config.json
```
