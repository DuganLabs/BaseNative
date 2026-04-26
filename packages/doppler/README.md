# @basenative/doppler

> Plumbing, not values. BaseNative gives every project the same Doppler workflow; Doppler holds the actual secrets.

A thin, dependency-free developer-experience layer over the [Doppler](https://www.doppler.com) CLI. Lets every DuganLabs repo (`basenative`, `duganlabs`, `greenput`, `pendingbusiness`, `ralph-station`, `t4bs`, `warren-sys`, `warrendugan`) bootstrap, validate, and run through Doppler the exact same way.

## Boundary rule

> BaseNative provides plumbing only. **It never reads, stores, or transmits values.**

Every command in this package shells out to `doppler` for the real work. The CLI exists to make the workflow consistent across projects — not to act as a secrets store of its own.

## Install

```bash
# Per-project
pnpm add @basenative/doppler

# The doppler CLI is a system dependency, not an npm dep:
brew install dopplerhq/cli/doppler         # macOS
curl -Ls --tlsv1.2 https://cli.doppler.com/install.sh | sh   # Linux
scoop install doppler                       # Windows

doppler login                                # one time
```

## One-time project setup

```bash
bn-doppler init my-app
```

This will:

1. Create a Doppler project named `my-app`.
2. Create configs `dev`, `prep`, `prod`.
3. Pin the local repo to the `dev` config (`doppler setup`).
4. Drop a starter `doppler-required.json` into the repo root.

Edit `doppler-required.json` to declare exactly which secrets the app expects:

```json
{
  "secrets": [
    { "name": "DATABASE_URL",   "required": true },
    { "name": "SESSION_SECRET", "required": true },
    { "name": "SENTRY_DSN",     "required": false }
  ],
  "configs": ["dev", "prep", "prod"]
}
```

Then set values via the dashboard or CLI:

```bash
doppler secrets set DATABASE_URL
doppler secrets set SESSION_SECRET
```

## Local dev workflow

```bash
# Recommended in your repo's package.json scripts:
{
  "dev":   "doppler run -- pnpm exec bn-wrangler pages dev dist",
  "build": "doppler run -- pnpm build"
}

# Or via the wrapper:
bn-doppler run -- pnpm dev
```

That's it. No `.env` files. No accidental commits of secrets. If a secret is missing, the app gets a fast, specific error at boot via `requireSecrets`.

## CI/CD wiring (GitHub Actions)

```bash
# Once, locally:
bn-doppler ci-token --config prod
# (it asks for confirmation, then prints the token)

# Add it to the repo:
gh secret set DOPPLER_TOKEN --body "<paste>"
```

Then in `.github/workflows/deploy.yml` (full snippet at `templates/.github-actions-doppler-snippet.yml`):

```yaml
- uses: dopplerhq/cli-action@v3

- name: Verify Doppler secrets
  env: { DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }} }
  run: pnpm exec bn-doppler verify --config prod

- name: Deploy
  env: { DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }} }
  run: doppler run --config prod -- pnpm exec bn-wrangler deploy
```

## `bn-doppler verify`

Cross-checks `doppler-required.json` against the actual Doppler config:

```bash
bn-doppler verify --config dev
# OK — all 3 required secret(s) are populated in config "dev".
```

If anything's missing, it exits non-zero and prints exactly which names are absent — perfect as the first step in CI before deploy.

## Programmatic API

```js
import {
  dopplerRun,
  requireSecrets,
  injectIntoWrangler,
  MissingSecretsError,
} from '@basenative/doppler';
import { loadRequired, findMissing } from '@basenative/doppler/required';

// Boot-time check (after `doppler run -- node ./server.js` injects env vars):
await requireSecrets(['DATABASE_URL', 'SESSION_SECRET']);

// Or pull straight from Doppler:
await requireSecrets(['DATABASE_URL'], {
  source: 'doppler',
  project: 'my-app',
  config: 'prod',
});

// Split resolved values into vars vs secrets for Wrangler:
const { vars, secrets } = injectIntoWrangler({
  env: process.env,
  names: ['APP_NAME', 'API_TOKEN', 'SESSION_SECRET'],
});

// Or run a child process under doppler:
await dopplerRun(['pnpm', 'build'], { config: 'prod' });
```

## Why this pattern

- **One playbook for every project.** `doppler run -- pnpm dev` works the same in `basenative`, `t4bs`, `greenput`, etc.
- **No `.env` drift.** Local dev, preview, and prod all read from the same canonical Doppler configs.
- **CI auditability.** A single `DOPPLER_TOKEN` in GitHub instead of 17 individual secrets.
- **Boot-time fail-fast.** `requireSecrets` turns a 3am production page into a 9am red CI run.
- **No values in BaseNative.** This package is plumbing — every actual secret lives in Doppler, end of story.

## License

Apache-2.0
