---
title: Figma token parity
applies_to: component authoring (variants, computed styles)
severity: blocking
ct_pattern: CT-10
captures: FM-1
---

# Figma token parity

Every token value used in `<Component>.variants.ts` (padding, gap, radius, size, color, shadow, font-size) MUST match the canonical Figma variable bound to the equivalent property in the canonical Figma frame for that component.

## Why

Code → spec → code is a two-step lossy translation. When specs are written as prose ("16px padding"), small drift creeps in (someone writes `pl-2` because they remember `8px` from another component). The only way to guarantee parity is property-by-property comparison against Figma's bound variables.

## What to do

When authoring or modifying any variant slot or class string:

1. Resolve the component's canonical Figma frame via `references/figma-frame-map.md`.
2. Fetch the frame's bound variables via `mcp__claude_ai_Figma__get_variable_defs`.
3. Map each Figma variable to its Tailwind equivalent. Use `tailwind-theme.css` as the bridge.
4. If the Figma value is responsive (e.g. width changes across breakpoints), use `max-w-*` / responsive prefixes — never fixed `w-[*]`.

## What NOT to do

- Don't trust prose specs ("16px padding" in design docs). Always check the bound variable.
- Don't extract Figma values from a single snapshot — frames evolve. Re-fetch on every author touch.
- Don't substitute approximations. `pl-2` is NOT close to `pl-4` — it's wrong.

## Verifier coverage

The `visual-verifier` subagent's Figma-frame-parity pre-step performs the comparison and emits `[figma-token-mismatch]` for every divergence. Findings are blocking.

## DX-1074 examples

- PopupHeader root `pl-2` (8px) vs Figma `pl-4` (16px) — fixed.
- Popover `sm: w-[256px]` vs Figma 288px responsive (`max-w-72`) — fixed.
- Popover `md: w-[416px]` vs Figma 384px responsive (`max-w-96`) — fixed.
