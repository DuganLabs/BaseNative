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
