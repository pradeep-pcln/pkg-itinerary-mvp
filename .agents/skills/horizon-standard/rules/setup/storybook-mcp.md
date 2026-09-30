---
name: storybook-mcp
description: Configure Storybook MCP server for a horizon-using project — covers monorepo (preset addon + port registry) and external (raw config).
applies-to: setup
---

# Storybook MCP setup

## Why this is part of horizon-standard

The visual-verifier subagent depends on Storybook MCP to render and compare component variants. The skill carries Storybook MCP into every horizon-using project as a side effect of being invoked there. If MCP is missing, the skill offers setup proactively (non-blocking).

## pcln-web monorepo recipe

1. Add `@pcln/horizon-storybook-preset-addon` to the project's `package.json` (devDependency)
2. In the project's `.storybook/main.ts`:
   ```ts
   import { presetAddon } from '@pcln/horizon-storybook-preset-addon'

   export default {
     stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
     addons: [presetAddon],
     framework: '@storybook/react-vite',  // or whichever bundler the app uses
   }
   ```
3. Register a Storybook port in the monorepo port registry (`common/config/storybook-ports.json` or wherever the canonical registry lives — see horizon skill's port-registry reference). Pick the next available port.
4. Add scripts to `package.json`:
   ```json
   "scripts": {
     "storybook": "storybook dev -p <registered-port>",
     "storybook:build": "storybook build"
   }
   ```
5. Configure the MCP server — add an entry to the user's MCP config (Claude Code settings.json) pointing at the local Storybook URL. The horizon team ships a canonical MCP server entry shape.

## External repo recipe

1. Install Storybook fresh:
   ```bash
   npx storybook@latest init --type react
   ```
2. Configure `.storybook/main.ts` for horizon:
   ```ts
   export default {
     stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
     addons: ['@storybook/addon-essentials'],
     framework: '@storybook/react-vite',
   }
   ```
3. Import horizon's theme in `.storybook/preview.ts`:
   ```ts
   import '@pcln/horizon/theme.css'
   import '../src/styles/globals.css'  // or wherever the app's global CSS lives

   export default { /* parameters */ }
   ```
4. Run on a fixed port (default `6006` is fine in external repos):
   ```json
   "scripts": {
     "storybook": "storybook dev -p 6006"
   }
   ```
5. Register the local Storybook URL in the user's MCP config (same canonical entry shape).

## Bootstrap story

Always create one bootstrap story so MCP has something to verify against:

```tsx
// src/components/Bootstrap.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@pcln/horizon'

const meta: Meta<typeof Button> = {
  title: 'Bootstrap/Button',
  component: Button,
}
export default meta

export const Default: StoryObj<typeof Button> = {
  args: { children: 'Hello horizon' },
}
```

## Verification

```bash
# pcln-web
rushx storybook
# external
npm run storybook
```

Open the URL. The bootstrap story renders horizon's Button with theme tokens. Then test MCP by invoking the visual-verifier subagent on the bootstrap story.
