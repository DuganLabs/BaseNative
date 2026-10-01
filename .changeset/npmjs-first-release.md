---
"@basenative/admin": patch
"@basenative/auth": patch
"@basenative/auth-webauthn": patch
"@basenative/builder": patch
"@basenative/claude-config": patch
"@basenative/cli": patch
"@basenative/combobox": patch
"@basenative/components": patch
"@basenative/config": patch
"@basenative/date": patch
"@basenative/db": patch
"@basenative/doppler": patch
"@basenative/eslint-config": patch
"@basenative/evals": patch
"@basenative/favicon": patch
"@basenative/fetch": patch
"@basenative/flags": patch
"@basenative/fonts": patch
"@basenative/forms": patch
"@basenative/hmr": patch
"@basenative/i18n": patch
"@basenative/icons": patch
"@basenative/integrations": patch
"@basenative/keyboard": patch
"@basenative/logger": patch
"@basenative/markdown": patch
"@basenative/marketplace": patch
"@basenative/mcp": patch
"@basenative/middleware": patch
"@basenative/notify": patch
"@basenative/og-image": patch
"@basenative/persist": patch
"@basenative/realtime": patch
"@basenative/router": patch
"@basenative/runtime": patch
"@basenative/server": patch
"@basenative/share": patch
"@basenative/station": patch
"@basenative/tenant": patch
"@basenative/theme": patch
"@basenative/tsconfig": patch
"@basenative/upload": patch
"@basenative/validate": patch
"@basenative/visual-builder": patch
"@basenative/wrangler-preset": patch
---

First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.
