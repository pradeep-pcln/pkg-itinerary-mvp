---
name: edit-discipline
description: Pause-before-second-edit rule for `.variants.ts`, config-shaped files, and any file where multiple edits in one turn signals unclear requirements.
applies-to: shared
---

# Edit discipline for config-shaped files

## Rule

Before editing any `.variants.ts`, `.stories.tsx`, `package.json`, `tsconfig.json`, `rsbuild.config.*`, `vite.config.*`, `next.config.*`, `tailwind.config.*`, or other config-shaped file:

1. **Read the file in full** before the first edit.
2. **Write a one-sentence statement** of the intended behavior change (in chat or scratch notes).
3. **Run typecheck or build** before making a *second* edit to the same file in the same turn.

Multiple edits to the same config-shaped file without an intervening verification step indicate unclear requirements. Pause and write a spec before continuing.

## Why

Config files are not narrative — small surface, dense semantics. Two unverified edits compound: the second edit may be undoing the first, or papering over a typo, or adapting to a misread of the schema. Verification between edits catches this.

Past evidence: `rsbuild.config.ts` accumulated 35 edits across one session before the underlying problem was understood. Each edit looked plausible in isolation; in aggregate they were a thrash.

`.variants.ts` files are similarly dense — a `tv()` definition with slots, compoundVariants, and defaultVariants holds many implicit constraints. Edit twice without checking and the variants table can drift out of sync with the consuming component.

## How to apply

- The first edit is fine. No friction.
- If you find yourself reaching for a second edit to the same file before running typecheck/build/test: **stop**.
- Output the one-sentence behavior change. Run the verification command. *Then* edit again.

## Counter-example (don't do this)

```
edit Foo.variants.ts (add a variant)
edit Foo.variants.ts (rename the slot you just added)
edit Foo.variants.ts (fix the type — typecheck would have caught the rename)
```

## Right way

```
edit Foo.variants.ts (add a variant)
$ rushx typecheck
edit Foo.variants.ts (rename slot — typecheck still green)
$ rushx typecheck
```
