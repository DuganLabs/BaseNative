# Run log — honest first-pass + fix iterations

Method rule: each implementation was written in one first pass, then its test
suite was run. Every fix after that first run is logged here — nothing was
iterated silently before the first test run.

## Setup
- Node v24.20.0, npm 10.9.4 (system).
- BaseNative: vendored v0.6.4 packages from ~/workspace/home-hub/packages
  (runtime 0.6.4, server 0.6.4, router 0.5.2 — router not exercised by these
  two tasks), linked into node_modules/@basenative by symlink; the server's
  own dependency node-html-parser@^9 installed from npm.
- React: installed from npm at benchmark time (versions recorded in
  results.json after install).

## Iterations
- FIRST RUN (basenative): task1 — 3/3 passed on first pass. task2 — FAILED:
  the effect log contained each entry twice
  (['count=0…','count=1 doubled=2','count=1 doubled=2',…]).
- Fix BN-1 (basenative/task2/app.js, 1 edit): root cause is a real runtime
  behaviour — a "diamond" subscription. The logging effect read BOTH count()
  and doubled() (a computed derived from count). On count.set(), the effect
  is scheduled once by count and again when the computed re-evaluates and
  sets doubled, so it runs twice per change. Fix: the logging effect now
  subscribes only to doubled() and reads count via .peek(). This is an
  honest caveat for the report: BaseNative's computed (implemented as an
  effect writing a signal) does not by itself dedupe diamond effects.
- FIRST RUN (react): task1 — 2/3 passed; populated-catalog test FAILED on
  "price Aurora Lamp". task2 — FAILED before any assertion.
- Fix R-1 (tests/react.test.mjs, harness, not app code): React's
  renderToString inserts <!-- --> separator comments between adjacent text
  nodes, rendering the price as "$<!-- -->49", so the shared substring
  assertion cannot match. This is a real React SSR quirk a writer must know
  about. The React test now strips "<!-- -->" before applying the same
  assertions (documented in the test file).
- Fix R-2 (tests/react.test.mjs, harness): Node 24 exposes a getter-only
  global `navigator`; assigning jsdom's navigator threw. Replaced with
  Object.defineProperty.
- SECOND RUN (react): task1 — 3/3 passed. task2 — FAILED at the first log
  assertion: log was [] instead of ['count=0 doubled=0'] immediately after
  mount. React 19 + createRoot schedules the mount useEffect and its
  resulting setState asynchronously.
- Fix R-3 (tests/react.test.mjs, harness): settle one macrotask inside
  React.act after mount before asserting. Contrast worth reporting:
  BaseNative effects run synchronously, so its test needed no settling.

## Iteration BN-2 / R-4 — fairness correction (declarative path + counting symmetry)
- The v1 BaseNative task2 used direct DOM binding (the HomeHub pattern:
  effects writing textContent). That is a supported pattern, but it is not
  BaseNative's declarative rendering path, while the React side WAS using
  its declarative path (JSX). Comparing declarative React to imperative
  BaseNative stacks the code-size metric. BaseNative task2 was therefore
  rewritten to its intended declarative form: an HTML template using
  {{ signal() }} interpolation, @click handlers, @for/@if, hydrated with
  hydrate(root, ctx). The v1 numbers are preserved here for transparency:
  v1 task2 = 69 lines / 2186 bytes / ~547 tokens, 1 app fix (BN-1).
- R-4 (counting symmetry): the React task1 code originally left its
  renderToString glue in the (excluded) test file, while BaseNative task1
  counted its render() glue in app code. catalog.jsx now exports a
  renderCatalog() that calls renderToString — the glue a real React SSR
  app needs — and the React tests use it. BaseNative needed no change.
- The BN-1 diamond caveat still applies to v2's log effect (it subscribes
  to doubled() and peeks count), and is documented in agent-docs/llms.txt.
- Fix R-5 (react/build.mjs, tooling): after R-4 moved renderToString into
  the bundled entry, all 3 React task1 tests failed with
  "Dynamic require of 'util' is not supported" — esbuild's ESM bundle of
  the CJS react-dom/server cannot dynamically require Node builtins.
  Fix: mark react/react-dom external in the task1 bundle (standard
  practice; the dependencies stay installed in node_modules). Another
  honest React-side tooling cost: the build script needed a third
  configuration pass. BaseNative task1 needed no build configuration at all.
- BaseNative v2 task2 (declarative hydrate) passed 4/4 on its first run.

## Final clean verification (2026-10-17)
- `rm -rf react/dist && npm install` — note: npm install PRUNES the
  @basenative symlinks, so `sh setup-basenative.sh` is a required setup
  step (documented in BENCHMARK.md). After re-linking:
- `npm test` — BaseNative suite 4/4 pass, React suite 4/4 pass
  (esbuild rebuild included). Final outputs pasted into BENCHMARK.md.

## Re-verification against published 2.0.1 (2026-10-18)
- Same benchmark copied to a fresh directory; the vendored 0.6.4 links were
  replaced with the published npm tarballs (@basenative/runtime,
  @basenative/server, @basenative/router — all 2.0.1). App code, tests and
  dataset untouched; `npm ci` from the original lockfile (React stays
  19.3.1, esbuild 0.25.12, jsdom 27.4.0).
- `npm test` — BaseNative suite 4/4 pass, React suite 4/4 pass.
- `node measure.mjs` — results.json regenerated: lines 95/114 and tokens
  827/795 identical; closures re-derived from the 2.0.1 package.json files
  (runtime: zero deps; server: runtime + node-html-parser) — unchanged.
- React task-2 bundle rebuilt at exactly 1,181,977 bytes (unchanged).
  BaseNative runtime source tree: 78,146 bytes at 2.0.1 vs 77,071 at 0.6.4,
  same measurement method (all .js under src/, concatenated) — the delta
  is the 2.0.1 :value/:checked property-sync fix.

## Re-verification against published 2.1.0 (2026-10-20)
- Same benchmark copied to a fresh directory; the BaseNative side was
  installed from the published npm tarballs (@basenative/runtime,
  @basenative/server, @basenative/router — all 2.1.0). App code, tests and
  dataset untouched. React stays 19.3.1 (still the current release on
  npm at the re-run date), esbuild 0.25.12, jsdom 27.4.0, Node v24.20.0.
- `npm test` — BaseNative suite 4/4 pass, React suite 4/4 pass.
- `node measure.mjs` — results.json regenerated: lines 95/114 and tokens
  827/795 identical; fix-iteration counts are the original authoring
  record and do not change on a re-run; closures re-derived from the
  2.1.0 package.json files (runtime: zero deps; server: runtime +
  node-html-parser; router: runtime) — unchanged.
- React task-2 bundle rebuilt at exactly 1,181,977 bytes (unchanged).
  BaseNative runtime source tree: 78,146 bytes at 2.1.0 — byte-identical
  to 2.0.1, same measurement method (all .js under src/, concatenated);
  the 2.1.0 release did not change the runtime package's source.
- Sole environment delta: node-html-parser installed at 9.0.5 (9.0.4 in
  the 2.0.1 run), inside the server's declared ^9.0.4 range. No measured
  value moved.

## Fresh authoring run against published 2.3.2 (2026-10-24)
- The original benchmark directory was never committed, so this run
  reconstructed both implementations and both test suites in one first
  pass each from BENCHMARK.md's task descriptions, against the published
  npm tarballs (@basenative/* 2.3.2; React 19.3.1; esbuild 0.28.2;
  jsdom 30.1.3; Node v24.22.1). The reconstructed apps, tests, dataset
  and measure.mjs are now committed beside this log.
- Dataset reconstructed per the documented coverage; the one product
  the documents name is the Aurora Lamp at $49 (featured, in stock),
  joined by an Ember Mug $24 (standard, out of stock), a Drift Chair
  $189 (clearance, in stock) and a Halo Bulb $15 (standard, in stock).
- Documented translations from the original log were applied in the
  first pass and are not counted as fixes: R-1 (strip React's
  `<!-- -->`), R-2 (navigator defineProperty), R-5 (esbuild
  externalizes react/react-dom), the controlled-input native setter,
  and BaseNative task 2 written directly in the declarative form
  (BN-2's fairness correction).
- FIRST RUN (basenative): task 1 — 3/3 pass. Task 2 — 1/1 pass (13
  assertions). No fixes of any kind. BN-1 did not recur: the log effect
  (reading count() and doubled(), writing the log via .peek()) fired
  exactly once per change on 2.3.2, including under batch().
- FIRST RUN (react): task 1 — 3/3 pass. Task 2 — FAILED before any
  assertion: react/dist/task2.mjs did not exist
  (ERR_MODULE_NOT_FOUND), because the build had failed (R2-1).
- R2-1 (react task 2, harness/tooling, 1 edit): the task-2 esbuild
  stdin entry read './react/task2/app.jsx' while its resolveDir was
  already the react/ directory, so esbuild could not resolve it, the
  build exited non-zero, and the bundle was never emitted. Fix: entry
  path changed to './task2/app.jsx'. After the fix the React suite
  passes 4/4. No React app code changed.
- No other fixes. BaseNative: 0 app-code fixes, 0 harness fixes.
  React: 0 app-code fixes; harness fixes 0 (task 1) + 1 (task 2).
- Dependency closures counted transitively in this run (see
  BENCHMARK.md's 2026-10-24 section): task-1 BaseNative closure is 12
  with node-html-parser's subtree expanded (3 under the original
  named-dependencies-only count); all other closures unchanged.
- Final clean verification: after rm -rf react/dist, npm test produced
  BaseNative 4/4 pass and React 4/4 pass. React task-2 bundle rebuilt
  at exactly 1,196,164 bytes (it now also re-exports the React
  namespace the test mounts with — see the run's measurement notes).
  node measure.mjs regenerated results.json: BaseNative 107 lines /
  813 tokens; React 108 lines / 748 tokens.
