# Tasks: CLI Overhaul

> Spec: 001-cli-overhaul

- [x] T01 Add lib/colors.js (ANSI helper) [P]
- [x] T02 Add lib/template.js (token interpolation + path renaming) [P]
- [x] T03 Add lib/pkg-manager.js (detect pnpm/npm/yarn/bun) [P]
- [x] T04 Add lib/git.js (sync wrappers) [P]
- [x] T05 Add lib/gh.js (sync wrappers around the gh CLI) [P]
- [x] T06 Author webapp/worker/library/t4bs templates [P]
- [x] T07 Rewrite commands/create.js to use template engine
- [x] T08 Add commands/prd.js (init/edit/sync)
- [x] T09 Add commands/speckit.js (init/spec/plan/tasks/validate)
- [x] T10 Add commands/gh.js (sync/board/automate)
- [x] T11 Add commands/nx.js (passthrough)
- [x] T12 Add commands/doctor.js
- [x] T13 Update commands/dev.js (pkg-manager-aware)
- [x] T14 Update commands/deploy.js (wrangler + doppler)
- [x] T15 New dispatcher in src/index.js with banner + did-you-mean
- [x] T16 Add manifest.json for shell completion
- [x] T17 Dogfood .specify/ for the CLI itself
- [x] T18 Update README.md with full command reference
- [x] T19 Add CHANGELOG entry
