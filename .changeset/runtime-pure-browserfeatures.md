---
"@basenative/runtime": patch
---

Mark `browserFeatures`'s initializer (`detectBrowserFeatures()`) as `/* @__PURE__ */` in `src/features.js`. `detectBrowserFeatures` only reads feature flags off its `target` argument, so this lets bundlers drop the call when an entry point pulls in `@basenative/runtime` (e.g. for signals) without using `browserFeatures` — fixing a CodeQL `js/unused-local-variable` finding in one such downstream bundle. No change to `browserFeatures`'s value or behavior for existing consumers. Also removes a tautological assertion (CodeQL `js/unneeded-defensive-code`) from an expression-evaluator fuzz test; test-only.
