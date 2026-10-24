---
'@basenative/platform': patch
---

Extend `renderBnHero` with raw-fragment options so every page hero can be rendered by the component: `titleHtml` and `ledeHtml` for titles and ledes that carry markup (an `<em>` accent, `<code>` names, a second lede paragraph), `after` for a trailing fragment inside the header (a meta list, a notice), and `attrs` for extra attributes on the `<header>` element. The escaped `title`/`lede` options are unchanged, and `titleHtml` wins over `title` when both are given.
