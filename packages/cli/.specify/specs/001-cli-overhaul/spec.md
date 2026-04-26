# Spec: CLI Overhaul

> Status: shipped
> Spec ID: 001-cli-overhaul
> Owner: Warren Dugan

## Why
The `bn` CLI is the default front door for BaseNative. Today it's thin —
create / dev / build / generate / deploy / env / analyze. New users hitting
`bn --help` don't see a path to the things that matter most: PRD scaffolding,
spec-driven workflows, GitHub milestones, Nx, Doppler. We need to make `bn` a
fully-formed tool that earns the "trillion-dollar polish" bar.

## What
- Add `create` template overhaul: `webapp`, `worker`, `library`, `t4bs`.
- Add `prd init|edit|sync`.
- Add `speckit init|spec|plan|tasks|validate`.
- Add `gh sync|board|automate`.
- Add `nx` passthrough.
- Add `doctor`.
- Polish: ANSI color, banners, suggestions on typo, --json everywhere.

## User stories
- As a new contributor, I want `bn create my-app --template t4bs` to give me
  a runnable repo with eslint/tsconfig/wrangler/Doppler pre-wired.
- As an owner, I want `bn prd init` then `bn prd sync && bn gh sync` to push
  my milestones to GitHub idempotently.
- As an LLM-assisted dev, I want `bn speckit spec foo` to give me a folder
  structure compatible with github/spec-kit.

## Acceptance criteria
- [x] `bn create webapp/worker/library/t4bs` produce well-formed projects.
- [x] All commands have `--help`, color output, --json where applicable.
- [x] `bn doctor` reports actionable findings.
- [x] No new runtime deps.
- [x] Existing tests still pass.

## Out of scope
- Real LLM integration for `bn speckit plan` (just scaffold the workflow).
- Implementing `bn doctor --fix` autoremediation.

## Open questions
- Should `bn nx` warn if the workspace has no `nx.json`?
- Should `bn create` offer interactive picker if no template flag?
