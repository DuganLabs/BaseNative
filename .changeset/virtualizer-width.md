---
'@basenative/components': patch
---

`[data-bn="virtualizer"]` takes `inline-size: 100%`. Its only descendant is
absolutely positioned, so the box had no intrinsic width and collapsed to its
two borders inside any flex parent — /components/virtual-list rendered as a
2px sliver. The dead `[data-bn="virtual-window"] { position: relative }` rule
(always beaten by the inline `position: absolute`) is gone.
