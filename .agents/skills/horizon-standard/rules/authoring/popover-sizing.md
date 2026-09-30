---
name: popover-sizing
description: Guide for choosing Popover size prop — sm/md/lg/auto — by content type and use case.
severity: SHOULD
ct: CT-28
applies-to: Popover
---

# Popover sizing

## Sizes

| Size | Max-width | Use for |
|------|-----------|---------|
| `sm` | 288px | Info tooltips, small menus, short confirmation messages |
| `md` | 384px | Default: filters, forms, short content lists — **use when unsure** |
| `lg` | 576px | 2-column content: date-range calendars, pricing breakdowns, fare cards that overflow `md` |
| `auto` | content-driven (min 288px) | Fare cards, brand-specific popovers where content width varies by locale |

Default is `md`. Do not omit `size` — the default is explicit in the API.

## Selection guide

```
Content is a 2-month calendar or side-by-side layout?  → lg
Content is text + 1-2 CTAs?                           → md (default)
Content is a single tooltip line?                      → sm
Content width varies by user data (prices, labels)?    → auto
```

## `size='auto'` floor

`auto` has a `min-w-72` (288px) floor — it cannot collapse below `sm` width
even on very short content. It grows freely beyond that. Use when content
naturally determines the right width (e.g., a fare card that changes by currency).

## `size='lg'` use case

```tsx
// ✅ Date-range calendar — 2 months side-by-side needs ~576px
<Popover.Popup size='lg'>
  <Calendar numberOfMonths={2} ... />
</Popover.Popup>

// ❌ Wrong — sm/md cuts off the 2nd calendar column
<Popover.Popup size='md'>
  <Calendar numberOfMonths={2} ... />   {/* calendar overflows or wraps awkwardly */}
</Popover.Popup>
```

## Fixed widths — do NOT use w-full on Popover.Popup

Popover size variants use **fixed widths** (`w-72`, `w-96`, `w-[36rem]`), not
`w-full max-w-*`. In popover mode, `w-full` resolves against the Positioner's
containing block — which is the **trigger element width** for absolutely-positioned
popups. A narrow trigger (e.g. a price button at ~80px) would give an 80px popup
regardless of `max-w-96`. Fixed widths ensure the popup is always the spec width.

On mobile, `useShouldUseDrawer` switches to the `drawerPopup` slot which correctly
uses `w-full max-w-[100vw]` for full-width drawer sheets.

## Drawer mode

`size` is ignored in drawer mode (coarse + small viewport). The drawer fills the
viewport width. Only `height='full'` / `snapPoints` control drawer dimensions.

## Evidence

DX-1074 QA Round IV T6: "DatePicker Popover — no width auto or min/max width";
"FarebrandCard: no auto min/max width". Added `lg` size (576px) and `min-w-72` floor
on `auto` to fill the gap.
