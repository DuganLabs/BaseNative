# Contributing

## Scope

BaseNative is an open-source `v0.x` framework preparing for v1.0. Contributions should favor:

- security and correctness
- semantic HTML defaults
- native platform primitives before custom ARIA composites
- honest documentation over aspirational marketing

## Development Setup

```bash
# Clone the repository
git clone https://github.com/DuganLabs/BaseNative.git
cd basenative

# Install dependencies (requires pnpm v10+)
pnpm install

# Run tests
pnpm exec nx run-many --target=test

# Run lint
pnpm exec nx run-many --target=lint

# Start the example app
pnpm start

# Start the enterprise example
pnpm exec nx serve basenative-enterprise-example

# Run benchmarks
node benchmarks/render.bench.js
node benchmarks/signals.bench.js

# Check bundle size
node scripts/bundle-size.js
```

## Architecture

```
packages/
  runtime/    — Client-side signals, hydration, diagnostics, devtools
  server/     — SSR rendering, streaming
  router/     — Client + server routing
  forms/      — Field state, validation, form management
  components/ — Semantic component templates + design tokens
  fonts/      — Custom font definitions
  icons/      — SVG icon assets

examples/
  express/     — Basic SSR example
  enterprise/  — Full CRUD reference app

benchmarks/   — Performance benchmarks
docs/         — API reference, guides, accessibility
```

## Development Priorities

1. Trust blockers (security, correctness)
2. Runtime/server correctness
3. Browser support and accessibility
4. Core semantic primitives
5. Broader framework surface

## Standards

- Do not introduce eval-like APIs.
- Do not oversell partial features in code comments or docs.
- Prefer named functions in templates over increasingly dynamic inline expressions.
- Prefer native elements when the platform already provides the semantics.
- All components must use semantic HTML elements.
- All interactive elements must be keyboard accessible.
- Include ARIA attributes only when native semantics are insufficient.

## Adding a New Component

1. Create `packages/components/src/<name>.js` with a `render<Name>()` function
2. Export from `packages/components/src/index.js`
3. Add CSS to `packages/components/src/components.css`
4. Add tests in `packages/components/src/components.test.js`
5. Add type declaration in `packages/components/types/index.d.ts`
6. Add accessibility entry in `docs/accessibility.md`
7. Add API documentation in `docs/api/components.md`

## Pull Requests

- Include tests when changing runtime or server behavior.
- Call out browser support implications explicitly.
- Document any new public behavior or limitation in the repo docs.
- Include a changeset (`pnpm exec changeset`) for any user-facing change.
- Ensure ESLint passes: `pnpm exec eslint <package>/src/`
- Ensure bundle size check passes: `node scripts/bundle-size.js`

## Code Style

- Pure JavaScript (ESM) — no TypeScript source, but `.d.ts` type declarations are maintained
- ESLint flat config with `no-eval`, `no-implied-eval`, `no-new-func` rules
- Prettier formatting (run `pnpm exec prettier --write .`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(runtime): add batch() API for synchronous signal updates
fix(server): handle null ctx in attribute binding
test(auth): add RBAC hierarchical inheritance tests
docs(api): add @basenative/fetch API reference
chore(ci): add bundle size check to PR workflow
```

Include a changeset for user-facing changes: `pnpm exec changeset`

## Adding a New Package

1. Create `packages/<name>/src/index.js`
2. Create `packages/<name>/package.json` with `"type": "module"` and `"exports": { ".": "./src/index.js" }`
3. Create `packages/<name>/project.json` with test and lint targets
4. Create `packages/<name>/src/<name>.test.js` with at least 10 test cases
5. Create `packages/<name>/README.md` for npm
6. Add docs to `docs/api/<name>.md`
7. Add the package to the packages table in the root `README.md`

## AI Assistant Guidelines

See [CLAUDE.md](CLAUDE.md) for guidance specific to AI assistants contributing to this repository.
