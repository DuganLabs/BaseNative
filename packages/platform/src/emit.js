/**
 * Emits the platform token sheet from the vendored kit (`data/tokens.json`).
 *
 * `src/tokens.css` is this function's output. `generate.js` writes it.
 * Edit the data or this emitter, never the sheet.
 *
 * Default `:root` is iOS, light, Dynamic Type Large, iPhone dimensions.
 * macOS replaces colour, type, and control-size tokens on
 * `[data-bn-platform="macos"]` / `.bn-platform-macos`. Increased contrast
 * redeclares the same colour names; those values are derived (see contrast.js).
 */

import { colorSlug, derivePalette, resolveEntry } from './contrast.js';

export const FONT_STACK =
  '"SF Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const TYPE_MODES = [
  ['xsmall', 'xSmall'],
  ['small', 'Small'],
  ['medium', 'Medium'],
  ['large', 'Large (Default)'],
  ['xlarge', 'xLarge'],
  ['xxlarge', 'xxLarge'],
  ['xxxlarge', 'xxxLarge'],
  ['ax1', 'AX1'],
  ['ax2', 'AX2'],
  ['ax3', 'AX3'],
  ['ax4', 'AX4'],
  ['ax5', 'AX5'],
];

const DEVICES = [
  ['iphone', 'iPhone'],
  ['ipad', 'iPad'],
  ['duo-inner-landscape', 'iPhone Duo Inner Landscape'],
  ['duo-inner-portrait', 'iPhone Duo Inner Portrait'],
  ['duo-outer-landscape', 'iPhone Duo Outer Landscape'],
  ['duo-outer-portrait', 'iPhone Duo Outer Portrait'],
];

const CONTROLS = [
  ['mini', 'Mini'],
  ['small', 'Small'],
  ['medium', 'Medium'],
  ['large', 'Large'],
  ['xl', 'XL'],
];

/** slug, dynamic-type key, tracking key, text-style prefix (kit names disagree). */
const IOS_STYLES = [
  ['large-title', 'Large Title', 'Large-title', 'Large Title'],
  ['title-1', 'Title 1', 'Title-1', 'Title1'],
  ['title-2', 'Title 2', 'Title-2', 'Title2'],
  ['title-3', 'Title 3', 'Title-3', 'Title3'],
  ['headline', 'Headline', 'Headline', 'Headline'],
  ['body', 'Body', 'Body', 'Body'],
  ['callout', 'Callout', 'Callout', 'Callout'],
  ['subheadline', 'Subheadline', 'Subheadline', 'Subheadline'],
  ['footnote', 'Footnote', 'Footnote', 'Footnote'],
  ['caption-1', 'Caption 1', 'Caption-1', 'Caption1'],
  ['caption-2', 'Caption 2', 'Caption-2', 'Caption2'],
];

const WEIGHTS = [
  ['regular', 400],
  ['medium', 510],
  ['semibold', 590],
  ['bold', 700],
  ['heavy', 800],
];

const IOS_ALIASES = [
  ['label', 'labels-primary'],
  ['label-secondary', 'labels-secondary'],
  ['label-tertiary', 'labels-tertiary'],
  ['label-quaternary', 'labels-quaternary'],
  ['fill', 'fills-primary'],
  ['fill-secondary', 'fills-secondary'],
  ['fill-tertiary', 'fills-tertiary'],
  ['fill-quaternary', 'fills-quaternary'],
  ['bg', 'backgrounds-primary'],
  ['bg-secondary', 'backgrounds-secondary'],
  ['bg-tertiary', 'backgrounds-tertiary'],
  ['bg-grouped', 'backgrounds-grouped-primary'],
  ['separator', 'separators-non-opaque'],
  ['separator-opaque', 'separators-opaque'],
  ['overlay', 'overlays-default'],
  ['accent', 'accents-blue'],
  ['gray', 'grays-gray'],
];

const MACOS_ALIASES = [
  ['label', 'labels-primary'],
  ['label-secondary', 'labels-secondary'],
  ['label-tertiary', 'labels-tertiary'],
  ['label-quaternary', 'labels-quaternary'],
  ['label-quinary', 'labels-quinary'],
  ['label-seximal', 'labels-seximal'],
  ['fill', 'fills-opaque-primary'],
  ['bg', 'window-background'],
  ['separator', 'miscellaneous-tables-column-separator'],
  ['overlay', 'miscellaneous-alerts-overlay'],
  ['accent', 'accents-blue'],
  ['gray', 'grays-gray'],
];

const ACCENTS = [
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown',
];

function num(value) {
  if (value && typeof value === 'object' && 'resolved' in value) return value.resolved;
  return value;
}

function px(value) {
  const n = num(value);
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return `${String(Number(n.toFixed(4)))}px`;
}

function decl(name, value) {
  return `    --bn-plat-${name}: ${value};`;
}

function weightFromFamily(family) {
  const s = String(family).toLowerCase();
  if (s.includes('heavy')) return 800;
  if (s.includes('semibold')) return 590;
  if (s.includes('bold')) return 700;
  if (s.includes('medium')) return 510;
  return 400;
}

function findStyle(styles, prefix, slot) {
  return styles.find((style) => style.n === `${prefix}/${slot}`);
}

function block(selectors, lines) {
  if (!lines.length) return '';
  return `${selectors.join(',\n')} {\n${lines.join('\n')}\n}\n`;
}

function scoped(scope, selectors) {
  return selectors.flatMap((sel) => scope(sel));
}

function iosScope(inner) {
  const notMac = ':not([data-bn-platform="macos"]):not(.bn-platform-macos)';
  if (!inner) {
    return [`:root${notMac}`, '[data-bn-platform="ios"]', '.bn-platform-ios'];
  }
  return [
    `${inner}${notMac}`,
    `[data-bn-platform="ios"]${inner}`,
    `[data-bn-platform="ios"] ${inner}`,
    `.bn-platform-ios${inner}`,
    `.bn-platform-ios ${inner}`,
    `:root${notMac} ${inner}`,
  ];
}

function macosScope(inner) {
  if (!inner) return ['[data-bn-platform="macos"]', '.bn-platform-macos'];
  return [
    `[data-bn-platform="macos"]${inner}`,
    `[data-bn-platform="macos"] ${inner}`,
    `.bn-platform-macos${inner}`,
    `.bn-platform-macos ${inner}`,
  ];
}

function iosTypeDecls(spec, modeLabel) {
  const { dynamicTypeSizePx, lineHeightPx, letterSpacingPx, textStyles } = spec.ios.typography;
  const lines = [];
  for (const [name, sizeKey, trackKey, stylePrefix] of IOS_STYLES) {
    const size = dynamicTypeSizePx[sizeKey]?.[modeLabel];
    const lead = lineHeightPx[`${modeLabel}/${sizeKey}`]?.Default;
    const track = letterSpacingPx[trackKey];
    if (size == null || lead == null || track == null) continue;
    lines.push(decl(`font-${name}-size`, px(size)));
    lines.push(decl(`font-${name}-leading`, px(lead)));
    lines.push(decl(`font-${name}-tracking`, px(track)));
    const regular = findStyle(textStyles, stylePrefix, 'Regular');
    const emphasized = findStyle(textStyles, stylePrefix, 'Emphasized');
    if (regular) lines.push(decl(`font-${name}-weight`, String(weightFromFamily(regular.f))));
    if (emphasized) {
      lines.push(decl(`font-${name}-emphasized-weight`, String(weightFromFamily(emphasized.f))));
      if (/italic/i.test(emphasized.f)) lines.push(decl(`font-${name}-emphasized-style`, 'italic'));
    }
  }
  return lines;
}

function iosLeadingDecls(spec, modeLabel, leading) {
  const { lineHeightPx } = spec.ios.typography;
  const lines = [];
  for (const [name, sizeKey] of IOS_STYLES) {
    const lead = lineHeightPx[`${modeLabel}/${sizeKey}`]?.[leading];
    if (lead == null) continue;
    lines.push(decl(`font-${name}-leading`, px(lead)));
  }
  return lines;
}

function macosTypeDecls(spec) {
  const groups = new Map();
  for (const style of spec.macos.typography.textStyles) {
    const slash = style.n.indexOf('/');
    const name = style.n.slice(0, slash);
    const slot = style.n.slice(slash + 1);
    const key = colorSlug(name);
    if (!groups.has(key)) groups.set(key, {});
    groups.get(key)[slot] = style;
  }
  const lines = [];
  for (const key of [...groups.keys()].sort()) {
    const slots = groups.get(key);
    const regular = slots.Regular;
    const emphasized = slots.Emphasized;
    const base = regular || emphasized;
    lines.push(decl(`font-${key}-size`, px(base.sz)));
    lines.push(decl(`font-${key}-leading`, String(base.lh)));
    lines.push(decl(`font-${key}-tracking`, '0px'));
    if (regular) lines.push(decl(`font-${key}-weight`, String(weightFromFamily(regular.f))));
    if (emphasized) {
      lines.push(decl(`font-${key}-emphasized-weight`, String(weightFromFamily(emphasized.f))));
      if (/^inter\b/i.test(emphasized.f)) {
        lines.push(decl(`font-${key}-emphasized-family`, `Inter, ${FONT_STACK}`));
      }
      if (/italic/i.test(emphasized.f)) lines.push(decl(`font-${key}-emphasized-style`, 'italic'));
    }
  }
  return lines;
}

function glassDecls(glass, scrollEdge) {
  const lines = [
    decl('glass-refraction', String(glass.Refraction)),
    decl('glass-depth', String(glass['Depth - Regular'])),
    decl('glass-depth-medium', String(glass['Depth - Medium and Large'])),
    decl('glass-dispersion', String(glass.Dispersion)),
    decl('glass-splay', String(glass['Splay - Regular'])),
    decl('glass-splay-medium', String(glass['Splay - Medium and Large'])),
    decl('glass-light-angle', String(glass['Light Angle'])),
    decl('glass-opacity', String(glass.Opacity)),
    decl('glass-opacity-unit', String(Number((glass.Opacity / 100).toFixed(4)))),
    '    /* frost: kit Liquid Glass radius, mapped to a blur length — not a kit blur */',
    decl('glass-frost-regular', px(glass['Frost - Regular'])),
    decl('glass-frost-medium', px(glass['Frost - Medium'])),
    decl('glass-frost-large', px(glass['Frost - Large'])),
  ];
  if (scrollEdge != null) lines.push(decl('scroll-edge-blur', px(scrollEdge)));
  return lines;
}

function weightDecls() {
  return WEIGHTS.map(([name, value]) => decl(`weight-${name}`, String(value)));
}

function sharedDecls() {
  return [
    decl('font-family', FONT_STACK),
    decl('blend-plus-lighter', 'plus-lighter'),
    decl('blend-plus-darker', 'plus-darker'),
    ...weightDecls(),
  ];
}

function sortedColors(colors, scheme) {
  return Object.keys(colors)
    .map((name) => ({ name, slug: colorSlug(name), resolved: resolveEntry(colors[name], scheme) }))
    .filter((entry) => entry.resolved)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function colorDecls(colors, scheme) {
  const lines = [];
  for (const entry of sortedColors(colors, scheme)) {
    lines.push(`    /* ${entry.name} — kit */`);
    lines.push(decl(`color-${entry.slug}`, entry.resolved.css));
  }
  return lines;
}

function aliasDecls(present, pairs) {
  const have = new Set(present.map((entry) => entry.slug));
  const lines = [];
  for (const [alias, target] of pairs) {
    if (!have.has(target)) continue;
    lines.push(decl(`color-${alias}`, `var(--bn-plat-color-${target})`));
  }
  for (const accent of ACCENTS) {
    const target = `accents-${accent}`;
    if (have.has(target))
      lines.push(decl(`color-accent-${accent}`, `var(--bn-plat-color-${target})`));
  }
  return lines;
}

function derivedDecls(colors, scheme, backgroundName) {
  const lines = ['    /* derived increased contrast — not a kit mode */'];
  for (const entry of derivePalette(colors, scheme, backgroundName)) {
    lines.push(decl(`color-${entry.slug}`, entry.derivedCss));
  }
  return lines;
}

function dimensionDecls(dimensions, deviceName) {
  const lines = [];
  for (const key of Object.keys(dimensions).sort()) {
    const raw = dimensions[key]?.[deviceName];
    const value = px(raw);
    if (value == null) continue;
    lines.push(decl(colorSlug(key), value));
  }
  return lines;
}

function controlDecls(controlSizes, sizeName) {
  const lines = [];
  for (const key of Object.keys(controlSizes).sort()) {
    if (key === 'Mode') continue;
    const value = px(controlSizes[key]?.[sizeName]);
    if (value == null) continue;
    lines.push(decl(`control-${colorSlug(key)}`, value));
  }
  return lines;
}

function materialColor(layer) {
  const rgb = layer.c;
  const parsed = rgb.startsWith('#') ? rgb : null;
  if (!parsed) return layer.c;
  const hex = parsed.slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (layer.op == null || layer.op >= 0.999) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${layer.op})`;
}

function materialDecls(materials, dark) {
  const lines = [];
  const suffix = dark ? ' - Dark' : '';
  for (const thickness of ['ultrathin', 'thin', 'medium', 'thick', 'ultrathick']) {
    const key = `Materials/${thickness[0].toUpperCase()}${thickness.slice(1)}${suffix}`;
    const layers = materials[key];
    if (!layers) continue;
    const dodge = layers.find((layer) => layer.blend === 'LINEAR_DODGE');
    const fill = layers.find((layer) => layer.blend !== 'LINEAR_DODGE') || layers[0];
    lines.push(decl(`material-${thickness}`, materialColor(fill)));
    if (dodge) {
      lines.push(decl(`material-${thickness}-dodge`, materialColor(dodge)));
      lines.push(decl(`material-${thickness}-dodge-blend`, 'plus-lighter'));
    }
  }
  return lines;
}

function contrastSelectors(scopeList, { explicit }) {
  return scopeList.flatMap((sel) => {
    if (explicit) {
      return [
        `${sel}:not([data-theme="dark"])[data-bn-contrast="more"]`,
        `${sel}:not([data-theme="dark"]).bn-contrast-more`,
      ];
    }
    return [`${sel}:not([data-bn-contrast="default"])`];
  });
}

/**
 * @param {object} spec vendored kit (`data/tokens.json`)
 * @returns {string}
 */
export function tokensCss(spec) {
  const chunks = [];
  chunks.push(`/**
 * @basenative/platform token sheet.
 * Generated from data/tokens.json — Apple iOS and iPadOS 27
 * (${spec.meta.source.ios.figmaFileKey}) and macOS 27
 * (${spec.meta.source.macos.figmaFileKey}), extracted ${spec.meta.extractedAt}.
 * Kit values are verbatim. Increased-contrast colours are derived: the kits
 * only define Light and Dark. Liquid Glass frost is mapped to a blur length
 * for backdrop-filter; that mapping is not a kit blur radius.
 * Do not edit. Run \`node generate.js\`.
 */
@layer tokens, components, states;

@layer tokens {
`);

  const iosLight = [
    '    /* iOS light, Dynamic Type Large, iPhone */',
    ...sharedDecls(),
    ...glassDecls(spec.ios.liquidGlass, spec.ios.scrollEdgeEffect['Blur Radius']),
    ...colorDecls(spec.ios.color, 'light'),
    ...aliasDecls(sortedColors(spec.ios.color, 'light'), IOS_ALIASES),
    ...iosTypeDecls(spec, 'Large (Default)'),
    ...dimensionDecls(spec.ios.dimensions, 'iPhone'),
    ...controlDecls(spec.macos.controlSizes, 'Medium'),
  ];
  chunks.push(block(iosScope(), iosLight));

  for (const [attr, device] of DEVICES) {
    if (attr === 'iphone') continue;
    chunks.push(
      block(
        scoped(iosScope, [`[data-bn-device="${attr}"]`, `.bn-device-${attr}`]),
        dimensionDecls(spec.ios.dimensions, device),
      ),
    );
  }

  for (const [attr, mode] of TYPE_MODES) {
    if (attr === 'large') continue;
    chunks.push(
      block(
        scoped(iosScope, [`[data-bn-type="${attr}"]`, `.bn-type-${attr}`]),
        iosTypeDecls(spec, mode),
      ),
    );
  }

  for (const leading of ['Loose', 'Tight']) {
    const leadAttr = leading.toLowerCase();
    for (const [attr, mode] of TYPE_MODES) {
      const typeSels =
        attr === 'large'
          ? [
              `[data-bn-leading="${leadAttr}"]:not([data-bn-type])`,
              `[data-bn-type="large"][data-bn-leading="${leadAttr}"]`,
              `.bn-type-large[data-bn-leading="${leadAttr}"]`,
            ]
          : [
              `[data-bn-type="${attr}"][data-bn-leading="${leadAttr}"]`,
              `.bn-type-${attr}[data-bn-leading="${leadAttr}"]`,
            ];
      chunks.push(block(scoped(iosScope, typeSels), iosLeadingDecls(spec, mode, leading)));
    }
  }

  for (const [attr, size] of CONTROLS) {
    if (attr === 'medium') continue;
    chunks.push(
      block(
        [`[data-bn-control="${attr}"]`, `.bn-control-${attr}`],
        controlDecls(spec.macos.controlSizes, size),
      ),
    );
  }

  const iosLightContrast = derivedDecls(spec.ios.color, 'light', 'Backgrounds/Primary');
  chunks.push(
    `@media (prefers-contrast: more) {\n${block(
      contrastSelectors(iosScope(), { explicit: false }),
      iosLightContrast,
    )}}\n`,
  );
  chunks.push(block(contrastSelectors(iosScope(), { explicit: true }), iosLightContrast));

  const macosLight = [
    '    /* macOS light, fixed type, Medium controls */',
    ...sharedDecls(),
    ...glassDecls(spec.macos.liquidGlass),
    ...colorDecls(spec.macos.color, 'light'),
    ...aliasDecls(sortedColors(spec.macos.color, 'light'), MACOS_ALIASES),
    ...macosTypeDecls(spec),
    ...controlDecls(spec.macos.controlSizes, 'Medium'),
    ...materialDecls(spec.macos.materials, false),
  ];
  chunks.push(block(macosScope(), macosLight));

  for (const [attr, size] of CONTROLS) {
    if (attr === 'medium') continue;
    chunks.push(
      block(
        scoped(macosScope, [`[data-bn-control="${attr}"]`, `.bn-control-${attr}`]),
        controlDecls(spec.macos.controlSizes, size),
      ),
    );
  }

  const macosLightContrast = derivedDecls(spec.macos.color, 'light', 'Window Background');
  chunks.push(
    `@media (prefers-contrast: more) {\n${block(
      contrastSelectors(macosScope(), { explicit: false }),
      macosLightContrast,
    )}}\n`,
  );
  chunks.push(block(contrastSelectors(macosScope(), { explicit: true }), macosLightContrast));

  const iosDark = [
    '    /* iOS dark — kit */',
    ...colorDecls(spec.ios.color, 'dark'),
    ...aliasDecls(sortedColors(spec.ios.color, 'dark'), IOS_ALIASES),
  ];
  const iosDarkContrast = derivedDecls(spec.ios.color, 'dark', 'Backgrounds/Primary');
  const macosDark = [
    '    /* macOS dark — kit */',
    ...colorDecls(spec.macos.color, 'dark'),
    ...aliasDecls(sortedColors(spec.macos.color, 'dark'), MACOS_ALIASES),
    ...materialDecls(spec.macos.materials, true),
  ];
  const macosDarkContrast = derivedDecls(spec.macos.color, 'dark', 'Window Background');

  const darkIosSel = [
    `:root:not([data-theme="light"]):not([data-bn-platform="macos"]):not(.bn-platform-macos)`,
    `[data-bn-platform="ios"]:not([data-theme="light"])`,
    `.bn-platform-ios:not([data-theme="light"])`,
  ];
  const darkMacSel = [
    `[data-bn-platform="macos"]:not([data-theme="light"])`,
    `.bn-platform-macos:not([data-theme="light"])`,
  ];

  chunks.push(`@media (prefers-color-scheme: dark) {\n${block(darkIosSel, iosDark)}} \n`);
  chunks.push(
    `@media (prefers-color-scheme: dark) and (prefers-contrast: more) {\n${block(
      darkIosSel.map((sel) => `${sel}:not([data-bn-contrast="default"])`),
      iosDarkContrast,
    )}}\n`,
  );
  chunks.push(
    block(
      [
        `[data-theme="dark"]:not([data-bn-platform="macos"]):not(.bn-platform-macos)`,
        `[data-theme="dark"][data-bn-platform="ios"]`,
        `[data-theme="dark"].bn-platform-ios`,
      ],
      iosDark,
    ),
  );
  chunks.push(
    block(
      [
        `[data-theme="dark"][data-bn-contrast="more"]:not([data-bn-platform="macos"])`,
        `[data-theme="dark"].bn-contrast-more:not([data-bn-platform="macos"])`,
        `[data-theme="dark"][data-bn-platform="ios"][data-bn-contrast="more"]`,
        `[data-theme="dark"][data-bn-platform="ios"].bn-contrast-more`,
      ],
      iosDarkContrast,
    ),
  );

  chunks.push(`@media (prefers-color-scheme: dark) {\n${block(darkMacSel, macosDark)}}\n`);
  chunks.push(
    `@media (prefers-color-scheme: dark) and (prefers-contrast: more) {\n${block(
      darkMacSel.map((sel) => `${sel}:not([data-bn-contrast="default"])`),
      macosDarkContrast,
    )}}\n`,
  );
  chunks.push(
    block(
      [`[data-theme="dark"][data-bn-platform="macos"]`, `[data-theme="dark"].bn-platform-macos`],
      macosDark,
    ),
  );
  chunks.push(
    block(
      [
        `[data-theme="dark"][data-bn-platform="macos"][data-bn-contrast="more"]`,
        `[data-theme="dark"][data-bn-platform="macos"].bn-contrast-more`,
        `[data-theme="dark"].bn-platform-macos[data-bn-contrast="more"]`,
        `[data-theme="dark"].bn-platform-macos.bn-contrast-more`,
      ],
      macosDarkContrast,
    ),
  );

  chunks.push('}\n');
  return chunks.filter(Boolean).join('\n');
}
