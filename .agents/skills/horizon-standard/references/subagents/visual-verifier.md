---
name: subagent-visual-verifier
description: Dispatch template for the horizon-standard visual verifier. Drives Storybook MCP (Figma MCP for design intent) to render variants and compare against horizon design tokens AND canonical Figma frames.
model: sonnet
subagent_type: general-purpose
---

# Visual verifier — dispatch template

## Table of contents

1. [When to dispatch](#when-to-dispatch)
2. [Why subagent](#why-subagent)
3. [Dispatch parameters](#dispatch-parameters)
4. [Two modes](#two-modes)
5. [Mandatory Rule Check Matrix (R1-R18)](#mandatory-rule-check-matrix-r1-r18-canonical)
6. [Prompt template](#prompt-template)
7. [Chromatic test-runner failure patterns (CT-1..CT-20)](#patterns-the-verifier-must-flag--chromatic-test-runner-failures)
8. [Output paths and write ownership](#output-paths-and-who-owns-the-write)
9. [Subagent execution discipline](#subagent-execution-discipline)

---

## When to dispatch

- Audit/Fix mode for a component that has stories
- User explicitly says "verify component renders correctly" / "visual check this story" / "design polish"
- Per-component audit child decides visual verification is needed
- After a structural refactor where Storybook MCP confirmed the API surface but not the rendering

## Why subagent

MCP tool output is verbose (screenshot data, large story manifests, Figma codegen blobs). Parent only needs the verdict (pass/fail per variant + token mismatch list + Figma deltas).

## Dispatch parameters

```ts
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",  // visual reasoning + tool use; Opus brings nothing extra
  description: "Visual verify component variants",
  prompt: `<see prompt below>`,
})
```

## Two modes

The verifier has two modes; specify in the prompt which one:

| Mode | Read-only | Output | When |
| --- | --- | --- | --- |
| **`verify`** | Yes | JSON per-story + 200-word summary | Audit mode; reporting only; parent decides edits |
| **`polish`** | No (story files only) | Edited stories + audit log | Fix mode; subagent applies token / padding / width fixes within story-file scope |

`polish` mode MAY edit story files (`*.stories.tsx`) but MUST NOT touch component source (`.tsx` subparts, variants, hooks, specs). If a fix requires a variants-file change, the polish subagent must flag it as `Figma-deferred` and return — the parent makes the structural call.

## Mandatory Rule Check Matrix

The verifier applies this matrix per story, every dispatch. Each row points to its canonical rule file — load that file when a finding is borderline. A failed check is a blocking finding unless the rule file says otherwise.

| ID | Check | Canonical rule file |
|---|---|---|
| R1 | A11y panel violations (non-contrast) — silence is itself a finding | `rules/testing/storybook-conventions.md` § Accessibility in Stories |
| R2 | Mobile twin story + mobile snapshot for viewport-aware components | `rules/testing/storybook-conventions.md` § Desktop and Mobile Stories |
| R3 | `defaultOpen` (uncontrolled), not `open={true}` (controlled) on default-open overlays | `rules/testing/storybook-conventions.md` § Overlay Stories: defaultOpen, Not open |
| R4 | Drawer/Popover default = no scrim; with-scrim opt-in named in story | `rules/testing/storybook-conventions.md` § Drawer + Popover Default = No Scrim |
| R5 | Dialog/Drawer/AlertDialog Description = first child of ScrollBody, NOT in PopupHeader | `rules/authoring/composition-patterns.md` § Overlay Header / Description / Footer Visual Contract |
| R6 | PopupHeader uniform `p-2`; Close button top-aligned, primary, emphasis bold, with shadow. **NOTE:** R6's close-button alignment is only independently evaluable AFTER R5 is fixed — when Description is wrongly inside the header, the close button centers against the 2-line Title+Description column, making R6 look failed when the root cause is R5. Audit order: fix R5 first, then re-evaluate R6. | same as R5 |
| R7 | Popup container clips chrome to rounded corners (so header/footer backgrounds don't bleed past `rounded-2xl`). **Implementation note:** `overflow-hidden` on a `fixed`-positioned popup CRASHES the tabbable + jsdom + Base UI `FloatingFocusManager` path with `Cannot read properties of undefined (reading 'visibility')`. Use `[clip-path:inset(0_round_var(--radius-2xl,1rem))]` instead — same visual clip, no `overflow:hidden`, no jsdom blast. For top-corner-only popups (Drawer-mode bottom sheet), use `[clip-path:inset(0_round_var(--radius-2xl,1rem)_var(--radius-2xl,1rem)_0_0)]`. | same as R5 |
| R8 | No ad-hoc `z-*` on Base UI overlay primitives or slots | `rules/authoring/styling-and-variants.md` § Z-Index Discipline |
| R9 | Prop docs as TSDoc on source, NOT in `argTypes.<prop>.description` (`react-docgen-typescript` reads source only) | `rules/authoring/component-anatomy.md` § TSDoc on Source |
| R10 | Wrapped Base UI primitives mirror Base UI prop signatures verbatim (no narrowing/omitting/renaming) | `rules/authoring/component-anatomy.md` § Mirror Base UI Prop Signatures |
| R11 | Horizon components + Horizon typography/palette in component source, tests, fixtures, AND stories | `rules/authoring/composition-patterns.md` § Use Horizon Components Over Raw HTML |
| R12 | testFixtures protocol — `.testFixtures.tsx` shared between `.stories.tsx` and `.spec.tsx` | `rules/testing/testing-strategy.md` § Test Fixtures Pattern |
| R13 | Subagent build/test commands single-threaded (`--runInBand`, `--workers=1`, `--parallelism 1`) — Rush cache deadlock | this file § Subagent execution discipline |
| R14 | Figma is the source of visual truth — Figma snapshot + diff for SPACING values is mandatory; for color/typography, also code-side check against `tailwind-theme.css` (Figma less reliable on those axes) | this file § Figma cross-reference |
| R15 | Interaction-test opportunities scanned + flagged on every functional story | `rules/testing/storybook-conventions.md` § Interaction Tests |
| R16 | Adaptive/side-by-side stories don't height-fill (use `items-start`, content-sized cells) | `rules/testing/storybook-conventions.md` § Adaptive Demos: No Height-Fill |
| R17 | Long-scrolling stories: content contained by `ScrollArea`; exactly one ActionFooter (no belt-and-suspenders) | `rules/testing/storybook-conventions.md` § Long Scrolling Stories |
| R18 | All output files use **worktree-absolute paths** — verifier runs in a worktree; writes outside the worktree are blocked by the perm boundary | this file § Output paths |

## Prompt template

Substitute the placeholders. `<MODE>` is `verify`, `polish`, or `polish-deep`. `<STORY_IDS>` is comma-separated. `<FIGMA_FRAMES>` is a list of `node-id` values; use `(none)` when there is no Figma reference.

`polish-deep` mode is `polish` mode with permission to modify component source (variants, subparts) when a layout bug is at the component level — required when stories alone can't fix the rendering.

````
You are the visual verifier subagent for horizon-standard. <MODE> mode.

Inputs:
- Component path: <COMPONENT_PATH>
- Story IDs: <STORY_IDS>
- Token manifest: design-system/horizon/src/tailwind-theme.css (canonical token export)
- Figma fileKey: nm7bzKMIBArRTTWBhqha9v (Horizon)
- Figma frames per scenario: <FIGMA_FRAMES>
- Storybook URL base: <STORYBOOK_BASE_URL> (e.g. http://localhost:6500)
- Mode: <MODE>

Procedure:
1. **Local Storybook MCP is MANDATORY for current-branch verification.**

   The Chromatic-backed MCP (`mcp__claude_ai_Horizon_Storybook_MCP_-_Chromatic__*`) tracks `master` and will silently miss every change on a feature branch. NEVER use it for current-branch verification.

   The required MCP is `mcp__Horizon_Storybook_MCP__Local__*` (double underscore between `Local` and the tool name, as the host normalizes the `Horizon Storybook MCP (Local)` server label). Call:
   ```
   mcp__Horizon_Storybook_MCP__Local__list-all-documentation
   ```
   to confirm availability.

   If the Local MCP is NOT registered, STOP immediately and return `local-mcp-unavailable` with a one-line note for the parent: "Local Storybook MCP not registered in this session — parent must reconnect via .mcp.json refresh / session restart and re-dispatch." Do NOT proceed with Chromatic, do NOT fall back to shell-only source review, do NOT fabricate findings without rendered output.

   Screenshots are still captured via `python3 .agents/skills/horizon-standard/scripts/storybook-screenshot.py --story <id> --out-dir .pcln-ai-output/horizon-standard/screenshots/<YYYY-MM-DD>` (the script drives Playwright against `http://127.0.0.1:6500` directly — separate from the MCP). Use story IDs returned by `list-all-documentation` (with `withStoryIds: true`) or `get-documentation`.

   The Chromatic MCP is permitted ONLY for "before-baseline" runs against downstream consumers (where `master` IS the baseline you want). That mode is dispatched separately and is NOT this current-branch flow.
2. **Per story — render AND screenshot the actual visual:**
   a. `mcp__Horizon_Storybook_MCP__Local__preview-stories` to get the canonical story URL. URL resolution alone is INSUFFICIENT — the previous protocol stopped here and missed truncated titles, missing footer chrome, broken layouts. **DO NOT** stop here.
   b. **Capture the actual rendered screenshot.** The canonical tool is the bundled Playwright script:
      ```bash
      python3 .agents/skills/horizon-standard/scripts/storybook-screenshot.py \
        --story <STORY_ID> [--story <STORY_ID> ...] \
        --out-dir .pcln-ai-output/horizon-standard/screenshots/<YYYY-MM-DD>
      ```
      For a full overlay sweep: `--all --filter components-overlays-`. The script writes one PNG per story plus a `manifest.json` mapping story IDs to file paths. Read the PNG paths from the manifest and inspect each via the `Read` tool. Run `bash .agents/skills/horizon-standard/scripts/tests/storybook-screenshot.test.sh` if you need to verify the script itself before a long capture.

      **Fallback** (if Playwright is unavailable): Chrome DevTools MCP (`mcp__Chrome-DevTools__*`) to open the URL and capture frames via `take_screenshot` or DOM inspection. Treat this as a degraded path; the bundled script is preferred for batch runs.

      Either way, this is the gate that catches:
      - Title truncation ("Confirm acti..." with ellipsis when full string was provided)
      - Description-next-to-title (flex-row layout when flex-col was intended)
      - Missing footer chrome (frosted-glass background invisible against white popup)
      - Side drawers full-width when Figma shows constrained
      - Buttons floating outside a visible action bar
      - Body content with no padding / paddings inconsistent across stories
      - Header/footer NOT sticky when canonical pattern requires sticky+ScrollArea+sticky
   c. **DO NOT** call `mcp__Horizon_Storybook_MCP__Local__run-story-tests` for runtime confidence — known to time out (see "Known infra issues" below). Instead, source-review the play function from the story file and confirm the assertions.
   d. **Token compliance** — compare colors / spacing in the rendered output to horizon tokens (OKLCH from theme; spacing scale from `tailwind-theme.css`). Tailwind default-palette colors (`gray-*`, `blue-*`, `white`, `black`, etc.) are blocking failures — Horizon resets those to `initial`, so they render invisible.
   e. **Horizon text component usage** — the rendered story MUST use Horizon's typography components for text content: `Heading`, `P`, `Span`, `Caption`. Plain `<h1>`/`<h2>`/`<p>`/`<div>` for body copy is a regression. Read the story source to confirm. This was missed in prior passes — designers expect every example to model the right primitives.
   f. **Figma cross-reference** (REQUIRED when `<FIGMA_FRAMES>` is provided). Figma is the source of visual truth, accessed via screenshot diff:
      - `mcp__claude_ai_Figma__get_design_context` (fileKey + nodeId) for the canonical layout / paddings / widths.
      - `mcp__claude_ai_Figma__get_screenshot` to get the canonical Figma rendering.
      - `mcp__claude_ai_Figma__get_variable_defs` for token names (don't paste hex; use the variable name).
      - **Diff the rendered screenshot from step 2b against the Figma screenshot.** Side-by-side.
      - **Spacing values are the most reliable axis** of the Figma snapshot — paddings, gaps, widths, sticky behavior. These are blocking when they diverge from Figma.
      - **Color and typography are LESS reliable** in the Figma snapshot — also cross-check those code-side against `tailwind-theme.css` and the Horizon typography scale (`textStyle` tokens). Trust the code-side token check over a Figma color delta when they conflict; raise both for review.
   g. **Sticky-header/ScrollArea/sticky-footer pattern check** — for any Dialog/Drawer story whose name implies scrolling content (`LongScrolling*`, `WithFooter*`, `WithHeader*`), three checks are MANDATORY (a "looks OK at rest" verdict is not enough — long-scrolling regressions only surface mid-scroll):

      **Check g.1 — DOM enumeration BEFORE scroll:**
      - Use Chrome DevTools MCP `mcp__Chrome-DevTools__evaluate_script` to query `document.querySelectorAll('[role="dialog"] [data-pcln-action-footer], [role="dialog"] [class*="action-footer"]').length`. Result MUST be `1`. `0` = no footer chrome (R5/R17). `2+` = belt-and-suspenders anti-pattern (R17).
      - Query `document.querySelectorAll('[role="dialog"] [data-scroll-area]').length` MUST be `1` for stories with growable content.
      - Capture the popup's outer bounding rect and the inner ScrollArea bounding rect. The ScrollArea's bottom MUST be ≤ popup's bottom (no overflow).

      **Check g.2 — scroll INSIDE the popup, mid-scroll screenshot:**
      - Identify the scroll container: `const sa = document.querySelector('[role="dialog"] [data-scroll-area]')`. Set `sa.scrollTop = sa.scrollHeight / 2`. Wait one animation frame.
      - Take a fresh screenshot via the screenshot script or Chrome DevTools `take_screenshot` tool.
      - Verify in the mid-scroll screenshot: PopupHeader pinned at top of popup, ActionFooter pinned at bottom of popup, body content scrolled. If the entire popup scrolled instead, popup variant is missing `flex flex-col` + bounded `max-height` → `[BLOCKING]`.
      - Verify content does NOT escape the popup's bottom edge (no body content visible below the sticky footer line). If it does → `[BLOCKING]` (R17 escape).

      **Check g.3 — count ActionFooters AGAIN after scroll:**
      - Same `querySelectorAll` count. Same expected value of `1`. Repeat catches stories that conditionally render a footer only after scroll triggers a class change.

      Failing any of g.1 / g.2 / g.3 is `[BLOCKING]`. A story that passes static rendering but fails scroll-state inspection is exactly the regression the verifier exists to catch — never skip g.2.
   h. **A11y panel inspection (R1)** — capture violations for each story. Three paths in order of preference; use the first one that works:

      **Path 1** — Local Storybook MCP `run-story-tests` with `withA11y: true`. **Known infra issue:** this tool times out 100% of the time as of 2026-05-08; do NOT block on it. If you get a timeout, fall through to Path 2.

      **Path 2** — Chrome DevTools MCP (`mcp__Chrome-DevTools__evaluate_script`) runs axe-core directly via injected script in the iframe. After story load:
      ```js
      // In the story iframe via mcp__Chrome-DevTools__evaluate_script
      // axe-core ships with @storybook/addon-a11y; query the panel state
      const panel = document.querySelector('#storybook-panel-root')
      // Or run axe directly in the iframe:
      const axeResults = await window.axe?.run?.()
      JSON.stringify({
        violations: axeResults?.violations?.map(v => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        })),
      })
      ```
      Capture `axeResults.violations` per story.

      **Path 3** — Read the Storybook a11y panel DOM after navigating to the story with `&panel=storybook/a11y/panel`. Query the violation list elements and extract rule IDs + counts.

      Every non-contrast violation is blocking. The single allowed exception is color-contrast where ratio is >4 but <4.5 (AA). Silenced rules in `parameters.a11y.config.rules` are themselves a finding unless the user has explicitly approved them. If all three paths fail, return `[a11y-unverifiable]` for that story rather than reporting a false-pass.
   i. **Mobile twin check (R2)** — if the component cares about viewport size (container queries, media queries, `useShouldUseDrawer`, etc.), every desktop story must have a mobile twin (iPhone 12 / `mobile1` viewport, or `w-[390px]` decorator). Every desktop snapshot must have a mobile snapshot. Missing twins on viewport-aware components is blocking.
   j. **`defaultOpen` vs `open` scan (R3)** — scan story source for `<Dialog.Root open>`, `<Drawer.Root open>`, `<Popover.Root open>`, `<AlertDialog.Root open>`. Bare `open` on a default-open story without an `onOpenChange` setter makes the close button a no-op — flag as `[defaultOpen-required]` and (in polish/polish-deep) replace with `defaultOpen`.
   k. **Scrim default scan (R4)** — Drawer/Popover stories must default to no scrim (omit `Drawer.Backdrop`/`Popover.Backdrop`). Stories with a scrim must have an opt-in name signal (`WithScrim`, `ScrimVariant`, etc.). Bare default with scrim = `[scrim-default-violation]`.
   l. **Description placement check (R5)** — Dialog/Drawer/AlertDialog Description must be the first child of the ScrollArea body, NOT inside `PopupHeader`. Hand-rolled descriptions inside the header are a `[description-placement]` blocking finding.
   m. **Header padding + close button styling (R6)** — `PopupHeader` container has uniform `p-2` (8px). Close button is top-aligned (not centered against full header), primary palette, emphasis bold, with shadow. Asymmetric padding or center-aligned close = blocking.
   n. **Popup `overflow-hidden` (R7)** — `Dialog.Popup` / `Drawer.Popup` / `AlertDialog.Popup` rounded container must include `overflow-hidden`. Without it, header/footer backgrounds bleed past the rounded corners and the popup looks square. Visual signal: header/footer have square outer corners while body has rounded ones. Component-source fix.
   o. **TSDoc on source vs argTypes description (R9)** — read story source. Any `argTypes.<prop>.description: '...'` body that contains prop semantics belongs as a TSDoc comment on the source props interface instead. Flag as `[tsdoc-required]`.
   p. **Base UI prop API mirror (R10)** — for components wrapping a Base UI primitive, diff the Horizon prop signature against `.claude/skills/base-ui/references/components/<component>.md`. Narrowing (e.g. `boolean | 'trap-focus'` → `boolean`), omitting, or renaming a pass-through prop is blocking.
   q. **testFixtures protocol (R12)** — story `args` and `.spec.tsx` test inputs should both import from `<Component>.testFixtures.tsx`. Inline mock data in stories or specs that duplicates fixture content is a `[testfixtures-bypass]` finding.
   r. **No height-fill in adaptive demos (R16)** — for grid/flex stories that compare multiple modes side-by-side, two scopes:

      **r.1 — Wrapper scope:** verify the wrapper does not stretch to `h-[NNNNpx]` / `min-h-screen` / `items-stretch`. Use `items-start` (or `place-items-start`) and content-sized cells.

      **r.2 — Per-cell scope (often missed):** CSS Grid's default is `align-items: stretch` — even with `items-start` on the parent, individual cells inherit container height when the row's tallest sibling stretches the row. Use Chrome DevTools `mcp__Chrome-DevTools__evaluate_script` to measure each cell:
      ```js
      const cells = document.querySelectorAll('#storybook-root > * > * > *')
      Array.from(cells).map(c => ({
        rendered: c.getBoundingClientRect().height,
        intrinsic: c.scrollHeight,
      }))
      ```
      If `rendered > intrinsic + 8px` (8px tolerance for shadows/margins), the cell is height-filling. Recommend `place-items-start` on the wrapper and/or `self-start` on the cell. Empty space below visible content is misleading and is `[BLOCKING]` for adaptive comparison stories.

   s. **Trigger fits viewport (G3 / R-Trigger)** — for any story whose primary visual is an overlay opened from a trigger button (Playground stories with the trigger visible), the trigger element must fit within `100vh` of the rendered viewport. Measure:
      ```js
      const trig = document.querySelector('[data-pcln-trigger], button[aria-haspopup]')
      const r = trig?.getBoundingClientRect()
      ;({ top: r?.top, bottom: r?.bottom, vh: window.innerHeight })
      ```
      If `bottom > vh` or `top < 0` the trigger is offscreen. Likely cause: a story decorator centering with `min-h-dvh` while content also has its own min-height. Flag as `[trigger-offscreen]`.

   t. **Per-size footer-position scan (G4 / R7+R17 boundary)** — for size-variant stories (Sizes/sm, /md, /lg, /full), capture each size's ActionFooter `getBoundingClientRect()` after scrolling the body. The footer's `bottom` MUST equal the popup's `bottom` to within 1px. A footer with `bottom < popup.bottom` is floating mid-frame — typically a Dialog `full` size with the popup variant missing `flex flex-col` or the footer missing `mt-auto`/`sticky bottom-0`. Component-source territory; flag `[component-fix-required]`.
3. **Adaptive components** — components that branch internally on `useShouldUseDrawer()` (Dialog) or any `matchMedia` cannot be reliably rendered for both modes in JSDOM. Stories that demonstrate adaptive behavior typically use a static side-by-side decorator. That is INTENTIONAL, not a bug. **However**, the story description MUST explain the staticness AND the rendered side-by-side must clearly show two distinct visual modes — if both panels look identical, the decorator is broken.
4. **Story-concept sanity** — flag stories whose names imply patterns that don't belong in the component:
   - `DestructiveFooter` on `Dialog` → destructive flows belong to AlertDialog (non-dismissible). Flag for removal/relocation.
   - Any non-AlertDialog story modeling "are you sure / cannot be undone" copy → same flag.
   - Any Dialog/Drawer story with no header/footer composition that ISN'T explicitly demonstrating a custom-content fixture or a minimal-API reference → flag. The default story template is "PopupHeader + ScrollArea + ActionFooter". Bare is the EXCEPTION, not the rule.
5. **Mode-specific output:**
   - `verify`: return JSON per story + ≤200-word markdown summary. NO edits.
   - `polish`: apply token / padding / width / ScrollArea / PopupHeader / ActionFooter fixes within story-file scope. After each edit re-render and re-screenshot. Flag anything requiring out-of-scope changes (variants, hooks, specs) as `[component-fix-required]`.
   - `polish-deep`: same as `polish` PLUS authority to modify component source (variants, subparts) when a layout bug is at the component level. Examples: PopupHeader rendering Title+Description in a row when column was intended; ActionFooter missing sticky chrome; Dialog.Popup missing flex-col bounded-height. After ANY component edit, run the full `rushx test` + `rushx lint` + `rushx build` triad and confirm no regressions before the next story.

Per-story result schema (verify mode):
{
  "storyId": "...",
  "status": "pass" | "fail" | "mcp-unavailable" | "component-fix-required",
  "screenshot": "<path or url>",
  "renderedScreenshot": "<path>",
  "figmaScreenshot": "<path>",
  "tokenMismatches": [
    { "type": "color" | "spacing" | "typography" | "layout", "expected": "...", "actual": "...", "selector": "..." }
  ],
  "figmaFrameId": "<node-id or null>",
  "figmaDeltas": ["text description of layout deltas"],
  "compositionUsesHorizonText": true | false,
  "stickyPatternCorrect": true | false | "n/a",
  "storyConceptIssues": ["text description of any concept-level issue"]
}

Hard rules:
- `verify` mode: read-only. No Edit, no Write.
- `polish` mode: story files only (`*.stories.tsx`). Component source / variants / hooks / specs are out of bounds. Flag component-level bugs explicitly with `[component-fix-required]` so the parent dispatches a `polish-deep` follow-up.
- `polish-deep` mode: full source modification authority, but every component-source edit MUST be followed by full-suite test + lint + build verification before the next story.
- Cap markdown summary at 300 words.
- All modes: if Storybook MCP AND Chrome DevTools MCP are both unavailable, return `mcp-unavailable` and stop. Source-review-only is INSUFFICIENT for visual verification.
- **Output paths must be worktree-absolute** (R18). When the dispatch prompt names an output report path, use that exact absolute path. Do NOT compute paths relative to a hardcoded `/Users/<user>/github/<repo>/...` root — verifier runs in a git worktree and writes outside the worktree are blocked by the perm boundary. Confirm the resolved path begins with the worktree root before calling Write/Edit.
- **Single-threaded build/test (R13)** — Rush cache deadlock + parent MCP starvation. Concurrent verifier subagents in the same checkout WILL race on `dist/`. Always: `rush build --parallelism 1`, `jest --runInBand --max-workers=1`, `vitest --pool=threads --poolOptions.threads.singleThread`, `playwright --workers=1`. When in doubt, serialize.

Subagent execution discipline (mandatory):
- You run inside a shared checkout with the parent session and sibling subagents. ALL build/test commands MUST be single-threaded — concurrent workers deadlock the Rush build cache and starve the parent's MCP tooling.
  - `rush build` / `rush rebuild`: append `--parallelism 1`
  - `jest`: append `--runInBand --max-workers=1`
  - `vitest`: append `--pool=threads --poolOptions.threads.singleThread` (or `--no-file-parallelism`)
  - `playwright`: append `--workers=1`
- Skill-quality standards apply. If the host defines a skill-quality protocol (e.g. `~/.claude/skill-standards.md`), audit and log findings the same way the parent does. You do NOT inherit SessionStart hooks — load the protocol explicitly when invoking or editing a skill.
- Verbose-output discipline. Never paste full `rushx build` / `rushx test` / `rushx lint` logs into your context. Capture pass/fail counts, lines matching `error|FAIL`, last 3–5 lines only.
````

## Known infra issues

- **`run-story-tests` MCP times out 100% in current versions** (observed 2026-05-07 across all batch sizes, a11y on/off). Subagent MUST NOT block on it. The fallback is source-review of the story's play function — `userEvent` assertions in the source are sufficient for confidence; runtime confirmation via the test runner is a separate infra ticket.
- **Storybook MCP cache after mass deletes** — the MCP can hold stale story IDs after a `git rm` of components (e.g. Phase-5-style legacy removal). User restart of the Storybook MCP server is required before a clean verification pass.

## Master-baseline-via-detached-worktree recipe (Chromatic-auth-gated consumers)

When a downstream consumer's Chromatic project is auth-gated (i.e. you can't fetch its published baseline via the Chromatic MCP), you still need a "before" baseline against `master` to diff the post-migration "after" against. The canonical recipe — established 2026-05-08 for `@pcln/horizon-penny-components` `PennyDialogDrawer` — is to spin up a detached git worktree at the master commit, run that consumer's Storybook from there, capture screenshots + DOM metrics, then return to the feature-branch worktree to capture the after-state on the same story IDs.

**When to use this recipe:**
- The consumer's Chromatic project is auth-gated (Chromatic MCP returns 401/403 or empty story manifests).
- You need master-state baseline DOM metrics (positioning, z-index, ScrollArea overflow) — not just screenshots — because the migration intentionally changes some metrics (e.g. footer `position: fixed` → sticky inside Popup) and you need to verify only the unintended ones held.
- The current-branch verification flow (Local MCP against the feature branch's Storybook) cannot answer the "what did this look like before?" question.

**Procedure:**

```bash
# From the feature-branch worktree root (e.g. .claude/worktrees/overlay-refactor)
# 1. Cut a detached worktree at master:
git worktree add /tmp/<consumer>-master-baseline master

# 2. Run rush install in that worktree if needed:
cd /tmp/<consumer>-master-baseline
rush install --to <consumer-package>

# 3. Start the consumer's Storybook on its registered port:
cd <consumer-package-path>
rushx storybook  # background

# 4. From the parent session (NOT the detached worktree), capture screenshots
#    via the bundled Playwright script or Chrome DevTools MCP, hitting the
#    consumer's port (e.g. 6405 for horizon-penny-components):
python3 .agents/skills/horizon-standard/scripts/storybook-screenshot.py \
  --story <story-id> \
  --base-url http://localhost:6405 \
  --out-dir .pcln-ai-output/horizon-overlay-migration/screenshots/<consumer>-baseline-<YYYY-MM-DD>

# 5. Run the DOM-metric extraction `evaluate_script` on each story
#    (Chrome DevTools MCP) — capture popup `getBoundingClientRect`, backdrop
#    `z-index`, footer `position`, ScrollArea `scrollHeight`, etc. Persist
#    these in a `manifest.md` in the screenshots directory so the after-state
#    diff has structured comparison points.

# 6. Stop the master Storybook (kill the rushx storybook process).

# 7. Switch to the feature branch's Storybook (same port works after stop+start
#    in the feature worktree). Re-capture the same story IDs and DOM metrics.

# 8. Diff the metrics — split the result into:
#    - MUST-MATCH (unintended changes are regressions): preserved z-index
#      contracts, custom-header presence, accessible labels, footer chrome
#      visibility.
#    - MUST-CHANGE (intentional migration outcomes): old `position: fixed`
#      footer → sticky inside popup; chat-message scroll bound by ScrollArea
#      instead of the page.
#    Document both in the manifest at the screenshots directory.

# 9. Clean up:
git worktree remove /tmp/<consumer>-master-baseline
```

**Why detached worktree (vs branch checkout):** The feature-branch worktree may have unstaged work and a Storybook running on the same port. Detached worktree at master keeps both checkouts side-by-side without swapping branches. Cleanup is one command.

**Reference baseline:** `.pcln-ai-output/horizon-overlay-migration/screenshots/penny-dialog-drawer-baseline-2026-05-08/manifest.md` — the canonical worked example (PennyDialogDrawer, two stories, full DOM-metric capture + must-match / must-change split).

**Federated-MCP roadmap:** when the federated Storybook MCP arrives (covers all consumer Storybooks at once), this recipe simplifies to "run `mcp list-all-documentation` against master via the federated MCP" — the worktree dance becomes unnecessary. Until then, this is the canonical recipe for auth-gated consumer baselines.

## Adaptive-component caveat (Dialog, future hooks-driven primitives)

Components that read `(pointer: coarse)` via `matchMedia` inside `useSyncExternalStore` cannot have both rendering modes verified live in JSDOM. The convention is:

- A `Playground` story (single mode, no decorator) — represents whatever pointer the test runner reports, typically `fine`.
- An `AdaptiveDemo` story with a decorator that statically renders BOTH modes side-by-side, with a `parameters.docs.description.story` note clarifying the staticness.

Both are correct. Do not flag the `AdaptiveDemo` static rendering as a regression.

## Token manifest

Canonical: `design-system/horizon/src/tailwind-theme.css` — exported by `@pcln/horizon` consumers. The verifier MUST cross-check against this file (not against generic Tailwind). Default-palette utilities are invalid in horizon-class projects.

## Dispatch invariants

- Tool surface (REQUIRED): Storybook MCP (`list-all-documentation`, `get-documentation`, `get-documentation-for-story`, `preview-stories`), **Chrome DevTools MCP / claude-in-chrome** (mandatory for actual rendered-screenshot inspection — `preview-stories` URL alone misses truncation, missing chrome, broken layouts), Figma MCP (`get_design_context`, `get_variable_defs`, `get_screenshot`), Read.
- `verify` mode: read-only.
- `polish` mode: `*.stories.tsx` only. NEVER component source / variants / specs. Flag component-level layout bugs as `[component-fix-required]` and let the parent escalate to `polish-deep`.
- `polish-deep` mode: full source modification authority. Required when stories alone can't fix the rendering (e.g. PopupHeader rendering Title+Description in a row instead of a column; ActionFooter missing sticky chrome; Dialog.Popup missing flex-col bounded-height pattern). After any component edit, run `rushx test` + `rushx lint` + `rushx build` and confirm no regressions before the next story.
- Output capped — verbose MCP output stays in subagent context.
- Time budget: 10–15 min for a single component verify pass; 30–45 min for a polish pass across 5+ components; 60+ min for polish-deep with component-source changes.

## Verbose-output discipline

Subagents handle verbose tool output less gracefully than the parent session. The verifier MUST NOT pipe raw `rushx build` / `rushx test` / `rushx lint` output into its own context. Capture only summary lines (final pass/fail count, the lines containing "error" or "FAIL", the last 3–5 lines of the run). Use whatever bulk-output / sandboxed-execution tooling the host provides for this; if none is allowlisted, prefer Bash with output filtered through `tail` / `grep`. Treat verbose tool output as something to *summarize before reading*, not paste into context.

## Horizon component coverage — strictness

Every story under verification MUST be implemented using the canonical Horizon primitives. Plain HTML for content-bearing elements is a **`[REGRESSION]`** finding. The verifier MUST scan story source AND rendered DOM (via Chrome DevTools MCP) for:

| Concern | Plain HTML (forbidden in stories) | Horizon primitive (required) |
|---|---|---|
| Headings | `<h1>` / `<h2>` / `<h3>` / `<h4>` | `<Heading as='h1' textStyle='heading1' />` etc. |
| Body copy | `<p>` | `<P palette='neutral' shade='10' textStyle='body3' />` |
| Inline text | `<span>` | `<Span textStyle='...' />` |
| Captions / fine print | `<small>` / `<p>` with small | `<Caption />` |
| Buttons | `<button>` | `<Button>` / `<IconButton>` |
| Linked anchors | `<a>` | Horizon link primitives if available |
| Cards / surfaces | `<div className='shadow rounded'>` | `<Card>` / `<Module>` |
| Scrollable bodies | `<div className='overflow-y-auto'>` | `<ScrollArea dialogBody />` / `<ScrollArea drawerBody />` |
| Layout spacing | inline `style={{}}` | tv() variants + Horizon utilities |

Exceptions ONLY for genuinely-content-semantic non-decorative tags (`<section>` / `<article>` when the meaning matters), or for layout containers (`<div>`) that wrap Horizon children.

Cross-reference against `@pcln/horizon`'s exported component inventory. If a story uses a primitive that has a Horizon equivalent, flag it.

### Overlay-specific strictness (Dialog / Drawer / Popover / AlertDialog / Modal)

Authoritative source: `rules/testing/storybook-conventions.md` § "Layout Components in Stories" + § "ScrollArea for Growable Content". Authoritative for component source: `rules/authoring/styling-and-variants.md` § "Z-Index Discipline".

The verifier MUST flag the following on overlay stories AND component source:

| Concern | Forbidden | Required | Finding |
|---|---|---|---|
| Header chrome in stories | hand-rolled `<div>` with title + close button | `PopupHeader` (with `.Title` / `.Description` / `.Close` subparts) | `[layout-primitive-required]` |
| Footer chrome in stories | hand-rolled `<div>` row of buttons | `ActionFooter` | `[layout-primitive-required]` |
| Header + body + footer composition | three sibling `<div>`s in a flex column | `PopupLayout` | `[layout-primitive-required]` |
| Growable content scroll | `overflow-y-auto`, `overflow-auto`, hand-rolled scroll containers | `ScrollArea` (with `dialogBody` / `drawerBody` slot) | `[scrollarea-required]` |
| Z-index on overlay primitives | ad-hoc `z-10` / `z-50` / `z-[…]` on Dialog/Drawer/Popover/Tooltip/Menu/AlertDialog or their slots | let Base UI manage stacking; if a real conflict exists, add a one-line comment explaining the conflict and the chosen value | `[z-index-smell]` |

Exception for layout primitives: a story explicitly demoing a custom header/footer/scroll pattern may opt out, and the story name MUST indicate that (e.g. `CustomHeaderDemo`, `WithoutPopupHeader`, `CustomScrollContainer`). The verifier checks the story name; if no opt-out signal in the name, hand-rolled chrome is `[layout-primitive-required]`.

## Interaction-test opportunity scanning

Every overlay component story has natural interaction moments worth testing. The verifier MUST scan each story for opportunities and flag stories that *should* have a play function but don't. Don't waste play functions on trivial demos — but DO test actual functional behavior.

### When to recommend an interaction test

Recommend a play function on a story when ALL of:
1. The story renders functional behavior (open/close, focus management, hover, keyboard nav, drag, etc.) — not pure visual variants.
2. The behavior is non-obvious from the structural composition alone (e.g. focus trap, escape inertness, hover delay).
3. The story is not already an established `Snapshot` / `Playground` (those have other purposes).

### Per-component opportunity catalog

| Component | Natural interaction tests | Skip when |
|---|---|---|
| `Dialog` | Trigger opens; Escape closes; backdrop click closes; Tab cycles within Popup; Close button focuses Trigger on dismissal; adaptive mode switch | Pure visual size variants |
| `Drawer` | Trigger opens; Handle drag-down dismisses (jsdom-limited; document); Escape closes; focus trap; snap-point assertion (drag from 0.5 → 1.0) | Standalone variant rendering |
| `Popover` | Trigger opens; click-outside closes; Escape closes; Tab cycle; with `openOnHover` — hover triggers, leave-after-delay closes | Pure positioning variants |
| `AlertDialog` | Trigger opens; Escape inertness asserted; backdrop-click inertness asserted; Cancel closes; Confirm closes (or fires action) | (always test) |
| `Tooltip` | Hover triggers (with delay); focus triggers; leave-after-delay closes; Escape closes; click anywhere closes | Tooltips that demo only positioning |
| `ActionFooter` | Buttons fire onClick handlers; primary/secondary tab order; sticky-bottom assertion when scrolled | Pure visual composition |
| `PopupHeader` | Close button fires onClose; sticky-top assertion when scrolled; Title overflow → line-clamp behavior | Pure visual composition |

### Verifier output for interaction-test opportunities

When the verifier identifies a story that *should* have a play function but doesn't, add to per-story result:
```json
{
  "interactionTestOpportunities": [
    { "behavior": "string description", "suggestedAssertion": "userEvent.click + expect popup visible" }
  ]
}
```

In `polish` / `polish-deep` modes, the verifier MAY add the play function if the assertion is trivially derivable from the existing render. For complex play functions (multi-step flows, snapshot capture mid-interaction), flag in the audit and let the parent decide.

`horizon-standard` integration: this scan is also a hint for the `audit` mode. A component whose stories are all visual with NO interaction tests is missing functional coverage — flag in the audit report.

## Patterns the verifier MUST flag — Chromatic test-runner failures (canonicalized from DX-1074 build 3733)

The Chromatic test runner runs play functions in a real browser AND scans accessibility. These patterns produced concrete failures that local Storybook missed; the verifier MUST flag them up-front:

> **rg availability note:** All `rg` commands below have `grep -R` equivalents for sandboxed subshells where ripgrep is not on PATH. Example: `rg -nE "pattern" path/` → `grep -RnE "pattern" path/`. `grep` is universally available; prefer it in `ctx_execute` shell contexts.

### CT-1 — Snapshot story with multiple `<Component.Root defaultOpen>` for overlay primitives

**Symptom:** "Component error" on Snapshot in Chromatic; locally the story renders but Chromatic test runner crashes during capture.

**Cause:** Each `<Dialog.Root defaultOpen>` / `<AlertDialog.Root defaultOpen>` / `<Popover.Root defaultOpen>` / `<Tooltip defaultOpen>` mounts a Portal. Multiple portals stack on `document.body`; only the last is visible. The `extractArgTypeCombinations` × `SnapshotPanelLayout` pattern multiplies the problem (cartesian product blew the test-runner budget).

**Fix:** static-panel pattern — render presentational `<div>` panels mimicking the popup chrome (rounded background + Title heading + body + ActionFooter shape). NO `Component.Root` / NO `Component.Portal`. Reference impls: `Dialog.stories.tsx` (`SnapshotPanel`), `AlertDialog.stories.tsx` (`AlertSnapshotPanel`), `Popover.stories.tsx` (`PopoverSnapshotPanel`), `Tooltip.stories.tsx` (`TooltipSnapshotPanel`).

**Detection regex:**
```
rg -nE "<(Dialog|Drawer|Popover|AlertDialog|Tooltip)\\.Root[^>]*defaultOpen|<(Tooltip)[^>]*defaultOpen" \
  --glob "*.stories.tsx" design-system/horizon/src/components/
# ALL matches in the same `Snapshot` story body = blocking
```

### CT-2 — Interaction `play` function using `within(canvasElement)` to find portaled content

**Symptom:** "Failed test" on InteractionTest in Chromatic; `findByRole('dialog' | 'alertdialog')` returns null because the dialog is in a portal at `document.body`, OUTSIDE the story's `canvasElement`.

**Cause:** `canvasElement` is the `#storybook-root` mount node. `Dialog.Portal` / `AlertDialog.Portal` / `Popover.Portal` render to `document.body`. Queries via `within(canvasElement)` cannot reach them.

**Fix:** use `within(document.body)` or import `screen` and use `screen.findByRole(...)` for portaled assertions. Triggers stay inside the canvas; popup/portal content needs the wider query root.

**Reference impl:** `AlertDialog.stories.tsx` `InteractionTest` (post-fix in DX-1074):
```tsx
const canvas = within(canvasElement)
const portal = within(document.body)

const trigger = canvas.getByTestId('alert-trigger')
await userEvent.click(trigger)
const dialog = await portal.findByRole('alertdialog')
```

**Detection regex:**
```
rg -nE "canvas\\.findByRole\\(['\"](dialog|alertdialog|menu|listbox|tooltip)['\"]\\)" \
  --glob "*.stories.tsx"
```

### CT-3 — Synchronous query on async-validating input

**Symptom:** "Failed test" on Interaction stories that exercise validation; `getByText('task_alt')` (success icon) or `getByRole('alert')` (error message) fails right after `userEvent.tab()` / `userEvent.blur()`.

**Cause:** `validate()` callbacks may run via a microtask, debounce, or React commit boundary. `getByText` is synchronous and may fire before the validation icon mounts. Locally the test happens to pass (timing); Chromatic's test runner is stricter.

**Fix:** use `findBy*` (async, polls) for any DOM that appears AFTER an async event:
```tsx
// Before
await userEvent.tab()
await expect(canvas.getByText('task_alt')).toBeInTheDocument()
// After
await userEvent.tab()
await expect(await canvas.findByText('task_alt')).toBeInTheDocument()
```

**Detection heuristic:** any `play` function where a `getBy*` query immediately follows `userEvent.tab()` / `userEvent.blur()` / `userEvent.click()` AND the element being queried is conditional on an effect/validation.

### CT-5 — `dialog-name` violation: Popup using `PopupHeader.Title` without overlay-Title binding

**Symptom:** axe-core flags `dialog-name` on every Storybook story for an overlay (Dialog, Drawer, AlertDialog, Popover) whose Popup contains `<PopupHeader.Title>` but NOT the host overlay's compound `Title`.

**Cause:** Base UI's `Dialog.Popup` / `Drawer.Popup` / `AlertDialog.Popup` / `Popover.Popup` derives `aria-labelledby` automatically from a `Dialog.Title` / `Drawer.Title` / etc. child. `PopupHeader.Title` by default is just a `<Heading as='h2'>` — it carries no overlay-context id, so the popup's `aria-labelledby` is empty and axe-core's `dialog-name` rule fires for every story.

**Fix:** pass the host overlay's compound Title primitive to `PopupHeader.Title` via the `asTitle` prop. `PopupHeader.Title` then wraps the heading inside the compound Title's `render` slot, which Base UI uses to set `aria-labelledby` on its Popup.

```tsx
// Before
<Dialog.Popup>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title>Settings</PopupHeader.Title>
    </PopupHeader.Content>
    <PopupHeader.Close aria-label='Close dialog' />
  </PopupHeader.Root>
</Dialog.Popup>

// After
<Dialog.Popup>
  <PopupHeader.Root>
    <PopupHeader.Content>
      <PopupHeader.Title asTitle={Dialog.Title}>Settings</PopupHeader.Title>
    </PopupHeader.Content>
    <PopupHeader.Close aria-label='Close dialog' />
  </PopupHeader.Root>
</Dialog.Popup>
```

**asTitle mapping:**
- inside `<Dialog.Popup>` → `asTitle={Dialog.Title}`
- inside `<Drawer.Popup>` → `asTitle={Drawer.Title}`
- inside `<AlertDialog.Popup>` → `asTitle={AlertDialog.Title}` *(AlertDialog stories already use AlertDialog.Title as a direct child rather than PopupHeader.Title — same end-effect)*
- inside `<Popover.Popup>` → `asTitle={Popover.Title}`

For consumer wrappers with bespoke headers (R6 documented exception — e.g. `PennyDialogDrawer` with `PennyDialogHeader`), include a sr-only `<Dialog.Title render={<span className='sr-only' />}>{titleText}</Dialog.Title>` as a sibling to the bespoke header so `aria-labelledby` resolves.

**Detection regex:**
```
rg -nE "<PopupHeader\\.Title>(?!.*asTitle)" --glob "*.tsx" \
  --glob "!*.spec.tsx" --glob "!*.test.tsx" \
  -- design-system react-components react-apps
```

**Reference impl:** `design-system/horizon/src/components/PopupHeader/PopupHeader.Title.tsx` (post-DX-1074 — accepts `asTitle` prop with documented usage).

---

### CT-6 — `PopupHeader.Close` rendered in flex flow instead of absolute

**Symptom:** Close button visually drifts when header content height changes (multi-line title, image header, sticky scroll). With `items-start` flex flow it locks to the top-left of its row; with `items-center` it sinks; in either case it follows content reflow rather than staying anchored to the popup's top-right corner.

**Why it's wrong:** Wes/Ben spec — the close button must always sit at `top-3 right-3` of the popup container so an image header (background image, gradient, decorative content) can fill the header without the close interfering, and so the close stays in the same screen position regardless of header content. Anchoring to the popup top-right also keeps the close visible during sticky-scroll without the header's flex flow re-laying it out.

**Detection:**
```bash
rg -nE "closeButton: ['\"]self-(start|center|end)['\"]" \
   design-system/horizon/src/components/PopupHeader/PopupHeader.variants.ts
```
Any `self-*` value in the `closeButton` slot is a regression. The expected value is `'absolute top-3 right-3 z-[4]'` (or equivalent absolute-positioned class).

**Fix:** make `PopupHeader.Root` `relative`, render `PopupHeader.Close` with `absolute top-3 right-3 z-[4]`, set `pr-15` (60px) on Root to leave room for the absolute Close. When a future image-header variant is added, drop the right padding so the image fills the header width.

**Reference impl:** `design-system/horizon/src/components/PopupHeader/PopupHeader.variants.ts` (post-DX-1074 design feedback round).

---

### CT-7 — Default-story Popover renders `<Popover.Arrow />`

**Symptom:** `Popover` stories beyond `Playground` and `WithArrow` render `<Popover.Arrow />` by default. Designer feedback (Ben, 2026-05-08): "Should not have arrow/pointer anymore" — arrow becomes opt-in, not default.

**Why it's wrong:** an arrow on every popover signals every popover is anchored-to-trigger. Many popover compositions (filter panels, dialog-shaped popovers, drawer-mode) don't need the arrow indicator; rendering it by default makes the component feel cramped and inconsistent with Figma.

**Detection:**
```bash
rg -nE "<Popover\\.Arrow" design-system/horizon/src/components/Popover/Popover.stories.tsx \
   | grep -vE "Playground|WithArrow"
```
Any match outside `Playground` or `WithArrow` is a regression.

**Fix:** remove `<Popover.Arrow />` from non-Playground / non-WithArrow stories. Do NOT deprecate the `Popover.Arrow` subpart — it remains a Base UI structural primitive available to consumers who explicitly want an arrow. Stories simply opt out by default.

**Reference impl:** `design-system/horizon/src/components/Popover/Popover.stories.tsx` (post-DX-1074 design feedback round).

---

### CT-8 — Adaptive Popover-as-Drawer renders a Backdrop / scrim

**Symptom:** when `Popover` renders adaptively as a Drawer (touch + viewport `<md`), a story renders `<Popover.Backdrop />`, dimming the page behind the drawer.

**Why it's wrong:** non-modality is the **key differentiator** between Popover and Dialog. Popover (in any mode — anchored or drawer) keeps the background interactive. Dialog (in either mode) blocks the background with a scrim. Rendering a Backdrop in Popover-drawer mode collapses that distinction and breaks the design contract.

**Detection:**
```bash
rg -nE "<Popover\\.Backdrop" design-system/horizon/src/components/Popover/Popover.stories.tsx
```
Any match is a regression unless the story is explicitly demoing modal Popover behavior with a documented rationale.

**Fix:** remove `<Popover.Backdrop />` from drawer-mode stories (`TouchDrawer`, `AdaptiveDemo`, etc.). Replace with a comment noting the non-modal contract: `{/* No Backdrop — Popover-as-Drawer is non-modal by design. */}`.

**Source-of-truth reminder:** Storybook MCP is the source of truth for horizon implementation at Priceline. If a verifier dispatch reads a story file and finds a `<Popover.Backdrop />` in drawer mode, that is a blocking finding — the story is wrong, not the contract.

---

### CT-9 — Body padding hardcoded in story wrapper instead of encoded in component

**Symptom:** Story renders `<ScrollArea dialogBody|popoverBody|drawerBody>` with an inner `<div className='p-6'>` (or similar) wrapping the body content. The padding is the consumer's responsibility, story-by-story.

**Why it's wrong:** design feedback (Ben, 2026-05-08): "Design's feedback is generally about the design system, not specific stories." Body padding (16px) is a design-system decision and must live on the `ScrollArea` `*Body` variants — encoded once, inherited by all consumers. Per-story wrappers leak padding decisions outside the design system and let consumers diverge.

**Detection:**
```bash
rg -nE "<ScrollArea.*Body" -A 3 \
   design-system/horizon/src/components/{Dialog,Drawer,Popover}/*.stories.tsx \
   | rg -E "p-[0-9]|px-[0-9]|py-[0-9]"
```
Any inner-padding wrapper inside `ScrollArea` `*Body` is a regression — the encoded `p-4` already lives on the ScrollArea `content` slot.

**Fix:** remove the wrapper padding (`<div className='flex flex-col gap-4'>` keeps gap; padding is gone). Verify `ScrollArea.variants.ts` `dialogBody`/`popoverBody`/`drawerBody` content slot is `'gap-0 bg-transparent p-4'`.

**Reference impl:** `design-system/horizon/src/components/ScrollArea/ScrollArea.variants.ts` (post-DX-1074 design feedback round).

---

### CT-4 — Snapshot story missing the snapshot policy

**Symptom:** New component lands without a `Snapshot` story; Chromatic catches NO regressions on its visual variants.

**Policy (from `rules/testing/storybook-conventions.md` § Required Stories):**
- **Non-overlay components** MUST ship a `Snapshot` story consolidating every visually distinct variant. `tags: ['!autodocs']` + `parameters: { chromatic: { disableSnapshot: false } }`.
- **Overlay components** (Dialog, Drawer, Popover, AlertDialog, Tooltip, Modal) MUST use the **static-panel** pattern (CT-1 fix) — full presentational chrome without `Component.Root`. Skipping Snapshot entirely for overlays is the legacy fallback; static-panel is the v35 expectation.

**Verifier action:** for every new component story file, confirm a `Snapshot` export exists and matches the appropriate pattern. Missing Snapshot on a non-overlay = `[snapshot-required]` blocking finding.

---

## Patterns the verifier MUST flag (carryover from prior misses)

These are concrete patterns that prior verifier passes missed because they only confirmed URL resolution. If a verifier in the future does NOT call them out, the verifier reference itself needs another iteration:

1. **Title truncation** — PopupHeader Title with `truncate` class showing `…` when full text was provided. Indicates `flex-row` layout where `flex-col` was intended; or `flex-1 truncate` on title without a column wrapper for Title+Description.
2. **Description-next-to-title** — Description rendering as a flex sibling of Title in a row, instead of stacked beneath. Same root cause as #1.
3. **Floating buttons (no footer chrome)** — ActionFooter buttons rendered without a visible bar. `tone='frosted'` is invisible against an opaque popup background; the footer needs a top border, shadow, or non-frosted tone in those contexts.
4. **Body-scroll instead of content-scroll** — when the entire popup scrolls and the header/footer scroll with it. The canonical pattern is `Dialog.Popup` with `flex flex-col` + bounded `max-height`, sticky PopupHeader, ScrollArea body taking `flex-1 overflow-y-auto`, sticky ActionFooter.
5. **Plain HTML text in stories** — `<h2>`, `<p>`, `<div>` for body copy. Stories must use Horizon `Heading` / `P` / `Span` / `Caption` to model the right primitives for downstream consumers.
6. **Side drawer full-width** — when Figma shows a constrained-width side panel. Indicates story missing `size='sm'` / `size='md'` on the popup OR variant lacking the constraint.
7. **Story-concept mismatch** — `DestructiveFooter` on a non-AlertDialog overlay; "are you sure" copy outside AlertDialog; "Custom" stories that aren't actually custom; AdaptiveDemo where both panels render identically (decorator broken).
8. **Bare-without-rationale** — Dialog/Drawer story with no PopupHeader and no ActionFooter, where the story's purpose is not explicitly demonstrating a custom fixture or minimal-API reference. The default is canonical composition; bare requires a documented reason in `parameters.docs.description.story`.
9. **`open={true}` instead of `defaultOpen`** (R3) — close button, Escape, and backdrop become no-ops. Always `defaultOpen` for stories that present an open overlay at load.
10. **Drawer/Popover with default scrim** (R4) — should be opt-in only. Bare default story rendering `Drawer.Backdrop` / `Popover.Backdrop` without an opt-in name signal is wrong.
11. **Description shoved into PopupHeader** (R5) — should be first child of the ScrollArea body. Long descriptions break the header's row/column layout when forced into the header.
12. **Asymmetric or non-`p-2` header padding** (R6) — uniform `p-2` (8px) on `PopupHeader` is the contract.
13. **Center-aligned close button** (R6) — close button must be top-aligned; primary palette; emphasis bold; with shadow.
14. **Popup missing `overflow-hidden`** (R7) — corners look square because rounded chrome backgrounds bleed past the corner radius. Component-source fix on the Popup variant.
15. **Modal prop narrowed to boolean** (R10) — `Dialog.Root.modal` must be `boolean | 'trap-focus'` to mirror Base UI. Narrowing throws away the trap-focus-without-backdrop mode.
16. **Prop docs in `argTypes.<prop>.description`** (R9) — `react-docgen-typescript` does not read these. Move to TSDoc on the source props interface.
17. **Mobile twin missing for viewport-aware component** (R2) — every desktop story for a viewport-aware component must have a mobile twin. Every desktop snapshot must have a mobile snapshot.
18. **A11y panel violations** (R1) — non-contrast violations are blocking. Silenced rules without explicit user approval are themselves a finding.
19. **Adaptive/grid demo height-fill** (R16) — `h-[NNNNpx]` / `items-stretch` / `min-h-screen` on the wrapper produces empty space below content that misrepresents component size.
20. **Belt-and-suspenders footer** (R17) — long-scrolling story rendering both a floating CTA inside body content AND a sticky `ActionFooter` at the bottom. Exactly one footer.
21. **testFixtures bypassed** (R12) — story args or spec inputs duplicating shape that exists in `<Component>.testFixtures.tsx`. Import from the fixture.
22. **Playground without canonical chrome** (CT-6 prerequisite) — `Playground` (or `Default`) story for an overlay primitive renders bare `Component.Title` + `Component.Description` + `Component.Close` instead of the canonical `PopupHeader + ScrollArea + ActionFooter` composition. Designer feedback 2026-05-08: Playground is the FIRST story reviewers see; it should demo the canonical chrome by default. Bare-without-rationale exemption requires explicit story-name + `parameters.docs.description.story` opt-out (see `WithoutPopupHeaderDemo`).
23. **Story body padding hardcoded** (CT-9) — see CT-9 above. Padding belongs on `ScrollArea` `*Body` content slot, not story wrappers.

## Figma frame parity — mandatory pre-step (DX-1074 design-review additions)

Before any visual compare, the verifier MUST establish Figma-side source of truth for every component it touches. The previous verifier compared stories against local Horizon tokens (computed styles vs. `tailwind-theme.css`). This is insufficient — local tokens can drift from Figma. The 2026-05-10 design review caught 28 deviations in one PR because the verifier never opened the Figma frame.

### Required steps

1. **Resolve frame** — read `references/figma-frame-map.md` (sibling of this file). Each component entry has two fields: `nodeUrl` (fully-qualified figma.com URL) AND `frameName` (human-readable frame name). Use `nodeUrl` first.

2. **Fetch frame metadata** — call `mcp__claude_ai_Figma__get_metadata` with the resolved node URL. Capture:
   - Frame dimensions (width × height)
   - Background fills (color / image)
   - Auto-layout direction + spacing
   - Corner radius
   - Effects (shadows, blur)

3. **Fetch variable definitions** — call `mcp__claude_ai_Figma__get_variable_defs` for the same node. Capture every bound variable: `padding`, `gap`, `radius`, `size`, `color`, `shadow`. These are the canonical token values.

4. **Fallback by name** — if `get_metadata` returns "node not found" or an empty result, fall back to `mcp__claude_ai_Figma__search_design_system` with the `frameName`. Update `figma-frame-map.md` with the resolved URL and emit a `[figma-frame-map-stale]` finding so the map gets refreshed.

5. **Compare to code** — for each Figma variable + metadata value, compare to:
   - Computed style of the rendered story element (via Storybook MCP screenshot + DOM inspection)
   - Literal class string in `<Component>.variants.ts` (read with `Read` tool)
   - Token value in `tailwind-theme.css`

6. **Emit `[figma-token-mismatch]` findings** for every property whose Figma value differs from the code value. Include both values + the Figma frame reference in the finding.

### Failure modes this catches

- `pl-2` shipped while Figma specifies `pl-4` (FM-1)
- Popover `md` width 416px while Figma specifies 384px responsive (FM-1)
- Missing variant rows that are present as "Types" in Figma (FM-2 — see CT-11)
- Full-size variants dropping shared geometry (FM-8 — see CT-16)

This pre-step is BLOCKING. The verifier MUST NOT proceed to visual compare until the Figma frame is resolved or `[figma-frame-map-stale]` is emitted.

---

## Dual-state screenshot protocol (overlays)

For every story under `Components/Overlays/*`, capture **two** screenshots:

1. **Closed state** — overlay closed, trigger visible. Asserts:
   - Trigger renders inside the initial 1440×900 viewport (CT-13)
   - Trigger has visible palette (CT-17)
   - Story is interactable (not a static mockup)
2. **Open state** — overlay opened (programmatically via play function or via story `globals`/`parameters` that select an open variant). Asserts:
   - Popup renders inside the portal
   - Animations interpolate (no abrupt show — CT-6.r.3 hardening)
   - PopupHeader / ActionFooter / ScrollArea visible per the canonical composition

Mismatch on EITHER state is a finding. Single-state captures are insufficient — the design review found 9 `defaultOpen` stories that worked in the open state but had no re-open path (CT-12).

Screenshots land under `.pcln-ai-output/horizon-standard/screenshots/<date>/<component>/{closed,open}/<story-id>.png`.

---

## Crash detection (CT-9 hardening)

The verifier previously deferred crash detection to Chromatic's runner. This is insufficient — a story that throws on initial render gets a single-frame Chromatic capture of the error boundary, but the verifier needs to flag it BEFORE Chromatic runs (to save build budget).

### Required protocol

When loading any story via Storybook MCP (`preview-stories`):

1. **Wrap the iframe interaction in a try/catch boundary** — capture any thrown `Error` and any React error-boundary fallback content (`role="alert"` divs in the DOM).
2. **Inspect the iframe's `console.error` output** (via `read_console_messages`) — any uncaught error logged here is a crash.
3. **Emit `[story-crash]` finding** with: story ID, error message, error stack frame top-line.
4. **Do NOT continue visual compare** for crashed stories — the screenshot is meaningless. Emit the crash finding and move to the next story.

The `adaptive-demo` Dialog story crash (DX-1074 Dialog Finding 1i) would have been flagged here.

---

## Patterns the verifier MUST flag — DX-1074 design-review additions (CT-10 .. CT-17)

These eight patterns were canonicalized from the 2026-05-10 design review (28 findings across 5 overlay components). Each maps to one or more failure modes documented in `ROOT_CAUSE.md` and to a horizon-standard rule file under `rules/authoring/`.

### CT-10 — Figma token mismatch

**Pattern**: Computed value of a story element differs from the canonical Figma variable bound to the equivalent property in the Figma frame.

**Trigger**: Property-by-property comparison done in the Figma frame parity pre-step. Specifically checks: `padding-*`, `margin-*`, `gap`, `border-radius`, `width` / `min-width` / `max-width`, `height` / `min-height` / `max-height`, `box-shadow`, `filter: drop-shadow(...)`, `background-color`, `color`.

**Examples from DX-1074**:
- PopupHeader root `padding-left: 8px` (code: `pl-2`) vs Figma `16px` (`pl-4`).
- Popover `--size-md` width 416px (code) vs Figma 384px responsive.

**Fix recipe**: Update `<Component>.variants.ts` to the Figma value. If the Figma value is responsive, use `max-w-*` instead of fixed `w-*`.

**Rule**: `rules/authoring/figma-token-parity.md`.

---

### CT-11 — Missing variant for Figma "Types" row

**Pattern**: A Figma frame's "Types" section shows multiple distinct visual configurations of a component (e.g. an `inset` placement of a header), but only the canonical configuration exists in `<Component>.variants.ts` as a variant prop.

**Trigger**: Pre-step Figma metadata fetch returns a frame with a child group named `Types` (case-insensitive) containing multiple rows. For each row, look for a corresponding entry in `<Component>.variants.ts.variants`. Any unaccounted row is a missing variant.

**Examples from DX-1074**:
- PopupHeader `Types` row in Figma includes an `inset` placement; no `inset` prop in code.
- Drawer `Types` row in Figma includes an `inset` bottom variant; no `inset` story in code.

**Fix recipe**: Add the missing variant to `<Component>.variants.ts`. Wire it through the Root subpart. Add a dedicated story `--<variant>` demonstrating it.

**Rule**: `rules/authoring/figma-types-as-variants.md`.

---

### CT-12 — Bare `defaultOpen` without re-open path

**Pattern**: A story uses Base UI `defaultOpen` (or sets a parent state to `true` once with no setter) but provides no path for the viewer to bring the overlay back after it closes. Once closed, the story is "dead".

**Trigger**: AST inspection of the story file looks for:
- `defaultOpen={true}` or `defaultOpen` (boolean attr) on `<*.Root>` AND
- No sibling re-open trigger (`<*.Trigger>` AND no controlled `useState` wiring `open` + `onOpenChange`)

This is distinct from CT-1 which catches MULTIPLE `defaultOpen` Root instances in a snapshot story.

**Examples from DX-1074**:
- Dialog stories 1b/1c/1d/1i and 8 Sizes stories.
- Popover TouchDrawer story.

**Fix recipe**: Use `OverlayStoryWithReopen` from `Dialog.testFixtures.tsx`. The helper owns controlled state and renders a "Re-open" button when closed.

**Rule**: `rules/authoring/story-discipline-overlays.md`.

---

### CT-13 — Story trigger off-screen at default viewport

**Pattern**: The overlay's trigger button is positioned outside the initial 1440×900 Storybook viewport (the default canvas size) due to a story decorator (`items-end`, `min-h-[XXXXpx]`, etc.) that pushes content past the visible area.

**Trigger**: Capture the closed-state screenshot. Run `getBoundingClientRect()` on the trigger element. If `top < 0 OR bottom > 900 OR left < 0 OR right > 1440`, the trigger is clipped/offscreen.

**Examples from DX-1074**:
- Dialog Playground trigger at canvas bottom in old layout.
- Drawer Playground decorator `items-end` pushed trigger offscreen.

**Fix recipe**: Update story decorator to `items-start` / center / responsive `min-h-dvh items-center`. Never anchor the trigger to a canvas edge.

**Rule**: `rules/authoring/story-discipline-overlays.md`.

---

### CT-14 — Adaptive story missing `coarse` touch capability

**Pattern**: An adaptive component (Dialog / Drawer / Popover with adaptive Drawer mode) has a story name containing `mobile` / `coarse` / `touch` AND uses a mobile viewport, but does NOT set `parameters.touchCapability: 'coarse'` (or the equivalent global `TOUCH_CAPABILITY_GLOBAL`).

**Trigger**: Story file AST analysis. If story name matches `/mobile|coarse|touch/i` AND has `globals.viewport.value` set to a mobile preset (`iphone*`, `android*`) AND lacks `globals[TOUCH_CAPABILITY_GLOBAL] === 'coarse'` (or equivalent parameter), flag.

**Examples from DX-1074**:
- Dialog Sizes mobile stories (small-mobile, etc.) rendered as centered dialogs instead of bottom-sheet drawers because the pointer leg of `useShouldUseDrawer` defaulted to fine.

**Fix recipe**: Add `[TOUCH_CAPABILITY_GLOBAL]: 'coarse'` to the story's `globals` object. Import `TOUCH_CAPABILITY_GLOBAL` from `../../storybook/withTouchCapability`.

**Rule**: `rules/authoring/story-discipline-overlays.md`.

---

### CT-15 — Inverted semantic prop pass-through (overlay close-buttons)

**Pattern**: A close-button affordance for an overlay (Tooltip, PopupHeader.Close, Dialog.Close, Drawer.Close, Popover.Close) renders an inner button whose semantic prop (e.g. `emphasis`, `palette`, `tone`) is computed by INVERTING the parent overlay's same-named prop, with no documented design rationale.

**Scope (intentional)**: This pattern is HARDCODED to the overlay close-button set above. Generic detection across arbitrary `?:` ternaries on props is fuzzy and produces unacceptable false-positive rates.

**Trigger**: Read the close-button source file. Look for `<IconButton ... emphasis={emphasis === 'X' ? 'Y' : 'X'}>` or equivalent ternary inversion on a prop that matches the parent's variant prop. The pattern is intentional only when there's a `// design: inverted intent` comment immediately above.

**Examples from DX-1074**:
- Tooltip close: `emphasis={emphasis === 'bold' ? 'regular' : 'bold'}` — inverted designer intent. Fix: pass-through `emphasis={emphasis}`.

**Fix recipe**: Replace inversion with pass-through. If the contrast was the actual need, address it via design tokens (e.g. a `closeButton` slot in variants) rather than a ternary on props.

**Rule**: `rules/authoring/no-semantic-prop-inversion.md`.

---

### CT-16 — Full-size variant breaks shared geometry

**Pattern**: A `full` (or `edge`, `fullscreen`) size variant of an overlay popup drops geometry tokens that the other sizes share — typically `rounded-*`, `[clip-path:inset(...)]`, or the `max-w-[calc(100dvw-16px)]` mirror of `max-h-[calc(100dvh-16px)]`. The other sizes share these tokens; the full size opting out introduces a visual divergence (flat corners, edge bleed, no scrim peek).

**Trigger**: Variants config AST. Look at every `size` entry. If `size.full` (or similar) sets `rounded-none` / `[clip-path:none]` / lacks `max-w-` while peer sizes have `rounded-*` / clip-path / `max-w-` — flag.

**Examples from DX-1074**:
- Dialog `size.full`: `rounded-none [clip-path:none]` + no `max-w-` mirror of `max-h-`. Flat corners + edge bleed.

**Fix recipe**: Mirror the geometry tokens. Use `max-w-[calc(100dvw-16px)]` to match `max-h-[calc(100dvh-16px)]` (8px scrim peek on every edge). Inherit `rounded-*` + `clip-path` from the base popup slot.

**Rule**: `rules/authoring/full-size-geometry.md`.

---

### CT-17 — Compound variant has no default branch for bare props

**Pattern**: A `tailwind-variants` config with `compoundVariants` matches based on combinations of variant props. If the user-supplied props collide with a non-variant value (e.g. Base UI's render-prop injects HTML `type='button'` onto a Button whose variant prop is also named `type`), NO compound row matches and `defaultVariants` is skipped (because `type` is "explicitly set"). The component renders with only the base slot styles applied — typically invisible or ghost.

**Trigger**: Component file AST. Look for variant props whose names collide with native HTML attribute names (`type`, `role`, `form`, `value`, `name`). If such a collision exists, the component MUST normalise the incoming prop before passing to `buttonVariants()` (or equivalent). Look for guard logic that discards non-variant values; flag if absent.

**Examples from DX-1074**:
- Button `<Button>Open dialog</Button>` rendering as plain bold text when used as a Base UI `<Dialog.Trigger>`/`<Drawer.Trigger>`/`<Popover.Trigger>` render-prop child. Base UI injects HTML `type='button'`; collides with Button's variant `type`; compound `secondary + regular` never fires.

**Fix recipe**: In the component, extract the incoming variant-prop name from `props`. Check if its value is a member of the variant key set. If not, pass `undefined` to the variants function so `defaultVariants` kicks in. See `Button.tsx` for the canonical guard.

**Rule**: `rules/authoring/className-routing-discipline.md` (closely related; close-button positioning routing is a sibling pattern).

### CT-18 — `toBeVisible()` on a portaled overlay immediately after open

**Pattern**: A play function that calls `await expect(dialog).toBeVisible()` immediately after `findByRole('alertdialog'|'dialog')`. Fails in Chromatic's real-browser runner but passes in jsdom.

**Cause**: Base UI entrance animation starts at `data-[starting-style]:opacity-0 data-[starting-style]:scale-95`. Real browsers apply CSS; `getComputedStyle(element).opacity === '0'` → `toBeVisible()` returns false mid-animation.

**Detection:**
```
rg -nE "toBeVisible\(\)" \
  design-system/horizon/src/components/**/*.stories.tsx
# grep fallback: grep -RnE "toBeVisible\(\)" design-system/horizon/src/components/ --include="*.stories.tsx"
```
Any `toBeVisible()` on a portaled overlay element is suspect. Confirm whether the assertion fires before the animation settles.

**Fix**: Replace with `toBeInTheDocument()` for the open-state assertion. `toBeInTheDocument()` confirms mounting without depending on computed opacity.

### CT-19 — `asTitle={X.Component}` inside a static snapshot panel

**Pattern**: A static snapshot panel (plain `<div>` wrapper, no `Component.Root`/`Portal`) uses `<PopupHeader.Title asTitle={Dialog.Title}>` or `asTitle={Popover.Title}`.

**Cause**: `Dialog.Title` and `Popover.Title` are Base UI compound components that read context from the nearest Root. Outside a Root they call `useDialogStore()` / `usePopoverRootContext()`, which destructures `store` from `undefined` → runtime crash (`TypeError: Cannot destructure property 'store'` or Base UI error #47).

**Detection:**
```
rg -nE "asTitle=\{(Dialog|Popover|AlertDialog|Drawer)\.Title\}" \
  design-system/horizon/src/components/**/*.stories.tsx
# grep fallback: grep -RnE "asTitle=\{(Dialog|Popover|AlertDialog|Drawer)\.Title\}" design-system/horizon/src/components/ --include="*.stories.tsx"
```
For each match: check whether the containing component is inside `Component.Root`. If it is a static panel (SnapshotPanel, PopoverSnapshotPanel, AdaptiveDemo static previews) with no Root → **BLOCKING**.

**Fix**: Remove `asTitle` from static panels. `PopupHeader.Title` renders a plain heading without it; the visual appearance is identical. `asTitle` is only required inside a live Root context for correct ARIA `id` wiring.

**Note**: `PopupHeader.Close` does NOT have this problem — it is a standalone `IconButton` with no context dependency.

### CT-20 — Tooltip `triggerNode` injects focusable tab stop via `nativeButton=false`

**Pattern**: A non-interactive Tooltip trigger (icon, badge, label) used inside an interactive form or list. The trigger gains `tabIndex="0"` from Base UI's `Popover.Trigger` when `nativeButton=false` (the default).

**Cause**: `nativeButton=false` causes Base UI to inject `role="button"` and `tabIndex="0"` on the rendered trigger element so it is keyboard-activatable as a non-native button. For purely decorative triggers (e.g. an error info icon whose message is already conveyed via `aria-describedby`), this adds an unwanted keyboard tab stop.

**Detection:**
```
rg -nE "<Tooltip[^>]*triggerNode=\{<CdnIcon|triggerNode=\{<img|triggerNode=\{<Image" \
  design-system/horizon/src/ react-components/
# grep fallback: grep -RnE "triggerNode=\{<(CdnIcon|img|Image)" design-system/horizon/src/ react-components/ --include="*.tsx"
```
For each match: verify the trigger has `tabIndex={-1}` when it is not independently interactive (i.e. the information is already in `aria-describedby` on the input). If absent → flag.

**Fix**: Pass `tabIndex={-1}` on the `triggerNode` element. Because `Tooltip`'s `triggerNodeRenderer` spreads `...triggerNode.props` AFTER Base UI's injected props, the user-supplied `tabIndex={-1}` wins:
```tsx
triggerNode={<CdnIcon iconName='error' size='20' tabIndex={-1} />}
```

---

## Output paths AND who owns the Write

Two distinct concerns:

### Path resolution

The dispatch prompt provides the report file path explicitly. The verifier MUST treat that path as authoritative — it is a worktree-absolute path. Do NOT remap to a hardcoded repo root. Failure mode: subagent computes a path against the main-repo root and hits the worktree perm boundary.

### Subagent Writes are NOT authorized — return findings to parent

**Subagents do NOT inherit the parent's `Write` permission for `.pcln-ai-output/` paths.** Even with a worktree-absolute path resolved correctly, the subagent's Write call will be denied. This was observed twice on 2026-05-07/08 — three dispatches, three Write blocks.

Protocol:

- Subagent MUST NOT call `Write` for the report file.
- Subagent MUST return all findings in its `result` reply to the parent — full JSON per-story result blocks plus the markdown summary verbatim. The parent writes the report file.
- Subagent's reply format: ≤200-word summary text PLUS a fenced `markdown` block containing the full report content as a single drop-in payload the parent can pass to `Write`.
- Subagent MAY call `Read` on rule files, source files, story files, and reference docs as needed.
- Subagent MAY call screenshot tooling (`storybook-screenshot.py`) which writes PNGs into `.pcln-ai-output/horizon-standard/screenshots/<date>/...` — that path is allowlisted for the script (different mechanism than direct Write).

Until subagent Write permission is added to project settings, treat the parent as the sole writer of `.md` reports. This keeps reports consistent and avoids burning subagent tool calls on retries.
