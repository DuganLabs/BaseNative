// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'theme-toggle';
export const root = 'fieldset';

/** The three appearances, in the order the toggle presents them. */
export const THEME_MODES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Apply a mode to a root element (the document element in an app).
 * System removes the stamp entirely — the media query decides, as
 * it does with no toggle at all. Light and dark stamp data-theme,
 * which the token sheet scopes its forced values under.
 * @param {string} mode system | light | dark
 * @param {{ dataset: Record<string, string | undefined>, style: { colorScheme: string } }} el
 */
export function applyTheme(mode, el) {
  if (mode === 'system') {
    delete el.dataset.theme;
    el.style.colorScheme = '';
  } else {
    el.dataset.theme = mode;
    el.style.colorScheme = mode;
  }
}

/**
 * The theme-toggle composite: the choice paradigm (a radio group over
 * a button substrate, one telemetry event) with the option set fixed
 * to the three appearances. The control is pure presentation and
 * state — stamping the document is the app's move, one call to
 * applyTheme with the event's mode.
 *
 * @typedef {object} ThemeToggleProps
 * @property {string} [legend]
 * @property {string} [name] The radio group name.
 * @property {string} [value] The starting mode.
 * @property {(event: { name: string, mode: string, previousMode: string }) => void} [onThemeChange]
 * @property {string} [variant] A registered variant name.
 */

/** @param {ThemeToggleProps} props */
export function create(props = {}) {
  const legend = signal(props.legend ?? 'Theme');
  const groupName = signal(props.name ?? 'theme');
  const mode = signal(props.value ?? 'system');
  const options = signal(THEME_MODES);
  const variant = signal(props.variant ?? 'theme-toggle');
  const inputVariant = signal('default');

  const isChecked = (/** @type {{ value: string }} */ option) => option.value === mode();
  const change = (/** @type {{ value: string }} */ option) => {
    const previousMode = mode();
    if (option.value === previousMode) return;
    mode.set(option.value);
    props.onThemeChange?.({ name: groupName(), mode: option.value, previousMode });
  };

  return { legend, groupName, mode, options, variant, inputVariant, isChecked, change };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('theme-toggle', 'theme-toggle');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const themeToggle = { name, root, create, registerVariants, template, styles };
export default themeToggle;
