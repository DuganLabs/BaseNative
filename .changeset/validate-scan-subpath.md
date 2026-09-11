---
"@basenative/validate": minor
---

Expose `@basenative/validate/scan` — an additive subpath re-exporting `scanTags`, `scanInterpolations`, and `spanAt` from the internal template tokenizer. Tooling that needs to find real component/directive usage inside template strings (for example a repo-wide component-usage scanner) can now reuse the same linear, ReDoS-safe tokenizer the validator and runtime already share, instead of approximating it with regex. The `"."` export is unchanged.
