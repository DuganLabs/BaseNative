---
"@basenative/auth-webauthn": minor
---

Add a `userVerification: 'preferred' | 'required' | 'discouraged'` option to `webauthnAdapter` (default `'preferred'`, matching prior behaviour byte-for-byte). It now drives both option generation (`authenticatorSelection.userVerification` on registration, `userVerification` on authentication) *and* the verification step (`requireUserVerification: userVerification === 'required'`), so the two settings can no longer disagree — previously the adapter always requested `'preferred'` UV but never enforced it (`requireUserVerification: false`), regardless of what the caller wanted. Set `'required'` to enforce UV on every login; see the README for the security tradeoff (authenticators without UV support, including previously-registered passkeys, will be rejected).

Also removes the unused `@basenative/auth` peer dependency — no module in this package imports it; the adapter follows the same `{ type, ... }` provider shape by convention, not by coupling, and the declared peer was surfacing as an `UNMET DEPENDENCY` for consumers who don't install `@basenative/auth`.
