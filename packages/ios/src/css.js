/**
 * Emits the token stylesheet from the data in `tokens.js`.
 *
 * `src/tokens.css` is this function's output, byte for byte — `generate.js`
 * writes it and `css.test.js` fails if the two drift. Edit the data, never
 * the sheet.
 *
 * The sheet's shape follows `@basenative/components`' own theme rules, so
 * the two layers compose instead of fighting:
 *
 *   - everything lives in `@layer tokens`;
 *   - scheme-independent tokens (type, geometry, springs, glass blur) are
 *     declared once on `:root`;
 *   - colour and glass tint/shadow tokens are declared per appearance —
 *     light on `:root`, dark twice: under
 *     `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`
 *     (OS-driven, yields to an explicit light choice) and under
 *     `[data-theme="dark"]` (explicit, wins over the OS).
 *
 * Token names are `--bn-ios-*`, nested under the `--bn-*` namespace the
 * rest of the design system already uses, kebab-cased from the data keys
 * with a dash before a trailing step number (`gray2` → `gray-2`).
 */

import {
  SYSTEM_COLORS,
  LABEL_COLORS,
  BACKGROUND_COLORS,
  FILL_COLORS,
  SEPARATOR_COLORS,
  LINK_COLOR,
  FONT_FAMILIES,
  TYPE_STYLES,
  GLASS_MATERIALS,
  RADII,
  SPACING,
  SAFE_AREA,
  LAYOUT,
  MOTION,
} from './tokens.js';

/** camelCase data key → kebab token fragment (`groupedSecondary` → `grouped-secondary`). */
const kebab = (key) =>
  key
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

/** Points → rem, trimmed (`34` → `2.125`). */
const rem = (pt) => String(Number((pt / 16).toFixed(4)));

/** Points → a unitless leading ratio, trimmed (`41, 34` → `1.2059`). */
const ratio = (leading, size) => String(Number((leading / size).toFixed(4)));

/**
 * Every colour token as `[cssName, { light, dark }]`, in emission order.
 * The group name maps are written out here rather than derived, because a
 * token's public name is a decision, not a computation.
 */
const COLOR_TOKENS = [
  ...Object.entries(SYSTEM_COLORS).map(([key, value]) => [`color-${kebab(key)}`, value]),
  ...Object.entries(LABEL_COLORS).map(([key, value]) => [
    {
      label: 'color-label',
      secondary: 'color-label-secondary',
      tertiary: 'color-label-tertiary',
      quaternary: 'color-label-quaternary',
      placeholder: 'color-placeholder',
    }[key],
    value,
  ]),
  ...Object.entries(BACKGROUND_COLORS).map(([key, value]) => [
    {
      base: 'color-bg',
      secondary: 'color-bg-secondary',
      tertiary: 'color-bg-tertiary',
      grouped: 'color-bg-grouped',
      groupedSecondary: 'color-bg-grouped-secondary',
      groupedTertiary: 'color-bg-grouped-tertiary',
    }[key],
    value,
  ]),
  ...Object.entries(FILL_COLORS).map(([key, value]) => [
    {
      base: 'color-fill',
      secondary: 'color-fill-secondary',
      tertiary: 'color-fill-tertiary',
      quaternary: 'color-fill-quaternary',
    }[key],
    value,
  ]),
  ...Object.entries(SEPARATOR_COLORS).map(([key, value]) => [
    { separator: 'color-separator', opaque: 'color-separator-opaque' }[key],
    value,
  ]),
  ['color-link', LINK_COLOR],
];

/** Radius keys whose CSS names are not the kebab of the data key. */
const RADIUS_NAMES = { xl2: '2xl', xl3: '3xl', xl4: '4xl' };

const decl = (name, value) => `    --bn-ios-${name}: ${value};`;

function rootBlock() {
  const lines = [];
  lines.push('    /* Font families */');
  lines.push(decl('font-family', FONT_FAMILIES.text));
  lines.push(decl('font-family-display', FONT_FAMILIES.display));
  lines.push('');
  lines.push('    /* Type — size, leading, weight, tracking, and the composed shorthand */');
  for (const [key, style] of Object.entries(TYPE_STYLES)) {
    const name = `font-${kebab(key)}`;
    const size = `${rem(style.size)}rem`;
    const leading = ratio(style.leading, style.size);
    const family = style.family === 'display' ? 'font-family-display' : 'font-family';
    lines.push(decl(`${name}-size`, size));
    lines.push(decl(`${name}-leading`, leading));
    lines.push(decl(`${name}-weight`, String(style.weight)));
    lines.push(decl(`${name}-tracking`, `${style.tracking}em`));
    lines.push(decl(name, `${style.weight} ${size}/${leading} var(--bn-ios-${family})`));
  }
  lines.push('');
  lines.push('    /* Corner radii */');
  for (const [key, value] of Object.entries(RADII)) {
    lines.push(decl(`radius-${RADIUS_NAMES[key] ?? kebab(key)}`, value));
  }
  lines.push('');
  lines.push('    /* Spacing — the 8pt grid */');
  for (const [key, value] of Object.entries(SPACING)) lines.push(decl(`space-${key}`, value));
  lines.push('');
  lines.push('    /* Safe area — supplied by the device at runtime */');
  for (const [key, value] of Object.entries(SAFE_AREA)) lines.push(decl(`safe-${key}`, value));
  lines.push('');
  lines.push('    /* Layout constants */');
  for (const [key, value] of Object.entries(LAYOUT)) {
    if (key === 'scrollEdge') continue;
    lines.push(decl(kebab(key), value));
  }
  lines.push('');
  lines.push('    /* Motion — duration, curve, and the composed shorthand */');
  for (const [key, preset] of Object.entries(MOTION)) {
    const name = `motion-${kebab(key)}`;
    lines.push(decl(`${name}-duration`, preset.duration));
    lines.push(decl(`${name}-timing`, preset.timing));
    lines.push(decl(name, `${preset.duration} ${preset.timing}`));
  }
  lines.push('');
  lines.push('    /* Glass — the scheme-independent channels (blur, saturation, backdrop) */');
  for (const [key, material] of Object.entries(GLASS_MATERIALS)) {
    const name = `glass-${kebab(key)}`;
    lines.push(decl(`${name}-blur`, `${material.blur}px`));
    lines.push(decl(`${name}-saturate`, `${material.saturate}%`));
    lines.push(
      decl(`${name}-backdrop`, `blur(${material.blur}px) saturate(${material.saturate}%)`),
    );
  }
  return lines;
}

function schemeBlock(scheme, indent) {
  const pad = indent;
  const lines = [];
  lines.push(`${pad}/* Colours — ${scheme} */`);
  for (const [name, value] of COLOR_TOKENS) lines.push(`${pad}${decl(name, value[scheme]).trim()}`);
  lines.push('');
  lines.push(`${pad}/* Glass — ${scheme} tint, edge highlight, shadow */`);
  for (const [key, material] of Object.entries(GLASS_MATERIALS)) {
    const name = `glass-${kebab(key)}`;
    lines.push(`${pad}${decl(`${name}-tint`, material[scheme].tint).trim()}`);
    lines.push(`${pad}${decl(`${name}-highlight`, material[scheme].highlight).trim()}`);
    lines.push(`${pad}${decl(`${name}-shadow`, material[scheme].shadow).trim()}`);
  }
  lines.push('');
  lines.push(`${pad}/* Scroll edge — the fade a bar dissolves into */`);
  lines.push(`${pad}${decl('scroll-edge', LAYOUT.scrollEdge).trim()}`);
  lines.push(
    `${pad}${decl(
      'scroll-edge-fade',
      'linear-gradient(to bottom, var(--bn-ios-color-bg), transparent)',
    ).trim()}`,
  );
  return lines;
}

/**
 * The complete token stylesheet, header included — exactly what
 * `src/tokens.css` contains.
 *
 * @returns {string}
 */
export function tokensCss() {
  const header = [
    '/* @basenative/ios — the foundation token stylesheet.',
    '   Generated from src/tokens.js by packages/ios/generate.js; edit the',
    '   data, not this. An original implementation informed by published',
    '   iOS design values — no Apple artwork. See README, "Tokens',
    '   provenance", for which values are documented and which estimated. */',
    '',
  ].join('\n');
  const body = [
    '@layer tokens {',
    '  :root {',
    ...rootBlock(),
    '',
    ...schemeBlock('light', '    '),
    '  }',
    '',
    '  @media (prefers-color-scheme: dark) {',
    '    :root:not([data-theme="light"]) {',
    ...schemeBlock('dark', '      '),
    '    }',
    '  }',
    '',
    '  [data-theme="dark"] {',
    ...schemeBlock('dark', '    '),
    '  }',
    '}',
    '',
  ].join('\n');
  return header + body;
}
