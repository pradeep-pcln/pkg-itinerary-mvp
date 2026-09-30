# Security Standards: Secrets and Credentials

**Never commit secrets, API keys, passwords, or tokens to git.** This applies to all files in the repo — source code, config files, test fixtures, and comments.

---

## The Rule

If you are about to write a hardcoded value that looks like any of the following, stop and use an environment variable instead:

- API keys or tokens (e.g. `AIza...`, `sk-...`, `Bearer ...`)
- Passwords or passphrases
- Connection strings with embedded credentials
- Private keys or certificates
- Client secrets from OAuth apps
- Any value the user says is "secret", "private", or "do not share"

If the user pastes a secret value directly into the chat, do not put it in code. Acknowledge it, suggest storing it in `.env.local`, and proceed with `import.meta.env.VITE_YOUR_VAR` in the code.

---

## Local Development: `.env.local`

Use `.env.local` for local secrets — never `.env`. Vite loads `.env.local` automatically and it is already in `.gitignore`.

```bash
# .env.local — never commit this file
VITE_API_URL=https://api.example.com
VITE_SOME_KEY=your-real-value-here
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

> **Reminder:** Only `VITE_`-prefixed variables are bundled into the client build and visible in the browser. Never put secrets that must remain server-side in a `VITE_` variable.

---

## QA / Non-Prod: Google Secrets Manager (GSM)

When the prototype is deployed to QA, secrets are injected by the platform via Google Secrets Manager. The user does not need to configure this themselves — tell them:

> "Add this variable to Google Secrets Manager under the project's non-prod secrets. The platform will inject it as an environment variable at runtime."

The variable name in GSM should match the name used locally (without the `VITE_` prefix if it's a server-side secret, or with it if it's a client-side non-sensitive config value).

---

## `.gitignore` Requirements

Every prototype must have these entries in `.gitignore`:

```
.env
.env.local
.env.*.local
dist
node_modules
*tsbuildinfo
```

If the user's `.gitignore` is missing these, add them before writing any code that uses environment variables.

---

## What to Do When You Catch a Secret

1. **Do not write the secret value into any file.**
2. Tell the user: *"That looks like a secret — I won't put it in the code. Add it to `.env.local` as `VITE_YOUR_VAR_NAME=<value>` and I'll reference it via `import.meta.env.VITE_YOUR_VAR_NAME`."*
3. Write the code using `import.meta.env.VITE_YOUR_VAR_NAME`.
4. When the prototype is ready for QA, remind the user to add the variable to GSM.

---

## What NOT to Do

- Do not hardcode any secret "just for now" or "as a placeholder with the real value"
- Do not commit `.env.local` even if the user says it's fine
- Do not use `process.env` in Vite client code — it does not work; use `import.meta.env`
- Do not log secret values to the console
