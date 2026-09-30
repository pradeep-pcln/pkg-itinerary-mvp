# Git Workflow for Vibe Coders

Vibe coders should never need to think about git. You handle all of it. This document defines the conventions to follow.

---

## The Most Important Rule

**No one ever merges to `main`.** Prototypes live on their own branches indefinitely. Main is protected and represents the stable state of the repo. If a prototype ever graduates to production, that goes through a formal engineering PR — it's not done from this repo.

---

## Branch Naming

Every prototype lives on its own branch. Name branches like this:

```
vibe/<short-description>
```

Examples:
- `vibe/flight-price-dashboard`
- `vibe/hotel-search-ui`
- `vibe/trip-summary-widget`

**Why `vibe/`?** The CI/CD pipeline has special handling for branch type prefixes. Branches starting with `vibe/` or `chore/` are treated as non-Jira branches — they deploy to QA with a "branchMode" track rather than trying to extract a Jira ticket number. This is the right mode for vibe coding where there's no Jira ticket.

If a viber *does* have a Jira ticket associated with their work, the branch can follow `<type>/<TICKET-123>-<description>` — but this is uncommon in vibe coding.

---

## Creating a Branch

Always create the branch before writing any code:

```bash
git checkout -b vibe/<description>
git push -u origin vibe/<description>
```

Handle this automatically. Never start coding on `main`.

---

## Committing

**Before commit always make sure the local server is restarted and ask if changes were tested.**

**Write commit messages as plain English sentences.** No conventional commit prefixes required (no `feat:`, `fix:`, etc.). The audience is a non-engineer who might look at the git history — keep it human.

Good messages:
- `Add flight search form with date pickers`
- `Connect to pcln-graph to fetch live hotel prices`
- `Fix broken layout on mobile screen sizes`
- `Add loading spinner while data fetches`

Bad messages:
- `feat(ui): implement search component`
- `wip`
- `update stuff`

**Commit frequency:** After each meaningful chunk of work — a working feature, a meaningful fix, a structural change. Don't wait until the end of a session to commit everything at once, and don't commit every single file save. Use judgment: would a future you want to be able to roll back to this point?

**Always push after committing.** The CI/CD pipeline triggers on push, so pushing = deploying to QA. That's the intended workflow.

```bash
git add <files>         # be specific, don't use git add -A blindly
git commit -m "message"
git push
```

---

## Checking Status

Before any new work session, check what branch is active and what's uncommitted:

```bash
git status
git branch --show-current
```

If uncommitted work exists, either commit it or stash it before starting new work.

---

## What NOT to Do

- Never `git merge main` into a prototype branch
- Never `git push origin main` or `git push --force`
- Never commit `.env` files or files with real credentials
- Never use `git add -A` without first reviewing what it would stage — it can accidentally include sensitive files
