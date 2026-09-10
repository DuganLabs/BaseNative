# Eval corpus — hand-authored, not generated

**Every file in this directory is written by hand by the repo owner. No skill, no
subagent, and no model at any tier may generate one.**

This is not a style preference. If a model writes the prompt, the reference
implementation, *and* the assertion, the eval measures that model's self-consistency
and nothing else. It will produce a beautiful, high, meaningless number.

Agents may mechanically expand **from an existing hand-written seed** — varying a
parameter across cases whose shape a human already specified. Agents may not decide
what correct looks like. A cheaper model deciding it is the same failure as an
expensive one.

The harness enforces this by refusing to run against an empty corpus rather than
falling back to anything generated.

## Case format

One JSON file per case:

```json
{
  "id": "t1-interpolation-01",
  "tier": "T1",
  "prompt": "Show the user's name in a paragraph.",
  "context": { "user": { "name": "Ada" } },
  "assertions": [
    { "type": "renders_contains", "value": "<p>Ada</p>" }
  ]
}
```

`id` must be unique. `tier` is one of `T1`–`T5`.

### Scoring a stateful (T3) case: the `state` field

`context` is what the template is server-rendered with — plain values (or, for a
signal read like `count()`, a plain zero-arg function such as `count: () => 0`).
It is **not** live: SSR evaluates every `{{ }}` once and discards the expression.

A T3 case additionally needs its signal, computed, or effect exercised for real,
which is what `state` is for. Add `"state": { "<name>": <initial value> }` and the
harness wraps each entry in a real `@basenative/runtime` signal, mounts the
*generated template itself* — directives intact, not the rendered HTML — into the
same DOM shim `@basenative/runtime`'s own tests use, and runs the real client
`hydrate()` against it before any hydrate-family assertion below is checked:

```json
{
  "state": { "count": 0 },
  "assertions": [
    { "type": "hydrated_contains", "value": "0" },
    { "type": "after_set", "signal": "count", "value": 5,
      "then": { "type": "hydrated_contains", "value": "5" } }
  ]
}
```

A case needs `state` only if it has a hydrate-family assertion (or otherwise wants
live signals mounted); T1/T2/T4/T5 cases are unaffected and never pay for hydration.

## Tiers

| Tier | Content | Target |
|---|---|---|
| T1 | Single directive — interpolation, one `@if` | 20 |
| T2 | Composite — `@for` + `@if` + dynamic attributes | 20 |
| T3 | Stateful — signals, computed, effects, hydration | 20 |
| T4 | Full component — form + validation + submit | 20 |
| T5 | **Adversarial** — prompts phrased in React/Vue idiom | 20 |

**T5 is the scientifically interesting tier.** Phrase these in another framework's
vocabulary — "make this conditionally render", "bind the disabled prop", "map over
the items" — to measure nearest-neighbour drift directly rather than inferring it.

## Assertion types

| Type | Fields | Checks |
|---|---|---|
| `renders_contains` | `value` | Rendered HTML contains the substring |
| `renders_excludes` | `value` | Rendered HTML does not contain it |
| `renders_matches` | `value`, `flags?` | Rendered HTML matches the regex |
| `renders_equals` | `value` | Equal after collapsing whitespace |
| `renders_count` | `value`, `count` | Exact number of occurrences |
| `uses_directive` | `value` | The generated template used that directive |
| `hydrated_contains` | `value` | The hydrated DOM contains the substring, right after `hydrate()` runs |
| `hydrated_excludes` | `value` | The hydrated DOM does not contain it |
| `after_set` | `signal`, `value`, `then` | Sets a live signal from `state` to `value`, then re-checks the nested `then` assertion (any registered type — typically `hydrated_contains`/`hydrated_excludes`) against the resulting DOM |

The last three trigger the hydrate stage even without `state` on the case, but
`after_set` then has no signal to find — it fails that assertion cleanly (naming
the missing signal) rather than silently skipping the check. In practice, always
pair a hydrate-family assertion with the `state` entry it needs.

Assertion *types* are infrastructure. Assertion *values* are yours.
