# .specify/

Spec-driven development for `@basenative/cli` itself. Compatible with
[github/spec-kit](https://github.com/github/spec-kit) — drop into another
repo and the same `bn speckit ...` workflow applies.

Workflow:

1. `bn speckit spec <name>` — write the *what*.
2. `bn speckit plan` — write the *how*.
3. `bn speckit tasks` — extract actionable work.
4. `bn speckit validate` — lint everything.
5. `bn gh sync` — push tasks to GitHub issues.
