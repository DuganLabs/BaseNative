---
'@basenative/components': patch
'@basenative/builder': patch
---

Tighten the design system for contrast and calm. Text that used the brand
tint now uses `--color-tint-strong` (breadcrumb, pagination, alert title,
toolbar more, search-field clear, app-bar current, site links), which clears
WCAG AA in light and dark; the tint fill is softer; the hero is a plain page
head with no frame; sidebar rows reach a 44px target; list groups sit on the
raised grouped surface. The builder window fills its host column instead of
breaking out under an app-shell rail, and its pane headings are sentence case.
