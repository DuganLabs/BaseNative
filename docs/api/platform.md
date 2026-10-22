# @basenative/platform

> Apple 27 kit tokens and semantic controls for iOS, iPadOS, and macOS

## Overview

`@basenative/platform` is the kit catalog. Colour, type, Liquid Glass
parameters, device dimensions, macOS control sizes, and macOS materials
come from the iOS and iPadOS 27 and macOS 27 Figma kits. Increased
contrast is derived and labeled. Controls are semantic HTML with
`data-bn="bn-*"`, so they do not restyle `@basenative/components`.

`@basenative/ios` keeps the classic UIColor table. Adopting this package
in GreenPut is a separate change.

## Installation

```bash
npm install @basenative/platform
```

## Adoption

Link `tokens.css` and `components.css`. Set `data-bn-platform` to `ios`
or `macos`, or call `initPlatform`. `data-theme` selects light or dark.
`data-bn-contrast="more"` (and `prefers-contrast: more`) turns on the
derived palette. `data-bn-type` selects an iOS Dynamic Type size.
`data-bn-device` selects iPhone, iPad, or a Duo orientation.
`data-bn-control` selects a macOS control size from `mini` to `xl`.

```js
import { initPlatform, renderBnButton } from '@basenative/platform';

initPlatform(document.documentElement);
renderBnButton('Save', { variant: 'prominent', size: 'large' });
```

`applyPlatform` writes attributes only where they are absent, so an
explicit choice wins over `detectPlatform`.

## API

### Token data — `@basenative/platform/tokens`

- `kit` — the vendored extract. Edit `data/tokens.json` and run
  `node generate.js`. Do not edit `src/kit.js`.
- `PROVENANCE` — per group: `kit`, `mapped` (frost used as a blur),
  `unread` (material blur), `derived` (increased contrast), or `absent`
  (motion).
- `FONT_STACK` — `"SF Pro"` then the system UI fonts. The font files
  are not shipped.
- `colorSlug` — `Labels/Secondary` becomes `labels-secondary`.
- `contrastRatio` — WCAG contrast of two sRGB colours.
- `derivePalette` — the increased-contrast colours for one scheme.
  Every row has `provenance: "derived"`.

### Stylesheet — `@basenative/platform/css`

- `tokensCss` — emit the token sheet from a kit extract.
- `FONT_STACK` — the same stack as the tokens subpath.

The static file is `@basenative/platform/tokens.css`. Component rules
are `@basenative/platform/components.css`. Names are `--bn-plat-*`.

### Platform detection — `@basenative/platform/platform`

- `detectPlatform` — iPhone or iPod to iOS phone, iPad or a touch Mac
  to iOS tablet, other Macs to macOS medium, a coarse pointer otherwise
  to iOS phone, else macOS medium.
- `applyPlatform` — set `data-bn-platform`, and device or control size,
  only where absent.
- `initPlatform` — apply, then bind keyboard behaviour for menus,
  segmented controls, page controls, and toolbars. Native dialog,
  details, range, and checkbox keep the browser.

### Catalog — `@basenative/platform/catalog`

- `catalogPage` — one HTML document of every control, both platforms,
  light and dark, increased contrast, Dynamic Type xxxLarge, and the
  macOS Large control size.
- `VERIFY` — what the 1024×594 fit-to-page screenshots could not
  settle: dense-page pixel measurements, macOS pressed fills, the macOS
  selected segment fill, the iOS switch’s 51×31 size, material blur
  radii, the Inter Bold Title 2 family, corner smoothing, motion,
  increased contrast, and SF Symbols. Exported from the package root.

`nextId` and `resetIds` mint `bn-<prefix>-n` ids for controls that need
one. Call `resetIds` at the start of a document, which `catalogPage`
does.

### Controls — `@basenative/platform/components`

Each function returns HTML. The host is a button, dialog, details,
input, select, fieldset, progress, table, list, nav, search, or the
popover API. No class, no inline style.

- `renderBnButton` — prominent, bordered, borderless, glass,
  glass-prominent; sizes large, medium, small.
- `renderBnPopupButton` — native `select`, or a button plus popover menu.
- `renderBnPulldownButton`
- `renderBnSegmented` — radiogroup. Arrow keys move the selection.
- `renderBnSwitch` — checkbox with `role="switch"`.
- `renderBnCheckbox`
- `renderBnRadio`
- `renderBnSlider`
- `renderBnDial`
- `renderBnStepper`
- `renderBnProgress`
- `renderBnSpinner`
- `renderBnField`
- `renderBnSearch`
- `renderBnCombobox`
- `renderBnColorWell`
- `renderBnColorPicker`
- `renderBnDatePicker`
- `renderBnList`
- `renderBnListRow`
- `renderBnTable`
- `renderBnMenu` — Arrow keys, Home, End, and Escape.
- `renderBnMenuItem`
- `renderBnContextMenu`
- `renderBnActionSheet`
- `renderBnShareSheet`
- `renderBnAlert` — `role="alertdialog"`.
- `renderBnDialog`
- `renderBnSheet`
- `renderBnPopover`
- `renderBnTooltip`
- `renderBnNotification` — `role="status"`.
- `renderBnPageControl`
- `renderBnTabBar`
- `renderBnToolbar`
- `renderBnSidebar`
- `renderBnWindow`
- `renderBnMenubar`
- `renderBnDisclosure` — `details` and `summary`.
- `renderBnForm`
- `renderBnGroup` — `fieldset` and `legend`.
- `renderBnImageWell`
- `renderBnScroll`
- `renderBnInputAccessory`
- `renderBnEmptyState`
- `renderBnAppIcon` — a monogram frame, not Apple artwork.
- `renderBnWidget`

## License

Apache-2.0.
