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

## TypeDocs (Auto-generated API Reference)

The TypeDocs section at `/docs/type-docs` contains API documentation auto-generated from JSDoc comments in the source code using [TypeDoc](https://typedoc.org/).

### How it works

1. **TypeDoc generates markdown** from JSDoc comments in `packages/cent/src/`
2. **Output goes to** `packages/cent/docs/api/` (gitignored)
3. **copy-docs processes these files** by:
   - Adding frontmatter (title, description)
   - Organizing into grouped sections (Core Types, Math, Errors, etc.)
   - Copying to `content/docs/type-docs/` (gitignored)

### Regenerating TypeDocs

To update the API documentation after changing JSDoc comments:

```bash
# From the monorepo root
pnpm --filter @thesis-co/cent docs:api

# Then restart dev server or rebuild
pnpm dev
```

The `copy-docs` script runs automatically on `dev` and `build`, so you only need to manually run `docs:api` when JSDoc comments change.

### TypeDoc configuration

Configuration is in `packages/cent/typedoc.json`. Key settings:

- `outputFileStrategy: "members"` - Separate file per class/function/type
- `fileExtension: ".md"` - Use .md to avoid MDX JSX parsing issues
- `hidePageHeader: true` - Frontmatter is added by copy-docs instead

### Sidebar organization

The `copy-docs` script creates custom `meta.json` files to organize the sidebar:

- **Classes**: Core Types → Math → Results → Errors
- **Functions**: Factories → Configuration → Result Helpers → Type Guards → Utilities
- **Interfaces**: Configuration → Exchange Rates → Currency
- **Type Aliases**: Core Types → Math → Results & Errors → Exchange Rates → Currency Symbols → Time

To modify the organization, edit `TYPEDOC_META_CONFIGS` in `scripts/copy-package-docs.ts`.

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
