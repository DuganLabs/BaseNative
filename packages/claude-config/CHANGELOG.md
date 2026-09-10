# @basenative/claude-config

## 0.2.1

### Patch Changes

- 99561f7: Fix file-system TOCTOU races (CodeQL `js/file-system-race`) in the installer: template, `settings.json`, and `CLAUDE.md` writes now use an exclusive create or a read-based existence check instead of `existsSync` followed by a separate write, closing the window where a file created in between could be silently overwritten. Also fixes an incomplete sanitization (CodeQL `js/incomplete-sanitization`): the glob-to-extension conversion used `.replace('*', '')`, which only strips the first `*`; now uses `.replaceAll('*', '')`. No user-visible behavior change.

## 0.2.0

### Minor Changes

- 3ce5feb: Initial release: bundled Claude Code subagents, skills, slash commands, hooks, and settings template for DuganLabs / BaseNative projects, plus a `bn-claude install` CLI for idempotent project setup.
