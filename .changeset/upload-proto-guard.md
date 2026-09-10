---
"@basenative/upload": patch
---

Fix CodeQL `js/remote-property-injection` (alert #35) by adding an explicit `__proto__`/`constructor`/`prototype` guard before writing parsed multipart header names into the headers object, alongside the existing null-prototype object.
