# Data Source: bundle-discover (BundleDiscoverService)

bundle-discover is Priceline's package search service. It returns flight+hotel bundle options for a given origin, destination, and date range. Accessed via gRPC (`BundleDiscoverService.RetrievePackages`).

**Important: this service is read-only.** It only reads from a cache — it does not make live pricing calls and it does not write to the cache. Cache entries are populated externally by initiating real package searches (e.g. through pkg-search or another package search flow). If a given O&D pair has never been searched, bundle-discover will return zero results.

**Browsers cannot make raw gRPC calls.** All calls must go through a Node.js server-side proxy.

---

## Endpoints

| Environment | Host |
|-------------|------|
| QA | `guse4-uspmidtiergw-qaa.dqs.pcln.com` (port 443, TLS) |
| Production | `guse4-uspmidtiergw-prod.prod.pcln.com` (port 443, TLS) |

**Important:** QA containers cannot reach the prod host due to network policy. Always default to the QA endpoint in deployed code. Use the prod endpoint locally on VPN only.

The QA cache is sparse — many O&D pairs return zero packages. Use the "Populate cache" pattern below to warm it before searching.

---

## Setup

### 1. Install gRPC packages

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

These must go in `dependencies` (not `devDependencies`) — `server.js` needs them at runtime in the container.

### 2. Get the proto file

The service proto is assembled from `pcln/unified-schema`. A single-file version is kept at `proto/bundle_discover.proto` in this repo. It defines:

```
package services.external.api.bundlediscover.v1;
service BundleDiscoverService {
  rpc RetrievePackages(stream RetrievePackagesRequest)
      returns (stream RetrievePackagesResponse);
}
```

Copy it to `dist/` at build time so the container has it:

```json
"build-deps": "cp server.js dist/ && cp -r node_modules dist/ && cp -r proto dist/"
```

### 3. Wire up the server-side proxy

Add a POST endpoint in `server.js` that accepts JSON, makes the gRPC call, and returns packages as JSON. See the full working example below.

### 4. Add the Vite dev proxy

The browser calls `/mobility-vibes/api/packages`. In dev, Vite proxies this to `localhost:3001` (where `server.js` runs). In QA, the ingress routes `/mobility-vibes/*` to the container directly.

```ts
// vite.config.ts
server: {
  proxy: {
    '/mobility-vibes/api': {
      target: 'http://localhost:3001',
      changeOrigin: false,
      rewrite: (path) => path.replace(/^\/mobility-vibes/, ''),
    },
  },
}
```

---

## Using in Code

### server.js — gRPC proxy

```js
import express from 'express'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const __dirname = dirname(fileURLToPath(import.meta.url))

// QA containers can't reach prod due to network policy.
// Override with BUNDLE_DISCOVER_GRPC env var for local dev on VPN.
const BUNDLE_DISCOVER_GRPC =
  process.env.BUNDLE_DISCOVER_GRPC || 'guse4-uspmidtiergw-qaa.dqs.pcln.com'

const def = protoLoader.loadSync(join(__dirname, 'proto', 'bundle_discover.proto'), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
})
const BundleDiscoverSvc =
  grpc.loadPackageDefinition(def).services.external.api.bundlediscover.v1.BundleDiscoverService

function fetchPackages({ originAirport, destinationAirport, departDate, returnDate, travelers = 2 }) {
  const departSecs = Math.floor(new Date(departDate).getTime() / 1000)
  const returnSecs = Math.floor(new Date(returnDate).getTime() / 1000)
  const transId = 'vibe-' + Date.now()
  const request = {
    header: {
      context: { appc: 'PCLN', trans_id: transId },
      point_of_sale: { country_code: 'US', currency_code: 'USD', locale: 'en-US' },
    },
    body: {
      package_type: 'FS',
      no_of_travellers: travelers,
      origin_airport: originAirport,
      destination_airport: destinationAirport,
      departure_date: { seconds: departSecs },
      return_date: { seconds: returnSecs },
      sort_option: 'CHEAPEST',
      pagination: { start: 0, size: 20 },
      correlation_id: transId,
    },
  }
  return new Promise((resolve) => {
    const packages = []
    const client = new BundleDiscoverSvc(BUNDLE_DISCOVER_GRPC, grpc.credentials.createSsl())
    const call = client.RetrievePackages({ deadline: new Date(Date.now() + 15000) })
    call.on('data', (resp) => { if (resp.body?.packages?.length) packages.push(...resp.body.packages) })
    call.on('error', (err) => resolve({ packages: [], error: err.message }))
    call.on('end', () => resolve({ packages }))
    call.write(request)
    call.end()
  })
}

// Register on both paths: /api/packages for local dev, /mobility-vibes/api/packages for QA ingress
app.post(['/api/packages', '/mobility-vibes/api/packages'], express.json(), async (req, res) => {
  const result = await fetchPackages(req.body || {})
  if (result.error) return res.status(502).json({ error: result.error })
  res.json({ packages: result.packages })
})
```

### Browser / React — calling the proxy

```ts
// BASE_URL includes the base path (/mobility-vibes/) so QA ingress routes correctly.
const res = await fetch(`${import.meta.env.BASE_URL}api/packages`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    originAirport: 'EWR',
    destinationAirport: 'MIA',
    departDate: '2026-07-10',   // yyyy-MM-dd
    returnDate: '2026-07-14',
    travelers: 2,
  }),
})
const { packages } = await res.json()
```

### Running the backend locally

Run `server.js` on a separate port alongside the Vite dev server:

```bash
# QA endpoint (default, no VPN needed)
PORT=3001 node server.js

# Prod endpoint — more data, requires Priceline VPN
BUNDLE_DISCOVER_GRPC=guse4-uspmidtiergw-prod.prod.pcln.com:443 PORT=3001 node server.js
```

---

## Populating the Cache

bundle-discover only reads from cache — it cannot populate it. To get real results, you must trigger actual package searches for the target O&D pairs first. This causes the upstream search pipeline to write results into the cache, after which bundle-discover will return them.

Add a `/api/warm-cache` endpoint that fans out package searches for all target destinations in parallel:

```js
app.post(['/api/warm-cache', '/mobility-vibes/api/warm-cache'], express.json(), async (req, res) => {
  const { originAirport, departDate, returnDate, travelers = 2, destinations = [] } = req.body || {}
  const results = await Promise.all(
    destinations.map(async ({ airport, name }) => {
      const { packages, error } = await fetchPackages({
        originAirport, destinationAirport: airport, departDate, returnDate, travelers,
      })
      return { airport, name, packages: packages.length, error: error || null }
    })
  )
  res.json({ results })
})
```

Call it from the UI before searching, then wait for the response before running the real search.

---

## Logging

Add structured JSON logging around every gRPC call so issues are easy to diagnose in QA pod logs:

```js
// Info: request, response (with durationMs and packageCount)
// Error: full code, details, message, stack — written to stderr
function log(level, message, data) {
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...data })
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}
```

---

## Authentication

No API key or token is required. The service uses mTLS at the infrastructure level; `grpc.credentials.createSsl()` is sufficient for QA and prod.

---

## Tips

- **Zero packages ≠ error.** The QA cache is sparse and read-only. A call that returns `{ packages: [] }` with no error means that O&D pair has never been searched and isn't in the cache. To get results, initiate a real package search for that O&D first (e.g. via pkg-search), then query bundle-discover again.
- **502 from the proxy = gRPC error.** Check the `error` field in the response body and look at server logs for the full gRPC status code and details.
- **15-second deadline.** The call uses `deadline: new Date(Date.now() + 15000)`. Increase it if you need to wait longer for cold cache misses.
- **Bidi streaming, but single request.** `RetrievePackages` is a bidi-streaming RPC. Write one request then `call.end()` — responses stream back until `end` fires.
- **`BASE_URL` must have a trailing slash.** `vite.config.ts` must set `base: '/mobility-vibes/'` (with the slash). Without it, `${import.meta.env.BASE_URL}api/packages` concatenates to `/mobility-vibesapi/packages` and 404s.
- **Register both path variants.** Express must handle both `/api/packages` (local dev via Vite proxy) and `/mobility-vibes/api/packages` (QA ingress direct). Pass both as an array to `app.post([...])`.
