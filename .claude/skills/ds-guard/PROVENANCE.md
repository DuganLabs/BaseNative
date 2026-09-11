# PROVENANCE — ds-guard

## Upstream

| | |
|---|---|
| Repository | `github.com/josschavez/creating-shared-components-plugin` |
| Commit | `a6f5bde17b9f8206c947d788dc5196041c87df20` ("Translate skill and README to English", 2026-04-17) |
| File taken | `skills/creating-shared-components/SKILL.md` (425 lines) |
| Upstream licence | MIT |
| Vendored | 2026-09-11 |

**This is a fork, not an install.** It is committed to this repo and maintained here.
A marketplace or plugin update must never overwrite it. `.gitignore` ignores
`.claude/skills/*` (so marketplace installs stay out of the tree) and explicitly
un-ignores `.claude/skills/ds-guard/` so this fork is tracked.

`@basenative/claude-config` installs skills as flat `.claude/skills/*.md` files
(`packages/claude-config/src/paths.js`: `{ name: 'skills', glob: '*.md' }`). This fork
lives in a subdirectory, so `bn-claude install` cannot collide with or clobber it.

## What we kept

- **Entry Point B — the "new feature check".** Upstream's second entry point is the
  whole of ds-guard: before writing new UI, check whether a shared component already
  covers it. That is the only behaviour retained.
- **The 3+ repetition threshold** for when a new shared component is warranted, and
  the "build it inline, cleanly, so it is cheap to extract later" instruction for when
  it is not.
- **"Not checking existing components first"** from upstream's Common Mistakes table —
  restated as this skill's reason to exist.

## What we cut, and why

| Cut | Why |
|---|---|
| Phases 1–6 (AUDIT, PRESENT, DECIDE, CREATE, APPLY, REPORT) | That is retrofit work. It belongs to `ds-extract`, invoked by name. ds-guard fires constantly and must stay cheap; a six-phase process in a constantly-firing skill is a tax on every UI edit. |
| The HTML/Tailwind visual report (Phase 2) | Requires `cdn.tailwindcss.com`. BaseNative does not use Tailwind, and a browser report is far too heavy for a check that runs before every UI change. |
| Every Vue construct | `v-model`, `defineProps<{}>()`, `defineEmits<{}>()`, `inheritAttrs: false`, `v-bind="$attrs"`, `<slot />`, named slots, `.vue` SFCs, `components/ui/`. BaseNative is its own runtime: components are `render*` functions returning HTML strings. None of this maps. |
| Every Tailwind class reference | `appearance-none`, `pr-9`, `bg-gray-50`, `text-red-600`. BaseNative styles through `data-bn` contracts and `--bn-*` custom properties. |
| TypeScript prop typing rules | BaseNative packages are plain ESM JavaScript (`"type": "module"`, no `engines`, no TS build). |
| The two Graphviz `digraph` blocks | Decorative here; the decision collapses to two verdicts. |
| Live codebase search (`Grep`/`Glob` for the pattern) | Replaced — see below. |

## What we rewrote, and why

1. **Discovery: live search to generated index.** Upstream greps the codebase
   (`Grep: "appearance-none" in components/ and pages/`). This fork reads
   `.agents/component-index.json`, or its token-budgeted markdown form
   `.agents/component-index.md`, and is forbidden from falling back to live search.
   Reason: the index is generated from source in the same pass as `llms-full.txt` with
   CI failing when stale, so it is current by construction, and reading one file is far
   cheaper than a grep sweep in a skill that fires before every UI change. A live grep
   also cannot see the two usage shapes that matter in this repo — `data-bn` markup
   typed into a template string, and custom-element tags — which is why
   `scripts/component-usage.js` exists at all.

2. **Output: report to two-line verdict.** Upstream produces an audit with counts,
   variation tables and an impact summary. This fork produces one of exactly two
   verdicts in three lines or fewer.

3. **Variant discipline added.** Upstream has no equivalent. Added because
   `.agents/design-system-audit.md` §4 found that passing an undeclared variant does
   not error — it renders unstyled, silently — and that this is live in production
   (`renderBadge` receiving `neutral`). The index's `allowedVariants` is the guard.

4. **"Call the renderer, do not hand-roll its markup" added.** Upstream has no
   equivalent. Added because hand-rolled duplication of a component's `data-bn` markup
   is the one real duplicate the audit found outside tests and demos
   (`renderPackageCard` reproduced by hand in two DuganLabs files).

5. **Creation routed to `nx g`.** Upstream writes the component file directly
   ("Phase 4: CREATE — Build the Component ... File in `components/ui/`"). In this repo
   Nx owns generation, so ds-guard states the threshold and stops. The skill is
   forbidden from touching `nx.json` or `package.json`.

6. **Non-chaining made explicit.** Upstream flows AUDIT → ... → REPORT as one
   continuous process. Here the three skills must not chain: ds-guard never invokes
   `ds-extract` or `ds-drift`, and never recommends them as a next step.

7. **Emoji severity markers dropped** throughout, per repo house style
   (`.claude/agents/*`, `.claude/commands/*` use none).

## The component index did not exist when this was vendored

`.agents/component-index.json` **does not exist in the tree yet** — it is being built by
a parallel effort. This skill was written against the contract as stated in the brief:
per component, `name`, `package`, a one-line `purpose`, `allowedVariants`, and a
`useInsteadOf` line, generated from source in the same pass as `llms-full.txt`, with CI
failing when stale.

Two things here are assumptions rather than read facts, and are the first places to
check when the index lands:

1. **The markdown form's filename.** The brief specifies "a token-budgeted markdown
   form" but does not name the file. This skill reads `.agents/component-index.md`.
2. **The field names.** `name` / `package` / `purpose` / `allowedVariants` /
   `useInsteadOf` are this skill's rendering of the five fields the brief describes in
   prose. If the generator emits different keys, fix the table in `SKILL.md`.

Note also that `.agents/` is gitignored (`.gitignore:4`); the existing files there were
force-added by name. A generated index will need the same treatment or its own
un-ignore rule, and today **nothing in `.agents/` has a CI staleness gate** — `ci.yml`
gates only `bundle-size`, `package-inventory --check` and `llms-txt --check`.

## Divergence from repo convention, recorded deliberately

Existing BaseNative skills are authored in `packages/claude-config/skills/*.md` and
installed into `.claude/skills/`. These three forks are **not** authored there, because
they are forks of third-party packs local to this repo, not part of the published
`@basenative/claude-config` product. They are committed directly under
`.claude/skills/<name>/`.
