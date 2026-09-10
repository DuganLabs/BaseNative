---
"@basenative/upload": patch
---

Fix CodeQL `js/remote-property-injection` (alert #35) by storing parsed multipart header names in a `Map` instead of a plain object, eliminating the dynamic-property-write sink entirely for this internal, never-exposed header store.
