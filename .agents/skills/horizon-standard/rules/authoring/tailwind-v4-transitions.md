---
name: tailwind-v4-transitions
description: Tailwind v4 uses native CSS translate/rotate/scale properties — transition-[transform] silently skips animations. Must use transition-[translate], transition-[rotate], transition-[scale].
severity: MUST
ct: CT-27
applies-to: All components using translate-*, rotate-*, scale-* with transitions
---

# Tailwind v4 — Use `transition-[translate]`, not `transition-[transform]`

## Rule

In Tailwind v4, `translate-x-*`/`translate-y-*` emit the CSS `translate` property. `rotate-*` emits `rotate`. `scale-*` emits `scale`. None of these are the `transform` shorthand. `transition-[transform]` or `transition-transform` does **not** transition them — the animation silently never plays.

```tsx
// ❌ translate-y-full does NOT animate in Tailwind v4
className='transition-[transform,opacity] duration-300 translate-y-full'

// ✅ correct
className='transition-[translate,opacity] duration-300 translate-y-full'

// ✅ for rotation (e.g. Chevron open/close)
className='transition-[rotate] duration-200 rotate-90'
```

## Why

Tailwind v4 maps individual transform utilities to their CSS native counterparts:
- `translate-*` → CSS `translate` property
- `rotate-*` → CSS `rotate` property
- `scale-*` → CSS `scale` property

The `transform` shorthand in `transition-property` covers only the legacy `transform` shorthand, not these individual properties. The component renders with the correct final state but the transition never fires — the element jumps instead of animating.

## Evidence

DX-1074 (2026-06-04): `StickyChooseRoomBar` had `transition-[transform,opacity]` + `translate-y-full`. DevTools showed `transform: none` even with the class applied — only opacity animated. Fixed by changing to `transition-[translate,opacity]`. Same bug confirmed in `ArticleEntry`, `ActionCard`, `Tabs` (indicator), `Chevron`.
