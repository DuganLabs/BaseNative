---
'@basenative/components': patch
---

Pagination layout matches `:is(ul, ol)`. Every rule was scoped to `ul`, so a
consumer's `<ol>` pager rendered as a browser-default numbered list while its
links looked right.
