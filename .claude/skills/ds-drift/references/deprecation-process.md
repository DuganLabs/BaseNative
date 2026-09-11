# Deprecation process

Retiring a component, a `data-bn` contract, an option key or a `--bn-*` token, with a
migration path. Apply the gates and rating axes from `../SKILL.md`.

## Step 1: Say precisely what is being deprecated

Name the exact surface, because the blast radius differs enormously:

| Surface | Who depends on it |
|---|---|
| An exported `render*` function | importing call sites |
| A `data-bn` contract | **consumer stylesheets and hand-written markup** — public API, wider than the export |
| A style-axis value | anything passing that value, including dynamic expressions |
| A `--bn-*` token | every rule using it, in this repo and in consumer app CSS |
| A custom element tag | HTML files, which the usage scanner does not read |

A `data-bn` rename is not an internal refactor. Treat it as a public contract change.

## Step 2: Audit current usage — tiered, not raw

```bash
cd packages/validate && node ../../scripts/component-usage.js
```

Then tier every record (Gate 1) and report the tiers separately. The migration cost is
the test and demo count; the *justification* is the production count. Both matter, and
conflating them produces a wildly wrong estimate in this repo — 68% of all usage
records are tests.

For tokens and contracts, the scanner does not help. Grep the 11 stylesheets, and say
explicitly that consumer app CSS was **not** searched if it was not.

**Before asserting anything is unused, apply Gate 4.** The scanner cannot see same-file
use, `.html` files, dynamically built contract names, or a component whose custom
element is re-registered elsewhere. A zero from the scanner is a lower bound. Two of
the three components that reported zero in the last audit were not dead.

## Step 3: Write the plan

State each of these; an omission is what makes a deprecation stall.

**Why.** The concrete problem. "Inconsistent" is not a reason; "two components claim
`data-bn="combobox"` and any page loading both stylesheets gets both rule sets on one
element" is.

**What replaces it**, with a worked before/after using real option keys — not a
sketch.

**Migration path**, by call-site shape:

| Shape | Path |
|---|---|
| `import` + call | Mechanical. Candidate for `codemod-generator.md`. |
| Hand-rolled `data-bn` markup | Must be replaced with a call. Manual; the file never imported the renderer. |
| Custom element tag in `.html` | Manual, and **grep for it directly** — the scanner never walked those files. |
| Dynamic axis value | Manual. The value cannot be resolved statically. |

**Timeline**, with the deprecation marked in `docs/api/<package>.md` and the JSDoc from
day one. Nothing is removed in the same release it is deprecated in.

**Blast radius**, counted per tier, naming the packages and the consumer repos. Note
that consumer scope is fixed to five named sibling directories; any other downstream
repo is invisible and the count is a lower bound.

**Exceptions.** Call sites that legitimately cannot migrate, and what happens to them.

**Rollback.** What to do if the replacement turns out to be wrong after the old path is
gone.

## Step 4: Sequence it

1. Deprecate in docs and JSDoc; ship nothing else.
2. Migrate internal call sites (`prod-internal`).
3. Migrate consumer call sites (`prod-consumer`), which is the step that needs notice.
4. Migrate tests and demos — the largest count, the lowest risk.
5. Remove, in a release that says so.

Removing before step 4 leaves the test suite asserting on a surface that no longer
exists, and in this repo that is 68% of the references.

## Never

- Never deprecate on a scanner zero alone (Gate 4).
- Never deprecate a component for low adoption. 40 of 61 have no production usage;
  "not adopted yet" is not "dead", and that distinction is the whole point of the gate.
- Never generate the test fixtures for the migration. Name what should be covered and
  stop.
- Never edit `nx.json` or `package.json`.
