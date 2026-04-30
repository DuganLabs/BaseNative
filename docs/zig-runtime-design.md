# BaseNative Zig Runtime — Design Doc

> Status: **R&D draft** · Owner: Warren Dugan · Last updated: 2026-04-30
> Phase: 4 (DuganLabs roadmap) — *parallel R&D track, not blocking v1.x*
> Tracking: `@basenative/zig-runtime` (proposed package)

## 1. TL;DR

Build a **Zig-compiled WASM module** that ships alongside `@basenative/runtime` and provides:

1. **A JSDoc parser** that extracts type information from `.js` files at dev-time.
2. **A Zod-equivalent runtime validator generator** that turns those JSDoc types into validators callable from JavaScript.
3. **A signal-reactivity fast path** (stretch goal) that runs the dependency-tracking inner loop in WASM for hot effects.

The validators run in **dev mode only** — production builds strip the WASM payload and the import sites. Goal: catch the kinds of `TypeError: undefined is not a function` bugs that a TypeScript build step would catch, **without making BaseNative require a build step**.

This is consistent with axiom #4 (Trinity Standard — state, logic, and template fuse in one file): JSDoc keeps types in the same file as the code, and the Zig runtime makes those types load-bearing at runtime.

---

## 2. Motivation

BaseNative's current runtime is ~120 lines of vanilla ES modules ([packages/runtime/src/signals.js](packages/runtime/src/signals.js), 122 lines). It has no build step. It has no type checking at runtime. It exposes types through hand-authored `.d.ts` files in [packages/runtime/types/index.d.ts](packages/runtime/types/index.d.ts).

This works well for the framework itself, but downstream consumers (Greenput, PendingBusiness) hit two problems:

1. **JSDoc types are decorative**, not enforced. We use them in 14+ core files ([packages/runtime/src/error-boundary.js](packages/runtime/src/error-boundary.js), [packages/forms/src/field.js](packages/forms/src/field.js), [packages/auth/src/rbac.js](packages/auth/src/rbac.js), etc.) but nothing checks them at runtime. A signal annotated `@param {Signal<User>}` will happily accept a `Signal<null>` and crash three frames deeper.
2. **Schema validation is duplicated.** `@basenative/config` has its own validators ([packages/config/src/schema.js](packages/config/src/schema.js)). `@basenative/forms` has another ([packages/forms/src/validators.js](packages/forms/src/validators.js)). Consumers wire a third copy via Zod. Each is ~50–100 LOC and they don't share.

A unified runtime validator would consolidate (1) and (2), and JSDoc-as-source-of-truth keeps the Trinity Standard intact.

The Zig choice is about three things:

- **Binary size.** The runtime budget for `@basenative/runtime` is **10KB gzipped** ([scripts/bundle-size.js:8](scripts/bundle-size.js)). A WASM payload that ships in dev only doesn't count against that, but we still want it small (<80KB) so dev startup stays fast. Zig with `ReleaseSmall` + `wasm-opt -Oz` is the most predictable path to small WASM.
- **`comptime`.** Zig's `comptime` lets us specialize validator code paths per schema shape, which is exactly the Typia/AOT-validator playbook.
- **No runtime.** Zig's stdlib has no panic infrastructure, no GC, no stdio unless you ask for them. That maps cleanly to `wasm32-freestanding`.

---

## 3. Goals

| # | Goal | Success criterion |
|---|------|-------------------|
| G1 | Parse JSDoc type annotations from `.js` files | Round-trips ≥95% of JSDoc shapes used in the BaseNative monorepo |
| G2 | Generate runtime validators API-compatible with `@basenative/config` validator shape | Existing `defineConfig({ schema })` callsites work unchanged when schema comes from JSDoc |
| G3 | Run in three hosts: browser, Node 22+, Cloudflare Workers | Same `.wasm` artifact loads in all three |
| G4 | Dev-only by default | A `bn build --prod` strips the import; bundle-size CI shows zero WASM bytes shipped |
| G5 | Ship as `@basenative/zig-runtime` | Independent package, peer-deps `@basenative/runtime` |
| G6 | Zero impact on the 10KB core runtime budget | `scripts/bundle-size.js` unchanged |
| G7 | Preserve CSP-safety axiom | No `eval`, no `new Function` in the JS shim |

### Stretch goals (Phase 2)

| # | Goal |
|---|------|
| S1 | WASM-accelerated signal dependency tracking for >1000-effect graphs |
| S2 | LSP-compatible type info emission (so IDEs see JSDoc-derived types same as TS would) |
| S3 | Zig-emitted ESM shim so the WASM module is `import`-able without a manual loader |

---

## 4. Non-goals

- **Replace TypeScript** for downstream consumers who want it. TS users keep using TS. This serves the "no build step" pure-JS path.
- **Replace the JS signals implementation.** Signals stay in [packages/runtime/src/signals.js](packages/runtime/src/signals.js). The Zig path is additive and opt-in.
- **Compete with Zod 4 / Valibot / Arktype** as a general-purpose validator. We generate validators *from JSDoc*; we don't compete on schema-DSL ergonomics.
- **Rewrite the CSP-safe expression evaluator** ([packages/runtime/src/shared/expression.js](packages/runtime/src/shared/expression.js)) in Zig. That's a separate decision; flagged as an open question (§11).
- **Phase 4 hardware track ambiguity.** [PRD.md:78](PRD.md) currently lists "Phase 4 — Power Specifications" (48V DC). The Zig runtime is a **parallel R&D phase 4** — needs roadmap reconciliation before either ships.

---

## 5. Architecture

### 5.1 Three components

```
┌──────────────────────────────────────────────────────────────┐
│  @basenative/zig-runtime                                     │
│                                                              │
│   ┌──────────────────┐     ┌──────────────────────────────┐ │
│   │  zig source      │ →   │  bn-runtime.wasm  (~50KB)    │ │
│   │  (this repo)     │     │  (built artifact, checked-in)│ │
│   └──────────────────┘     └──────────────────────────────┘ │
│                                       ↓                      │
│                            ┌──────────────────────────┐      │
│                            │  src/index.js (JS shim)  │      │
│                            │  loads .wasm, exposes:   │      │
│                            │   parseJSDoc(source)     │      │
│                            │   compileSchema(ast)     │      │
│                            │   validate(schema, val)  │      │
│                            └──────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
                                       ↓ consumed by
┌──────────────────────────────────────────────────────────────┐
│  bn dev (CLI)                                                │
│   - watches .js files                                        │
│   - calls parseJSDoc on save                                 │
│   - injects validation guards into dev-mode bundle           │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Compilation target

**Pick `wasm32-freestanding`.** Reasons:

- All three hosts (browser, Node, Workers) instantiate the module via `WebAssembly.instantiate`/`compileStreaming`. None of them need WASI.
- `wasm32-wasi` adds startup overhead and a dependency on the host providing WASI imports — Workers' WASI support has historically been partial.
- Smaller binary (no WASI shim).

Canonical build command (verified against [Zig 0.14 release notes](https://ziglang.org/download/0.14.0/release-notes.html)):

```bash
zig build-lib src/main.zig \
  -target wasm32-freestanding \
  -dynamic -rdynamic \
  -O ReleaseSmall

wasm-opt -Oz --strip-debug --strip-producers \
  zig-out/lib/main.wasm -o dist/bn-runtime.wasm
```

`-rdynamic` is required to export Zig functions to JS in 0.14+. We pin Zig to 0.14 (or whichever is current at first ship); upgrade is a deliberate decision per release.

### 5.3 JS↔WASM ABI

**No `wasm-bindgen` for Zig.** We hand-roll a small ABI.

Exported from Zig:

```zig
// memory management
export fn alloc(len: usize) [*]u8;
export fn free(ptr: [*]u8, len: usize) void;

// JSDoc parsing
export fn parseJSDoc(src_ptr: [*]const u8, src_len: usize) u32; // returns AST handle
export fn astLen(handle: u32) usize;
export fn astBytes(handle: u32) [*]const u8;

// validator compilation
export fn compileSchema(ast_handle: u32) u32; // returns schema handle
export fn validate(schema: u32, json_ptr: [*]const u8, json_len: usize) u32; // result handle

// reading results
export fn resultOk(handle: u32) bool;
export fn resultMessageLen(handle: u32) usize;
export fn resultMessageBytes(handle: u32) [*]const u8;

// release
export fn releaseHandle(handle: u32) void;
```

Strings cross the boundary as `(ptr, len)` pairs into shared linear memory. JS:

```js
const wasm = await WebAssembly.compileStreaming(fetch(wasmUrl));
const inst = await WebAssembly.instantiate(wasm, {});

function passString(s) {
  const bytes = new TextEncoder().encode(s);
  const ptr = inst.exports.alloc(bytes.length);
  new Uint8Array(inst.exports.memory.buffer, ptr, bytes.length).set(bytes);
  return [ptr, bytes.length];
}
```

The shim wraps this into a clean JS API:

```js
import { parseJSDoc, compileSchema, validate } from '@basenative/zig-runtime';

const ast = await parseJSDoc(source);
const schema = compileSchema(ast);
const result = validate(schema, untrustedValue);
if (!result.ok) console.warn(result.message);
```

### 5.4 ASTs and schema handles

ASTs and schemas live **inside** WASM linear memory. JS holds opaque `u32` handles. This avoids serializing big ASTs across the boundary on every call. We expose `releaseHandle` so the JS shim can release WASM-side memory deterministically (no GC integration in MVP — a `FinalizationRegistry` cleanup is a Phase 2 concern).

Result objects are small enough to serialize on read; the shim copies them out and immediately releases the handle.

---

## 6. Compilation pipeline

End-to-end, what happens to a file like [packages/forms/src/field.js](packages/forms/src/field.js):

```
┌─ field.js ─────────────────────────────────────┐
│ /**                                            │
│  * @param {*} initial                          │
│  * @param {object} [options]                   │
│  * @param {Array<Function>} [options.validators]│
│  * @returns {Field}                            │
│  */                                            │
│ export function createField(initial, options) {│
│   ...                                          │
│ }                                              │
└────────────────────────────────────────────────┘
                    │
                    ▼  bn dev / bn watch
┌─ Zig parseJSDoc(source) ────────────────────────┐
│ AST nodes:                                      │
│   FunctionDecl "createField"                    │
│     Param "initial"  : Any                      │
│     Param "options"  : Optional<Object{         │
│                          validators?: Array<Fn>}│
│     Return: TypeRef("Field")                    │
└─────────────────────────────────────────────────┘
                    │
                    ▼  Zig compileSchema(ast)
┌─ schema handle (in linear memory) ──────────────┐
│ Validator opcodes:                              │
│   IS_OBJECT_OR_UNDEFINED                        │
│     IF_PRESENT key="validators"                 │
│       IS_ARRAY_OF { IS_FUNCTION }               │
└─────────────────────────────────────────────────┘
                    │
                    ▼  bn dev injects guard
┌─ dev-mode wrapped createField ──────────────────┐
│ const _orig = createField;                      │
│ createField = (initial, options) => {           │
│   const r = validate(_schema, { initial, options});
│   if (!r.ok) console.warn(`createField: ${r.message}`);
│   return _orig(initial, options);               │
│ };                                              │
└─────────────────────────────────────────────────┘
                    │
                    ▼  bn build --prod
┌─ field.js (unchanged) ──────────────────────────┐
│ Original code. Wrapper + WASM payload stripped. │
└─────────────────────────────────────────────────┘
```

### 6.1 Where the wrapping happens

The wrapper insertion lives in **`@basenative/cli`** (in `bn dev` and `bn build`), not in the runtime. The runtime is unaware. This keeps:

- Production bundles identical to today.
- The 10KB runtime budget intact ([scripts/bundle-size.js](scripts/bundle-size.js)).
- The "no build step" axiom **for production** — dev mode is allowed to do more work because the dev loop already invokes `bn dev`.

### 6.2 Where the WASM gets loaded

Three host-specific entry points:

| Host | Loader |
|---|---|
| Browser | `WebAssembly.compileStreaming(fetch('/_bn/runtime.wasm'))` — served by dev server |
| Node 22+ | `WebAssembly.compile(await fs.readFile(wasmPath))` |
| Workers | `import wasmModule from './bn-runtime.wasm'` — Workers' built-in WASM module syntax |

The shim picks the right path at import time using runtime detection. (Cloudflare Workers does **not** allow dynamic `WebAssembly.compile` from the network — the module must be bundled at deploy time.)

---

## 7. API surface

### 7.1 The shim package — `@basenative/zig-runtime`

```js
// JSDoc-driven validators
export function parseJSDoc(source: string): JSDocAst;
export function compileSchema(ast: JSDocAst, exportName?: string): Schema;
export function validate<T>(schema: Schema, value: unknown): ValidationResult<T>;

// Schema utilities
export function schemaFromFile(filePath: string): Map<string, Schema>;
export function inferType(value: unknown): JSDocAst;

// Cleanup
export function releaseSchema(schema: Schema): void;

// Result
type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; path: string[] };
```

### 7.2 Integration with `@basenative/config`

Today, [packages/config/src/schema.js](packages/config/src/schema.js) exports `string()`, `number()`, `boolean()`, `oneOf()`, `optional()`, `validateConfig()`. After Phase 1:

```js
// today
defineConfig({
  schema: {
    PORT: number({ min: 1024 }),
    LOG_LEVEL: oneOf(['debug', 'info', 'warn']),
  },
});

// future (option, not replacement)
/**
 * @typedef {object} AppConfig
 * @property {number} PORT
 * @property {'debug'|'info'|'warn'} LOG_LEVEL
 */
defineConfig({ schema: schemaFromTypedef('AppConfig') });
```

The hand-written validator API stays. The JSDoc path is additive. `zodAdapter` ([packages/config/src/schema.js:88](packages/config/src/schema.js)) gets a sibling `jsdocAdapter`.

### 7.3 Integration with `@basenative/forms`

[packages/forms/src/validators.js](packages/forms/src/validators.js) supplies `required()`, `minLength()`, `pattern()`, etc. These stay. The Zig path adds *type-shape* validation on `createField` initial values and `setValue` calls in dev — catches the "I passed `null` where the field expects a `string`" class of bug.

### 7.4 Integration with `@basenative/runtime`

The runtime imports nothing from `@basenative/zig-runtime`. The reverse may happen: in Phase 2, `@basenative/zig-runtime` may export a faster `effect()` for graphs above a threshold, behind a feature flag set by `bn dev`. The default `signal/effect/computed` path ([packages/runtime/src/signals.js](packages/runtime/src/signals.js)) remains canonical.

---

## 8. Bundle size & performance

### 8.1 Realistic WASM size budget

Based on research, sub-50KB is tight but achievable for a JSDoc parser + validator runtime. Realistic budget:

| Component | Size (gzipped) |
|---|---|
| Validator opcode interpreter | 8–15KB |
| JSDoc tokenizer + AST builder | 12–20KB |
| String/Unicode handling | 5–10KB |
| Allocator (fixed-buffer) | 1–2KB |
| **Total** | **~30–45KB** |

We **commit to <80KB gzipped** as the contract; **target <50KB**. We add a CI check to `scripts/bundle-size.js` for the WASM artifact specifically. If we miss <80KB, the doc forces a re-evaluation of Zig vs. AssemblyScript (see §10).

### 8.2 Cold-start cost

- **Browser:** `compileStreaming` of a 50KB module is sub-50ms on a cold network. Cached after first dev session.
- **Node:** First-call cost ~5–15ms (read + compile). Subsequent calls are instance reuse.
- **Workers:** Module-scope instantiation is sub-millisecond. Per-request validation is a function call.

### 8.3 Per-call cost

We don't have a number until benchmarks land — but the design intent is that a validator call should be **O(value-size)** and free of allocation in the steady state. Comparable to Typia (compile-time generated validators) and faster than Zod 3. We benchmark against:

- Zod 4
- Valibot 1.x
- The hand-rolled validators in [packages/config/src/schema.js](packages/config/src/schema.js)

Benchmarks live in `benchmarks/zig-validator.bench.js`, alongside existing benches.

---

## 9. Phased implementation plan

### Phase 0 — Decision spike (1 week)

- Build a 200-LOC Zig `parseJSDoc` that parses `@param`, `@returns`, `@typedef` only.
- Verify build pipeline on macOS + Linux + Windows.
- Verify Workers loads the WASM artifact.
- **Decision gate:** if WASM size > 30KB for this trivial scope, re-evaluate Zig vs. AssemblyScript before continuing.

### Phase 1 — JSDoc parser (3–4 weeks)

- Full JSDoc tag coverage: `@param`, `@returns`, `@typedef`, `@property`, `@callback`, `@template`, `@type`.
- Type-expression parser covering: primitives, arrays, tuples, unions, intersections, function types, generics, optional properties, literal types.
- Test corpus: every JSDoc in BaseNative monorepo (96 files) round-trips.
- Reference grammar: align with [`jsdoc-type-pratt-parser`](https://www.npmjs.com/package/jsdoc-type-pratt-parser) (TypeScript mode) for compatibility.
- **Ship:** `@basenative/zig-runtime@0.1.0` exposing only `parseJSDoc`.

### Phase 2 — Schema compiler + validator (3 weeks)

- Compile AST to validator opcodes.
- Validator interpreter in Zig.
- API: `compileSchema`, `validate`, `releaseSchema`.
- Adapter for `@basenative/config` (`jsdocAdapter`).
- **Ship:** `@basenative/zig-runtime@0.2.0`.

### Phase 3 — CLI integration (2 weeks)

- `bn dev` watches files, parses on save, injects dev-mode guards.
- `bn build` strips WASM and guards.
- `bn doctor` reports JSDoc coverage and "files with no JSDoc that probably should have it."
- **Ship:** `@basenative/cli` minor version, `@basenative/zig-runtime@0.3.0`.

### Phase 4 — Forms integration (1 week)

- `createField` accepts a `@type` JSDoc-derived schema for initial value.
- Validation hooks fire in dev only.
- **Ship:** `@basenative/forms` minor version.

### Phase 5 (stretch) — Signal fast path (open-ended)

- Benchmark dependency tracking with 1k/10k/100k effects.
- If JS impl wins, **stop here** — Zig signal path doesn't ship.
- Else: prototype WASM dependency graph.
- **Decision gate:** ship only if benchmark wins are >2x with no DX regressions.

Total to MVP (Phases 0–4): **~10 weeks**.

---

## 10. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R1 | WASM bundle blows past 80KB | Phase 0 decision gate; AssemblyScript is the fallback (smaller binaries, simpler interop) |
| R2 | Zig 0.14→0.15 breaking changes destabilize the build | Pin Zig version per release; vendored binary in CI; only upgrade on explicit decision |
| R3 | JSDoc grammar coverage is incomplete; users hit "this works in TS but not in BaseNative" gaps | Mirror `jsdoc-type-pratt-parser` TypeScript-mode grammar; document exclusions in `@basenative/zig-runtime` README |
| R4 | Cross-file `@typedef` resolution requires a project-wide model | Phase 1 ships single-file only. Cross-file resolution = Phase 2 with `schemaFromFile` walking imports |
| R5 | Workers cold-start regression from WASM instantiation | Module-scope instantiation; benchmark against current latency before shipping |
| R6 | Dev/prod divergence — code passes in dev, fails in prod, or vice versa | Validators *only* warn in dev; never throw; never change runtime behavior. Production code path is always a no-op |
| R7 | "No build step" axiom violation perception | Document clearly: production has no build step. Dev tooling already exists (`bn dev`); WASM-loading is invisible to users |
| R8 | Source maps / debugger experience worsens with injected wrappers | Use `--inline-source-map` in dev wrappers; preserve original line numbers via offset table |
| R9 | Hand-rolled JS↔WASM interop has memory-leak failure modes | Audit pass + fuzzer in Phase 1 test suite; `FinalizationRegistry` cleanup in Phase 2 |
| R10 | Roadmap conflict with existing "Phase 4 — Power Specifications" ([PRD.md:78](PRD.md)) | Reconcile in PRD before merging this design — propose renaming to "Phase 4a (Zig runtime) / Phase 4b (Power specs)" or sequencing them |

---

## 11. Open questions

1. **Should the CSP-safe expression evaluator** ([packages/runtime/src/shared/expression.js](packages/runtime/src/shared/expression.js), 695 lines) **be ported to Zig?** Pros: single tokenizer/parser core, ~3–5x speedup likely, smaller JS surface. Cons: shared between runtime + server, can't depend on WASM in `@basenative/server` (Node-without-WASM is a supported target). **Tentative answer: no, Phase 5 at earliest.**

2. **Component Model (WIT) or hand-rolled ABI?** [WASI 0.2 + Component Model](https://component-model.bytecodealliance.org/) shipped stable in 2024 and Zig support is improving. Hand-rolled is simpler today; Component Model would future-proof for sharing with Rust or AssemblyScript. **Tentative answer: hand-rolled for MVP, re-evaluate at Phase 3 once `jco` browser story is firmer.**

3. **Where does the `.wasm` artifact live in the repo?** Checking it in (~50KB binary in `packages/zig-runtime/dist/`) avoids requiring contributors to install Zig. Building it in CI keeps the repo cleaner. **Tentative answer: check in the artifact + CI verifies it matches a fresh build.**

4. **What's the JSDoc grammar contract?** TypeScript's checker accepts more than `jsdoc-type-pratt-parser` (mapped types via JSDoc, `@satisfies`, etc.). We need a written grammar spec — what we accept, what we reject, what we *warn* on.

5. **LSP integration** (stretch goal S2). Do we ship a language server, or emit `.d.ts` sidecars from the JSDoc AST so existing TS-based IDE tooling sees the types? `.d.ts` emit is simpler.

6. **Distribution: one `.wasm` for all hosts, or three?** Same binary, three loaders is the plan, but we should benchmark whether a Node-specific binary that uses Node's faster TextEncoder bindings is meaningfully different.

7. **Versioning**: `@basenative/zig-runtime` independent from `@basenative/runtime` (as designed) or coupled? Independent is cleaner for the Phase 0–2 R&D arc.

---

## 12. Alternatives considered

### 12.1 Rust + `wasm-bindgen`

**Pros:** mature toolchain, ~zero interop boilerplate, large ecosystem. **Cons:** baseline 30–80KB before any code (panic infra, std), strict-er memory model adds friction for the AST/handle pattern. **Verdict:** the safer bet on tooling, but loses the binary-size lead. If Phase 0 finds Zig too painful, Rust is the fallback.

### 12.2 AssemblyScript

**Pros:** smallest binaries (often <20KB), TypeScript-shaped source, trivial interop. **Cons:** AS has had ecosystem instability historically; less expressive for parser-shaped code than Zig's `comptime`. **Verdict:** the fallback if Zig misses the size budget in Phase 0.

### 12.3 Pure JavaScript (no WASM)

**Pros:** zero new toolchain. **Cons:** the schema interpreter cost adds up — Zod 3 was famously slow because of this. We could write a faster-but-still-JS validator (Valibot-style), but then we don't get the comptime specialization Zig offers. **Verdict:** rejected for the validator. Reasonable for the JSDoc *parser* alone, which is mostly string scanning.

### 12.4 Use TypeScript compiler API

The TS compiler's `getJSDocType` is the most semantically accurate JSDoc parser available, including cross-file `@typedef` resolution. **Cons:** ~50MB install, slow cold start, and pulling in the TS compiler at dev time effectively makes BaseNative TS-dependent — defeating the purpose. **Verdict:** rejected as the runtime parser; *useful as a reference oracle* during Phase 1 testing.

---

## 13. Cross-references

- Current runtime: [packages/runtime/src/signals.js](packages/runtime/src/signals.js), [packages/runtime/src/hydrate.js](packages/runtime/src/hydrate.js)
- CSP-safe evaluator: [packages/runtime/src/shared/expression.js](packages/runtime/src/shared/expression.js)
- Existing validators: [packages/config/src/schema.js](packages/config/src/schema.js), [packages/forms/src/validators.js](packages/forms/src/validators.js)
- Bundle budgets: [scripts/bundle-size.js](scripts/bundle-size.js)
- BaseNative axioms: [CLAUDE.md](CLAUDE.md)
- Conflicting Phase 4: [PRD.md:78](PRD.md)
- BaseNative roadmap: [docs/roadmap.md](docs/roadmap.md)

---

## 14. Decision

**Recommendation:** approve Phase 0 (1-week spike). Phases 1–4 contingent on Phase 0 hitting the binary-size and DX gates. Phase 5 (signal fast path) is speculative — no commitment until benchmarks justify it.

**Out-of-scope for this doc:** the Phase 4 PRD reconciliation. That's a follow-up edit to [PRD.md](PRD.md).

---

*Verification notes: research findings on Zig 0.14 build flags and `-rdynamic` requirement [verified against ziglang.org 0.14 release notes](https://ziglang.org/download/0.14.0/release-notes.html). Component Model + jco browser status [confirmed via Bytecode Alliance docs](https://component-model.bytecodealliance.org/). `jsdoc-type-pratt-parser` TypeScript-mode coverage [confirmed via the project's npm page](https://www.npmjs.com/package/jsdoc-type-pratt-parser). WASM bundle-size estimates are projections, not measurements — Phase 0 spike validates them.*
