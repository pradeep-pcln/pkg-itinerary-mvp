# Data Source: pcln-graph (Apollo Graph)

pcln-graph is Priceline's primary GraphQL API, built on Apollo Graph. It exposes travel data — flights, hotels, car rentals, trip details, user info, and more.

**Graph endpoint (QAA):** `https://qaa.priceline.com/pws/v0/pcln-graph/`

---

## Schema Discovery at Runtime

Before writing any query, **introspect the schema directly from the graph server**. Do not guess field names — introspect first, then write.

### Step 1 — Discover available root queries

```bash
curl -s -X POST https://qaa.priceline.com/pws/v0/pcln-graph/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { queryType { fields { name description } } } }"}' | jq '.data.__schema.queryType.fields'
```

This returns all available query operations with their descriptions. Scan this list to find the operation most relevant to the user's need.

### Step 2 — Inspect a specific type

Once you know which query to use, inspect its arguments and return type:

```bash
curl -s -X POST https://qaa.priceline.com/pws/v0/pcln-graph/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name: \"<TypeName>\") { fields { name description type { name kind ofType { name kind ofType { name kind } } } } } }"}' | jq '.data.__type.fields'
```

Replace `<TypeName>` with the return type from Step 1. Repeat for nested types as needed to understand the shape of available data.

### Step 3 — Verify your query before using it in code

Once you've built a query from the schema, run a quick test to confirm it works:

```bash
curl -s -X POST https://qaa.priceline.com/pws/v0/pcln-graph/ \
  -H 'Content-Type: application/json' \
  -d '{"query": "<your query here>"}' | jq .
```

If the endpoint returns a 401 or requires auth headers, ask the user: "Does pcln-graph require any auth headers for QAA? (e.g. a session token or API key)" — then pass them via `-H 'Authorization: <value>'`. Never hardcode credentials.

---

## Avoiding CORS in Local Development (Vite Proxy)

Browsers block direct requests to `qaa.priceline.com` from `localhost` due to CORS. In local dev, route requests through Vite's dev server proxy — Node/Vite proxies are not subject to CORS restrictions.

In production the app is deployed **on** `qaa.priceline.com`, so same-origin requests to `/pws/v0/pcln-graph/` work directly with no proxy needed.

### vite.config.ts — add proxy under `server` (local dev only)

```ts
export default defineConfig({
  // ... other config (base, plugins, etc.)
  server: {
    proxy: {
      '/pcln-graph': {
        target: 'https://qaa.priceline.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pcln-graph/, '/pws/v0/pcln-graph'),
      },
    },
  },
});
```

With this config, a browser request to `/pcln-graph/` is rewritten and forwarded to `https://qaa.priceline.com/pws/v0/pcln-graph/` during local dev. The `server` block has no effect on production builds.

### Point your GraphQL client at the right URL per environment

```typescript
// Local dev  → hits the Vite proxy at /pcln-graph/, which rewrites to /pws/v0/pcln-graph/ on qaa.priceline.com
// Production → app is on qaa.priceline.com; must use the full path /pws/v0/pcln-graph/ directly
const GRAPH_URL = import.meta.env.DEV
  ? '/pcln-graph/'
  : '/pws/v0/pcln-graph/';

const client = new GraphQLClient(GRAPH_URL);
```

> **Critical:** The production path **must** be `/pws/v0/pcln-graph/` — not `/pcln-graph/`. The Vite proxy (which rewrites `/pcln-graph/` → `/pws/v0/pcln-graph/`) only runs during local dev. When the app is deployed to the server, there is no proxy, so requests to `/pcln-graph/` will 404. Always use the full `/pws/v0/pcln-graph/` path for non-dev builds.

> **Never** use an absolute `https://qaa.priceline.com/...` URL in the production path — the app is already running on that domain, so a relative path is correct and avoids any CORS or hardcoded-hostname issues.

---

## Using pcln-graph in Code

### Install the GraphQL client

```bash
npm install graphql-request graphql
```

### Making a query

```typescript
import { GraphQLClient, gql } from 'graphql-request';

// DEV: proxy at /pcln-graph/ rewrites to /pws/v0/pcln-graph/ — proxy only runs locally
// PROD: no proxy; must use /pws/v0/pcln-graph/ directly or requests will 404
const GRAPH_URL = import.meta.env.DEV
  ? '/pcln-graph/'
  : '/pws/v0/pcln-graph/';

const client = new GraphQLClient(GRAPH_URL, {
    headers: {
        // Add auth headers here if required — use import.meta.env, never hardcoded values
    },
});

const query = gql`
  # Use the query you validated via introspection above
`;

const data = await client.request(query, { /* variables */ });
```

---

## Tips

- **Always introspect before writing queries.** The schema is large and field names are not guessable.
- **Start narrow.** Query only the root fields list first, then drill into the specific types you need.
- **Request only the fields you need.** Smaller GraphQL responses are faster and easier to work with.
- **If introspection is disabled**, ask the user if there's a schema SDL file or an internal schema explorer available.
- **Auth requirements vary.** If unauthenticated requests fail, check `#mobility-vibes` on Slack for current QAA auth details.
- **Errors are usually schema mismatches.** Re-introspect the specific type if a query returns unexpected errors.

---

## Adding More Data Sources

If pcln-graph doesn't have the data you need, see `_adding-datasources.md` for how to add support for another data source.