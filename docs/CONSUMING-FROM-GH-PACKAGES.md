# Consuming `@basenative/*` from GitHub Packages

BaseNative publishes to **GitHub Packages**, not npmjs.org. This is deliberate — open-source projects in the DuganLabs org get unlimited free Actions minutes and bandwidth on GH Packages, so it's the right home for our shared libraries.

## One-time setup (per developer / per CI)

### 1. Create a fine-grained PAT with `read:packages`

`https://github.com/settings/tokens?type=beta` → New token →
- Resource owner: `DuganLabs`
- Repository access: All repositories (or specifically the consuming repo)
- Permissions: **Account permissions → Packages: read**

Save the token securely.

### 2. Configure your project's `.npmrc`

In the consuming repo (e.g. `t4bs`, `pendingbusiness`, etc.), add a project-local `.npmrc`:

```
@basenative:registry=https://npm.pkg.github.com/
```

### 3. Auth at install time

Two patterns:

**Local dev:** add to `~/.npmrc`:
```
//npm.pkg.github.com/:_authToken=ghp_yourTokenHere
```

**CI:** set `NODE_AUTH_TOKEN` env when calling `npm/pnpm install`. With GitHub Actions on a DuganLabs repo, you can use the built-in `GITHUB_TOKEN`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: 'https://npm.pkg.github.com'
    scope: '@basenative'
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For non-DuganLabs repos pulling these packages, mint a deploy-scoped PAT and add as a repo secret.

## Consuming a package

```bash
npm install @basenative/og-image
```

```js
import { renderPng, scoreCardPreset } from '@basenative/og-image';
```

That's it.

## What's available

After the next release tag, all of these will be on GitHub Packages:

| Package | Purpose |
|---|---|
| `@basenative/runtime` | signal-based runtime (<5KB) |
| `@basenative/server`, `router`, `components`, `forms`, `fetch`, `realtime` | app stack |
| `@basenative/auth`, `auth-webauthn` | auth + passkeys |
| `@basenative/db`, `middleware`, `upload`, `tenant`, `flags`, `notify`, `i18n`, `date`, `markdown` | backend + utility |
| `@basenative/og-image`, `keyboard`, `admin`, `persist`, `share`, `combobox`, `favicon` | UX primitives |
| `@basenative/wrangler-preset`, `doppler` | infra |
| `@basenative/eslint-config`, `tsconfig` | shared configs |
| `@basenative/cli` | the `bn` CLI |
| `@basenative/claude-config` | Claude Code agents/skills bundle |

## Publishing flow

The Release workflow runs on every push to `main`:
1. Lint + test all packages
2. If a Changeset bumps any version, open a "Version Packages" PR
3. When that PR merges, publish bumped packages to GitHub Packages

To cut a release: `pnpm changeset` → describe the change → commit + push → CI does the rest.
