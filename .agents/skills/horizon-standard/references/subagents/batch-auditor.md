---
name: subagent-batch-auditor
description: Dispatch template for the horizon-standard batch audit dispatcher. Fans out parallel per-component audit subagents when N>1 components need auditing.
model: sonnet
subagent_type: general-purpose
---

# Batch audit dispatcher — dispatch template

## When to dispatch

- Discovery scanner returned N>1 candidates
- User explicitly says "audit these N components" with a list
- A scheduled audit sweep runs over a known package set

## Why subagent

True parallelism — N components audited at once. Per-component finding lists are small; parent context stays clean. Each child agent runs the full audit checklist on a single component.

## Dispatch parameters (parent → batch dispatcher)

```ts
Agent({
  subagent_type: "general-purpose",
  model: "sonnet",  // children parallelize; Opus would 10x cost for marginal quality
  description: "Horizon batch audit",
  prompt: `<see prompt below>`,
})
```

## Parent prompt template

Pass this to the batch dispatcher. Substitute `<COMPONENT_LIST>` (newline-delimited paths) and `<MAX_PARALLEL>` (default 8).

````
You are the batch audit dispatcher for the horizon-standard skill. You will fan out N parallel per-component audit subagents and aggregate their findings.

Inputs:
- Components to audit (one per line):
<COMPONENT_LIST>

- Max parallel children: <MAX_PARALLEL>

For each component, dispatch a per-component audit subagent (Sonnet, general-purpose) using the per-component prompt template (see below). Run them in parallel batches of <MAX_PARALLEL>. Wait for all to complete.

Aggregate the results into a single audit report:

1. Sort findings by severity (blocking > warning > nit), then by component path
2. Compute totals: blocking count, warning count, nit count
3. Identify recurring findings (same `id` appearing in 3+ components) — these are rule-promotion candidates
4. Output a single markdown table with columns: Component, Severity, Rule, Message, Evidence
5. Summary section: per-component score, top 5 recurring findings

For each component, also write the dual-write artifacts (markdown report + JSON sidecar) per horizon-standard's audit completion gates. Use today's date.

Hard rules:
- Cap final report at 1500 words.
- Hard cap children at <MAX_PARALLEL> in flight at once.
- If a child returns an error, log it and continue — don't abort the batch.

Subagent execution discipline (mandatory):
- You run inside a shared checkout with the parent session and sibling subagents. ALL build/test commands MUST be single-threaded — concurrent workers deadlock the Rush build cache and starve the parent's MCP tooling. `rush build`: `--parallelism 1`. `jest`: `--runInBand --max-workers=1`. `vitest`: `--pool=threads --poolOptions.threads.singleThread` (or `--no-file-parallelism`). `playwright`: `--workers=1`. Pass these requirements through to every child subagent you spawn.
- Skill-quality standards apply. If the host defines a skill-quality protocol (e.g. `~/.claude/skill-standards.md`), audit and log findings the same way the parent does. You do NOT inherit SessionStart hooks. Children inherit nothing from you either — repeat this block in every child prompt.
- Verbose-output discipline. Never paste full build/test logs into your context. Capture pass/fail counts, lines matching `error|FAIL`, last 3–5 lines only.
````

## Per-component child prompt template

Each child gets a fresh subagent. Substitute `<COMPONENT_PATH>` and `<RULES_PATH>`.

````
You are a per-component audit subagent for the horizon-standard skill. Audit ONE component file against the horizon-standard rules and return structured findings.

Component path: <COMPONENT_PATH>
Rules base path: <RULES_PATH>

Procedure:
1. Read the component file in full.
2. Read the sibling .variants.ts file if present.
3. Read the sibling .stories.tsx file if present.
4. Apply each rule from rules/shared/, rules/authoring/, rules/testing/. For each, decide: pass / blocking-fail / warning / nit.
5. If the component has stories, run the visual-verifier subagent (see references/subagents/visual-verifier.md). Include its findings.

For each finding, output:
{
  "id": "<rule-name>",
  "severity": "blocking" | "warning" | "nit",
  "rule": "<path-to-rule-file>",
  "message": "<one-sentence what's wrong>",
  "evidence": "<file:line or screenshot path>"
}

Return a JSON array of findings AND a markdown summary (under 300 words).

Hard rules:
- READ + Edit (for the dual-write artifacts only) — do not modify the component itself.
- One component per child agent. Do not audit other components even if you see them.
- Cap markdown summary at 300 words.

Subagent execution discipline (mandatory):
- Shared checkout — single-threaded only. If you run any build/test, use: `rush build --parallelism 1`, `jest --runInBand --max-workers=1`, `vitest --pool=threads --poolOptions.threads.singleThread`, `playwright --workers=1`.
- Skill-quality standards apply. If the host defines a skill-quality protocol (e.g. `~/.claude/skill-standards.md`), audit and log findings the same way the parent does. You do NOT inherit SessionStart hooks.
- Verbose-output discipline. Summarize before reading: pass/fail counts, `error|FAIL` lines, last 3–5 lines. Never paste full logs.
````

## Dispatch invariants

- Children parallelize but bounded by MAX_PARALLEL (default 8).
- Each child writes its own per-component dual-write artifacts (markdown + JSON sidecar) before returning.
- Parent only consumes the aggregated finding list — does not re-read child artifacts.
