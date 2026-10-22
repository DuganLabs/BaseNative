# Release Process

BaseNative uses [Changesets](https://github.com/changesets/changesets) for version management. Every public package publishes to **https://registry.npmjs.org**. The generated status is [`docs/package-inventory.md`](package-inventory.md).

## Adding a Changeset

After making a change that affects users:

```bash
pnpm exec changeset
```

Select the affected packages, choose the bump type (patch/minor/major), and write a summary. Do not add a changeset for a release-tooling-only change.

## Releasing

1. Changesets accumulate on `main` via PRs.
2. The release workflow (`.github/workflows/release.yml`) opens a "Version Packages" PR.
3. Merging that PR runs the `prd` environment job, which versions the packages and runs `node scripts/publish-release.mjs`.

Publishing has two lanes:

- **Trusted publishing (OIDC).** Packages that already have a trusted publisher for this repo, `.github/workflows/release.yml`, and the `prd` environment are published by `changeset publish` with provenance. No npm token is on that lane.
- **Stage-only bootstrap.** `NPM_BOOTSTRAP_TOKEN` is a granular **stage-only** token. It can run `npm stage publish`. It cannot `npm publish`: a direct publish fails with `EOTP` (the registry asks for 2FA) or `E_STAGE_REQUIRED`. Bypass-2FA tokens are not used. npm removes direct publish with those tokens in January 2027.

The stage lane runs for any package OIDC cannot publish. That is a brand-new package (a trusted publisher can only be added on a package page, and the first publish creates the page) and an existing package that does not have a trusted publisher yet. The script runs `pnpm pack` first, so `workspace:` ranges are rewritten to real versions, checks the packed manifest contains no `workspace:` string, then runs `npm stage publish` on that tarball. The dist-tag matches `pnpm publish`: `latest` for a stable version, and the prerelease identifier (`1.2.3-beta.1` → `beta`) otherwise. A version that is already staged is left staged; the job does not treat that as an error. An E409 that says the version was already published (`Cannot stage previously published version`) is reported as published, not staged. The stage command runs only after a registry read misses that version, and a version OIDC already published is not staged again.

The job succeeds when every publishable package is either on the registry or staged. It fails only on a real error.

Staged versions are not installable. The log lists each staged package and its stage id, then:

```text
Approve at https://www.npmjs.com/settings/warrendugan/staged-packages (Staged Packages) with 2FA.
```

Staging a package that has never existed also publishes a public placeholder, `0.0.0-stage`. The staged version itself stays private until it is approved.

After the first approval, add a trusted publisher for each staged package on npmjs.com (the package's settings: this repo, `.github/workflows/release.yml`, environment `prd`). Adding a trusted publisher needs interactive 2FA, so the owner does it in the browser. The next release of that package then publishes over OIDC.

The clean-install smoke test runs against the public registry after a publish. It skips any core package whose version was only staged.

## Manual approval

Do not `npm publish` with the stage-only token. Approve from the Staged Packages page above, or from a machine where you can enter 2FA:

```bash
npm stage list
npm stage approve <stage-id> --otp <code>
```

---

_Last verified against the code: 2026-10-22._
