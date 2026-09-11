/**
 * Fixtures for this package's own tests. NOT exported from `package.json` and
 * not a reference theme — see README, "Why there is no default theme". These
 * are deliberately plain: two ramps, one signal family doing all five jobs.
 * Nothing here is a look, and nothing here is importable by a consumer.
 */

const RAMPS = {
  neutral: {
    50: '#ffffff',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
};

/** A deep copy, so a test that mutates a fixture cannot leak into the next one. */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * The smallest theme that is actually valid.
 *
 * @param {object} [overrides]
 */
export function minimalTheme(overrides = {}) {
  return {
    name: 'fixture',
    scheme: 'light',
    ramps: clone(RAMPS),
    surfaces: {
      base: 'neutral.50',
      subtle: 'neutral.100',
      sunk: 'neutral.100',
      raised: 'neutral.50',
      inverse: 'neutral.900',
    },
    ink: {
      base: 'neutral.900',
      muted: 'neutral.600',
      subtle: 'neutral.600',
      inverse: 'neutral.50',
      link: 'primary.600',
    },
    roles: {
      primary: 'primary.600',
      primaryHover: 'primary.700',
      onPrimary: 'neutral.50',
      primaryTint: 'primary.50',
      border: 'neutral.300',
      borderStrong: 'neutral.400',
      borderControl: 'neutral.500',
      focus: 'primary.500',
      focusOnInverse: 'primary.300',
      selectedBg: 'primary.50',
      selectedInk: 'primary.700',
    },
    signals: {
      families: {
        plain: {
          bg: 'primary.100',
          ink: 'primary.800',
          line: 'primary.500',
          solid: 'primary.600',
          onSolid: 'neutral.50',
        },
      },
      slots: {
        default: 'plain',
        primary: 'plain',
        success: 'plain',
        warning: 'plain',
        error: 'plain',
      },
    },
    ...overrides,
  };
}

/** The dark tiers of the fixture, as a `dark` block. */
export function darkBlock(overrides = {}) {
  const light = minimalTheme();
  return {
    surfaces: {
      base: 'neutral.950',
      subtle: 'neutral.900',
      sunk: 'neutral.800',
      raised: 'neutral.900',
      inverse: 'neutral.50',
    },
    ink: {
      base: 'neutral.50',
      muted: 'neutral.400',
      subtle: 'neutral.400',
      inverse: 'neutral.900',
      link: 'primary.300',
    },
    roles: { ...light.roles, primary: 'primary.400', onPrimary: 'neutral.950' },
    signals: {
      families: {
        plain: {
          bg: 'neutral.800',
          ink: 'primary.300',
          line: 'primary.400',
          solid: 'primary.400',
          onSolid: 'neutral.950',
        },
      },
      slots: light.signals.slots,
    },
    ...overrides,
  };
}

/** The fixture as a `dual` theme. */
export function dualTheme(darkOverrides = {}) {
  return { ...minimalTheme(), scheme: 'dual', dark: darkBlock(darkOverrides) };
}

/** The fixture as a single-scheme DARK theme — the pendingbusiness.com shape. */
export function darkOnlyTheme() {
  const dark = darkBlock();
  return { ...minimalTheme(), scheme: 'dark', ...dark };
}
