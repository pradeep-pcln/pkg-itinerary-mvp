# Runtime: Vite + React + TypeScript

Vite 6 + React 19 + TypeScript is the default and only runtime for UI prototypes in mobility-vibes.

---

## Project Structure

```
my-prototype/
├── src/
│   ├── main.tsx          # ReactDOM.createRoot entry point
│   ├── App.tsx           # Root component
│   └── index.css         # Tailwind + Horizon CSS imports
├── public/               # Static assets (favicon, etc.)
├── server.js             # Production static file server (Express, ESM)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── .gitignore
├── Dockerfile
└── .github/
    └── workflows/
        └── build-release.yml
```

---

## `package.json`

```json
{
  "name": "my-prototype",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "clean": "rm -rf dist",
    "build:ext": "npm run build",
    "build-deps": "cp server.js dist/ && cp -r node_modules dist/",
    "preview": "vite preview"
  },
  "dependencies": {
    "express": "^4.19.0"
  },
  "devDependencies": {
    "@pcln/horizon": "latest",
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react-swc": "^3.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

> `express` is the only production dependency. Everything else (React, Horizon, etc.) is bundled into `dist/` at build time by Vite.

The three CI-required scripts:
- **`clean`** — removes the `dist/` output directory
- **`build:ext`** — runs `tsc -b && vite build` to type-check and produce `dist/`
- **`build-deps`** — copies `server.js` and `node_modules/` into `dist/` so the Docker image only needs `COPY dist/ .`

---

## `vite.config.ts`

See `references/design-system/horizon.md` — the Tailwind Vite plugin required for Horizon is defined there.

---

## `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" }
  ]
}
```

## `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## `server.js` (Production Static Server)

```javascript
import express from 'express'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8080

// Serve Vite's static build output
app.use(express.static(__dirname))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// SPA fallback: all routes return index.html
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'index.html'))
})

app.listen(PORT, () => console.log(`Listening on :${PORT}`))
```

> This file lives at the project root. `build-deps` copies it into `dist/` at build time. The Docker image copies `dist/` as its working directory, so `__dirname` resolves to the directory containing `index.html` and the static assets — no path adjustments needed.

---

## `src/main.tsx`

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## `src/App.tsx`

```typescript
export default function App() {
  return (
    <main style={{ padding: '2rem' }}>
      {/* Add Horizon components here — see references/design-system/horizon.md */}
    </main>
  )
}
```

## `src/index.css`

See `references/design-system/horizon.md` for the full CSS setup.

---

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Prototype</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## `.gitignore`

```
node_modules/
dist/
.env
.env.local
```

---

## Environment Variables

See `references/standards/secrets-security.md` for full guidance on secrets and credentials.

Use `.env.local` for local development (loaded automatically by Vite, already in `.gitignore`):

```bash
# .env.local — never commit this file
VITE_API_URL=http://localhost:3000
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

In QA/production, variables are injected by the platform via Google Secrets Manager. Only `VITE_`-prefixed variables are bundled into the client build — never put secrets in `VITE_` vars.

---

## Updating `package.json` Dependencies

Whenever `package.json` is modified (adding, removing, or changing a dependency or devDependency), always remove `node_modules/` and `package-lock.json` before reinstalling. This prevents stale or conflicting module trees from causing hard-to-diagnose build failures.

```bash
rm -rf node_modules package-lock.json
npm install
```

> Do this any time a dependency version is bumped, a new package is added, or a package is removed — even if the change looks minor. Skipping this step is a common source of subtle runtime or build errors.

---

## Development

```bash
npm install    # requires GART auth for @pcln/horizon
npm run dev    # → http://localhost:5173
```

Vite HMR handles hot-reloading automatically. Restart the dev server only if:
- A new `.env.local` variable was added
- `vite.config.ts` or `tsconfig.json` was modified
- A new package was installed

---

## Production Build

```bash
pnpm run clean       # remove dist/
pnpm run build:ext   # tsc + vite build → dist/
pnpm run build-deps  # copy server.js + node_modules into dist/
```

CI runs these three commands in sequence. The resulting `dist/` directory contains the static assets, `server.js`, and pruned `node_modules/` (express only). The Docker image copies this and starts with `node server.js` on port 8080.
