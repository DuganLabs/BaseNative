---
"@basenative/server": patch
---

Fix CodeQL `js/incomplete-html-attribute-sanitization` (alert #140) by applying a final, literal `"` → `&quot;` replace at the attribute serialisation sink in `render.js`, making the sink itself provably quote-free instead of relying on upstream escaping alone.
