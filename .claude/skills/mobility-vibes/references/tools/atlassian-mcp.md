# Atlassian MCP — JIRA & Confluence

The Atlassian MCP connects Claude Code directly to your Atlassian account, giving hands-free access to JIRA and Confluence without opening a browser.

## MCP Server URL

```
https://mcp.atlassian.com/v1/mcp
```

## Setup

The server is registered in `~/.claude/settings.json`:

```json
"atlassian": {
  "type": "http",
  "url": "https://mcp.atlassian.com/v1/mcp"
}
```

Authentication uses OAuth — the first time it's used, Claude Code will open a browser window to authorize access. After that, tokens are cached automatically.

**If `/mcp` shows `atlassian` as disconnected:**
1. Run `/mcp` in Claude Code to check status.
2. If disconnected, Claude Code will prompt you to re-authorize in a browser.
3. Complete the OAuth flow, then retry your request.

## What You Can Do

### JIRA

| Task | How |
|------|-----|
| Look up a ticket | "What's in MOB-123?" — Claude fetches it automatically |
| Search tickets | Natural language: "show me open bugs on the checkout flow" |
| Create a ticket | "Create a bug for the broken hotel price display" |
| Update a ticket | Change status, description, assignee, priority |
| Transition status | Move to In Progress, Done, etc. |
| Add a comment | Leave notes on any issue |
| Log work | Record time spent on a ticket |

### Confluence

| Task | How |
|------|-----|
| Read a page | "Show me the onboarding doc" — Claude fetches and summarizes |
| Search pages | "Find the architecture decision for pcln-graph auth" |
| Create a page | Draft and publish new documentation |
| Update a page | Edit existing content |
| Add a comment | Leave feedback on pages |

## Common Patterns

**Fetching a ticket by key** — just mention the key:
> "Pull up MOB-456 and summarize the acceptance criteria"

**JQL search** — useful for sprint boards or backlog queries:
> "Show me all tickets in the MOB project assigned to me that are In Progress"

**Linking work to a prototype** — when starting a prototype tied to a ticket:
> "The work for this prototype is tracked in MOB-789 — update the description with what we built"

**Confluence knowledge lookup** — great before starting prototypes:
> "Is there a Confluence page about the Trip Dashboard API contract?"

## Finding Your Cloud ID

Most tools need a `cloudId`. Use `getAccessibleAtlassianResources` to list your sites — or just pass the site hostname (e.g. `priceline.atlassian.net`) and Claude Code will resolve it automatically.
