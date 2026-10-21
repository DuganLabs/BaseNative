# BaseNative vs React — head-to-head coding benchmark

**Date:** 2026-10-17 · **Node** v24.20.0 · **React** 19.3.1 · **BaseNative** runtime 0.6.4 / server 0.6.4 / router 0.5.2 (vendored)
**Machine-readable results:** `results.json` · **Full iteration history:** `RUN_LOG.md` · **Agent docs bundle:** `agent-docs/llms.txt`

## Re-verification against the published 2.0.1 packages (2026-10-18)

The original run above used vendored 0.6.4 packages because BaseNative was
not yet on npm. On 2026-10-18 the identical benchmark — same app code, same
tests, same measurement script — was re-run against the **published
@basenative/runtime, @basenative/server and @basenative/router 2.0.1**
npm tarballs (`results.json` in this folder is now that run's output).
Outcome: **no measured value changed.**

- Both suites pass 4/4 on 2.0.1, React side unchanged (19.3.1).
- Lines and tokens are identical (95/114 lines, 827/795 tokens) — the app
  code did not change, and neither did what it costs to write it.
- Dependency closures re-derived from the real 2.0.1 `package.json` files:
  runtime declares zero dependencies; server depends on the runtime and
  `node-html-parser`. Task closures stay 3 (task 1) and **1** (task 2).
- React's task-2 bundle rebuilt at exactly **1,181,977 bytes**. The entire
  BaseNative runtime source tree at 2.0.1 is **78,146 bytes** (was 77,071
  at 0.6.4 — the 2.0.1 `:value`/`:checked` property-sync fix added code).
- Fix-iteration counts are the original authoring record; a re-run cannot
  change them, and none of the 2.0.x changes altered the API surface the
  tasks exercise (the 2026-10-18 three-LLM trial ran the same patterns
  against 2.0.0 independently).
- One number moved in BaseNative's favor outside the tasks themselves:
  the repo's shipped `llms.txt` is now 6,885 bytes (≈1,721 tokens), down
  from the 10,360-byte (≈2,590-token) bundle this benchmark used. The
  amortization verdict is unchanged — at −16 tokens/task there is still
  no break-even; the smaller file just lowers the one-time cost.

## Re-verification against the published 2.1.0 packages (2026-10-20)

The identical benchmark was re-run again against the **published
@basenative/runtime, @basenative/server and @basenative/router 2.1.0**
npm tarballs (`results.json` in this folder is now that run's output).
React stays 19.3.1 — still the current release on npm at the re-run
date. Outcome: **no measured value changed.**

- Both suites pass 4/4 on 2.1.0.
- Lines and tokens are identical (95/114 lines, 827/795 tokens), as are
  the fix-iteration counts (the original authoring record) and the
  dependency closures (3 for task 1, **1** for task 2), re-derived from
  the 2.1.0 `package.json` files: the runtime declares zero
  dependencies; the server depends on the runtime and
  `node-html-parser`; the router depends on the runtime.
- React's task-2 bundle rebuilt at exactly **1,181,977 bytes**. The
  BaseNative runtime source tree is **78,146 bytes** — byte-identical
  to 2.0.1; the 2.1.0 release did not change the runtime package's
  source.
- Sole environment delta: `node-html-parser` installed at 9.0.5 (9.0.4
  in the 2.0.1 run), inside the server's declared `^9.0.4` range.
- The repo's shipped `llms.txt` is now 7,041 bytes (≈1,760 tokens), up
  slightly from 6,885 at 2.0.1 as the docs grew; the amortization
  verdict is unchanged.

## The question

Warren's challenge: *confirm, with measurements, whether BaseNative is better
for an LLM to write with than React — even though the model's training gives
React an enormous head start.* This benchmark was run by an LLM agent (the
same kind of author the question is about), writing both implementations
first-pass, running identical behavior tests, and logging every fix.

## Verdict (read the numbers below before quoting this)

**Qualified yes on writing experience; no on code size.**

- ✅ **Confirmed:** BaseNative needed **no build step, no build config, and
  zero harness/tooling fixes** across both tasks. React needed an esbuild
  pipeline that went through **three configuration states** and **4
  harness/tooling fixes** before its suites ran clean — every one of them a
  framework-ism (SSR `<!-- -->` text separators, CJS→ESM dynamic-require,
  async effect settling under `act()`, a getter-only global). None of that
  friction exists on the BaseNative side: its effects are synchronous, its
  SSR output is byte-for-byte the template you wrote, and its tests assert
  immediately after a click.
- ✅ **Confirmed:** production dependency closure for the interactive task:
  **1 package** (BaseNative runtime, itself zero-dependency) vs **3**
  (react, react-dom, scheduler). The shipped-code weight gap is stark even
  unminified: React's task-2 bundle is **1,181,977 bytes**; the *entire*
  BaseNative runtime source tree is **77,071 bytes**.
- ❌ **Not confirmed — reported as-is:** the hypothesis that BaseNative code
  is *smaller*. On these two tasks it wasn't. BaseNative used **fewer lines
  (95 vs 114, −17%)** but **slightly more code tokens (827 vs 795, +4%)**,
  because HTML templates carry closing tags and longer lines than JSX.
  Consequently the agent-docs amortization **has no break-even through
  code-size savings** at this task size (average saving −16 tokens/task).
  Anyone claiming "LLMs write less code with BaseNative" cannot cite this
  benchmark.
- ⚠️ **Honest debit against BaseNative:** the only *application-code* bug in
  the whole benchmark was BaseNative's — a diamond-subscription effect that
  fired twice per change (fix BN-1). React's app code needed **zero** fixes;
  the model's React fluency is real and it showed. BaseNative's bug is now
  documented in the docs bundle the benchmark produced, which is the point
  of the bundle: 2,590 one-time tokens that buy down exactly this class of
  error (plus the stale-starter trap that caused a real failure earlier the
  same day).

**Bottom line:** for an LLM author, BaseNative was better to *write with* —
measured in build/tooling friction, test determinism, dependency weight, and
output fidelity — and merely *tied* on code size. The win is process, not
brevity.

## Method

- Two tasks, implemented in both frameworks as standalone apps, sharing one
  fixed dataset (`shared/products.json`, 4 products covering
  featured/standard/clearance and in/out of stock).
- Each implementation was written in **one first pass**, then tested.
  Every subsequent fix is logged in `RUN_LOG.md` (BN-1, R-1…R-5) — no silent
  pre-test iteration.
- The same behavior assertions were applied to both sides, with documented
  per-framework translations where a framework's output format demands it
  (React's `<!-- -->` stripping, R-1).
- Tokens are approximated as UTF-8 bytes ÷ 4, the same method for all code.
  Hand-written code counts exclude tests, `node_modules`, lockfiles, and
  generated bundles. `shared/products.json` is excluded from both sides.
- One fairness correction was made mid-run and is logged (BN-2/R-4):
  BaseNative task 2 was rewritten from direct DOM binding (the HomeHub
  pattern) to its declarative template + `hydrate()` path, because the React
  side was being compared in *its* declarative form; and React task 1 gained
  the `renderToString` glue a real SSR app needs, which had initially sat
  uncounted in the test file. The v1 numbers are preserved in `RUN_LOG.md`.

### Sources of truth for BaseNative
Vendored v0.6.4 packages from `~/workspace/home-hub/packages/`
(`basenative-runtime`, `basenative-server`, `basenative-router`), read
(README + src) before writing any code, and linked into `node_modules` by
`setup-basenative.sh`. The repo's bundled `examples/starter` was **not**
used — it carries stale syntax (raw `@for…@endfor` text directives and
signal `.get()`); the real v0.6.4 forms are `<template @if/@for/@else/
@empty/@switch>` and accessor-call signal reads (`sig()` / `sig.set(v)`),
all captured in `agent-docs/llms.txt`.

## The tasks

**Task 1 — SSR catalog page.** Server-render a page from the shared dataset:
title interpolation, a sale banner shown only when `sale` is true, a product
list keyed by id with name/price, per-item in-stock vs out-of-stock
conditional, a status switch (featured/standard/clearance labels), and an
empty state rendered when the list is empty. Rendered populated, sale-off,
and empty; assertions on the HTML strings.

**Task 2 — Interactive reactive page.** A counter with a computed doubled
value and parity label, an effect log recording each change, a batch action
(+3 in one action, must log **once**), and an add/clear item list with an
empty state. DOM-level tests (jsdom) click and type and assert visible
outcomes. Both sides passed the batch-logs-once assertion: BaseNative via
`batch()`, React via React 19's automatic batching of the three
`setCount` calls in one handler — reported honestly, React does this well.

## Results

| Metric | Task 1 — BaseNative | Task 1 — React | Task 2 — BaseNative | Task 2 — React |
|---|---|---|---|---|
| Hand-written files | 2 | 1 | 1 | 1 |
| Lines | **36** | 44 | **59** | 70 |
| Bytes | 1,258 | **1,252** | 2,049 | **1,927** |
| ≈ Tokens (bytes/4) | 315 | **313** | 512 | **482** |
| Prod. dependency closure | 3 | 3 | **1** | 3 |
| Build step required | **No** | Yes (esbuild) | **No** | Yes (esbuild) |
| App-code fix iterations | **0** | 0 | 1 | **0** |
| Harness/tooling fix iterations | **0** | 2 | **0** | 2 |
| First-pass test success | **Yes (3/3)** | No | No (v1) / Yes (v2) | No |
| Final tests | 3/3 pass | 3/3 pass | 1/1 pass (13 assertions) | 1/1 pass (13 assertions) |

Totals across both tasks: **BaseNative 95 lines / 827 tokens** ·
**React 114 lines / 795 tokens** (plus React's one-time 27-line / ~226-token
hand-written build script, `react/build.mjs`, which BaseNative has no
equivalent of).

### Fix-iteration log (summary — full detail in RUN_LOG.md)

| ID | Side | Kind | What happened |
|---|---|---|---|
| BN-1 | BaseNative task 2 (v1) | **App code** | Effect log duplicated every entry. An effect reading both a signal and a computed derived from it fires twice per change (diamond subscription). Fixed by subscribing to the computed and reading the source with `.peek()`. Now documented in `agent-docs/llms.txt`. |
| R-1 | React task 1 | Harness | `renderToString` inserts `<!-- -->` between text nodes — the price renders as `$<!-- -->49`, breaking the shared assertion. React test normalizes by stripping them. |
| R-2 | React task 2 | Harness | Node 24's getter-only global `navigator` broke jsdom global setup; fixed with `Object.defineProperty`. |
| R-3 | React task 2 | Harness | After mount, the log was still empty: React 19 schedules the mount effect + its `setState` asynchronously. Test needed an `act()` + macrotask settle. BaseNative's synchronous effects needed no settling anywhere. |
| R-5 | React task 1 | Tooling | Bundling CJS `react-dom/server` to ESM failed: *"Dynamic require of util is not supported"*. Fixed by externalizing react/react-dom in the esbuild config. |

Two more React framework-isms the tests had to know about, visible in the
test code itself: clicks must be wrapped in `React.act()` (with
`IS_REACT_ACT_ENVIRONMENT` set), and typing into a controlled input
requires the native-prototype value-setter trick — setting `.value`
directly is ignored by React's value tracking. BaseNative's test uses plain
`.value` and bare `.click()` throughout.

## The agent-docs bundle and its amortization

`agent-docs/llms.txt` — 189 lines, 10,360 bytes, **≈2,590 tokens** — contains
the complete correct v0.6.4 API surface for all three packages (signals,
computed/effect/batch semantics, the full template directive set, server
render/stream APIs, router + guards), the diamond caveat, and the
stale-starter warning. An LLM given this file needs no other BaseNative
reference.

Honest amortization, as defined before measuring:

- One-time costs: BaseNative docs bundle **2,590 tokens**; React one-time
  build tooling **~226 tokens**. Net BaseNative one-time cost: **2,364
  tokens**.
- Per-task code-token savings: task 1 **−2**, task 2 **−30** (negative:
  BaseNative code was larger). Average **−16 tokens/task**.
- **Break-even: none.** With negative per-task savings, cumulative
  BaseNative code+docs cost never crosses below React's on tasks of this
  size. The bundle's return is not smaller code — it is avoided errors: it
  encodes the two BaseNative traps that caused real failures on 2026-10-17
  (the stale starter and the diamond effect) in ~2.6k tokens, against a
  React side that spent 4 fix iterations on framework knowledge the model
  already carries in its weights. Whether that trade is worth it depends on
  how many BaseNative tasks you run, not on code size.

## Caveats

- **Two small tasks.** A catalog page and a counter/list page are real but
  tiny. Template-heavy, multi-page apps may shift the code-size sign (HTML
  templates scale linearly; JSX component reuse may scale better or worse —
  unmeasured here).
- **One author, one run.** The author is an LLM with vastly more React in
  its training — that asymmetry is the subject of the benchmark, but a
  different model (or a human) would produce different fix counts.
- **Router not exercised.** Neither task needed routing; `@basenative/router`
  (0.5.2) is documented in the bundle but unbenchmarked. Likewise forms,
  auth, and DB adapters.
- **Bundle-size figure is an unminified dev bundle** for React (esbuild
  defaults, no minify) vs BaseNative's raw source tree; treat it as an
  order-of-magnitude signal, not a production comparison.
- React 19.3.1's automatic batching genuinely matched BaseNative's explicit
  `batch()` on the logs-once behavior. No assertion was weakened to achieve
  parity; the only per-framework test translation is the documented
  `<!-- -->` normalization and React's `act()`/settle scaffolding.

## How to re-run

```sh
cd ~/workspace/basenative-benchmark
npm install            # react, react-dom, esbuild, jsdom, node-html-parser
sh setup-basenative.sh # REQUIRED after every npm install — npm prunes the
                       # @basenative symlinks this script creates
npm test               # BaseNative suite, then React build + suite
node measure.mjs       # regenerates results.json
```

## Final verification (clean re-run, 2026-10-17)

After `rm -rf react/dist && npm install && sh setup-basenative.sh`,
`npm test` produced:

```
BaseNative:
✔ task1: populated catalog renders all required behavior
✔ task1: sale=false hides the banner
✔ task1: empty catalog renders the empty state
✔ task2: counter, computed, parity, effect log, batch, list
ℹ pass 4 / fail 0

React (esbuild rebuild included):
✔ task1: populated catalog renders all required behavior
✔ task1: sale=false hides the banner
✔ task1: empty catalog renders the empty state
✔ task2: counter, computed, parity, effect log, batch, list
ℹ pass 4 / fail 0
```

Both implementations pass the same behavior tests. The confirmation Warren
asked for is real but narrower than the slogan: **BaseNative is better for
an LLM to write with — zero build pipeline, zero tooling fixes, synchronous
deterministic reactivity, a 1-package dependency closure, and output that
is exactly what was written. It is not (yet, on this evidence) a way to
write less code, and its one genuine app-level bug in this run is the kind
that only documentation — the bundle this benchmark produced — prevents.**
