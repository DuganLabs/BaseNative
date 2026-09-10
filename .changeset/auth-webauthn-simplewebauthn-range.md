---
"@basenative/auth-webauthn": patch
---

Widen the `@simplewebauthn/server` peer range to `^11.0.0 || ^12.0.0 || ^13.0.0 || ^14.0.0` so consumers can upgrade past v11 (for example via Dependabot). No code changes were required: the adapter's option and result shapes have been stable across that whole range, and the fallbacks are now covered by regression tests.
