# @basenative/cli — Constitution

> The non-negotiable principles every spec for this CLI must respect.

## Core principles

1. **Zero heavy dependencies.** Node built-ins only. `parseArgs`, `spawn`,
   `fs`, `path`. No commander, yargs, ink, oclif, chalk.
2. **Fast startup.** Cold-path `bn --help` must run in <200ms on a modern dev
   machine. Lazy-import every command.
3. **`--help` everywhere.** Every command and subcommand has its own help.
4. **`--json` for machine output.** Anything that emits structured data
   accepts `--json`; default stdout is human-readable with ANSI color.
5. **`--dry-run` for mutation.** Any command that writes files or hits a
   remote service supports `--dry-run`.
6. **Idempotency.** `bn gh sync`, `bn prd sync`, `bn speckit init` are all
   safe to re-run.
7. **Actionable errors.** Every error includes a fix hint.

## Stack invariants

- Runtime: Node ≥ 20.11.
- Lint: `@basenative/eslint-config`.
- Tests: `node --test`.

## Definition of done

- [ ] Spec, plan, and tasks all exist and pass `bn speckit validate`.
- [ ] `node --test` passes.
- [ ] `bn --help` cold-start is still <200ms.
- [ ] README updated with any new command.
- [ ] CHANGELOG entry added.
