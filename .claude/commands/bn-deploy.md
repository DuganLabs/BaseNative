---
description: Gated deploy with explicit confirmation. Runs preflight checks, shows the diff being shipped, asks before pushing.
argument-hint: [--env staging|production]
allowed-tools: Bash, Read
---

# /bn-deploy

Deploy this project — carefully. Target env: **$ARGUMENTS** (default: `staging` if omitted).

Hard rule: **never deploy production without an explicit "yes, production" from the user in this turn.**

Preflight (run all, report all, don't stop on first failure):

1. `git status` — working tree clean? Untracked files?
2. `git rev-parse --abbrev-ref HEAD` — on `main`? If not, warn loudly.
3. `git fetch && git status -sb` — branch up to date with origin?
4. Tests: `pnpm test` (or `npx nx run-many --target=test --all`).
5. Lint: `pnpm lint` if present.
6. Build: `pnpm build` if present.
7. `git log origin/main..HEAD --oneline` — what commits are about to ship?

After preflight, present a summary:

```
Deploy target: <env>
Branch: <name> (<n> commits ahead of origin)
Tests: PASS / FAIL
Lint:  PASS / FAIL
Build: PASS / FAIL
Commits to ship:
  abc1234 feat: ...
  def5678 fix: ...
```

Then ask: **"Proceed with deploy to `<env>`? Type the env name to confirm."** Wait for the literal env name match.

If confirmed:
- staging: `wrangler deploy --env staging` (or the project's deploy script).
- production: re-confirm "Type 'production' once more". Then run.

After deploy: tail logs (`wrangler tail --env <env>`) for 30 seconds, report any errors.

If the `pre-bash-deploy-confirm.sh` hook fires, that's expected — answer it.

Built with BaseNative — basenative.dev
