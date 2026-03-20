# Migration Guide

## v0.1.x → v0.2.0

### Breaking Changes

None. v0.2.0 is the first published release.

### New Features

- **CSP-safe expression engine**: Template expressions no longer use `eval()` or `new Function()`. All expressions are parsed and evaluated by a safe interpreter.
- **Keyed `@for` reconciliation**: Use `@for="item of items; track item.id"` for stable DOM identity across list updates.
- **Hydration diagnostics**: `hydrate()` now accepts `onDiagnostic` and `onMismatch` callbacks.
- **Browser feature detection**: `detectBrowserFeatures()` checks for `dialog`, `popover`, `anchorPositioning`, and `baseSelect`.

### Migration Steps

1. Update package versions: `pnpm update @basenative/runtime @basenative/server`
2. If you had custom `eval`-based expressions, move logic into named functions
3. Add `track` expressions to `@for` loops for better performance

## v0.2.0 → v0.3.0

### New Packages

- `@basenative/router` — Client-side and server-side routing
- `@basenative/forms` — Field state management and validation
- `@basenative/components` — 15 semantic UI components with design tokens

### Migration Steps

1. Install new packages as needed:
   ```bash
   pnpm add @basenative/router @basenative/forms @basenative/components
   ```
2. Include component CSS in your HTML:
   ```html
   <link rel="stylesheet" href="@basenative/components/tokens.css" />
   <link rel="stylesheet" href="@basenative/components/theme.css" />
   ```
3. Replace custom routing logic with `@basenative/router`
4. Replace manual form state tracking with `@basenative/forms`

### New Runtime Exports

- `enableDevtools()`, `disableDevtools()` — Debug instrumentation
- `createErrorBoundary()`, `renderWithBoundary()` — Error handling

### New Server Exports

- `@basenative/server/stream` — `renderToStream()` and `renderToReadableStream()`
