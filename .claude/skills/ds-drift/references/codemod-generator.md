# Codemod generator

Mechanical, repo-wide substitutions that are too large to do by hand and too risky to
do with a bare `sed`. Apply the gates and rating axes from `../SKILL.md`.

## Before writing anything: is this actually mechanical?

A codemod is justified only when the transform is **unambiguous**. If a human has to
read the surrounding declaration to know the right answer, it is not a codemod — it is
a review task with a checklist. Saying so is a valid outcome.

The canonical trap in this repo is the ambiguous token. `1rem` is declared as both
`--bn-font-size-base` and `--bn-space-4`; `0.75rem` is three tokens. Only the property
it sits in decides. In the last count, 9 ambiguous rows accounted for 57 of 136
occurrences — **do not sed those**. The 8 unambiguous single-token rows (`1px` 32,
`2px` 22, `#a1a1aa` 8, `0.375rem` 7, `4rem` 4, `1.125rem` 3, `#f4f4f5` 2, `#18181b` 1
— 79 occurrences) are the ones that can run mechanically.

## The five transform types that apply here

There is **no JSX and no TypeScript in this repo**, so jscodeshift and ts-morph
recipes do not apply. The transforms are:

| # | Type | Surface |
|---|---|---|
| 1 | Token substitution | a literal value in a CSS declaration to `var(--bn-*)` |
| 2 | Token rename | a `--bn-*` name, at both its declaration and every `var()` |
| 3 | Option-key rename | a key in a `render*` destructure **and** at every call site |
| 4 | `data-bn` contract rename | the literal in the renderer, every CSS selector, and every hand-rolled copy |
| 5 | Axis-value rename | a value in emitted markup, in CSS selectors, and at call sites |

Types 4 and 5 cross the JS/CSS boundary. A codemod that updates only one side ships a
broken contract, so both sides go in the same transform and the same commit.

## Rules for the transform itself

**Never regex the template language.** Markup lives inside JS template literals here.
To find a tag or an attribute, tokenize with the real tokenizer:

```js
import { scanTags, scanInterpolations, spanAt } from '@basenative/validate/scan';
```

It is linear, ReDoS-safe and comment-aware, and it is the same tokenizer the validator
and the runtime's renderer use. Re-approximating it with a regex is the specific
mistake `scripts/component-usage.js` exists to prevent.

**Strip CSS comments before matching values.** Not doing this is how the previous
tooling reported `#2e5bff` as a violation when the text was a contrast-ratio note in a
comment.

**Never rewrite a `--bn-*` declaration into a reference to itself.** Exclude token
definitions from value substitution, or `--bn-border-width: 1px` becomes
`--bn-border-width: var(--bn-border-width)`.

**Leave `var(--bn-x, #hex)` fallbacks alone.** The hex there is a fallback, not a loose
value, and substituting the matching token treats the symptom. If `--bn-x` is
undeclared, the finding is the undeclared token — fix that instead.

**Ship a dry run, and make it the default.** Print the file, line, before and after for
every site, and the count, without writing.

**Preserve formatting.** Quote style, indentation and trailing commas stay as they
were. A codemod whose diff is mostly reformatting cannot be reviewed.

## Untransformable patterns: stop, do not guess

When a site cannot be transformed safely, **leave the original untouched**, and report
it with file and line. Do not transform incorrectly, and do not silently skip.

Common cases here:

- **Dynamic axis values** — `variant: card.badgeVariant || 'default'`,
  `status: card.status`, `variant: statusColors[x] ?? 'neutral'`. Eight of thirteen
  production axis arguments are this shape.
- **Interpolated contract names** — a `data-bn` built across a `${…}` hole never
  resolves statically. (These should not exist: `data-bn` values are required to be
  static literals precisely so tooling can see them. Finding one is itself a finding.)
- **Arguments spanning an interpolated template** — the audit already hit one call site
  whose argument text could not be recovered.
- **Ambiguous token values** — see above.
- **Consumer repos** — outside this repo's tree. Report the sites; do not reach across
  and edit another repository.

## Verification, in this repo's actual commands

```bash
pnpm exec nx run-many --target=test     # node --test under the hood
pnpm exec nx run-many --target=lint     # eslint
node scripts/bundle-size.js
git diff                                 # read it; a codemod diff is reviewed, not trusted
```

If the transform touched anything the generated artefacts derive from, re-run their
checks — `node scripts/llms-txt.js --check` and
`node scripts/package-inventory.js --check` are what CI runs.

## Never

- **Never generate test cases, fixtures, corpora or assertions** for the codemod, at
  any model tier, including via a subagent. They are hand-authored by the owner. State
  which cases need covering — basic, no-op, multiple occurrences, dynamic value,
  untransformable — and stop there.
- Never run the transform without showing the dry run first.
- Never edit `nx.json` or `package.json`.
- Never write to a consumer repository.
