---
"@basenative/middleware": patch
---

Fix CodeQL `js/remote-property-injection` (alert #34) by adding an explicit `__proto__`/`constructor`/`prototype` guard before writing parsed cookie names in the Express adapter's `parseCookieHeader`, alongside the existing null-prototype object.
