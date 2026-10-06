# mobility-vibes

A dedicated prototyping playground for non-engineers to safely experiment with AI-assisted ("vibe") coding at Priceline — without compromising engineering standards, security, or the SDLC.

> **Full details:** [Vibing For Non-Engineers](https://priceline.atlassian.net/wiki/spaces/RC/pages/11215798432/Vibing+For+Non-Engineers) on Confluence

---

## What is this repo?

This repo is a **non-production sandbox** for non-engineers to iterate on ideas using AI tools like Claude Code. It will never be deployed to Production. All deployments target **QA/non-prod only** via a dedicated Plaza application.

The goal is to explore how non-engineering contributions can be enabled safely, with proper guardrails — not to replace the standard engineering SDLC.

---

## Ground Rules

- **This repo never goes to Production.** Deployments are scoped to QA/non-prod only.
- **Never work on `main`.** Every prototype lives on its own `vibe/<description>` branch. Claude Code handles this for you.
- **Never merge to `main`.** Prototype branches stay on their own branches permanently.
- **Engineering standards still apply.** Vibe coding does not bypass security or compliance requirements.
- **Secrets must stay secret.** No API keys, tokens, or credentials in code — ever. Environment variables only, and `.env` files with real values are never committed.
- **SCW completion is required.** Anyone who pushes code must complete Secure Code Warrior training — no exceptions. This is a BHI requirement.

---

## Getting Started

### 1. Install Claude Code

Follow the Priceline-specific setup guide: [Set up Claude Code](https://priceline.atlassian.net/wiki/spaces/DX/pages/10969940005/Set+up+Claude+Code) on Confluence. It covers installation, LiteLLM token configuration, and SSL certificate troubleshooting specific to Priceline's network.

**Quick summary:**

Install via Homebrew (macOS):

```shell
brew install --cask claude-code
```

Configure the Priceline LiteLLM token (get this from `#mlplatform` or a teammate via 1Password):

```shell
echo 'export ANTHROPIC_AUTH_TOKEN=sk-litellm-<your-token>' >> ~/.zshrc
echo 'export ANTHROPIC_BASE_URL=https://guse4-litellmmgmt-nonprod.dqs.pcln.com/' >> ~/.zshrc
source ~/.zshrc
```

Then launch Claude Code from the repo directory:

```shell
claude
```

> **SSL issues?** If you see `Self-signed certificate detected`, follow the certificate fix in the [setup guide](https://priceline.atlassian.net/wiki/spaces/DX/pages/10969940005/Set+up+Claude+Code#Troubleshooting).

### 2. Verify your toolchain

Before building anything, Claude Code will check that the required tools are installed. The checklist:

| Tool | Check command | Required version |
|------|--------------|-----------------|
| Node | `node --version` | 18 or higher |
| npm | `npm --version` | 9 or higher |
| git | `git --version` | any |
| gh (GitHub CLI) | `gh --version` | any |

If any are missing, Claude Code will walk you through installing them. Node and npm can be installed via `nvm`; the GitHub CLI via Homebrew (`brew install gh`).

### 3. Set up GART (Priceline's private npm registry)

All `@pcln`-scoped packages — including the Horizon design system — live in Priceline's private Google Artifact Registry (GART). **`npm install` will fail without this.**

**One-time machine setup** (run in your terminal):

```shell
rm ~/.npmrc
npm install -g google-artifactregistry-auth
npm config set progress false
npm config set registry https://us-npm.pkg.dev/pcln-pl-artifacts-prod/npm/
npm config set @pcln:registry https://us-npm.pkg.dev/pcln-pl-artifacts-prod/npm-internal/
cd ~
gcloud auth login --update-adc
artifactregistry-auth
```

> Requires the [Google Cloud SDK](https://docs.cloud.google.com/sdk/docs/install-sdk) (`gcloud`). Install it first if the command isn't found.

**Daily auth refresh** (every morning before running `npm install`):

```shell
gcloud auth login --update-adc
artifactregistry-auth
```

If `npm install` fails mid-session with a 401, your token has expired (they last 1 hour). Re-run `artifactregistry-auth` to refresh.

**Access issues?** If you get a 403 even after authenticating, you may not be in the `pcln-developers` AD group. Contact the IT Support Desk.

---

## How to Contribute

### Starting a new prototype

Just tell Claude Code what you want to build. It handles everything else:

1. **Describe your idea** — a sentence or two is enough. No spec required.
2. **Claude creates the branch** — named `vibe/<short-description>` (e.g., `vibe/hotel-price-dashboard`).
3. **Claude scaffolds the project** — Vite + TypeScript + Horizon at the repo root, with Docker and GitHub Actions CI/CD wired up.
4. **Claude runs `npm install`** — after confirming GART auth is working.
5. **Claude commits and pushes** — triggering a QA deployment automatically.

From there, just describe what you want to change or add. Claude writes the code, runs a build check, commits, and pushes — you watch it take shape.

### Continuing existing work

Open the repo in a terminal, run `claude`, and tell Claude Code what branch you were working on. It will switch to the right branch and pick up where you left off.

### Branch naming

All prototype branches use the `vibe/` prefix:

```
vibe/flight-search-dashboard
vibe/hotel-price-widget
vibe/trip-summary-ui
```

The CI/CD pipeline recognizes `vibe/` branches and deploys them to QA automatically on every push.

### From prototype to production

If a prototype is good enough to graduate to a production app, that work must go through a Pull Request and standard SDLC review by engineers. It does not happen from this repo directly.

---

## The Claude Code Skill

This repo ships with a built-in Claude Code skill (`/mobility-vibes`) that activates automatically whenever you're working here. You don't need to invoke it manually — it's always in effect.

The skill handles:

- **Guardrails** — enforces branch rules, blocks secrets in code, and reminds you about QA-only deployments.
- **Project scaffolding** — sets up Vite + TypeScript projects at the repo root with the correct CI/CD defaults.
- **Horizon design system** — uses `@pcln/horizon` components for all UI by default. No hand-rolled buttons or cards.
- **pcln-graph data** — guides you to Priceline's GraphQL API for live flight, hotel, and trip data.
- **Git operations** — creates branches, writes commit messages, stages files, and pushes. You never touch git.
- **Dev server** — starts and manages the local dev server for you. Just ask to "see it" or "preview it."
- **Build validation** — always runs `npm run build` and confirms it passes before committing.
- **Atlassian integration** — can look up JIRA tickets and Confluence pages directly from the terminal.

### What the skill does NOT do

- Work on `main` (it will refuse and create a branch instead).
- Write secrets or credentials into any file.
- Deploy to Production.
- Merge branches.

---

## Priceline's Horizon Design System

All UI prototypes use [`@pcln/horizon`](https://horizon.priceline.com) — Priceline's internal React component library. Claude Code defaults to Horizon for all visual elements: buttons, cards, typography, layout, inputs, and more.

You don't need to install or configure it manually — the project scaffold includes it automatically.

---

## Data: pcln-graph

For Priceline data (flights, hotels, car rentals, trip history, user info), Claude Code connects to **pcln-graph** — Priceline's internal GraphQL API. Just describe what data you need and Claude figures out the queries.

---

## Access

- GitHub access is granted individually or via a per-team non-developer GitHub group (e.g., `mob-non-dev`).
- Non-developers are **not** added to `pcln-developers` or CODEOWNERS.
- GART access is provided via the `pcln-non-developers` AD group.

---

---

## pkg-itinerary-mvp — Package Search Prototype

Branch: `vibe/pkg-itinerary-mvp`

Displays hotel + flight vacation packages sourced from the USP (Unified Search Platform) via a Node/Express API and a Vite/React frontend.

### Architecture

```
https://local.priceline.com/pkg-itinerary-mvp/
        │
        ▼ pcln nginx (Docker)
  Vite dev server  :5173   ← SPA + assets + proxies /api/* → Express
  Express server   :3001   ← /api/packages, /api/header, /api/flights
        │
        ├── USP (Unified Search) — bundle proposals
        ├── global-navigation-service — real Priceline header/footer HTML
        └── pcln-graph — hotel images, airline metadata
```

### Prerequisites

1. **pcln CLI** — install via:
   ```bash
   npm install -g @pcln/cli
   ```

2. **Docker Desktop** — the pcln nginx proxy runs in a container. Download from [docker.com](https://www.docker.com/products/docker-desktop/).

3. **GART auth** — required for `npm install` (see [GART setup](#3-set-up-gart-pricelines-private-npm-registry) above).

4. **Priceline TLS certs** — Express calls internal QAA services over HTTPS. Certs live at `certs/pcln-internal-ca.pem`. To refresh them:
   ```bash
   curl -s https://raw.githubusercontent.com/nicowillis/pcln-internal-certs/main/download.sh | bash
   ```

### Local Setup

```bash
# 1. Clone and switch to the branch
git checkout vibe/pkg-itinerary-mvp

# 2. Install dependencies (GART auth must be active first)
npm install

# 3. Link the project with pcln CLI and set the backing environment
pcln link
pcln --host=guse4-qaa update   # generates .env with GLOBAL_NAV_URL + certs paths

# 4. Start the pcln nginx proxy (Docker Desktop must be running)
pcln start

# 5. Start Express + Vite
npm start
```

App is now live at **https://local.priceline.com/pkg-itinerary-mvp/**

### Environment Variables

All env vars are auto-generated by `pcln --host=guse4-qaa update` into `.env` (symlinked from `~/.pcln/env/mobility-vibes.env`). See [`.env.example`](.env.example) for the full list with descriptions.

**Never commit `.env` — it contains secrets injected by the pcln CLI.**

| Variable | Source | Description |
|---|---|---|
| `GLOBAL_NAV_URL` | pcln CLI (services) | global-navigation-service endpoint — header/footer HTML |
| `NODE_EXTRA_CA_CERTS` | pcln CLI | Path to Priceline internal CA bundle |
| `CERT_PATH` | pcln CLI | Directory of Priceline certs |
| `PORT` | pcln.json env | Express server port (default 3001) |
| `APP_NAME` | pcln.json env | App identifier |

### npm Scripts

| Script | What it does |
|---|---|
| `npm start` | Starts Express (3001) + Vite (5173) together |
| `npm run dev` | Vite only (no Express API) |
| `npm run server` | Express only |
| `npm run build` | TypeScript + Vite production build → `dist/` |

### Troubleshooting

**`https://local.priceline.com` not reachable**
→ Docker Desktop isn't running, or the pcln container is down. Start Docker then run `pcln start`.

**Global header not showing / empty**
→ Express started without `.env` loaded. Use `npm start` (not `node server.js` directly) — the script sources `.env` first.

**`pcln start` fails: "Cannot connect to Docker daemon"**
→ Open Docker Desktop and wait for the whale icon to go solid, then retry.

**No package results**
→ QAA cache is sparse. Results may be empty for some date/route combos — try different dates.

---

## Questions?

Head over to **#mobility-vibes** in Slack or read the full documentation on Confluence:
[Vibing For Non-Engineers](https://priceline.atlassian.net/wiki/spaces/RC/pages/11215798432/Vibing+For+Non-Engineers)
