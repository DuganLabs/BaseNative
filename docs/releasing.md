# Release Process

BaseNative uses [Changesets](https://github.com/changesets/changesets) for version management.

## Adding a Changeset

After making a change that affects users:

```bash
pnpm exec changeset
```

Select the affected packages, choose the bump type (patch/minor/major), and write a summary.

## Releasing

1. Changesets accumulate on `main` via PRs
2. The release workflow (`.github/workflows/release.yml`) creates a "Version Packages" PR automatically
3. Merging that PR triggers:
   - Version bumps in all affected `package.json` files
   - `CHANGELOG.md` updates
   - `changeset publish`, which the workflow points at **GitHub Packages**
     (`registry-url: https://npm.pkg.github.com` before publish) — **not**
     npmjs.org. See the README's Quick Start and
     [`docs/package-inventory.md`](package-inventory.md) for why, and for
     which older `0.2.x`/`0.3.x` versions still sit on npmjs.org from before
     this move (stale, not maintained there).

## Manual Release (if needed)

```bash
# Version packages
pnpm exec changeset version

# Review changes
git diff

# Commit and push
git add .
git commit -m "chore: version packages"
git push

# Publish — same registry as CI (GitHub Packages, not npmjs.org)
npm config set @basenative:registry https://npm.pkg.github.com/
pnpm exec changeset publish
```

## Package Visibility

Every `@basenative/*` package publishes to GitHub Packages except three private
asset/tooling packages. This list is a summary — for the authoritative, current
per-package version and sync state (40 packages published, 3 private, 21 with a stale
npmjs mirror), see the generated
[`docs/package-inventory.md`](package-inventory.md).

| Package | Registry | Notes |
|---------|-----|-------|
| `@basenative/runtime` | GitHub Packages | Zero production dependencies |
| `@basenative/server` | GitHub Packages | Depends on `node-html-parser` |
| `@basenative/router` | GitHub Packages | Depends on `runtime` |
| `@basenative/forms` | GitHub Packages | Depends on `runtime` |
| `@basenative/components` | GitHub Packages | Depends on `runtime` + `forms` |
| `@basenative/fonts` | private | Asset package |
| `@basenative/icons` | private | Asset package |
| `@basenative/evals` | private | Eval harness; hand-authored corpus, not for external consumption |

---

_Last verified against the code: 2026-09-11._
