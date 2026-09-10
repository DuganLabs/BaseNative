---
"@basenative/upload": patch
---

Fix a prototype-pollution surface (CodeQL `js/remote-property-injection`) in the built-in multipart parser: header names parsed from the request body were written onto a plain `{}` object, so a crafted `__proto__` header name reached `Object.prototype`. The per-part headers object is now created with `Object.create(null)`. No change to the parsed shape returned to callers.
