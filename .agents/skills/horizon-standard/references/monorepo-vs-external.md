---
name: monorepo-vs-external
description: Reference for how horizon-standard behaves differently in pcln-web monorepo vs external repos — package management, build tooling, change files, port registry.
---

# Monorepo vs external — operational differences

The skill is one codebase but the operational environment differs. This reference captures the differences for skill self-orientation.

## Detection

| Signal | Means we're in pcln-web | Means we're in external |
| --- | --- | --- |
| `rush.json` at repo root | Yes | No |
| `common/config/rush/` directory | Yes | No |
| `package.json` with `workspaces` field | Possible (rush + pnpm workspaces) | Possible (npm/pnpm/yarn workspaces) |
| `@pcln/horizon` resolves via `workspace:*` | Yes | No (resolves via npm registry) |

The skill detects monorepo by checking for `rush.json`. Layer 1 trigger globs only fire when this is detected.

## Package management

| Operation | pcln-web | External |
| --- | --- | --- |
| Add a dependency | `rush add -p <pkg> [--dev]` | `npm install <pkg> [--save-dev]` (or pnpm/yarn equivalent) |
| Update a dependency | Edit `package.json`, then `rush update` | `npm install` |
| Cross-package consistency | `rush check` | `npm ls` (manual review) |
| Lockfile location | `common/config/rush/pnpm-lock.yaml` | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` |
| Workspace specifier | `workspace:*` or `workspace:^` | `^X.Y.Z` from registry |

## Change files

pcln-web requires a Rush change file for any `package.json` change that affects publishable behavior. External repos do not.

```bash
# pcln-web
rush change                 # interactive; prompts per project
# OR write directly to common/changes/@pcln/<pkg>/<branch>.json:
cat > common/changes/@pcln/horizon/dx-1055-feature.json <<'EOF'
{
  "changes": [{
    "packageName": "@pcln/horizon",
    "comment": "Add new component variants",
    "type": "minor"
  }],
  "packageName": "@pcln/horizon",
  "email": "user@priceline.com"
}
EOF
```

## Build / typecheck / test

| Command | pcln-web | External |
| --- | --- | --- |
| Build a single project | `rush build --to <pkg>` | `npm run build` |
| Build everything affected | `rush build --to-except <pkg>` or full `rush build` | `npm run build` (or task graph in Nx/Turbo) |
| Typecheck | `rushx typecheck` | `npm run typecheck` or `tsc --noEmit` |
| Test | `rushx test` | `npm test` |
| Lint | `rushx lint` | `npm run lint` |

## Storybook ports

pcln-web has a port registry (`common/config/storybook-ports.json` or similar) so concurrent Storybook instances don't collide. External repos use the default `6006` or whatever the user configures.

## Visual verification

| | pcln-web | External |
| --- | --- | --- |
| Storybook MCP entry | Configured per project; one URL per Storybook | Single project; default URL |
| Chromatic project token | Per-project; in `package.json` config | One token for the repo |

## When the skill explicitly differs

The skill loads the same rules in both environments (`shared/`, `authoring/`, etc.). Differences are operational, surfaced through:
- Setup recipes (`rules/setup/*`) which include both pcln-web and external paths
- Audit-mode commands (commands shown in pcln-web form by default; external commands footnoted)
- Subagent dispatch templates (which pass repo-detection signals so child agents adapt their commands)

When the skill needs to know which environment it's in:

```bash
[ -f rush.json ] && echo "monorepo" || echo "external"
```
