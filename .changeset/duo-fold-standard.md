---
'@basenative/ios': minor
---

Phase 1.5 of `@basenative/ios` — the fold standard for the iPhone Duo. The token layer gains the `BREAKPOINTS` group (the named size-class stops from `watch` to `wide`, with the Duo's two classes: `duoCover`, the 5.4-inch cover display, and `duoInner`, the 7.6-inch inner display's short edge) and the `FOLD` group (the segment count and the `env(viewport-segment-*)` geometry the device reports at runtime, each with a single-pane fallback, plus the crease safe margin). A new `@basenative/ios/posture` subpath ships `POSTURE_MEDIA` — the spanning posture queries and the Duo width classes, derived from the breakpoint token — and `postureCss()`, the utility sheet whose spanning pane grid is sized by the segments themselves, gapped by the hinge, and keeps content off the crease. An original implementation informed by Apple's announced Duo specifications — no Apple artwork.
