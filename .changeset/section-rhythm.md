---
'@basenative/components': minor
'@basenative/theme': patch
---

Vertical rhythm is now part of the app shell. New tokens `--spacing-app-shell-section-gap` (48px on a phone, `--spacing-app-shell-section-gap-rail` 80px beside the rail) and `--spacing-app-shell-stack-gap` (16px) space the page's sections and the cards stacked inside them, so no page spaces its sections by hand. Adds `--spacing-20`, `--white-space-pre` and `--white-space-pre-wrap`. Code blocks, and bare reading `<pre>`s, wrap long lines on a phone (`--white-space-code-block-pre-phone`, `--overflow-wrap-code-block-pre-phone`) instead of clipping them at the card edge. The theme bridge lists `--spacing-20` as upstream-owned.
