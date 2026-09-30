# Design System: Horizon (`@pcln/horizon`)

Horizon is Priceline's internal design system. **All Vite prototypes in mobility-vibes must use Horizon for UI components.** Only bypass it if the user explicitly needs something off-brand or Horizon genuinely doesn't have the component.

---

## Installation

`@pcln/horizon` lives in Priceline's private npm registry (GART). GART must be authenticated before this will resolve.

```bash
pnpm add @pcln/horizon
pnpm add -D @tailwindcss/vite
```

If `@pcln/horizon` fails with a 404 or 401, see `references/standards/gart-setup.md`.

---

## Setup in Vite

### 1. Update `vite.config.ts`

Add the Tailwind Vite plugin alongside the React plugin:

```typescript
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
})
```

### 2. Update `src/index.css`

Replace or update the global CSS file with Horizon's Tailwind layer imports:

```css
@import 'tailwindcss';
@import '@pcln/horizon/tailwind.css';
@source '../node_modules/@pcln/horizon/dist';

/* Optional: Horizon's Montserrat font */
@import '@pcln/horizon/montserrat.css';

/* Optional: Horizon icon symbols */
@import '@pcln/horizon/symbols.css';
```

> **Note:** If existing components change stylistically after adding these imports, configure the Tailwind Preflight Layer per the TailwindCSS docs to prevent global style resets from affecting your components.

### 3. Font — Montserrat

Horizon's official font is Montserrat. Import `@pcln/horizon/montserrat.css` in `src/index.css` (shown above) — no extra configuration needed.

---

## Using Components

Import directly from `@pcln/horizon`. There is no `'use client'` directive needed in a Vite React app — all components run on the client by default.

```typescript
import { Heading, P, Span, Button, Card, Link } from '@pcln/horizon'
```

> **Note:** `@pcln/horizon` does not export a `ThemeProvider`. No theme wrapper is needed — components work out of the box.

> **Note:** `@pcln/horizon` does not export `Box`, `Flex`, or a `Text` component with styled-system props. Use standard HTML elements (`<div>`, `<section>`) or inline styles for layout. Use `Heading`, `P`, and `Span` for typography.

### Typography — Heading and P

```typescript
<Heading>Page Title</Heading>

<P>Body paragraph text</P>
<Span>Inline text</Span>
```

### Buttons

```typescript
<Button>Primary action</Button>
<Button emphasis="bold">Bold emphasis</Button>
<Button variation="outline">Secondary</Button>
<Button variation="subtle">Subtle</Button>
<Button disabled>Disabled</Button>
```

### Cards

```typescript
<Card p={3} borderRadius="lg">
  Card content here
</Card>
```

### Links

```typescript
<Link href="/somewhere">Internal link</Link>
<Link href="https://..." target="_blank">External link</Link>
```

---

## Testing Configuration

### Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

### Jest

Use `identity-obj-proxy` to handle CSS module imports that Horizon uses:

```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  setupFilesAfterFramework: ['./src/test/setup.ts'],
}
```

---

## Whitelabel / Partner Theming

If the prototype needs partner-specific theming:

- Update `@pcln/whitelabel-node` to v27.3.0+ and `@pcln/whitelabel-components` to v17.6.0+
- Access the theme via `res.locals.partner.config.horizonTheme`
- Apply it using the `generateHorizonTheme()` utility

For standard mobility-vibes prototypes, whitelabel theming is not required.

---

## When NOT to Use Horizon

Only bypass Horizon components when:
- The user explicitly asks for something off-brand or custom-styled beyond what Horizon supports
- Horizon genuinely doesn't have the component (e.g., a highly specialized data visualization)

In those cases, use raw HTML/CSS or another library, but call it out — the user should know they're going off-brand.

---

## Resources

- **Onboarding Docs:** https://docsite.corp.priceline.com/docs/design-systems/horizon/onboarding
- **Storybook / Docs:** Available internally — ask in `#mobility-vibes` for the link
- **Source:** `pcln/pcln-web` on GitHub (private — requires Priceline access)
- **Questions:** `#mobility-vibes` on Slack
