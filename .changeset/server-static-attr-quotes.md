---
"@basenative/server": patch
---

Static attribute values in a template are re-emitted inside double quotes; a single-quoted value containing `"` could previously break out of them. Bare double quotes in static values are now written as `&quot;` (existing entities are left intact).
