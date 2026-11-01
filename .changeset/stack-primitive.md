---
'@basenative/components': patch
---

One stack primitive for every page: any block surface (figure, table, pre, details, article, section, form, dl, iframe, listed ul/ol) that follows another inside a section is set off by the stack gap, whether or not it carries a variant. Component pages no longer stack the registry table and source cards with no gap. The stack is a layout-layer default that skips the inside of any component, so grids keep their own gap and the section gap always wins.
