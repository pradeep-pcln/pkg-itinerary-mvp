# Figma frame map

Maps each Horizon component to its canonical Figma asset. Used by the `visual-verifier` subagent's Figma-frame-parity pre-step to fetch source-of-truth tokens before any visual compare.

Every entry has up to three frame references:
- **props**: the canonical component-set frame (spec; variants, props, tokens). This is the `parameters.design.url` value embedded in the Storybook meta.
- **stories**: design-team-authored example compositions that show the component in real layouts. Useful for per-story visual cross-reference.
- **legacy**: the predecessor frame (when migrating an API), kept for backref during the migration window.

## File context

- **fileKey**: `nm7bzKMIBArRTTWBhqha9v`
- **fileName**: `🌅 Horizon`
- **library**: `🌅 Horizon` (`lk-860dc5f2894f77fc34d0e277b12f32216dc5c3ec9c24f4abe9ab8e9030fab03feb6bee8d6c230eb494891e79ac76b3421b54c42ede815758151ada5a9317561b`)
- **node URL pattern**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=<node-id>&m=dev`

## Resolution protocol

1. Look up the component below.
2. Use **props** URL with `mcp__claude_ai_Figma__get_metadata` and `mcp__claude_ai_Figma__get_variable_defs` for spec tokens.
3. Use **stories** URL with `mcp__claude_ai_Figma__get_design_context` for layout / composition reference.
4. If a URL returns "node not found", call `mcp__claude_ai_Figma__search_design_system` with the `componentName` to confirm the frame moved. Update this file and emit a `[figma-frame-map-stale]` finding.

## Entries

### Dialog
- **componentKey**: `dfb6c0fe5c5769cf077a8031ce2d229064a6ca6d` (`Dialog (Web)`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=45901-2712&m=dev`
- **stories**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46022-60605&m=dev`
- **bound variables (expected)**: `radius-2xl`, `shadow-overlay-lg`, `max-w-[calc(100dvw-16px)]`, `max-h-[calc(100dvh-16px)]`
- **last verified**: 2026-05-11

### Drawer
- **componentKey**: `b5607141e19f3c8fbb68b73dfba3285bd462bb12` (`Drawer`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46055-130055&m=dev`
- **stories**: _embedded in Drawer.stories.tsx via `parameters.design` (same URL)_
- **bound variables (expected)**: `radius-2xl` (top corners for bottom sheet), `shadow-overlay-lg`, `transition-transform 300ms ease-out`
- **last verified**: 2026-05-08

### Popover
- **componentKey**: `2987f444994076e3a9c28168525a4a422190daca` (`Popover`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46311-35405&m=dev`
- **stories**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46337-42166&m=dev`
- **bound variables (expected)**: `drop-shadow-overlay-md`, `radius-lg`, `sm: max-w-72 (288px)`, `md: max-w-96 (384px)`, `lg: max-w-128 (512px)`
- **last verified**: 2026-05-11

### PopupHeader
- **componentKey**: _Horizon-side composite — no dedicated component_set in library_
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46029-97722&m=dev`
- **stories**: _same as props (single spec frame)_
- **bound variables (expected)**: `pl-4` (default), `pl-6` (inset), `pr-15` (Close clearance), `min-h-14` (size-md). Close button: `type='primary'`, `emphasis='bold'`, `shadow`.
- **last verified**: 2026-05-11

### Tooltip
- **componentKey**: `591c7567ac6a014b27111956c8b2720e0420462d` (`Tooltip`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=7532-16256&m=dev`
- **legacy (PopTip)**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=24708-214335&m=dev` (v34 predecessor; migration backref)
- **bound variables (expected)**: close-button `emphasis` matches tooltip `emphasis` (NO inversion)
- **last verified**: 2026-05-11

### Button
- **componentKey**: `2bfec807ff8dab0ce25c94e0a4153073d7860ad5` (`Button (Web, iOS, Android)`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=5863-6568&m=dev`
- **bound variables (expected)**: `actionSecondary-*` palette for default (secondary+regular), `actionPrimary-*` for primary, `actionShop-*` for primaryShop, `actionCritical-*` for critical
- **last verified**: 2026-05-11

### IconButton
- **componentKey**: `37e827ecbdfef5f7b736784161403508868a1b2c` (`Icon Button`)
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=6435-21298&m=dev`
- **bound variables (expected)**: same palette tokens as Button. Wrapper DOM structure: `<button>` outer + inner wrapper div — positioning utility classes (`absolute`, etc.) MUST land on `<button>` via `buttonClassName`, not on `className` (which targets the inner wrapper).
- **last verified**: 2026-05-11

### ActionFooter
- **componentKey**: _Horizon-side composite_
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=13789-121367&m=dev`
- **stories**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=13802-48061&m=dev`
- **bound variables (expected)**: `size='lg'` is the canonical Dialog/Drawer footer size — stories annotate explicitly.
- **last verified**: 2026-05-11

### AlertDialog
- **componentKey**: _Horizon-side composite — uses Dialog primitive under the hood_
- **props**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46007-27170&m=dev`
- **stories**: `https://www.figma.com/design/nm7bzKMIBArRTTWBhqha9v/%F0%9F%8C%85-Horizon?node-id=46022-87356&m=dev`
- **bound variables (expected)**: inherits Dialog geometry; `tone` palette (`primary` / `critical` / `caution` etc.) drives confirm-button styling
- **last verified**: 2026-05-11

## Maintenance

When a Figma frame moves or is renamed:
1. Update the **props** / **stories** URL here.
2. Update the `parameters.design.url` in the component's stories meta (single source of truth in code).
3. Update `last verified` to today's date.
4. Re-run the verifier against the affected component to confirm parity.

Adding a new component:
1. Add a section above with `componentKey` (from `mcp__claude_ai_Figma__search_design_system`), `componentName`, `props` URL, `stories` URL when applicable, bound-variable expectations.
2. Add `parameters.design = { type: 'figma', url: '<props-url>' }` to the component's stories meta.
3. The verifier will pick up both surfaces on its next run.

## Code Connect mapping (next step)

Each entry above is also a candidate for a Figma Code Connect mapping (via `mcp__claude_ai_Figma__add_code_connect_map` + `send_code_connect_mappings`). Once registered, designers and agents fetching these nodes via Figma MCP get back the canonical `@pcln/horizon` import + prop shape instead of just a screenshot. Tracked under DX-1074 follow-up.

## Code Connect mechanics — known gotchas

Learned during DX-1074 round 1 (2026-05-11). These apply whenever registering or updating Code Connect mappings.

### What `add_code_connect_map` actually needs

`add_code_connect_map` requires the **published `component_set` node id** — NOT:
- A documentation/props frame URL (the "Share frame" URL designers paste)
- A local nested component (`.Dialog`, `.popupHeader`, `.AlertDialog` — dot-prefix = local)
- A `componentKey` (library asset key; different format, no resolver to node id via MCP)

The published `component_set` lives on the library's component-definitions page, not embedded in props/documentation frames.

### How to find a publishable `component_set` node id

1. **`get_code_connect_suggestions`** returns `mainComponentNodeId` per instance — but these are local nested component ids, NOT the published library masters. Cannot be used directly.
2. **`search_design_system`** returns `componentKey` (e.g. `dfb6c0fe5c5769cf...` for `Dialog (Web)`), but there is no MCP tool that resolves `componentKey → nodeId`. Gap.
3. **What works**: ask the design team to share the published library component-set frame link (not the props documentation frame). Or use the Figma web UI: open the component set in the library file → right-click → "Copy link to selection" → extract the `node-id` from the URL.

### Why ActionFooter worked but others didn't (round 1)

`Sticky Action Bar` (`3028:5892`) pre-existed the v35 rename and had been a published library component_set entry for some time. Its node id was discoverable directly. The newer overlay components (Dialog, Drawer, Popover, AlertDialog, Tooltip, PopupHeader) have props frames but their published component_set ids weren't discoverable via MCP alone.

### Existing mappings registered before round 1

- **Button** → `design-system/horizon/src/components/Button/Button.tsx` (16 variant node ids already live)
- **ActionFooter** → freshly registered in round 1 (9 node ids)

## Verifier-side resolution (runtime)

If a `props` URL returns "node not found":

1. Call `mcp__claude_ai_Figma__search_design_system({ query: componentName, fileKey, includeLibraryKeys: ['<horizon library key>'] })`.
2. Match the returned `componentKey` against the entry here.
3. Use `mcp__claude_ai_Figma__get_design_context` against the resolved node id.
4. Cache the resolved URL and emit a `[figma-frame-map-needs-update]` finding so this map gets refreshed.
