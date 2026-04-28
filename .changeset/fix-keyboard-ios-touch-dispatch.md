---
'@basenative/keyboard': patch
---

Fix iPhone keyboard taps not registering.

`preventFocusSteal` calls `e.preventDefault()` on `touchstart` to keep
text inputs focused when the user taps an on-screen keyboard key. On
iOS Safari, that also suppresses the synthetic `click` event that
would otherwise reach the dispatch handler — so taps never fired the
`onKey`/`onAction` callbacks on iPhone. Desktop was unaffected because
`mousedown.preventDefault` doesn't suppress click.

`hydrateKeyboard` now also listens on `touchend` and dispatches keys
from there, calling `preventDefault` to swallow the (already-suppressed)
synthetic click. The desktop click path is unchanged.
