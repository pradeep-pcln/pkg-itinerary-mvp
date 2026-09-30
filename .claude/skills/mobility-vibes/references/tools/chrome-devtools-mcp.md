# Chrome DevTools MCP

The Chrome DevTools MCP gives Claude Code live access to the browser — inspect the DOM, read console errors, check network requests, and interact with the running app directly from the conversation.

---

## One-Time Installation

Run this once to register the MCP server with Claude Code:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

Verify it's registered:

```bash
claude mcp list
```

Restart Claude Code after adding it.

---

## Starting Chrome with Remote Debugging

Chrome must be launched with remote debugging enabled **before** the MCP can connect. Run this each session:

```bash
open -a "Google Chrome" --args --remote-debugging-port=9222
```

> **Note:** If Chrome is already open, quit and relaunch it with the command above — an already-running instance won't pick up the flag.

Claude Code can run this automatically in the background:

```bash
open -a "Google Chrome" --args --remote-debugging-port=9222
```

---

## Verifying the Connection

After Chrome is launched with the flag, the MCP should connect automatically. Confirm with `/mcp` in Claude Code — you should see `chrome-devtools` listed as connected.

If it shows "Failed to reconnect", Chrome is likely already running without the debug port. Quit Chrome fully and re-run the launch command.

---

## What You Can Do Once Connected

With the MCP active, Claude Code can:

- **Inspect the DOM** — read current page structure, find elements, check computed styles
- **Read console output** — see JS errors and logs without opening DevTools manually
- **Monitor network requests** — check what API calls are firing and their responses
- **Interact with the page** — click elements, fill forms, trigger events
- **Take screenshots** — capture the current state of the browser

This is especially useful while iterating on a prototype — errors surface directly in the conversation instead of requiring the user to switch to the browser.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to reconnect to chrome-devtools-mcp` | Quit Chrome, relaunch with `--remote-debugging-port=9222` |
| MCP not in `claude mcp list` | Run `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest`, restart Claude Code |
| Connected but no pages listed | Navigate to a page in Chrome; open tabs show up as inspectable targets |
