---
name: dl-doppler-setup
description: Use this when starting a new DuganLabs project that needs secrets, or when an existing project's .env workflow needs to move to Doppler. Walks through `doppler login`, project creation, environment setup (dev/staging/prod), pulling secrets into wrangler / Node, and wiring the `doppler run --` prefix into npm scripts. Expect: a working `doppler.yaml`, updated package.json scripts, and a verification command that prints a non-secret env var to confirm injection.
---

# DuganLabs Doppler Setup

You get a project from "secrets in .env" to "secrets in Doppler" without leaking anything along the way.

## When to invoke

- New DuganLabs project, secrets needed.
- Existing project still using `.env` / `.dev.vars` checked-in or copy-pasted between machines.
- User says "let's add Doppler", "move secrets out of .env", "set up Doppler for this".

## Walkthrough (do these one at a time, confirm each)

1. **Pre-flight**: `doppler --version`. If missing: `brew install dopplerhq/cli/doppler`.
2. **Login**: `doppler login` (opens browser). Confirm with `doppler me`.
3. **Project**: prompt for project name. Convention: matches the repo name (`t4bs`, `pendingbusiness`, etc.).
   - `doppler projects create <name>` (skip if exists).
4. **Configs**: ensure `dev`, `stg`, `prd` exist. `doppler configs --project <name>`.
5. **Setup local link**: in repo root, `doppler setup --project <name> --config dev`. Creates `doppler.yaml`.
6. **Migrate existing .env**:
   - `doppler secrets upload .env --project <name> --config dev` (then **delete .env from disk** and ensure it's gitignored).
   - For Cloudflare: `.dev.vars` → `doppler secrets upload .dev.vars`.
7. **Wire npm scripts**. Wrap whatever runs the app:
   ```json
   "scripts": {
     "dev": "doppler run -- node server.js",
     "deploy:stg": "doppler run --config stg -- wrangler deploy --env staging",
     "deploy:prd": "doppler run --config prd -- wrangler deploy --env production"
   }
   ```
8. **Cloudflare bridge**: for production deploys, `doppler secrets download --no-file --format docker | xargs -I {} wrangler secret put {} --env production` (or the user's preferred bulk approach).
9. **Verify**: add a non-secret like `APP_NAME=...` and run `doppler run -- node -e 'console.log(process.env.APP_NAME)'`. Should print.

## Rules

- **Never echo a secret value.** When verifying, use a non-secret or `process.env.SECRET ? "set" : "missing"`.
- **Always gitignore `.env*`** before any upload step.
- **Don't commit `doppler.yaml`** if it pins a service token. The plain `setup` form is safe.
- **Service tokens for CI**: create read-only tokens scoped to one config. Never reuse personal tokens.

Built with BaseNative — basenative.dev
