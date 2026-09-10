---
"@basenative/admin": patch
---

Remove the unused `@basenative/auth` peer dependency. No module in this package imports `@basenative/auth` — every module is written storage/auth-agnostic, accepting resolvers you supply (`getCurrentUser`, `setRole`, `identifier`, etc.) — so the declared peer was phantom and made `@basenative/auth` show as an `UNMET DEPENDENCY` for consumers who don't happen to install it. `@basenative/auth` remains a fine choice for implementing `getCurrentUser`, it's just no longer a declared dependency of this package.
