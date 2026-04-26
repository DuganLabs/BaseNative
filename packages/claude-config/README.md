# @basenative/claude-config

> Bundled Claude Code subagents, skills, slash commands, hooks, and settings for DuganLabs / BaseNative projects.

Every DuganLabs project should make the most of Claude Code. This package is the canonical bundle of agents, skills, commands, hooks, and settings — drop it into any repo with one command and you get the same tight workflow everywhere.

## Install

In any project that should get the BaseNative Claude Code config:

```bash
npx @basenative/claude-config install
```

It writes into `.claude/` (creating it if missing). Existing files are preserved unless you pass `--force` or confirm overwrite at the prompt. `settings.json` is **never overwritten** — only created if missing.

When BaseNative ships new templates, refresh:

```bash
npx @basenative/claude-config update
```

Verify and list:

```bash
bn-claude verify
bn-claude list
```

## What's inside

### Agents (`.claude/agents/`)

| Agent | When to invoke |
|---|---|
| **basenative-package-author** | Designing or scaffolding a new `@basenative/*` package — produces package.json, project.json, src/index.js, test skeleton, README. |
| **prd-author** | Writing a PRD from a fresh idea — interviews the user one question at a time, writes `docs/PRD.md`. |
| **speckit-spec-author** | Scaffolding a github/spec-kit style spec at `specs/NNN-slug/spec.md` with FR/NFR IDs and Given/When/Then scenarios. |
| **cf-deploy-doctor** | Diagnosing Cloudflare deploy failures — names the cause (binding, env, migration, secret) and gives the exact fix. |
| **og-image-designer** | Composing OG share images using the `@basenative/og-image` preset DSL — proposes 3 variants. |
| **auth-migration-planner** | Planning a phased migration from express-session / NextAuth / Lucia / Clerk to `@basenative/auth-webauthn`. |

### Skills (`.claude/skills/`)

| Skill | Trigger |
|---|---|
| **basenative-pattern** | "Is there a BaseNative pattern for X?" — searches `packages/*` and answers with a working snippet or "no, here's the gap." |
| **prd-driven-issue** | Turn a PRD section into ready-to-paste GitHub issue bodies. |
| **dl-doppler-setup** | Walk through Doppler setup for a project — login, project, configs, npm script wiring, CF bridge. |
| **dl-cf-binding** | Add a Cloudflare binding (D1/KV/R2/DO/Queue/Service) to `wrangler.toml` correctly the first time. |
| **dl-wcag-audit** | Drive Claude Preview / Chrome MCP to inject axe-core, run an audit, produce `docs/a11y-audit-YYYY-MM-DD.md`. |

### Slash commands (`.claude/commands/`)

| Command | What it does |
|---|---|
| `/bn-init <name>` | Scaffold a new BaseNative project + install this config. |
| `/bn-prd` | Invoke the prd-author subagent. |
| `/bn-spec <slug>` | Invoke the speckit-spec-author subagent. |
| `/bn-doctor` | Run `bn doctor` and propose fixes. |
| `/bn-deploy [--env]` | Gated deploy with explicit confirmation and post-deploy log tail. |

### Hooks (`.claude/hooks/`)

| Hook | Wired as | Purpose |
|---|---|---|
| `pre-commit-secret-scan.sh` | `UserPromptSubmit` | Block commits containing AWS / GitHub / Stripe / Anthropic / Slack / Doppler secrets. |
| `post-tool-edit-format.sh` | `PostToolUse` (Edit\|Write) | Run prettier on the file just edited. |
| `pre-bash-deploy-confirm.sh` | `PreToolUse` (Bash) | Block any `wrangler deploy` / `wrangler secret put` / destructive D1 SQL until re-confirmed. |

### Settings (`.claude/settings.json`)

The template:

- Allows safe operations (`ls`, `rg`, `git status/diff/log`, `pnpm test/lint/build`, `wrangler whoami`, `gh pr list`).
- Asks for risky ones (`git push`, `pnpm publish`, `wrangler deploy`, `wrangler secret put`, `gh pr create/merge`).
- Denies catastrophic ones (`rm -rf /`, `git push --force`, `curl | sh`).
- Wires the three hooks above.

Edit `.claude/settings.local.json` for personal tweaks — `settings.json` is the team contract.

## CLI reference

```
bn-claude install [--root DIR] [--force] [--dry-run] [--quiet]
bn-claude update  [--root DIR]               # alias for install --force
bn-claude verify  [--root DIR]
bn-claude list    [--root DIR]
bn-claude help
```

Zero runtime dependencies. Pure Node `parseArgs`, ANSI codes inline.

## Extending

To add a new agent / skill / command:

1. Drop a markdown file with YAML frontmatter into the appropriate directory in this package.
2. Bump the version, `pnpm publish`.
3. Consumers run `bn-claude update`.

For agent/skill/command formatting conventions, see Anthropic's docs:

- https://docs.claude.com/en/docs/claude-code/sub-agents
- https://docs.claude.com/en/docs/claude-code/skills
- https://docs.claude.com/en/docs/claude-code/slash-commands
- https://docs.claude.com/en/docs/claude-code/settings

## CLAUDE.md template

`CLAUDE.md.tmpl` is included for projects that don't have a memory file yet. `bn-claude install` drops it as `CLAUDE.md` (only if missing). Fill in `{{PROJECT_NAME}}`, `{{ONE_LINE_PITCH}}`, etc.

## License

Apache-2.0. Built with BaseNative — basenative.dev
