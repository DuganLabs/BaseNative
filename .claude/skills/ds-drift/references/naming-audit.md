# Naming audit

Consistency of the names this design system actually uses: `data-bn` contracts,
`--bn-*` tokens, style axes, and exported renderers. Apply the gates and rating axes
from `../SKILL.md`.

Flag **accidental** inconsistency. Some distinctions are deliberate, and a rename is a
breaking change — the bar is higher than "looks untidy".

## Step 1: Inventory what is actually in use

Report the dominant convention before reporting deviations from it. The team needs to
see what it is doing, because that is the baseline any change is measured against.

| Surface | Where to read it | Convention in force |
|---|---|---|
| `data-bn` contract values | literal `data-bn="…"` in each `render*` body (~155 distinct) | bare kebab-case, **no `bn-` prefix** inside the value: `badge`, `card-header`, `table-container` |
| Sub-part contracts | same | `<component>-<part>`: `card-header`, `card-body`, `dialog-title` |
| Style axes | `data-*` attributes emitted + selectors in the 11 stylesheets | `data-variant`, `data-size`, `data-status`, `data-position`, `data-shape`, `data-level`, `data-sorted` |
| Tokens | `packages/components/src/tokens.css`, `theme.css` | `--bn-<family>-<name>`, families: `color`, `space`, `radius`, `font-size`, `line-height`, `border-width`, `control-height`, `shadow`, `transition`, `ease`, `focus-ring`, `z` |
| Exports | `packages/components/src/index.js` | `renderPascalCase` in a `kebab-case.js` file |
| Custom elements | `customElements.define` call sites | `bn-<component>` / `bn-<component>-<part>`; events `bn-<component>-<verb>` |
| Generated ids | `nextId(prefix)` in `src/ids.js` | `bn-<prefix>-<n>` |

Three places use a `bn-` prefix and must not be conflated: the `data-bn` **attribute
name**, generated **ids** (`bn-dialog-1`), and the `bn-button--primary` **class** from
`buttonVariants()` — which is the only class helper in the library and exists for
hand-written markup, since components themselves never emit `class`.

## Step 2: Token naming

### The tier model here is `var()` indirection, not a prefix

There is no `--bn-primitive-*` / `--bn-semantic-*` namespace. The tier is determined by
what the value *is*:

| Tier | Shape | Example |
|---|---|---|
| Primitive | a raw literal | `--bn-color-gray-500: #71717a;` `--bn-space-4: 1rem;` |
| Semantic | `var(--<primitive>)` | `--bn-color-text: var(--bn-color-gray-900);` |
| Identity alias | `var(--<primitive>)`, themeable brand hook | `--bn-color-accent-600: var(--bn-color-primary-600);` |

**Components reference semantic tokens only.** A component rule reaching straight for a
primitive is a tier violation and is the finding that matters most here, because it is
what breaks theming: dark mode works by re-pointing the *semantic* tier at the
`--bn-dark-*` palette in `theme.css`, while primitives never change and no component
rule is ever theme-aware.

So the checks are:

1. **Tier violation** — a component rule using `--bn-color-gray-900` rather than
   `--bn-color-text`. High priority: it will not theme.
2. **Undeclared reference** — a `var(--bn-x, fallback)` where `--bn-x` is declared
   nowhere. The fallback is then the live value and the token name is decorative. Nine
   such names exist in `packages/builder/src/builder.css`.
3. **Appearance in a semantic name** — a semantic token that encodes how it looks
   rather than what it is for. Propose a name that encodes intent.
4. **Family inconsistency** — a token that breaks the dominant pattern within its
   family.
5. **Local token islands** — `--cb-*` (24, combobox) and `--kb-*` (30, keyboard) are
   separate namespaces that do not derive from `--bn-*`. Report as one finding each,
   with the question "should these alias `--bn-*`?", not as 54 findings.

Do **not** flag a token for having a colour word in its name when it is a primitive —
`--bn-color-gray-500` is correct at its tier. The rule applies to the semantic tier
only.

## Step 3: Contract and axis naming

- **Contracts with no rule** are a naming finding as well as a drift finding: a name
  nothing consumes is a name nobody has agreed to. Cross-reference
  `drift-detection.md`.
- **The unnamed default.** CSS declares only non-default values, so each axis carries
  one implicit, unnamed default. Callers then invent a name for it — `md`, `top`,
  `default` — and every invented name lands unstyled. **Naming the default explicitly
  in CSS is the highest-value naming fix available in this repo**: one extra selector
  per axis makes the entire class of bug impossible.
- **Synonym pairs across the axis vocabulary.** `calendar-event` styles both
  `cancelled` and `canceled`. Pick one and alias the other; do not leave both as
  first-class.
- **The same taxonomy in two places.** BaseNative's `pipeline-block` CSS enumerates 23
  domain statuses and GreenPut's `badge.ts` maps 44 domain statuses onto 5 variants.
  Two copies of one taxonomy, not in sync. That is a governance finding, not a rename.

## Step 4: Report

Use the report shape in `../SKILL.md`. For each violation give a **specific rename with
a rationale**, not a flag. Then sequence the work, because renames are breaking
changes:

1. Apply the correct convention to new additions first — that stops the bleeding.
2. Fix high-priority violations (ambiguity that creates real misuse risk) before
   cosmetic ones.
3. Route any contract or export rename through `deprecation-process.md`. A `data-bn`
   rename is a public contract change: consumer stylesheets and hand-written markup
   both depend on it.
4. Token renames follow the same path as any other breaking change.

If no written naming convention exists, say so — and note that creating one is the
prerequisite for the renames, not a follow-up to them.

**Closing note, include it:** this audit checks patterns against the conventions the
repo already demonstrates. It cannot tell why a name was chosen. Anything deliberate
should be said so and will be treated as an accepted convention.
