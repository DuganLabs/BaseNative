---
'@basenative/components': patch
---

Table code now wraps with `overflow-wrap: break-word` instead of `anywhere`, so a column keeps room for each identifier part and a name never breaks mid-word on wider monospace fonts.
