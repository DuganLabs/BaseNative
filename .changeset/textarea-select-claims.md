---
'@basenative/components': minor
---

Ship the two catalogue claims the stylesheet never backed. `[data-bn="textarea"]`
now declares `field-sizing: content` and `resize: vertical`, so it grows with its
value (the control-family floor keeps the starting height; engines without
`field-sizing` still honour `rows`). `[data-bn="select"]` opts into
`appearance: base-select` inside `@supports`, for itself and its
`::picker(select)`. Both rules had existed only for the demo site's bare
elements, scoped away from `[data-bn]`, so the catalogue described behaviour no
consumer ever got.
