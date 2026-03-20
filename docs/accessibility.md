# Accessibility

BaseNative components are built on native HTML elements with semantic defaults. This document defines the accessibility contracts for each component.

## Principles

1. **Native first** — Use semantic HTML elements that provide built-in accessibility (e.g., `<button>`, `<input>`, `<table>`)
2. **ARIA only when needed** — Only add ARIA attributes when native semantics are insufficient
3. **Keyboard navigable** — All interactive elements must be operable with keyboard
4. **Focus visible** — All focusable elements display a visible focus indicator

## Component Accessibility Matrix

### Button

| Feature | Implementation |
|---------|---------------|
| Element | `<button>` (native) |
| Role | Implicit `button` |
| Keyboard | `Enter` / `Space` activates |
| Focus | Visible focus ring via `--bn-focus-ring` |
| Disabled | Native `disabled` attribute |
| Loading | Add `aria-busy="true"`, disable button |

### Input

| Feature | Implementation |
|---------|---------------|
| Element | `<input>` (native) |
| Label | Associated `<label for="...">` |
| Required | Native `required` attribute |
| Invalid | `aria-invalid="true"` when errors present |
| Description | `aria-describedby` linking to help text / error |
| Error | Error message has `role="alert"` |

### Textarea

| Feature | Implementation |
|---------|---------------|
| Element | `<textarea>` (native) |
| Label | Associated `<label for="...">` |
| Required | Native `required` attribute |
| Invalid | `aria-invalid="true"` when errors present |

### Checkbox

| Feature | Implementation |
|---------|---------------|
| Element | `<input type="checkbox">` (native) |
| Label | Wrapping `<label>` with text |
| Keyboard | `Space` toggles |
| Focus | Browser native focus ring |

### Radio Group

| Feature | Implementation |
|---------|---------------|
| Element | `<fieldset>` + `<input type="radio">` |
| Group Label | `<legend>` |
| Keyboard | Arrow keys navigate within group |
| Focus | Browser native focus ring |

### Toggle / Switch

| Feature | Implementation |
|---------|---------------|
| Element | `<input type="checkbox" role="switch">` |
| Role | Explicit `switch` role |
| Keyboard | `Space` toggles |
| State | Native `checked` attribute |

### Select

| Feature | Implementation |
|---------|---------------|
| Element | `<select>` (native) |
| Label | Associated `<label for="...">` |
| Keyboard | Arrow keys navigate options |
| Invalid | `aria-invalid="true"` when errors present |
| Disabled Options | Native `disabled` on `<option>` |

### Alert

| Feature | Implementation |
|---------|---------------|
| Element | `<div>` |
| Role | `role="alert"` (error/warning) or `role="status"` (info/success) |
| Live | Implicit `aria-live` via role |
| Dismiss | Button with `aria-label="Dismiss"` |

### Toast

| Feature | Implementation |
|---------|---------------|
| Container | `role="region"` with `aria-live="polite"` |
| Label | `aria-label="Notifications"` |
| Auto-dismiss | Configurable duration |

### Table

| Feature | Implementation |
|---------|---------------|
| Element | `<table>` (native) |
| Headers | `<th scope="col">` |
| Caption | `<caption>` when provided |
| Empty State | Spanning `<td colspan>` |

### Pagination

| Feature | Implementation |
|---------|---------------|
| Element | `<nav aria-label="Pagination">` |
| Current Page | `aria-current="page"` |
| Previous/Next | `rel="prev"` / `rel="next"` with `aria-label` |
| Disabled | `aria-disabled="true"` |

### Badge

| Feature | Implementation |
|---------|---------------|
| Element | `<span>` (decorative, inline) |
| Semantics | Content is text, readable by screen readers |

### Card

| Feature | Implementation |
|---------|---------------|
| Element | `<article>` (semantic) |
| Structure | `<header>`, `<div>`, `<footer>` sections |

### Progress

| Feature | Implementation |
|---------|---------------|
| Element | `<progress>` (native) |
| Label | `aria-label` for context |
| Value | Percentage in text content for fallback |

### Spinner

| Feature | Implementation |
|---------|---------------|
| Element | `<span>` |
| Role | `role="status"` |
| Label | `aria-label` describing the action |
| Decorative | Inner element has `aria-hidden="true"` |

### Skeleton

| Feature | Implementation |
|---------|---------------|
| Element | `<div>` |
| Hidden | `aria-hidden="true"` (purely decorative) |

## Keyboard Navigation Reference

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next focusable element |
| `Shift+Tab` | Move focus to previous focusable element |
| `Enter` | Activate buttons, submit forms |
| `Space` | Activate buttons, toggle checkboxes/switches |
| `Arrow Keys` | Navigate radio groups, select options |
| `Escape` | Close dialogs, dismiss toasts |

## Screen Reader Testing

Recommended screen readers for testing:
- **macOS/iOS**: VoiceOver (built-in)
- **Windows**: NVDA (free), JAWS
- **Android**: TalkBack (built-in)

## WAI-ARIA Pattern References

- [Button](https://www.w3.org/WAI/ARIA/apd/patterns/button/)
- [Checkbox](https://www.w3.org/WAI/ARIA/apd/patterns/checkbox/)
- [Radio Group](https://www.w3.org/WAI/ARIA/apd/patterns/radio/)
- [Switch](https://www.w3.org/WAI/ARIA/apd/patterns/switch/)
- [Alert](https://www.w3.org/WAI/ARIA/apd/patterns/alert/)
- [Table](https://www.w3.org/WAI/ARIA/apd/patterns/table/)
