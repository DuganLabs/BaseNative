// Built with BaseNative — basenative.dev
/**
 * @basenative/combobox — accessible typeahead combobox primitive.
 *
 * Implements the WAI-ARIA APG combobox + listbox pattern:
 *   https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * Public API:
 *   Combobox         — `{ html, hydrate(rootEl) }` factory
 *   renderCombobox   — SSR-only HTML string output
 *   hydrateCombobox  — hydrate an already-rendered combobox
 *   defaultFilter, prefixFilter, fuzzyFilter — filter strategies
 *   normalizeOption  — lift string -> { value, label }
 *   applyAriaAttributes, escapeOnKeydown — a11y helpers
 */

export {
  Combobox,
  renderCombobox,
  hydrateCombobox,
  normalizeOption,
} from './combobox.js';

export {
  defaultFilter,
  prefixFilter,
  fuzzyFilter,
} from './filter.js';

export {
  applyAriaAttributes,
  escapeOnKeydown,
  announce,
} from './a11y.js';
