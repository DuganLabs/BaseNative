---
'@basenative/cli': minor
---

New `bn site build` command: generate static pages from a JSON input that names the site's page module, an output directory, and the pages to render (route paths or `{ path, ...spec }` objects whose extra fields reach the renderer as data). Generation is deterministic — sorted page order, no clock, environment, or randomness — and renders through the site's own `renderRoute`, so generated output and server output agree. The BaseNative site's /roadmap page is the pilot: the deploy build now produces it through this generator from `examples/express/site.json`.
