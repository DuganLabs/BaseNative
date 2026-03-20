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
2. The release workflow creates a "Version Packages" PR automatically
3. Merging that PR triggers:
   - Version bumps in all affected `package.json` files
   - CHANGELOG.md updates
   - npm publish for public packages
   - Git tags for each published version

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

# Publish to npm
pnpm exec changeset publish
```

## Package Visibility

| Package | npm | Notes |
|---------|-----|-------|
| `@basenative/runtime` | public | Zero dependencies |
| `@basenative/server` | public | Depends on node-html-parser |
| `@basenative/router` | public | Depends on runtime |
| `@basenative/forms` | public | Depends on runtime |
| `@basenative/components` | public | Depends on runtime + forms |
| `@basenative/fonts` | private | Asset package |
| `@basenative/icons` | private | Asset package |
