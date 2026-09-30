# Google Artifact Registry (GART) — NPM Setup

Priceline's private npm registry hosts all `@pcln`-scoped packages, including `@pcln/horizon`. **`npm install` will fail on these packages without GART authentication.**

This is a machine-level one-time setup. If a user has never done it before, they must complete it before any `npm install` will work.

---

## How to Tell if GART Isn't Set Up

Signs the user needs to run the one-time setup:
- `npm install` fails with a 404 or 401 on `@pcln/...` packages
- `~/.npmrc` doesn't exist or doesn't reference `us-npm.pkg.dev`
- They've never worked in a Priceline Node.js project before

---

## Step 0 — Check for gcloud CLI

GART authentication requires the Google Cloud SDK (`gcloud`). Before anything else, check if it's installed:

```bash
gcloud --version
```

If the command is not found, tell the user:

> "You need the Google Cloud SDK installed to authenticate with GART. Please install it from:
> https://docs.cloud.google.com/sdk/docs/install-sdk
>
> After installing, restart your terminal and come back here — we'll continue from where we left off."

Do **not** proceed with any GART setup until `gcloud --version` succeeds.

---

## One-Time Setup

> **Source:** [Artifact Registry Setup - NPM](https://priceline.atlassian.net/wiki/spaces/PIPE/pages/7900594947/Artifact+Registry+Setup+-+NPM) on Confluence

Tell the user to run this entire block in their terminal. Because `gcloud auth login` is interactive, they must run it themselves — use `! <command>` in Claude Code or paste it directly.

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

---

## Daily Auth (Every Morning)

Even with the cron set up, the underlying `gcloud` session expires overnight. Each morning before running `npm install`, the user must re-authenticate:

```shell
gcloud auth login --update-adc
artifactregistry-auth
```

This is the only manual step after initial setup.

---

## Mid-Session Token Expiry

Tokens last 1 hour. If `npm install` suddenly fails mid-session with a 401, the token has expired. Fix:

```shell
artifactregistry-auth
```

---

## Troubleshooting

**`npm install -g google-artifactregistry-auth` fails with EACCES (permission denied)**

Preferred fix — use `nvm` for Node version management:
```shell
brew install nvm
nvm install 24
```

Fallback if `nvm` isn't an option:
```shell
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
sudo npm install -g google-artifactregistry-auth
```

**Access denied / 403 even after authenticating**

The user may not be in the `pcln-developers` group (or `Developer Consultants Restricted Auth` for consultants). They should contact IT Support Desk to verify and fix their group membership.

**`artifactregistry-auth` sets the token in the wrong `.npmrc`**

Run it from the home directory to ensure it writes to `~/.npmrc`:
```shell
cd ~
artifactregistry-auth
# or explicitly:
artifactregistry-auth --repo-config ~/.npmrc --auth-config ~/.npmrc
```
