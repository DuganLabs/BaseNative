---
'@basenative/components': patch
---

Site: one deploy, one version. Every page maps the bare `/basenative.js` import to the deploy's versioned bundle with an import map, the specimens fetch component templates under the same version, and the playground preview document is stamped the same way. A cached bundle or template can no longer outlive a deploy and break the interactive specimens.
