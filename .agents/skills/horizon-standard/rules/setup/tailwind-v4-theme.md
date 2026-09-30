---
name: tailwind-v4-theme
description: Wire horizon's Tailwind v4 theme exports into a consuming app — covers monorepo and external repos.
applies-to: setup
---

# Tailwind v4 theme wiring

## What gets wired

Horizon ships its theme as Tailwind v4 `@theme` directives plus a CSS file with custom properties (OKLCH color tokens, spacing scale, typography, etc.). The consuming app must:

1. Import horizon's theme CSS in its global stylesheet
2. Configure Tailwind to pick up horizon's content paths (so the JIT compiler sees the classes)

## pcln-web monorepo recipe

Most pcln-web apps already wire this via `@pcln/horizon-storybook-preset-addon` for Storybook and a shared `tailwind.config.*` template. For a fresh app:

1. Add `@pcln/horizon` to `dependencies`
2. In the app's CSS entry (`app/globals.css` or `src/index.css`):
   ```css
   @import 'tailwindcss';
   @import '@pcln/horizon/theme.css';
   ```
3. In the app's `tailwind.config.*`:
   ```ts
   import type { Config } from 'tailwindcss'

   export default {
     content: [
       './app/**/*.{ts,tsx}',
       './components/**/*.{ts,tsx}',
       '../../node_modules/@pcln/horizon/dist/**/*.{js,css}',  // pick up horizon classes
     ],
     // theme is imported via @theme in CSS — no extend needed unless app-specific
   } satisfies Config
   ```

## External repo recipe

1. `npm install @pcln/horizon tailwindcss@^4 tailwind-variants`
2. Same CSS imports as above (`@import '@pcln/horizon/theme.css'`)
3. Tailwind config — point `content` at horizon's dist path:
   ```ts
   content: [
     './src/**/*.{ts,tsx}',
     './node_modules/@pcln/horizon/dist/**/*.{js,css}',
   ]
   ```

## Verification

After wiring, write a smoke test in the app:

```tsx
// smoke test page or story
import { Box, Text } from '@pcln/horizon'

export default function ThemeSmoke() {
  return (
    <Box p="md" bg="background-base">
      <Text variant="body">If this renders with horizon tokens, theme is wired.</Text>
    </Box>
  )
}
```

Run the dev server and confirm:
- `bg-background-base` resolves (background renders with the OKLCH token, not white-fallback)
- `text-content-primary` resolves (text renders in horizon's primary content color)
- No "unknown utility" warnings in the console

## Common failure modes

- **Theme imports but tokens don't render**: usually a `content` path miss — Tailwind didn't see the horizon classes. Add `node_modules/@pcln/horizon/dist/**/*` (or workspace path in monorepo).
- **Tailwind v3 vs v4 mismatch**: horizon requires v4. Verify with `npm ls tailwindcss`.
- **OKLCH not supported in target browser**: rare in 2026 but possible — horizon ships fallbacks; check the imported CSS includes them.
