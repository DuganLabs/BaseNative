# @basenative/platform

Apple iOS, iPadOS, and macOS 27 kit tokens, plus a semantic-HTML control
for every control in both kits. Colour, type, Liquid Glass parameters,
device dimensions, macOS control sizes, and macOS materials are the
values extracted from the kits. Increased contrast is derived, because
the kits only define Light and Dark, and every derived colour is labeled
as such.

This package does not restyle `@basenative/components`. Those controls
keep `data-bn="button"` and the BaseNative visual language. Kit controls
use `data-bn="bn-*"`. `@basenative/ios` is unchanged: its accents stay
the classic UIColor table the express site already consumes. Rolling
this language out to GreenPut is a separate change.

Zero production dependencies. The font stack names SF Pro and falls
through to the system UI font. SF Pro files, SF Symbols, and Apple
artwork are not shipped.

```
@basenative/platform              kit, renderers, detectPlatform, catalogPage
@basenative/platform/tokens       kit, PROVENANCE, colorSlug, derivePalette
@basenative/platform/css          tokensCss(spec)
@basenative/platform/platform     detectPlatform, applyPlatform, initPlatform
@basenative/platform/components   renderBn*
@basenative/platform/catalog      catalogPage()
@basenative/platform/tokens.css
@basenative/platform/components.css
```

## Adoption

1. Link the stylesheets. Tokens win by attribute, not by rewriting
   existing components.

```html
<link rel="stylesheet" href="/node_modules/@basenative/platform/tokens.css" />
<link rel="stylesheet" href="/node_modules/@basenative/platform/components.css" />
```

2. Choose a platform on an ancestor. Default, with no attribute, is iOS,
   light, Dynamic Type Large, iPhone, with medium macOS control-size
   tokens also defined so the names exist.

```html
<body data-bn-platform="ios" data-theme="light"></body>
```

```html
<body data-bn-platform="macos" data-bn-control="medium" data-theme="dark"></body>
```

Class mirrors: `bn-platform-ios`, `bn-platform-macos`, `bn-device-iphone`,
`bn-device-ipad`, `bn-type-xxxlarge`, `bn-contrast-more`.

3. Or let the user agent choose, without overwriting an attribute you
   already set:

```js
import { initPlatform } from '@basenative/platform';

initPlatform(document.documentElement);
```

`detectPlatform` maps iPhone and iPod to iOS phone, iPad (and a touch
Mac) to iOS tablet, other Macs to macOS at the medium control size, and
anything else with a coarse pointer to iOS phone.

4. Render a control. The host is a real element. There is no class and
   no `style` attribute.

```js
import { renderBnButton, renderBnAlert } from '@basenative/platform';

renderBnButton('Save', { variant: 'prominent', size: 'large' });
renderBnAlert({
  title: 'Delete this item?',
  message: 'This cannot be undone.',
  actions: [
    { label: 'Cancel', role: 'none' },
    { label: 'Delete', role: 'destructive' },
  ],
});
```

5. Vary the kit axes when you need them.

| Attribute          | Values                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `data-bn-platform` | `ios`, `macos`                                                                                             |
| `data-theme`       | `light`, `dark` (also `prefers-color-scheme`)                                                              |
| `data-bn-contrast` | `more`, `default` (also `prefers-contrast: more`)                                                          |
| `data-bn-type`     | `xsmall`, `small`, `medium`, `large`, `xlarge`, `xxlarge`, `xxxlarge`, `ax1`–`ax5`                         |
| `data-bn-leading`  | `loose`, `tight`                                                                                           |
| `data-bn-device`   | `iphone`, `ipad`, `duo-inner-landscape`, `duo-inner-portrait`, `duo-outer-landscape`, `duo-outer-portrait` |
| `data-bn-control`  | `mini`, `small`, `medium`, `large`, `xl`                                                                   |

Increased contrast rewrites the same `--bn-plat-*` colour names. It is
not a third kit mode. `data-bn-contrast="default"` opts out of
`prefers-contrast`.

6. Browse the catalog:

```bash
node packages/platform/catalog/server.js
```

That serves every control, both platforms, light and dark, increased
contrast, an xxxLarge type stage, and the macOS Large control size, on
port 4317.

Token names are `--bn-plat-*` (`--bn-plat-color-accents-blue`,
`--bn-plat-font-body-size`, `--bn-plat-glass-frost-regular`). Regenerate
the sheet with `node generate.js` inside this package after editing
`data/tokens.json`. Do not hand-edit `src/tokens.css` or `src/kit.js`.

## What the screenshots could not settle

`VERIFY` lists these. The shapes the page screenshots did confirm are
implemented and are not in the list.

- Fit-to-page shots of dense pages (Keyboards, Sidebars, Toolbars, Lists
  and Tables, Windows, Menu Bar and Dock) are not reliable pixel
  measurements. Those controls use `tokens.json` and the HIG.
- macOS pressed fills are a brightness filter. Clicked and disabled
  fills were not readable.
- The macOS selected segment uses Accents/Blue. The fit does not show
  whether the kit uses blue or a darker gray.
- The iOS switch is 51×31 from the HIG. The shot confirms the pill,
  gray off, green on, and a white knob.
- Material blur radii were not readable. macOS materials carry fill,
  opacity, and blend only. Liquid Glass frost mapped to
  `backdrop-filter` blur is a labeled mapping, not the kit GLASS effect.
- macOS Title 2 Emphasized is Inter Bold in the kit file. Weight 700 is
  emitted; the family is likely a Figma fallback.
- `corner-shape: squircle` does not reproduce Figma smoothing 0.6.
- Neither kit defines motion. No spring curves were added.
- Increased contrast is derived.
- SF Symbols and app artwork are not shipped. Icon slots are a glyph or
  a monogram.

## License

Apache-2.0.
