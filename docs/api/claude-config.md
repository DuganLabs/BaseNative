# @basenative/claude-config

> Bundled Claude Code subagents, skills, slash commands, hooks, and settings for DuganLabs / BaseNative projects. Drop in via `bn-claude install`.

## Overview

`@basenative/claude-config` is a distributable bundle of `.claude/` content (agents, skills, slash commands, hooks, and a settings template) plus a small JS installer API that copies that bundle into a target project. Most consumers never import the JS API directly — they run the bundled `bn-claude` CLI (`npx @basenative/claude-config install`). The JS exports are path-resolution and file-copying helpers used by that CLI (`src/bn-claude.js`, not part of this package's `exports` map) and by any tooling that wants to drive an install programmatically; the templates themselves (markdown agent/skill/command files, `settings.template.json`, `CLAUDE.md.tmpl`) are plain files shipped alongside `src/`, not JS values — `TEMPLATE_KINDS` describes where to find them on disk rather than embedding their content.

## Installation

```bash
npm install @basenative/claude-config
```

Typical usage is via the CLI rather than a dependency install:

```bash
npx @basenative/claude-config install
```

## Quick Start

```js
import { install, verify, listInstalled } from '@basenative/claude-config';

// Copy agents/skills/commands/hooks + settings.template.json + CLAUDE.md.tmpl
// into <projectRoot>/.claude/ (and <projectRoot>/CLAUDE.md).
await install({ projectRoot: process.cwd() });

// Check whether everything the bundle ships is present.
const { ok, missing } = verify({ projectRoot: process.cwd() });
if (!ok) console.log('missing:', missing);

// Enumerate what's currently installed, by kind.
const installed = listInstalled({ projectRoot: process.cwd() });
console.log(installed.agents, installed.skills, installed.commands, installed.hooks);
```

## API Reference

### Root (`@basenative/claude-config`)

Re-exports `PACKAGE_ROOT`, `TEMPLATE_KINDS`, `SETTINGS_TEMPLATE`, `CLAUDE_MD_TEMPLATE` from `./paths`, and `install`, `verify`, `listInstalled` (aliased from `install.js`'s `list`) from `./install`.

#### install({ projectRoot, force = false, dryRun = false, quiet = false } = {})

Installs the bundled templates into `<projectRoot>/.claude/`. For each entry in `TEMPLATE_KINDS`, copies every matching file from the package's source directory into the corresponding `.claude/` subdirectory. A destination file that already exists with identical content is skipped; one that differs is overwritten only if `force` is `true` or the user confirms an interactive prompt (auto-declined when stdin isn't a TTY). Applies the file mode from `kind.mode` where set (hooks are written `0o755`). Separately, `settings.template.json` is written to `.claude/settings.json` and `CLAUDE.md.tmpl` to `<projectRoot>/CLAUDE.md`, but **only if each destination doesn't already exist** — both writes use exclusive-create (`flag: 'wx'`) so an existing `settings.json` or `CLAUDE.md` is never clobbered, regardless of `force`.

**Parameters:**
- `projectRoot` — target project root. **Required**; throws if omitted.
- `force` — overwrite differing files without prompting; default `false`
- `dryRun` — report what would happen without writing anything; default `false`
- `quiet` — suppress per-file console logging; default `false`

**Returns:** `Promise<{ written: number, skipped: number, overwritten: number }>`

---

#### verify({ projectRoot } = {})

Checks that every file the bundle ships (per `TEMPLATE_KINDS`) is present under `<projectRoot>/.claude/`, and that `.claude/settings.json` exists.

**Parameters:**
- `projectRoot` — target project root. **Required**; throws if omitted.

**Returns:** `{ ok: boolean, missing: string[], present: string[], hasSettings: boolean }` — `ok` is `true` only when `missing` is empty and `hasSettings` is `true`. If `.claude/` itself doesn't exist, returns `{ ok: false, missing: ['.claude/'], present: [], hasSettings: false }` immediately.

---

#### listInstalled({ projectRoot } = {})

Lists installed files under each `.claude/` subdirectory covered by `TEMPLATE_KINDS` (agents, skills, commands, hooks) for a project. Exported from `./install.js` as `list` and re-exported at the package root as `listInstalled`.

**Parameters:**
- `projectRoot` — target project root. **Required**; throws if omitted.

**Returns:** `Record<'agents' | 'skills' | 'commands' | 'hooks', string[]>` — filenames present in each directory (empty array for a directory that doesn't exist).

---

### Paths (`./paths`)

Path constants used by the CLI and installer to locate the bundled templates on disk, resolved relative to the package's own `src/` directory via `import.meta.url`.

#### PACKAGE_ROOT

Absolute path to the package root — one directory above `src/` (i.e. the directory containing `agents/`, `skills/`, `commands/`, `hooks/`, `settings/`, `CLAUDE.md.tmpl`, and `src/`).

---

#### TEMPLATE_KINDS

Array describing each template category the bundle ships, used to drive `install`/`verify`/`listInstalled`:

```js
[
  { name: 'agents',   src: 'agents',   dest: 'agents',   glob: '*.md' },
  { name: 'skills',   src: 'skills',   dest: 'skills',   glob: '*.md' },
  { name: 'commands', src: 'commands', dest: 'commands', glob: '*.md' },
  { name: 'hooks',    src: 'hooks',    dest: 'hooks',    glob: '*.sh', mode: 0o755 },
]
```

`src`/`dest` are directory names relative to `PACKAGE_ROOT` and `<projectRoot>/.claude/` respectively; `glob` is a simple suffix filter (not a real glob); `mode`, when present, is applied via `chmodSync` after writing (hooks need to be executable).

---

#### SETTINGS_TEMPLATE

Absolute path to `settings/settings.template.json` under `PACKAGE_ROOT`. Installed to `.claude/settings.json` only if that file doesn't already exist — this is the file's team-wide settings template, never overwritten by `install`.

---

#### CLAUDE_MD_TEMPLATE

Absolute path to `CLAUDE.md.tmpl` under `PACKAGE_ROOT`. Installed to `<projectRoot>/CLAUDE.md` only if that file doesn't already exist.

## Integration

The `bn-claude` CLI binary (`src/bn-claude.js`, not part of the package's `exports` map) is a thin `parseArgs` wrapper over this same API: `install`, `update` (alias for `install --force`), `verify`, and `list` map directly to the four functions documented above. The actual agent/skill/command/hook/settings content lives as plain files under `agents/`, `skills/`, `commands/`, `hooks/`, and `settings/` in this package — see the package README for what's bundled — and is intentionally not re-exported as JS; only the paths to it are.

## License

Apache-2.0
