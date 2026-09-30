---
name: fresh-app-onboarding
description: End-to-end checklist for wiring horizon, Tailwind v4 theme, and Storybook MCP into a fresh app — runs on first invocation when horizon is missing.
applies-to: setup
---

# Fresh-app horizon onboarding

## When this fires

The skill enters Setup mode when:
- The user explicitly asks to "set up horizon" or "onboard horizon"
- The skill detects an app missing required wiring (no `@pcln/horizon` dep, no Tailwind v4 theme entry, no Storybook MCP config)

This rule is the orchestrator. It chains the other setup rules: `package-dependencies.md` → `tailwind-v4-theme.md` → `storybook-mcp.md`.

## Onboarding checklist

Walk through every item. Skip with explicit user opt-out only.

1. **Dependencies** (see `package-dependencies.md`)
   - Required: `@pcln/horizon`, `tailwindcss@^4`, `tailwind-variants`
   - Optional but encouraged: `@pcln/horizon-storybook-preset-addon` (pcln-web only), `@storybook/react`, `chromatic`
   - For pcln-web: use `rush add` (with `--make-consistent` only when explicitly authorized)
   - For external: use `npm install` / `pnpm add` per the project's package manager

2. **Tailwind v4 theme** (see `tailwind-v4-theme.md`)
   - Wire horizon's theme exports into the app's Tailwind config
   - Verify `bg-background-base` and `text-content-primary` resolve in a smoke test

3. **Storybook MCP** (see `storybook-mcp.md`)
   - Detect Storybook config presence (`.storybook/main.ts` or similar)
   - If absent, offer to scaffold a minimal config
   - Register Storybook MCP server (pcln-web: via `@pcln/horizon-storybook-preset-addon` and port-registry; external: raw config)
   - Bootstrap one story so MCP has something to render

4. **First component**
   - Create a one-line `<Heading>` smoke test page or story
   - Verify it renders with horizon tokens (no arbitrary values)

5. **Skill self-registration**
   - Confirm horizon-standard fires on the new app's files (Layer 2 generic heuristics will pick it up automatically once `@pcln/horizon` is in `package.json`)

## Mode chain

After Setup completes, return to the user's original task and re-detect mode:
- If user was on a `page.tsx` → enter Page composition
- If user was on a component file → enter Authoring
- If user just wanted setup → exit cleanly with summary

## Output

At end of onboarding, write a one-screen summary to `.pcln-ai-output/horizon-standard/YYYY-MM-DD_<app-name>-onboarding.md` with:
- What was installed
- What was configured
- Open issues (e.g. "Tailwind v4 theme conflicts with existing tokens — needs reconciliation")
