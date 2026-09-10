---
"@basenative/notify": patch
---

`renderEmail`'s `{{ variable }}` interpolation now escapes with `@basenative/runtime/shared/escape` (`escapeAttr`) instead of a local copy of the same logic, so HTML email templates and the SSR renderer can't drift apart. Behavior is unchanged for existing callers — every substituted value is still escaped by default — but a value wrapped in `raw()` (from `@basenative/runtime/shared/escape`) is now supported as an explicit, documented opt-out for trusted HTML, matching the SSR renderer's convention. Adds `@basenative/runtime` as a dependency.
