# @basenative/platform

## 2.2.0

### Minor Changes

- a0154b5: Atom controls accept a forced hover, pressed, focus, or disabled state so the design-system catalog can render those states without a pointer.
- 3ee6d56: The catalog renders every control state in light and dark, and the coverage gate records a cell only after the computed style matches the state tokens. An inline tooltip is a real element instead of a closed popover. Grouped rows with a detail stay on the 68px kit height.
- 172ea11: Alerts and action sheets use a dark glass fill in the dark theme. The light fill stays the white glass. Large regular glass buttons keep a 50px height and the 30px blur.
- dd772c8: Hero actions keep the button atom's own width and a 28px macOS height. A tab label clips inside its item, and a list mark fills the 29px tile.
- 9aad27a: The footer is a row of link columns, list rows keep a 29px tinted tile at every width, and content text stays at least 15px with a darker secondary label. Dense chrome stays at 13px.
- 3e5f0b1: Grouped lists use one blue tile, with a second hue only for a semantic red, orange, or green row. The phone tab bar is a single floating glass capsule. macOS web content stays at 15px and the large title at 28px. Elevation, radius, and z-index live on one token scale.
- 67ca256: An iOS catalog stage keeps iOS metrics when the document shell is macOS. The segmented track uses a 2px slot padding so the selected pill is 46px inside the 50px control, including when a site fieldset rule pads the control.
- 2bcc934: iOS stages keep destructive fills and the large glass-prominent frost when the document shell is macOS. A native popup select uses the 44px popup frame. Measured passes now include those frames plus the dark prominent disabled fill.
- 35a58b9: Molecule controls accept a forced state, and an iOS stage nested under the macOS shell keeps iOS button and segmented metrics. The large segmented control stays 50px tall instead of growing with the site fieldset rule.
- 196a717: Organism hosts accept a forced state. Alerts, dialogs, and action sheets name themselves from their titles. The page control is a radiogroup on a div, and an inline sidebar or inspector is a section so the catalog can show it inside the page.
- 5175199: Add the material token layer — blur, saturation, specular edge, layered shadow — and the organisms the design-system catalog renders: symbol tile, badge, index bar, metric, navigation bar, inspector, card grid, hero, footer, and dock.
- 124d741: Semantic hosts for the Apple 27 controls: menu, aside, nav, fieldset, and figure replace wrapper elements. macOS button styles (push, bevel, gradient, recessed, textured, rounded, square, help) and a material swatch are included. `bn-*` stays a data contract, not a tag.
- Brand amber, shared elevation, and Liquid Glass land together. The Builder is a macOS window with an organism palette, canvas, layers, and inspector. Site routes are composed from those organisms, including the scrollbar and refraction materials.
- 7d3aab6: A sheet or window can take composed markup from other renderers. The catalog shows three templates: an iOS list screen, a macOS window, and a sheet with a field. They are not kit-verified.

### Patch Changes

- 65ee34d: The rendered platform catalog no longer ends with the internal "What the screenshots could not settle" working notes. Those notes are the kit-translation team's open verification questions (recorded in `verify.js`, still exported for programmatic use) — internal process material that was being published on the public design-system page. The catalog body now ends with the last control stage.
- b0ed913: `renderBnFooter` gains a `siteFooter` option: when set, the rendered footer carries the `data-bn-site-footer` attribute the basenative.com stylesheets key on. The site now renders its footer through the component from the nav model, which the attribute exists to support; the option defaults off, so existing consumers render byte-identical output. A footer group may also carry an `ariaLabel` distinct from its visible label, for pages where another footer already uses that label as its landmark name.
- 2a39327: Extend `renderBnHero` with raw-fragment options so every page hero can be rendered by the component: `titleHtml` and `ledeHtml` for titles and ledes that carry markup (an `<em>` accent, `<code>` names, a second lede paragraph), `after` for a trailing fragment inside the header (a meta list, a notice), and `attrs` for extra attributes on the `<header>` element. The escaped `title`/`lede` options are unchanged, and `titleHtml` wins over `title` when both are given.
- fafc853: The current route now reads the same in the tab bar, the tab bar's More menu, and the sidebar: one shared treatment (brand background, ink text, semibold) for every `[aria-current='page']` item. Before, the tab was text-only and menu items had no current rule at all, so a route behind More showed no current state anywhere — not on the More tab, and not inside its menu.

## 2.1.0

### Minor Changes

- 6b80c2d: Add `@basenative/platform`: the iOS, iPadOS, and macOS 27 kit token sheet (`--bn-plat-*`), derived increased contrast, and semantic HTML controls (`data-bn="bn-*"`) for both kits, with a browsable catalog. This does not restyle `@basenative/components` or change `@basenative/ios`.
