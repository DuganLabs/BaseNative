# Plan: CLI Overhaul

> Spec: 001-cli-overhaul

## Approach
Lazy-loaded dispatcher in `src/index.js`. Each command is its own module under
`src/commands/`. Shared helpers under `src/lib/` (colors, template, git, gh,
pkg-manager). Templates ship as on-disk directories under `templates/`.

## Architecture
- `src/lib/template.js` — `{{token}}` interpolation + path renaming, no Handlebars.
- `src/lib/colors.js` — tiny ANSI helper, NO_COLOR aware.
- `src/lib/{git,gh,pkg-manager}.js` — sync subprocess wrappers.
- Commands register in `src/index.js` `COMMANDS` map and `manifest.json`.

## Risks
- Wrangler/Doppler not installed locally → fall back gracefully.
- `gh` token missing `project` scope → emit a hint, don't crash.
- Existing tests assume legacy template names → keep them registered as
  in-memory generators.

## Rollout
Ship behind no flag. Major version stays 0.x.
