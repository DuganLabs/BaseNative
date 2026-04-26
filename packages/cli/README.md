# @basenative/cli

> The `bn` command — front door for every BaseNative / DuganLabs project.

Scaffolding, PRDs, spec-driven workflows (compatible with
[github/spec-kit](https://github.com/github/spec-kit)), GitHub
milestones/issues, Nx, Wrangler + Doppler deploys, and a `doctor` that calls
out drift. Zero heavy dependencies — Node built-ins only.

## Install

```bash
npm install -g @basenative/cli
# or, without installing:
npx @basenative/cli create my-app
```

## Quick start

```bash
bn create my-app --template t4bs
cd my-app
bn dev
bn deploy --preview
```

## Commands

### Front door

| Command | What it does |
|---|---|
| `bn create <name> [-t <template>]` | Scaffold a new project. Templates: `webapp` (default), `worker`, `library`, `t4bs`. Legacy: `minimal`, `enterprise`, `api`. |
| `bn prd init`                       | Write `docs/PRD.md` from the t4bs-format scaffold. |
| `bn prd edit`                       | Open `docs/PRD.md` in `$EDITOR`. |
| `bn prd sync`                       | Parse the milestones section → `.bn/prd-issues.json` (consumed by `bn gh sync`). |
| `bn speckit init`                   | Bootstrap `.specify/` (memory, specs, templates). |
| `bn speckit spec <name>`            | Scaffold `.specify/specs/NNN-name/spec.md`. |
| `bn speckit plan`                   | Stub `plan.md` for the active spec. |
| `bn speckit tasks`                  | Extract `tasks.md` items → `.bn/speckit-tasks.json`. |
| `bn speckit validate`               | Lint specs/plans/tasks for required fields. |
| `bn gh sync`                        | Idempotently create milestones + issues from `.bn/*.json`. |
| `bn gh board`                       | Create / verify the org Project for this repo. |
| `bn gh automate`                    | Verify `.github/workflows/deploy.yml` references `DuganLabs/.github` reusable workflows. |
| `bn nx [...]`                       | Passthrough to `nx` (uses your detected pm). `--task <t> [--affected]` shorthand for common runs. |

### Workflow

| Command | What it does |
|---|---|
| `bn dev`                                | Run the project's dev server (npm-script first, then `node --watch`, then `wrangler dev`). |
| `bn deploy --prod` / `--preview`        | `wrangler pages deploy` (or `wrangler deploy`), wrapped in `doppler run --` if Doppler is installed. |
| `bn deploy --env <preview|staging|production>` | Legacy basenative.cloud deploy. `--dry-run` prints a manifest. |
| `bn doctor`                             | Validate Node version, `.nvmrc`, packageManager, eslint config, tsconfig, doppler-required.json, deploy.yml. |
| `bn build`                              | Build for production. |
| `bn generate <type> <name>`             | Generate a `component`, `route`, or `page`. |
| `bn env <list|set|unset|pull|push>`     | Manage `.env`. |
| `bn analyze [dir]`                      | Bundle size + dependency report. |

## Options

Every command supports `--help`/`-h`. Top-level flags:

- `-h, --help`     Show help.
- `-v, --version`  Print the installed CLI version.

Commands that emit data accept `--json`. Commands that mutate the filesystem
or remote state accept `--dry-run`.

## End-to-end example

```bash
# 1. Scaffold and check
bn create rocket --template webapp
cd rocket
bn doctor

# 2. Author a PRD, sync to GitHub
bn prd init --owner "Warren"
$EDITOR docs/PRD.md         # fill in milestones
bn prd sync
bn gh sync                  # idempotent

# 3. Spec a feature
bn speckit init
bn speckit spec onboarding
bn speckit plan
bn speckit tasks
bn gh sync --input .bn/speckit-tasks.json

# 4. Build and ship
bn dev
bn deploy --preview
bn deploy --prod
```

## Templates

All templates ship with:

- `package.json` referencing `@basenative/*` packages.
- `eslint.config.js` extending `@basenative/eslint-config`.
- `tsconfig.json` extending `@basenative/tsconfig`.
- `.nvmrc`, `.prettierrc`, `.gitignore`.
- `wrangler.toml` (where applicable).
- `.github/workflows/deploy.yml` calling reusable workflows from
  `DuganLabs/.github`.

| Template | Stack |
|---|---|
| `webapp`  | Cloudflare Pages SPA + Worker, BaseNative runtime/router/server. |
| `worker`  | Cloudflare Worker (API / cron / queue). |
| `library` | npm-publishable library, Apache-2.0. |
| `t4bs`    | Game scaffold using `@basenative/og-image`, `keyboard`, `share`, `auth-webauthn`, `admin`, `persist`. |

## Manifest

`manifest.json` enumerates every command, subcommand, and flag — useful for
shell completions and downstream tooling.

## License

Apache-2.0.

<!-- Built with BaseNative — basenative.dev -->
