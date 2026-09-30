# Global Header Integration for Vite SPA Prototypes

How to add the real Priceline global header (nav bar + footer) to a Vite/React prototype in this repo.

Reference implementation: `m-fly-search` (full SSR app — the pattern there is different; the SPA adaptation is documented here).

---

## How it works

`@pcln/global-header-install` fetches header/footer HTML from `global-navigation-service` (or falls back to static "doomsday" HTML if the service is unreachable). It returns three strings: `headerHTML`, `footerHTML`, and `installerHTML` (a script that wires up interactivity and analytics).

Because Vite serves the HTML shell directly (not through `server.js`), we cannot do SSR injection. Instead:
1. `server.js` exposes a `GET /api/header` endpoint that calls `HeaderInstaller.getHeader()` and returns JSON
2. A React component fetches that endpoint on mount and renders the HTML via `dangerouslySetInnerHTML`
3. The `installerHTML` script is injected into `document.head` to wire up analytics and GTM
4. A `setTimeout` forces `visibility: visible` on the header element — the installer script checks for domain/GTM conditions that don't apply on `localhost`

---

## Step-by-step

### 1. Install the package

```bash
npm install @pcln/global-header-install
```

Requires GART auth. If you get 403:
```bash
NEW_TOKEN=$(gcloud auth print-access-token --quiet)
npm config set //us-npm.pkg.dev/pcln-pl-artifacts-prod/npm-internal/:_authToken "$NEW_TOKEN"
npm config set //us-npm.pkg.dev/pcln-pl-artifacts-prod/npm/:_authToken "$NEW_TOKEN"
npm config set //us-npm.pkg.dev/pcln-pl-artifacts-prod/:_authToken "$NEW_TOKEN"
```

### 2. Add env vars

In `.env` (or the pcln-cli managed file at `~/.pcln/env/<app>.env`):

```
GLOBAL_NAV_URL=https://guse4-sitexmidtiergw-qaa.dqs.pcln.com/global-navigation/components
GLOBAL_WEB_COMPONENTS_URL=https://qaa.priceline.com/global-web-components/public/js/global-web-components-install.js
```

**`GLOBAL_NAV_URL`** — the global-navigation-service endpoint. Use the `.dqs.pcln.com` hostname (not `.sitex`) — it resolves on VPN and the pcln CA cert handles TLS. Returns live personalized header HTML.

**`GLOBAL_WEB_COMPONENTS_URL`** — the absolute URL for the installer JS. Without this, the installer script uses a relative `/global-web-components/...` path, which breaks on `localhost`. Use `https://qaa.priceline.com/...` in QAA.

### 3. Add to server.js

At the top, add a dynamic import (graceful if package not installed):

```js
let HeaderInstaller = null
try {
  const mod = await import('@pcln/global-header-install')
  HeaderInstaller = mod.default
} catch {
  // header endpoint returns empty strings if package missing
}
```

Add the cache + endpoint before your `/health` route:

```js
let _headerCache = null
async function fetchGlobalHeader(req, res) {
  if (_headerCache) return _headerCache
  if (!HeaderInstaller) return { headerHTML: '', footerHTML: '', installerHTML: '' }
  const config = {
    globalNavServiceURL: process.env.GLOBAL_NAV_URL,
    discovery: !!process.env.GLOBAL_NAV_URL,
    featureOptions: { lightHeader: true },
    globalWebComponentsURL: process.env.GLOBAL_WEB_COMPONENTS_URL || null,
  }
  const content = await HeaderInstaller.getHeader(req, res, config).catch(() => ({}))
  _headerCache = {
    headerHTML: content.headerHTML || '',
    footerHTML: content.footerHTML || '',
    installerHTML: content.installerHTML || '',
  }
  return _headerCache
}

app.get(['/api/header', '/cdns-pkg-ui/api/header'], async (req, res) => {
  res.json(await fetchGlobalHeader(req, res))
})
```

The result is cached in memory — the header HTML is the same for every user.

### 4. Proxy header assets in vite.config.ts

The header CSS and installer JS use relative `/global-web-components/...` paths. Proxy them to QAA:

```ts
proxy: {
  '/global-web-components': {
    target: 'https://qaa.priceline.com',
    changeOrigin: true,
    secure: false,
  },
  // ... your existing /cdns-pkg-ui/api proxies ...
}
```

### 5. Create src/components/GlobalHeader.tsx

```tsx
import { useEffect, useState } from 'react'

interface HeaderData {
  headerHTML: string
  footerHTML: string
  installerHTML: string
}

let _cache: HeaderData | null = null
let _promise: Promise<HeaderData> | null = null

function loadHeader(): Promise<HeaderData> {
  if (_cache) return Promise.resolve(_cache)
  if (_promise) return _promise
  _promise = fetch('/cdns-pkg-ui/api/header')
    .then(r => r.json())
    .then(data => { _cache = data; return data })
    .catch(() => ({ headerHTML: '', footerHTML: '', installerHTML: '' }))
  return _promise
}

function useGlobalHeader() {
  const [data, setData] = useState<HeaderData | null>(_cache)
  useEffect(() => {
    if (_cache) return
    loadHeader().then(setData)
  }, [])
  return data
}

export function GlobalHeader() {
  const data = useGlobalHeader()

  useEffect(() => {
    if (!data?.installerHTML) return
    const container = document.createElement('div')
    container.innerHTML = data.installerHTML
    container.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script')
      if (old.src) s.src = old.src
      else s.textContent = old.textContent
      document.head.appendChild(s)
    })
    // The installer script checks domain/GTM conditions that don't apply on localhost.
    // Doomsday CSS also explicitly hides the nav list and logo via display:none.
    // Force all hidden elements visible after scripts have had a tick to run.
    setTimeout(() => {
      const sel = (s: string) => document.querySelector<HTMLElement>(s)
      const selAll = (s: string) => [...document.querySelectorAll<HTMLElement>(s)]
      sel('#pcln-global-header #global-header')?.style.setProperty('visibility', 'visible')
      sel('#pcln-global-header .global-header-nav-product-list')?.style.setProperty('display', 'flex')
      sel('#pcln-global-header .navbar-priceline-brand')?.style.setProperty('display', 'flex')
      selAll('#pcln-global-header .node-invisible').forEach(el => el.classList.remove('node-invisible'))
    }, 100)
  }, [data?.installerHTML])

  if (!data?.headerHTML) return null
  return <div id="pcln-global-header" dangerouslySetInnerHTML={{ __html: data.headerHTML }} />
}

export function GlobalFooter() {
  const data = useGlobalHeader()
  if (!data?.footerHTML) return null
  return <div id="pcln-global-footer" dangerouslySetInnerHTML={{ __html: data.footerHTML }} />
}
```

### 6. Use in App.tsx

```tsx
import { GlobalHeader, GlobalFooter } from './components/GlobalHeader'

// In your JSX:
return (
  <div>
    <GlobalHeader />          {/* real Priceline nav bar */}
    {/* your app content */}
    <GlobalFooter />          {/* real Priceline footer */}
  </div>
)
```

Remove any hand-rolled nav/header divs.

### 7. Start the server with env vars

```bash
GLOBAL_NAV_URL=https://guse4-sitexmidtiergw-qaa.dqs.pcln.com/global-navigation/components \
GLOBAL_WEB_COMPONENTS_URL=https://qaa.priceline.com/global-web-components/public/js/global-web-components-install.js \
node server.js
```

Or via pcln-cli (loads env automatically from `~/.pcln/env/<app>.env`):
```bash
pcln run
```

---

## Gotchas

| Issue | Cause | Fix |
|---|---|---|
| Header `visibility:hidden` | Installer script checks domain/GTM conditions | Force `visibility:visible` after 100ms timeout (see step 5) |
| Nav links and logo not showing (`display:none`) | Doomsday CSS explicitly hides `.global-header-nav-product-list` and `.navbar-priceline-brand` via `display:none` — the installer JS is supposed to unhide them based on domain/GTM checks that fail on `localhost` | Force `display:flex` on both elements and remove `.node-invisible` classes in the same setTimeout (see step 5) |
| `ENOTFOUND` / empty header | Wrong `GLOBAL_NAV_URL` — use `.dqs.pcln.com` not `.sitex`; `@pcln/request` inside the package can't load the pcln CA cert | Bypass the package: call the service directly via Node `https` with `ca: pclnCa` (see server.js `fetchGlobalHeader`) |
| `/global-web-components/` returns 500 | Vite proxy target unreachable | Must be on VPN for CSS/JS to load from `qaa.priceline.com` |
| 403 on `npm install` | GART auth token expired | Re-run `gcloud auth print-access-token` and update `npm config set` (see step 1) |
| Header renders but has no nav links | Viewport too narrow (mobile breakpoint) | The real header collapses on narrow screens — test at desktop width |
| `_headerCache` is null after server restart | In-memory cache resets | Normal — first request after restart re-fetches from global-navigation-service |

## Graceful degradation

The implementation degrades cleanly at every layer:
- No VPN → doomsday static HTML (real nav markup, no personalization)
- Package not installed → `/api/header` returns `{headerHTML:'', footerHTML:'', installerHTML:''}` → `GlobalHeader` renders `null`
- Service 500 → same as above (`.catch(() => ({}))` in `fetchGlobalHeader`)
