---
'@basenative/components': patch
---

button: a button no longer adds its own inline margin beside a sibling button, so a row's gap is its only spacing and wrapped rows align (removes `--spacing-button-margin-inline-start-adjacent`). hero: the actions gap is 16px (`spacing-4`), so wrapped actions keep a full block gap.
