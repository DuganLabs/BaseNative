---
"@basenative/favicon": patch
---

Fix a polynomial ReDoS surface (CodeQL `js/polynomial-redos`) in `buildManifest`: trailing slashes on the caller-supplied `iconBaseUrl` were stripped with `/\/+$/`, which backtracks quadratically on input with many slashes. Replaced with a linear index scan; output is unchanged.
