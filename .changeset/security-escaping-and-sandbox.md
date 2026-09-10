---
'@basenative/runtime': minor
'@basenative/server': minor
---

Security: close a sandbox escape in the CSP-safe expression evaluator, and escape SSR output by default.

**Evaluator sandbox escape (runtime — critical).** `safeMemberRead` consulted its blocklist only for string keys, so a non-string computed key such as `x[["constructor"]]` skipped the guard and was coerced to `"constructor"` by the property read itself, reaching `Function` — arbitrary code execution from an ordinary `{{ }}` expression, in both the client runtime and SSR. Keys are now resolved with ToPropertyKey semantics *before* the blocklist check, and object/array computed keys are rejected outright.

**SSR output escaping (server — high).** `render()` performed no HTML escaping, so any application rendering user-supplied data was XSS-injectable with no malicious template required. Interpolated values and `:attr` bindings are now HTML-escaped on both server and client (one shared module, so the two sides cannot diverge again); URL-bearing attributes (`href`, `src`, `action`, `formaction`, …) reject `javascript:`, `vbscript:`, `data:`, `blob:` and `file:` schemes and report `BN_UNSAFE_URL`; `'` is escaped in attribute values. Static template markup is never escaped — only substituted data.

**New API.** `raw(value)`, exported from `@basenative/runtime`, is the explicit per-value opt-out for trusted markup. It does not bypass the URL-scheme guard. `findInterpolations` is exported from `@basenative/runtime/shared/escape` — a linear scanner that replaces the polynomial `{{ }}` regex on the untrusted-input path.

**Behaviour change.** Templates that relied on unescaped interpolation to inject markup must now wrap those values in `raw()`.
