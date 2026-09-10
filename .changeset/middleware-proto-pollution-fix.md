---
"@basenative/middleware": patch
---

Fix a prototype-pollution surface (CodeQL `js/remote-property-injection`) in the Express adapter's `Cookie` header parser: cookie names were written onto a plain `{}` object, so a crafted `__proto__` cookie name reached `Object.prototype`. The parsed cookie map is now created with `Object.create(null)`. No change to the shape returned as `ctx.request.cookies`.
