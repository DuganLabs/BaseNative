---
'@basenative/platform': patch
---

`renderBnFooter` gains a `siteFooter` option: when set, the rendered footer carries the `data-bn-site-footer` attribute the basenative.com stylesheets key on. The site now renders its footer through the component from the nav model, which the attribute exists to support; the option defaults off, so existing consumers render byte-identical output. A footer group may also carry an `ariaLabel` distinct from its visible label, for pages where another footer already uses that label as its landmark name.
