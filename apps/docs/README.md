# cent Documentation Site

Documentation site for the cent financial math library, built with [Fumadocs](https://fumadocs.dev) and Next.js.

## Development

```bash
pnpm dev
```

This starts the dev server at http://localhost:3000.

## Content Structure

Documentation lives in two places:

1. **Site-level docs** in `content/docs/` - Core documentation like getting started, core concepts, guides
2. **Package docs** in each package's `docs/` folder - Integration-specific documentation

The build process automatically copies package documentation from:

- `packages/cent-zod/docs/` → `content/docs/zod/`
- `packages/cent-react/docs/` → `content/docs/react/`
- `packages/cent-supabase/docs/` → `content/docs/supabase/`

These copied directories are gitignored. The `copy-docs` script runs automatically before `dev` and `build`.

## Building

```bash
pnpm build
```

This runs the doc copy script and builds the Next.js site.

## Deployment

The site deploys to Cloudflare Pages.

### Manual deployment

```bash
pnpm build                # Build Next.js
pnpm pages:build          # Convert to Cloudflare Pages format
pnpm pages:deploy         # Deploy to Cloudflare
```

### CI deployment

Connect the repo to Cloudflare Pages with:

- Build command: `cd apps/docs && pnpm build && pnpm pages:build`
- Build output directory: `apps/docs/.vercel/output/static`

Note: The `.vercel/output/static` path is required by `@cloudflare/next-on-pages` which uses Vercel's Build Output API format internally.

## Interactive Playground

The `/playground` page provides an interactive TypeScript editor with the cent library available globally. Code is executed client-side using [Sucrase](https://github.com/alangpierce/sucrase) for TypeScript compilation.
