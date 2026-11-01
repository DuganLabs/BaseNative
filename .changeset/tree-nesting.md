---
'@basenative/components': patch
---

tree: a branch's children render as its `role="group"` list directly inside the treeitem (pass `nested: true` when rendering the child list), so the markup is valid and the tree is one tree with one tab stop. The root list now handles the keys, selection and roving focus for nested items.
