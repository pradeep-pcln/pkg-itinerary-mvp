# How to Add a New Data Source

When a vibe coder needs data that isn't available via pcln-graph, document the new source so future vibe coders can use it too.

---

## Steps

1. **Create `references/datasources/<source-name>.md`** following the template below.
2. **Update `SKILL.md`** — mention the new datasource in the "Getting Data" or "Using a Different Data Source" section.

---

## Reference Doc Template

```markdown
# Data Source: <Name>

Brief description of what data this source provides and when to use it.

---

## Setup

How to get access (MCP, npm package, API key process, etc.).
Step-by-step instructions for getting configured in Claude Code if applicable.

---

## Using in Code

Minimal working example showing:
- How to install any client library
- How to initialize the client (with env vars, never hardcoded credentials)
- A simple request/query example

---

## Authentication

How auth works and where credentials come from.
Where to get them (internal service, Slack channel, vault, etc.).
Which environment variables to set in `.env`.

---

## Tips

Practical advice: common gotchas, rate limits, pagination patterns, etc.
```

---

## Notes

- Document auth requirements clearly — this is the most common point of friction for vibe coders.
- If an MCP server exists for the source, always prefer it over writing raw HTTP calls — it enables schema discovery and reduces mistakes.
- Keep examples minimal and concrete. Vibe coders learn by example, not by reading docs.
