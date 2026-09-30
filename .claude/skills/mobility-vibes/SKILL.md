---
name: mobility-vibes
description: >-
  Use this skill whenever you are working in the mobility-vibes repository at Priceline.
  This skill governs ALL prototyping work in this repo — trigger it even for casual
  requests like "lets build something" or "I need to show hotel prices". Specifically,
  always use it when: starting or continuing a prototype, scaffolding Vite/React/TypeScript
  projects, using Priceline's Horizon design system (@pcln/horizon), setting up Google
  Artifact Registry (GART) authentication for npm, handling any git operations (branching,
  commits, pushes), querying pcln-graph data, setting up Docker containers
  or GitHub Actions, enforcing guardrails (no secrets in code, QA-only deployments,
  no merges to main), or running/previewing the app (npm run dev, starting the dev server,
  showing a live preview). If the user is building anything in mobility-vibes, this skill is always in effect.
---

# Mobility Vibes — Vibe Coder Skill

You are helping a non-engineer prototype in the `mobility-vibes` sandbox at Priceline. Your job is to absorb all technical complexity invisibly — git operations, project structure, CI/CD setup, data access — so they can focus entirely on what they want to build.

## Guardrails (always enforce, no exceptions)

- **Never work on `main`.** Before writing a single line of code, make sure a branch exists. Create one if needed.
- **Never merge to `main`.** All prototypes live on their own branches permanently.
- **No secrets in code.** Refuse to write API keys, tokens, or credentials directly into any file. Environment variables only, and never commit `.env` files with real values.
- **QA/non-prod only.** This repo never deploys to Production. Remind users if they seem confused about this.
- **SCW reminder.** If someone seems new to this repo, mention they need to complete Secure Code Warrior training before pushing code — it's a BHI requirement.
- **Always scaffold at the repo root.** Project files (`package.json`, `src/`, `Dockerfile`, etc.) go directly at `/` — never in a subdirectory. Vite outputs `dist/` at the repo root, which is exactly where the GitHub Actions reusable workflow expects it. Never set `project-folder` or `build-dir` in the workflow; the defaults are correct only when the project is at root.

---

## Before You Build Anything (First-time Setup)

**Step 0 — Verify the toolchain.** Read `references/standards/toolchain-setup.md` before touching any code. It covers:
- Identifying the user (git config name/email)
- Checking for Node and npm — and installing them via `nvm` if missing
- Checking for the GitHub CLI (`gh`) — and installing it if missing
- Authenticating `gh` so pushes and PR creation work

**Do not assume Node, npm, or `gh` are installed.** Always check first.

All `@pcln`-scoped packages — including `@pcln/horizon` — live in Priceline's private npm registry (GART). **`npm install` will fail without it.**

Read `references/standards/gart-setup.md` for the complete GART setup guide, including:
- Checking whether `gcloud` CLI is installed (required — guide user to install if missing)
- First-time machine setup
- Daily auth refresh

**Do not proceed with `npm install` until GART auth is confirmed** (no 403 errors).

---

## Starting a New Prototype

Each prototype lives at the **repository root** of its own branch. There are no subdirectories — project files (`package.json`, `src/`, `Dockerfile`, etc.) go directly at `/`. This keeps the CI/CD defaults working without any extra configuration (`dist/` is created at the repo root, which is where the reusable workflow expects it).

When a user wants to build something new:

1. **Understand the idea** — ask them what they want to build in a sentence or two. Don't demand a full spec.
2. **Create a branch** — see `references/standards/git-workflow.md` for naming. Use `vibe/<short-description>` (e.g., `vibe/flight-search-dashboard`). Handle this with git; don't ask them to do it.
3. **Scaffold the project at the repo root** — read `references/runtimes/vite-typescript.md`. Place all files directly at the root of the repo (not in a subfolder). Use that file as your complete guide for structure, scripts, and config.
   **Always set `base` in `vite.config.ts`** — the app is deployed under a path prefix and without this, all JS/CSS assets will 404 in the deployed environment:
   ```ts
   export default defineConfig({
     base: process.env.VITE_BASE_PATH || '/mobility-vibes',
     plugins: [...],
   })
   ```
4. **Add a `/health` endpoint to `server.js`** — always include this before the SPA fallback route:
   ```javascript
   app.get('/health', (_req, res) => {
     res.json({ status: 'ok' })
   })
   ```
5. **Add Docker and CI/CD** — copy the Dockerfile asset to the repo root:
   - `assets/docker/vite.Dockerfile` → `Dockerfile`
   - **For the GitHub Actions workflow:** check if `.github/workflows/build-release.yml` already exists in the repo. If it does, **do not create a new one** — reuse it as-is. Every workflow file in `.github/workflows/` triggers on every push, so adding a second workflow doubles CI runs. Only create `.github/workflows/build-release.yml` from `assets/github-actions/vite.yml` if no workflow file exists yet.
   - Do **not** set `project-folder` or `build-dir` in the workflow — the defaults work correctly when the project is at the repo root (`dist/` is produced at root by Vite).
6. **Run `npm install`** — from the repo root to generate `package-lock.json`. GART auth must be confirmed first (see above). This file must be committed.
7. **Initial commit and push** — stage everything including `package-lock.json`, write a plain-English commit message summarizing what was scaffolded, push the branch.

---

## Continuing Existing Work

When resuming work on an existing prototype:
- Check the active branch. If somehow on `main`, stop and switch them to a working branch.
- Read the existing code structure before suggesting or writing anything new.
- After each meaningful set of changes, commit and push automatically — don't wait for the user to ask.

---

## Connecting to Internal Priceline Services (TLS)

Any service on `.dqs.pcln.com`, `.pcln.com`, or other internal hosts uses a Priceline internal CA that Node.js doesn't trust by default. Connections will fail with `SELF_SIGNED_CERT_IN_CHAIN` without the cert bundle.

- Read `references/standards/priceline-tls-certs.md` before making any TLS connection to an internal host.
- **When scaffolding a new app, download fresh certs as part of setup** — see the reference doc for the download command and extraction steps.
- The cert bundle is pre-extracted at `certs/pcln-internal-ca.pem` — pass it as `rootCerts` to `grpc.credentials.createSsl()` or equivalent.
- Do NOT use `NODE_TLS_REJECT_UNAUTHORIZED=0` — grpc-js ignores it.

---

## Getting Data from pcln-graph

When the user needs Priceline data (flights, hotels, car rentals, trip data, user info, etc.):
- Read `references/datasources/pcln-graph.md` for setup and usage.
- pcln-graph is Priceline's GraphQL API. Use GraphQL introspection at runtime to discover available queries and types — do not guess field names. See `references/datasources/pcln-graph.md` for the introspection workflow.

---

## Linking Into Package Search (pkg-search)

To send a user from a prototype into a full package search on QA:
- Read `references/datasources/pkg-search.md` for the URL pattern and parameter reference.
- Use a GET deep-link to `https://qaa.priceline.com/shop/search/` with origin, destination, dates (`YYYYMMDD`), and `num-adults`.
- Always open in a new tab — don't navigate away from the prototype in the same tab.

---

## Using the Horizon Design System

For any Vite prototype with a UI, use Priceline's Horizon design system (`@pcln/horizon`) for all visual components.

- Read `references/design-system/horizon.md` for setup and component usage.
- **Always default to Horizon.** Only bypass it if the user explicitly wants something off-brand, or if Horizon genuinely doesn't have the component they need.
- Do not hand-roll buttons, cards, typography, or layout if Horizon has an equivalent.

---

## Using a Different Runtime

If the user wants Python, Go, or another language instead of Vite/TypeScript:
- Read `references/runtimes/_adding-runtimes.md` for the pattern and what to include.
- The `references/runtimes/` directory contains one file per supported runtime. Vite/TypeScript is the default.

---

## Getting Package Data from bundle-discover

For flight+hotel bundle search (cheapest/top-rated packages per destination):
- Read `references/datasources/bundle-discover.md` for full setup and usage.
- bundle-discover is a gRPC service (`BundleDiscoverService.RetrievePackages`). Browsers can't call gRPC directly — always proxy through `server.js`.
- QA endpoint: `guse4-uspmidtiergw-qaa.dqs.pcln.com` — default for all deployments.
- Prod endpoint: `guse4-uspmidtiergw-prod.prod.pcln.com` — local dev on VPN only, more data.
- QA cache is sparse; use the `/api/warm-cache` endpoint pattern to populate it before searching.

---

## Using a Different Data Source

If the user needs data from somewhere other than pcln-graph:
- Read `references/datasources/_adding-datasources.md` for the pattern.
- New datasource docs go in `references/datasources/`.

---

## Atlassian — JIRA & Confluence

The Atlassian MCP gives Claude Code direct access to JIRA issues and Confluence pages without the user ever opening a browser.

- Read `references/tools/atlassian-mcp.md` for setup and usage patterns.
- Use it to look up tickets, create/update issues, read Confluence docs, and log work — all hands-free.
- When a user references a JIRA ticket (e.g., "MOB-123" or a ticket URL), fetch it automatically with `getJiraIssue` rather than asking them to paste the details.
- When searching for issues, prefer `searchAtlassian` (Rovo Search) for natural language queries; use `searchJiraIssuesUsingJql` when the user gives you a JQL filter.
- If the user says `/mcp` shows `atlassian` as disconnected, walk them through the setup in the reference doc.

---

## Chrome DevTools MCP — Browser Inspection

The Chrome DevTools MCP lets Claude Code inspect the live browser — DOM, console errors, network requests — without the user ever opening DevTools.

- Read `references/tools/chrome-devtools-mcp.md` for installation and setup.
- Chrome must be launched with `--remote-debugging-port=9222` for the MCP to connect. **Always do this automatically** when starting the dev server (see "Running the App" below).
- If the user reports `/mcp` shows `chrome-devtools` as disconnected or missing, walk them through the setup from that reference doc.

---

## Before Every Push — Build Check

**Always run a full build before pushing.** Never push code that fails to build.

```bash
npm run build
```

This runs `tsc -b` (TypeScript compile) followed by `vite build`, so it catches both type errors and bundler errors in one step.

If there are errors:
1. Read each error carefully — don't guess at fixes.
2. Fix the root cause (wrong prop types, missing imports, missing packages, etc.).
3. Re-run `npm run build` to confirm clean.
4. Only then commit and push.

Common Horizon-related TS mistakes to watch for:
- Using styled-system props (`p`, `m`, `borderRadius`, etc.) on Horizon components — these are not supported. Use `style` instead.
- Passing `children` to components that don't accept them.
- Importing components that don't exist in `@pcln/horizon`'s exports.

---

## Git — You Handle Everything

Vibe coders should not need to think about git at all. See `references/standards/git-workflow.md` for full conventions. In short:

- You create branches, stage files, write commit messages, and push.
- Commit messages should be plain English summaries — no technical jargon, no conventional commit prefixes required.
- Commit proactively after meaningful changes. Don't batch everything into one giant commit at the end.
- Never ask the user to run a git command themselves unless there's an unavoidable interactive step (like auth).
- **Always run `npm run build` and confirm it passes before committing and pushing.**

---

## Running the App — You Handle This Too

Never tell the user to run `npm run dev` or any other dev server command. You start and manage the app yourself.

### How to start the dev server

1. **Detect the port** — check `package.json` for a `--port` flag or `PORT` env var. Default for Vite is `5173`.
2. **Free the port if occupied** — before starting, check whether the port is already in use and kill it:
   ```bash
   lsof -ti tcp:<PORT> | xargs kill -9 2>/dev/null || true
   ```
3. **Launch Chrome with remote debugging** — before starting the dev server, always launch Chrome with the remote debugging port so the Chrome DevTools MCP can connect. Run this in the background silently:
   ```bash
   open -a "Google Chrome" --args --remote-debugging-port=9222
   ```
4. **Start in the background** — use `run_in_background: true` so the server runs without blocking. Run from the repo root:
   ```bash
   npm run dev
   ```
5. **Confirm it's up** — after launching, tell the user the local URL (e.g., `http://localhost:5173`) so they can open it in their browser.

### When to start the app

- After scaffolding a new project and installing dependencies.
- After any change the user would want to see live (new page, component update, data wiring, etc.).
- If the user says anything like "show me", "preview", "run it", "start it", or "what does it look like".

### Restarting after changes

Vite HMR handles most changes automatically — no restart needed. Only restart if:
- A new environment variable was added.
- `vite.config.ts` or `tsconfig.json` was modified.
- A new package was installed.

To restart: kill the port again with the `lsof` command above, then re-launch in the background.
