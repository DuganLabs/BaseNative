---
'@basenative/forms': major
---

Realign `@basenative/forms` with the registry.

GitHub Packages already holds `@basenative/forms` 0.5.0 through 0.13.0, published in January 2026 from the pre-monorepo, Angular-era package (`fesm2022/` bundle, `tslib` dependency). This repository's `@basenative/forms` is a different package with a different API — a signal-based rewrite exporting `createField`, `createForm`, `zodAdapter`, `createWizard` and the validator set — but it still carried the version 0.4.0, so its next patch release would have collided with the existing 0.4.1 and been skipped silently, leaving consumers on the January build.

This is a major release: the API is not compatible with the 0.x Angular line. Consumers of the old line should treat 1.0.0 as a new package.
