---
'@basenative/components': minor
---

App nav grows the two pieces a real phone-class surface needs. A material surface: the bar and rail now read `--bn-material-bg` / `--bn-material-backdrop` / `--bn-material-shadow` (opaque by default), so a platform token layer such as `@basenative/ios`'s glass ladder can glass them without component CSS changing. And a More overflow: pass `overflow` to `renderAppNav` and items past the bar's capacity (default 4) leave the phone-class bar for a More button and its sheet — the iOS tab-bar pattern, never a cram of wrapped labels — while the rail shows everything and hides the sheet; `initAppNav` wires the sheet's toggle (Escape and outside-click close, focus returns to the button). Also adds `renderListGroup`, the inset grouped list: a section heading, fact and link rows on one raised surface with hairline separators inset to the label edge, and an explanatory footer.
