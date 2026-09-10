---
"@basenative/runtime": patch
---

`types/index.d.ts` declared only 27 of the package's 47 runtime exports — `raw`, `batch`, `registerPlugin`, the error boundary, devtools, and debug-mode APIs had no type declarations at all, forcing consumers to hand-write module augmentation to use them from TypeScript. Added the missing declarations, and added `types` conditions to the `./shared/expression`, `./shared/escape`, and `./shared/directives` subpath exports (each backed by its own `.d.ts`, previously untyped). A new `types/exports.test.js` guards the package root and each subpath against future drift between declared and actual exports.
