/**
 * Multiselect — multiple value selection with tags/chips.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { normalizeItem } from './internal/items.js';

function tagHtml(value, text) {
  return `<span data-bn="tag" data-value="${escapeAttr(value)}">${escapeText(text)}<button type="button" data-bn="tag-remove" aria-label="Remove ${escapeAttr(text)}">&times;</button></span>`;
}

/**
 * Multiselect — multiple value selection with tags/chips over a hidden native
 * <select multiple>. Attributes, label, tag text and option labels are escaped.
 *
 * The search input is backed by a native `<datalist>` of the item labels, so
 * the browser filters suggestions as you type with no script. Pair with
 * `initMultiselect()` on the client to make the × buttons, Backspace and a
 * picked suggestion change the selection; the hidden `<select>` stays the
 * form value either way.
 *
 * @param {object} options
 * @param {string} [options.name]
 * @param {string} [options.label]   Escaped text
 * @param {Array<string | {value: string, label: string}>} [options.items]
 * @param {string[]} [options.selected]
 * @param {string} [options.placeholder]
 * @param {boolean} [options.disabled]
 * @param {string} [options.id]      Defaults to `bn-multiselect-<name>`, or nextId() without a name
 * @param {string} [options.attrs]   Raw attribute markup appended to the search <input>; not escaped
 * @returns {string}
 */
export function renderMultiselect(options = {}) {
  const {
    name,
    label,
    items = [],
    selected = [],
    placeholder = 'Select items...',
    disabled = false,
    id = name ? `bn-multiselect-${name}` : nextId('multiselect'),
    attrs = '',
  } = options;

  const dis = disabled ? ' disabled' : '';
  const selectedSet = new Set(selected);
  const normalized = items.map(normalizeItem);

  const tagsHtml = selected
    .map(val => {
      const item = normalized.find(i => i.value === val);
      return tagHtml(val, item ? item.label : val);
    })
    .join('');

  const listId = `${id}-options`;
  const datalistHtml = normalized.map(item => `<option value="${escapeAttr(item.label)}"></option>`).join('');

  const optionsHtml = normalized
    .map(item => {
      const sel = selectedSet.has(item.value) ? ' selected' : '';
      return `<option value="${escapeAttr(item.value)}"${sel}>${escapeText(item.label)}</option>`;
    })
    .join('');

  return `<div data-bn="multiselect"${dis ? ' data-disabled' : ''}>
  ${label ? `<label for="${escapeAttr(id)}" data-bn="label">${escapeText(label)}</label>` : ''}
  <div data-bn="multiselect-container">
    <div data-bn="multiselect-tags">${tagsHtml}</div>
    <input type="text" data-bn="multiselect-search" placeholder="${escapeAttr(placeholder)}" autocomplete="off" aria-label="${escapeAttr(label || 'Search')}" list="${escapeAttr(listId)}"${attrsSuffix(attrs)}>
  </div>
  <datalist id="${escapeAttr(listId)}">${datalistHtml}</datalist>
  <select id="${escapeAttr(id)}" name="${escapeAttr(name)}" multiple hidden${dis}>${optionsHtml}</select>
</div>`;
}

const TAGS = '[data-bn="multiselect-tags"]';
const TAG = '[data-bn="tag"]';
const REMOVE = '[data-bn="tag-remove"]';
const SEARCH = '[data-bn="multiselect-search"]';

function closestFrom(target, selector) {
  return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

/**
 * Client-side: wire a rendered `[data-bn="multiselect"]` element. The hidden
 * `<select multiple>` is the source of truth — every path below changes an
 * `<option>`'s `selected` first and the tags second, so a form submit always
 * matches what is shown.
 *
 * A click on a tag's × deselects that value, removes the tag and moves focus
 * to the search input. In the input, Backspace on an empty value removes the
 * last tag; Enter, or picking a `<datalist>` suggestion (the input's
 * `change`), selects the item whose label or value matches the typed text,
 * appends its tag and clears the input. Every user-driven change calls
 * `onChange(values)` with the selected values in option order.
 *
 * `add(value)` and `remove(value)` reflect state silently (no `onChange`) and
 * return whether anything changed; `values()` reads the select. Tags are
 * re-queried on every interaction.
 *
 * @param {HTMLElement} root  The [data-bn="multiselect"] element
 * @param {object} [options]
 * @param {(values: string[]) => void} [options.onChange]
 * @returns {{ add(value: string): boolean, remove(value: string): boolean, values(): string[], destroy(): void }}
 */
export function initMultiselect(root, options = {}) {
  const { onChange } = options;
  const select = root.querySelector('select[multiple]');
  const tags = root.querySelector(TAGS);
  const input = root.querySelector(SEARCH);
  const selectOptions = () => Array.from(select ? select.querySelectorAll('option') : []);
  const values = () => selectOptions().filter(option => option.selected).map(option => option.value);
  const tagFor = value => Array.from(tags ? tags.querySelectorAll(TAG) : []).find(tag => tag.getAttribute('data-value') === value) ?? null;

  function emit() {
    if (onChange) onChange(values());
  }

  function remove(value) {
    const option = selectOptions().find(o => o.value === value);
    if (!option || !option.selected) return false;
    option.selected = false;
    const tag = tagFor(value);
    if (tag && typeof tag.remove === 'function') tag.remove();
    return true;
  }

  function add(value) {
    const option = selectOptions().find(o => o.value === value);
    if (!option || option.selected) return false;
    option.selected = true;
    if (tags && !tagFor(value)) tags.insertAdjacentHTML('beforeend', tagHtml(value, String(option.textContent ?? value)));
    return true;
  }

  function commitInput() {
    if (!input) return false;
    const text = String(input.value ?? '').trim().toLowerCase();
    if (!text) return false;
    const option = selectOptions().find(o => String(o.textContent ?? '').trim().toLowerCase() === text || String(o.value).toLowerCase() === text);
    if (!option) return false;
    input.value = '';
    if (add(option.value)) emit();
    return true;
  }

  function onClick(e) {
    const button = closestFrom(e.target, REMOVE);
    const tag = button ? closestFrom(button, TAG) : null;
    if (!tag) return;
    if (!remove(tag.getAttribute('data-value'))) return;
    if (input && typeof input.focus === 'function') input.focus();
    emit();
  }

  function onKeydown(e) {
    if (!input || e.target !== input) return;
    if (e.key === 'Backspace' && !input.value) {
      const last = values().at(-1);
      if (last !== undefined && remove(last)) {
        e.preventDefault();
        emit();
      }
    } else if (e.key === 'Enter' && commitInput()) {
      e.preventDefault();
    }
  }

  function onInputChange(e) {
    if (input && e.target === input) commitInput();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('change', onInputChange);

  return {
    add,
    remove,
    values,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
      root.removeEventListener('change', onInputChange);
    },
  };
}
