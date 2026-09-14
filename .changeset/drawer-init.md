---
'@basenative/components': minor
---

Add `initDrawer(drawer, options)`, the client half of the drawer contract.

`renderDrawer` marks a closed drawer `inert` and documented that "the client"
removes it on open, but nothing shipped did, so an opened drawer's close button
could not be clicked, tabbed to or read by assistive technology, and no scrim
appeared. `initDrawer` returns `{ open, close, toggle, isOpen, destroy }`:
`open()` lifts `inert`, adds `data-open` to the drawer and its overlay and moves
focus to the close button (or the panel); `close()` reverses that and returns
focus to the element that had it before. The close button, a click on the
overlay (unless `dismissible: false`) and Escape all close it. The overlay is
found as the drawer's preceding `[data-bn="drawer-overlay"]` sibling — what
`renderDrawer` emits — or passed as `options.overlay`.
