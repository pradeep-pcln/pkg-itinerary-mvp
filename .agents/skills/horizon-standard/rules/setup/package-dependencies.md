---
name: package-dependencies
description: Required and recommended package.json entries for a horizon-using app — covers dependencies, devDependencies, peerDependencies, and version pinning.
applies-to: setup
---

# Package dependencies for horizon-using apps

> **Scope:** This rule applies when onboarding a *consuming app* to horizon. For authoring a `horizon-*` component package itself (rig, rslib, scripts), use `rules/authoring/package-setup.md` instead.

## Required (dependencies)

```jsonc
{
  "dependencies": {
    "@pcln/horizon": "<latest major>",
    "tailwind-variants": "^0.3.0 || newer",
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  }
}
```

## Required (devDependencies)

```jsonc
{
  "devDependencies": {
    "tailwindcss": "^4",
    "@types/react": "^18 || ^19",
    "@types/react-dom": "^18 || ^19",
    "typescript": "^5.3"
  }
}
```

## Recommended (devDependencies)

```jsonc
{
  "devDependencies": {
    "@pcln/horizon-storybook-preset-addon": "workspace:*",  // pcln-web only
    "@storybook/react": "^8",
    "chromatic": "^11",
    "vitest": "^2",
    "@testing-library/react": "^16"
  }
}
```

## peerDependencies (for shared component packages, not apps)

If the project being set up is a *component package* (lives under `react-components/`), it should declare horizon as a peerDependency, not a regular dependency:

```jsonc
{
  "peerDependencies": {
    "@pcln/horizon": "<major>",
    "react": "^18 || ^19"
  },
  "devDependencies": {
    "@pcln/horizon": "<major>",  // for tests/storybook
    "react": "^18 || ^19"
  }
}
```

This avoids duplicate horizon copies in consuming apps (peerDependencies dedupes; regular dependencies hoist).

## pcln-web monorepo specifics

- Use `workspace:*` for any first-party `@pcln/*` package
- Run `rush update` after editing `package.json` (not `npm install`)
- Avoid `--make-consistent` unless explicitly requested by the user — it expands PR scope to all ~335 monorepo consumers
- Add a Rush change file: `rush change --bulk` or write the changefile JSON directly for targeted bumps

## External repo specifics

- Use the project's package manager (`npm`, `pnpm`, `yarn`, `bun`)
- Pin horizon to a specific major version (`^X.0.0`) — minor/patch updates are safe
- For monorepo-style external projects (Nx, Turborepo), the same peerDependency split applies to internal packages

## Verification

After install:
```bash
# pcln-web
rush check  # validates monorepo consistency
# external
npm ls @pcln/horizon  # should show single version, no duplicates
```

If npm/pnpm reports multiple horizon versions, investigate — duplicate horizon trees produce subtle bugs (multiple Tailwind theme registrations, ref/context drift).
