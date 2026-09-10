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

Assertion *types* are infrastructure. Assertion *values* are yours.
