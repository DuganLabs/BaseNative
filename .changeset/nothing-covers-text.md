---
'@basenative/components': patch
---

The alert's dismiss control takes its own grid column instead of overlaying the body, so a text button never covers the message. The fixed app bar sits on a new chrome layer (`--layer-chrome`, `--layer-app-bar`) above raised content.
