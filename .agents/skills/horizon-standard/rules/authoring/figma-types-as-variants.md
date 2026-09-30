---
title: Figma "Types" rows become variant props
applies_to: component authoring
severity: warning
ct_pattern: CT-11
captures: FM-2
---

# Figma "Types" rows become variant props

Every distinct row in a Figma frame's "Types" section (or equivalent variants frame) MUST be represented in `<Component>.variants.ts` as either:

- A dedicated `variant` prop (when the row varies a single dimension — placement, density, emphasis), OR
- A documented combination of existing variant props (when the row is a composition that already has primitives in code).

If neither, the row is a missing feature and the component is incomplete.

## Why

Designers communicate the full API surface via "Types" rows. Code that only models the canonical row silently drops API. Consumers can't access the design's full intent.

## What to do

When authoring or reviewing a component:

1. Fetch the component's Figma frame metadata.
2. Identify all "Types" rows (case-insensitive — designers may call them "Variants", "States", "Modes").
3. For each row, map it to either an existing variant or a new variant.
4. Add a dedicated story (`<Component>--<variant-name>`) demonstrating every row.

## What NOT to do

- Don't treat "Types" rows as illustrative-only. Designers don't make rows that aren't meant to ship.
- Don't try to encode placement variants via story `className` overrides. They belong in `variants.ts`.

## Verifier coverage

CT-11 — the `visual-verifier` cross-references the Figma "Types" rows against `<Component>.variants.ts.variants` and emits `[missing-figma-variant]` for unaccounted rows.

## DX-1074 examples

- PopupHeader had no `inset` variant — Figma "Types" row showed inset placement. Added.
- Drawer had no inset (bottom-only constrained-to-parent) story — Figma "Types" row showed it. Added.
