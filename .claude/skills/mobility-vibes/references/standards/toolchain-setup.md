# Toolchain Setup — Node, npm, and GitHub CLI

Before scaffolding any project, verify the required tools are installed. Do not assume anything is present.

---

## Who Is the User?

Run this to identify the logged-in user:

```bash
git config --global user.name
git config --global user.email
```

If those are empty, the user hasn't configured git yet. Set them:

```bash
git config --global user.name "First Last"
git config --global user.email "you@priceline.com"
```

Ask the user to confirm their name and Priceline email if you don't know them.

---

## Step 1 — Check for Node and npm

```bash
node --version
npm --version
```

If either command is not found, install Node (npm is bundled with it). The preferred way is via `nvm`:

### Install nvm (Node Version Manager)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

After the script runs, **restart the terminal** (or source the shell profile) before continuing:

```bash
source ~/.zshrc   # or ~/.bashrc depending on the user's shell
```

Then install and use Node 20 (LTS):

```bash
nvm install 20
nvm use 20
nvm alias default 20
```

Verify:

```bash
node --version
npm --version
```

> Do **not** proceed with `npm install` or any package work until both commands return version numbers.

---

## Step 2 — Check for the GitHub CLI

```bash
gh --version
```

If `gh` is not found, install it.

### macOS (Homebrew — preferred)

```bash
brew install gh
```

If Homebrew itself is not installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then retry `brew install gh`.

### macOS (direct download — fallback)

Direct the user to download the latest `.pkg` installer from:
https://github.com/cli/cli/releases/latest

> After installing, restart the terminal so the `gh` command is on the PATH.

---

## Step 3 — Authenticate the GitHub CLI

After `gh` is installed, authenticate:

```bash
gh auth login
```

Follow the interactive prompts:
- **Where to log in:** GitHub.com
- **Preferred protocol:** HTTPS
- **Authenticate via browser:** Yes

This opens a browser tab for OAuth. After completing it, verify:

```bash
gh auth status
```

You should see `Logged in to github.com as <username>`.

> The GitHub CLI is used to open pull requests, check CI run status, and view repo state — all without leaving the terminal.

---

## Checklist

Before starting any project work, confirm all four are green:

| Tool | Check command | Required version |
|------|--------------|-----------------|
| Node | `node --version` | 18 or higher |
| npm | `npm --version` | 9 or higher |
| git | `git --version` | any |
| gh | `gh --version` | any |
