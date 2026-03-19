# Browser Support

BaseNative targets current evergreen Chrome, Edge, Firefox, and Safari.

## Policy

- Semantic HTML is the default path.
- Modern browser APIs are enhancements, not hard requirements.
- If a feature needs fallback logic, the fallback must be documented.
- If a feature has no acceptable fallback yet, it should be marked partial.

## Current Feature Policy

- `dialog`
  Use native `<dialog>` where available. If a workflow depends on complex stacked-modal behavior, treat it as partial until the dialog primitives are fully packaged.
- Popover API
  Feature-detect. Do not assume universal availability.
- CSS anchor positioning
  Feature-detect. Do not make it the only positioning strategy.
- `appearance: base-select`
  Treat as progressive enhancement only.

## First Public Compatibility Promise

- current Chrome
- current Edge
- current Firefox
- current Safari

No older-browser promise is made in `v0.x`.
