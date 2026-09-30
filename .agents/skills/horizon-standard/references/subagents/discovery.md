---
name: subagent-discovery
description: Dispatch template for the horizon-standard discovery scanner. Invoked when the skill is run without a target or the user says "find horizon components needing audit".
model: haiku
subagent_type: Explore
---

# Discovery scanner — dispatch template

## When to dispatch

- User invokes horizon-standard without a target component
- User says "find horizon components needing audit" or "show me what's drifted"
- A batch operation needs to enumerate candidates first

## Why subagent

Reads dozens-to-hundreds of files. Parent only needs the ranked list, not the file contents. Read-only sweep with grep/glob heuristics — no deep reasoning needed.

## Dispatch parameters

```ts
Agent({
  subagent_type: "Explore",
  model: "haiku",  // read-only sweep; no deep reasoning needed
  description: "Horizon component discovery scan",
  prompt: `<see prompt below>`,
})
```

## Prompt template

Pass this verbatim to the subagent. Substitute `<REPO_ROOT>` and `<FILTER>` (optional).

````
You are a read-only discovery scanner for the horizon-standard skill. Find horizon-class component files that need audit attention and return a ranked list. Do NOT modify any files.

Scope:
- Repo root: <REPO_ROOT>
- Filter (optional package or path): <FILTER>

Find candidate files (any of these signals):
1. File at *.variants.ts (definition of horizon variants)
2. File at *.tsx that imports from "@pcln/horizon" or "@pcln/horizon-*" AND defines a function returning JSX
3. File at react-components/horizon-*/**/*.tsx
4. File at react-apps/<app>/components/**/*.tsx that imports horizon and defines a component
5. File at node-apps/*/web/**/*.tsx that imports horizon and defines a component

For each candidate, score against these checks (each missing = +1 to score, higher = worse):
- No sibling .variants.ts file (check `dirname(file)/<basename(file, .tsx)>.variants.ts`)
- No sibling .stories.tsx file
- variants file has tv() but doesn't export a *VariantsSlots type
- File contains arbitrary Tailwind values (regex `\\[[^\\]]+\\]`)
- File contains style={ (hand-rolled inline CSS)
- File defines a <button> element but doesn't accept buttonClassName, ref, slots props (Button override API miss)
- File has more than 200 lines (size signal — likely needs split)

Return a markdown table sorted by score descending. Hard cap at 50 rows. Format:

| Path | Score | Top issues | Suggested mode |
|---|---|---|---|
| react-apps/.../Foo.tsx | 4 | no .variants.ts; no story; arbitrary values; >200 lines | Authoring |

After the table, in <500 words total, write:
- A 2-sentence summary of the findings (e.g. "12 components in next-landing missing variants files; 8 components in horizon-fly-components have suspect arbitrary values")
- The top 3 patterns observed
- Whether you saw any signs of broken state (truncated files, malformed imports) — flag for human attention

Hard rules:
- READ-ONLY. Do not Edit or Write.
- Cap output at 500 words after the table.
- If your scan finds zero candidates, say so explicitly.

Subagent execution discipline (mandatory):
- You run inside a shared checkout with the parent session and sibling subagents. This scanner does not run build/test by default — but if you do invoke one, it MUST be single-threaded: `rush build --parallelism 1`, `jest --runInBand --max-workers=1`, `vitest --pool=threads --poolOptions.threads.singleThread`, `playwright --workers=1`.
- Skill-quality standards apply. If the host defines a skill-quality protocol (e.g. `~/.claude/skill-standards.md`), audit and log findings the same way the parent does. You do NOT inherit SessionStart hooks.
- Verbose-output discipline. Summarize tool output before reading; never paste raw logs into context.
````

## Dispatch invariants

- Read-only — Edit and Write tools are not granted to this subagent.
- Hard cap on output size.
- Self-contained prompt — assume zero prior conversation context.
