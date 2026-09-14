---
'@basenative/components': patch
---

WCAG 2.5.8: `alert-dismiss` and breadcrumb links join the minimum-target block.
The alert's × was the size of its glyph (~11×18px) and a breadcrumb link was its
text line; both now resolve a 24×24 floor from `--bn-target-size-min` without
changing what is visible. The block's comment records why `dialog-close`,
`drawer-close`, `command-item` and `dropdown-item` clear the floor in their own
rules, and the test suite now checks every member of the button-reset group
against one or the other.
