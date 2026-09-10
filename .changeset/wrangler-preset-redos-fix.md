---
"@basenative/wrangler-preset": patch
---

Fix a polynomial ReDoS surface (CodeQL `js/polynomial-redos`) in `toToml`: trailing newlines were stripped with `/\n+$/`, which backtracks quadratically on input with many newlines, and the input can come from config values outside this module's control. Replaced with a linear index scan; output is unchanged.
