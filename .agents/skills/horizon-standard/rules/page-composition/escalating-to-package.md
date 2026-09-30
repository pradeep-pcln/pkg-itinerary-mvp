---
name: escalating-to-package
description: When an app-internal component is reused or accumulates domain logic, promote it from the app's components/ dir to a horizon-* package.
applies-to: page-composition
---

# Escalating an app-internal component to a horizon-* package

## Rule

An app-internal component (lives in `react-apps/<app>/components/` or `react-apps/<app>/<route>/components/`) should be promoted to a `@pcln/horizon-*` domain package when any of these are true:

- It's used in **2 or more apps** or **3 or more routes within one app**
- It encodes domain logic that another team's app would benefit from (rate display formatting, inventory state UI, brand-specific animations)
- It has accumulated tests or stories that are non-trivial (≥3 stories, ≥1 test file)
- A reviewer of an unrelated PR asks "is there a shared version of this?"

The promotion target is the relevant domain package (e.g. `@pcln/horizon-fly-components` for fly UX). If no domain package fits, file a ticket with the F&A squad to scope a new one — do not invent ad-hoc shared packages.

## Why

App-internal components are appropriate when the component is genuinely page-specific. The risk is they become *informally shared* via copy-paste. Each copy diverges in a small way, and now you have 5 visually similar components, 4 of which have the same bug.

Formal promotion forces the right reviewers (the package owner) and the right tests (Storybook stories, audit compliance) to gate the component before it spreads.

## How to apply

- During audit mode, when scanning a react-app's `components/` directory, run `git grep -l "<ComponentName>" react-apps/` and count distinct app paths. If ≥2, flag for promotion.
- When you find a promotion candidate, output a finding with `id: "promotion-candidate"` and severity `warning`. Recommend the target package in the finding `message`.
- Do not attempt the promotion in the same audit pass — promotions need their own ticket and review.

## Counter-example (don't do this)

```
react-apps/next-landing/components/PriceBadge.tsx
react-apps/mktg-landing/components/PriceBadge.tsx          # copied, diverged
react-apps/penny-portal/src/components/PriceBadge.tsx       # copied again, lost prop
```

## Right way

```
@pcln/horizon-pricing-components/src/components/PriceBadge/
  PriceBadge.tsx
  PriceBadge.variants.ts
  PriceBadge.stories.tsx
  PriceBadge.test.tsx
```

Then every app imports `PriceBadge` from `@pcln/horizon-pricing-components`. Promotion ticket should include the migration list (which apps to update) and a deprecation timeline for the local copies.
