---
'@basenative/station': minor
---

Initial release of `@basenative/station` — queue-driven local-inference primitive that drives an OpenAI-compatible local tower (or any OpenAI-compat endpoint) with an SQLite-backed job queue, iteration-loop runtime, Workers AI fallback, and a registry of five pre-built job templates (`tests-from-todos`, `docstring-coverage`, `lint-bankruptcy`, `refactor-migration`, `fsm-classifier`). Ships with the `bn-station` CLI and full TypeScript declarations.
