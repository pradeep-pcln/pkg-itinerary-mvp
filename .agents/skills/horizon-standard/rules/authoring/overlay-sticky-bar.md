---
name: overlay-sticky-bar
description: Pattern for a sticky CTA bar (e.g. "Choose your room") that slides in/out at the bottom of a Drawer.Popup without affecting scroll layout.
severity: MUST
ct: CT-28
applies-to: Drawer.Popup with a sticky bottom bar
---

# Overlay Pattern: Sticky Bar in Drawer

## Rule

A sticky bar at the bottom of a `Drawer.Popup` that shows/hides based on scroll state must use this exact structure:

```tsx
<Drawer.Popup className='relative overflow-hidden ...'>
  {/* scroll-pb clears space so bottom content scrolls above the bar */}
  <Drawer.Body slots={{ viewport: 'scroll-pb-28' }}>
    {scrollableContent}
  </Drawer.Body>
  {/* absolute = outside layout flow; no empty-space residue when hidden */}
  <div className='absolute right-0 bottom-0 left-0'>
    <div className={`px-4 pb-4 transition-[translate,opacity] duration-300 ease-out ${
      isHidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
    }`}>
      {bar}
    </div>
  </div>
</Drawer.Popup>
```

## Why

| Constraint | Why it matters |
|---|---|
| `Drawer.Popup relative overflow-hidden` | `relative` creates the positioning context. `overflow-hidden` clips the slide-out animation at the popup's edge — without it, the bar translates past the popup boundary and remains visible on screen. |
| Wrapper is `absolute bottom-0`, not a flex sibling | A flex sibling always occupies layout space even when the bar is hidden via `translate-y-full`. This creates an empty gap below scrollable content. `absolute` takes the bar out of flow entirely. |
| `transition-[translate,opacity]` | Tailwind v4 uses the CSS `translate` property for `translate-y-*`. `transition-[transform]` silently skips it. See `tailwind-v4-transitions.md`. |
| `overflow-hidden` on popup, NOT on an intermediate wrapper | If `overflow-hidden` is on the wrapper div instead of the popup, it clips the animation immediately (bar was at `bottom-0`, any downward translate is instantly hidden). The popup's edge provides the natural clip point after a full-length animation. |
| `scroll-pb-28` on `Drawer.Body` viewport | Prevents the last scroll content from hiding behind the visible bar. Without it, users can't scroll the final items fully into view. |

## Evidence

DX-1074 (2026-06-04): `PennyHotelDetailsDrawer` went through `ActionFooter` → flex sibling (empty space) → sticky (scrolls with content) → max-h collapse (clips card corners) → `absolute` + wrong `overflow-hidden` placement (no animation) → final correct pattern above.
