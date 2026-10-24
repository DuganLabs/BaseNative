---
'@basenative/platform': patch
---

The current route now reads the same in the tab bar, the tab bar's More menu, and the sidebar: one shared treatment (brand background, ink text, semibold) for every `[aria-current='page']` item. Before, the tab was text-only and menu items had no current rule at all, so a route behind More showed no current state anywhere — not on the More tab, and not inside its menu.
