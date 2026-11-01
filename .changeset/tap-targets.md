---
'@basenative/components': patch
'@basenative/builder': patch
---

Every control is a 44px tap target. Pagination, breadcrumb, footer, tab, dropdown-menu, list-group link, tree and app-bar items reserve `--size-target-min`; app-bar items keep the minimum at every width. A narrow pagination keeps one row by dropping far pages in a container query (`--display-pagination-item-compact`). Tree leaf text now lines up with toggle labels. Builder palette and toolbar buttons are 44px at every width.
