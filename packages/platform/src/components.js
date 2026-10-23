/**
 * Semantic-HTML controls for the Apple 27 kits.
 *
 * The host is the control: button, a, input, select, dialog, menu,
 * details, fieldset, progress, table, ul, nav, search, header, aside,
 * section, output. data-bn is a contract name, never a tag. No class,
 * no style. A list item inside menu or ul is display:contents in the
 * stylesheet so the required wrapper does not affect layout.
 * iOS metrics that were read from the kit are the default. macOS geometry
 * comes from the control-size tokens.
 */
import { escapeAttr, escapeHtml } from './html.js';
import { nextId, resetIds } from './ids.js';

export { nextId, resetIds };

function idOf(prefix, id) {
  return id || nextId(prefix);
}

function opt(name, value) {
  if (value == null || value === false || value === '') return '';
  if (value === true) return ` ${name}`;
  return ` ${name}="${escapeAttr(value)}"`;
}

/** Decorative glyph. `<i>` is the idiomatic offset, not a layout wrapper. */
function glyph(text) {
  return `<i data-bn="bn-symbol" aria-hidden="true">${text}</i>`;
}

const TINTS = [
  'blue',
  'green',
  'orange',
  'purple',
  'red',
  'teal',
  'indigo',
  'pink',
  'yellow',
  'mint',
  'cyan',
  'brown',
];

function tintOf(value) {
  return TINTS.includes(value) ? value : 'blue';
}

const SEMANTIC_TINTS = ['red', 'orange', 'green'];

/**
 * A grouped list keeps one accent. A second hue is allowed only when the
 * row is marked semantic and the tint is red, orange, or green.
 */
function listTile(row, hue) {
  const requested = tintOf(row.tint);
  const meaningful = row.semantic === true && SEMANTIC_TINTS.includes(requested);
  if (meaningful && (hue.kept === null || hue.kept === requested)) {
    hue.kept = requested;
    return { tint: requested, semantic: true };
  }
  return { tint: 'blue', semantic: false };
}

/**
 * Settings-style symbol tile. `mark` is text, never markup.
 * @param {object} [options]
 */
export function renderBnSymbol(options = {}) {
  const semantic = options.semantic ? ' data-semantic="true"' : '';
  return `<i data-bn="bn-symbol-tile" data-tint="${escapeAttr(tintOf(options.tint))}" aria-hidden="true"${semantic}${opt('data-force', options.force)}>${escapeHtml(options.mark || '')}</i>`;
}

/** Count or status badge. Default tint is the system red badge. */
export function renderBnBadge(label = '', options = {}) {
  const tint = options.tint ? tintOf(options.tint) : 'red';
  return `<b data-bn="bn-badge" data-tint="${escapeAttr(tint)}"${opt('data-force', options.force)}>${escapeHtml(options.text ?? label)}</b>`;
}

/**
 * Button. iOS variants: prominent, bordered, borderless, glass, glass-prominent.
 * Sizes: large 50, medium 34, small 28. macOS follows the control-size tokens.
 * macOS styles from the Buttons page: push, bevel, gradient, recessed,
 * textured, rounded, square, help.
 * @param {string} [label]
 * @param {object} [options]
 */
export function renderBnButton(label = '', options = {}) {
  const variant = options.variant || 'prominent';
  const size = options.size || 'large';
  const labelStyle = options.labelStyle || 'title';
  const text = labelStyle === 'icon' ? '' : escapeHtml(options.text ?? label);
  const icon = labelStyle === 'title' ? '' : glyph(escapeHtml(options.icon || '●'));
  const destructive = options.destructive ? 'true' : 'false';
  const force = options.force || '';
  const id = options.id ? ` id="${escapeAttr(options.id)}"` : '';
  const labelAttr =
    labelStyle === 'icon' ? ` aria-label="${escapeAttr(options.text ?? label)}"` : '';
  const style = options.style ? ` data-style="${escapeAttr(options.style)}"` : '';
  const selected = options.selected ? ' data-selected="true" aria-pressed="true"' : '';
  const control =
    options.size === 'mini' || options.size === 'xl'
      ? ` data-bn-control="${escapeAttr(options.size)}"`
      : '';
  const open = `${icon}${text}`;
  const attrs = `data-variant="${escapeAttr(variant)}" data-size="${escapeAttr(size)}" data-label="${escapeAttr(labelStyle)}" data-destructive="${destructive}" data-force="${escapeAttr(force)}"${style}${selected}${control}${id}${labelAttr}`;
  if (!options.href) {
    return `<button data-bn="bn-button" ${attrs} type="${escapeAttr(options.type || 'button')}"${opt('disabled', options.disabled)}>${open}</button>`;
  }
  return `<a data-bn="bn-button" ${attrs} href="${escapeAttr(options.href)}">${open}</a>`;
}

/**
 * Pop-up button. Pass native:true for a select; otherwise a button plus popover menu.
 * @param {object} [options]
 */
export function renderBnPopupButton(options = {}) {
  if (options.native) {
    const items = (options.items || [])
      .map(
        (item) =>
          `<option value="${escapeAttr(item.value)}"${opt('selected', item.selected)}>${escapeHtml(item.label)}</option>`,
      )
      .join('');
    return `<select data-bn="bn-popup-button" aria-label="${escapeAttr(options.label || 'Options')}"${opt('id', options.id)}${opt('disabled', options.disabled)}${opt('data-force', options.force)}>${items}</select>`;
  }
  const menuId = idOf('popup-menu', options.menuId);
  const button = `<button data-bn="bn-popup-button" type="button" popovertarget="${escapeAttr(menuId)}"${opt('id', options.id)}${opt('disabled', options.disabled)}${opt('data-force', options.force)}>${escapeHtml(options.label || 'Options')}${glyph('▾')}</button>`;
  return `${button}${renderBnMenu({ id: menuId, items: options.items || [], label: options.label || 'Options' })}`;
}

/** Pull-down button opening a popover menu. */
export function renderBnPulldownButton(options = {}) {
  const menuId = idOf('pulldown-menu', options.menuId);
  const button = `<button data-bn="bn-pulldown-button" type="button" popovertarget="${escapeAttr(menuId)}"${opt('id', options.id)}${opt('disabled', options.disabled)}${opt('data-force', options.force)}>${escapeHtml(options.label || 'Actions')}${glyph('▾')}</button>`;
  return `${button}${renderBnMenu({ id: menuId, items: options.items || [], label: options.label || 'Actions' })}`;
}

/**
 * Segmented control. Track is Fills/Tertiary; the selected segment is a pill.
 * @param {object} [options]
 */
export function renderBnSegmented(options = {}) {
  const name = options.name || idOf('segment');
  const radios = (options.segments || [])
    .map(
      (segment) =>
        `<label data-bn="bn-segment"${opt('data-selected', segment.selected ? 'true' : null)}><input type="radio" name="${escapeAttr(name)}" value="${escapeAttr(segment.value)}"${opt('checked', segment.selected)}>${escapeHtml(segment.label)}</label>`,
    )
    .join('');
  return `<fieldset data-bn="bn-segmented" data-size="${escapeAttr(options.size || 'large')}" role="radiogroup" aria-label="${escapeAttr(options.label || 'Segments')}"${opt('id', options.id)}${opt('disabled', options.disabled)}${opt('data-force', options.force)}>${radios}</fieldset>`;
}

/** Switch. iOS size is the HIG 51×31 control; macOS uses Toggle (Switch) tokens. */
export function renderBnSwitch(options = {}) {
  const inputId = idOf('switch', options.id);
  const mixed = options.mixed ? ' data-mixed="true"' : '';
  const checked = options.mixed ? 'mixed' : options.checked ? 'true' : 'false';
  return `<label data-bn="bn-switch"${opt('data-force', options.force)}><input data-bn="bn-switch-input" type="checkbox" role="switch" id="${escapeAttr(inputId)}"${opt('checked', options.checked && !options.mixed)}${opt('disabled', options.disabled)}${mixed} aria-checked="${checked}">${escapeHtml(options.label || '')}</label>`;
}

/** Checkbox. macOS size and radius come from Checkboxes tokens. */
export function renderBnCheckbox(options = {}) {
  const inputId = idOf('checkbox', options.id);
  const mixed = options.mixed ? ' data-mixed="true" aria-checked="mixed"' : '';
  return `<label data-bn="bn-checkbox"${opt('data-force', options.force)}><input data-bn="bn-checkbox-input" type="checkbox" id="${escapeAttr(inputId)}"${opt('checked', options.checked && !options.mixed)}${opt('disabled', options.disabled)}${mixed}>${escapeHtml(options.label || '')}</label>`;
}

/** Radio. macOS size comes from Radio Button tokens. */
export function renderBnRadio(options = {}) {
  const inputId = idOf('radio', options.id);
  return `<label data-bn="bn-radio"${opt('data-force', options.force)}><input data-bn="bn-radio-input" type="radio" name="${escapeAttr(options.name || 'bn-radio')}" id="${escapeAttr(inputId)}"${opt('checked', options.checked)}${opt('disabled', options.disabled)}>${escapeHtml(options.label || '')}</label>`;
}

/** Slider. macOS knob and track insets come from Slider tokens. */
export function renderBnSlider(options = {}) {
  return `<label data-bn="bn-slider"${opt('data-force', options.force)}>${escapeHtml(options.label || '')}<input type="range"${opt('id', options.id)} min="${escapeAttr(options.min ?? 0)}" max="${escapeAttr(options.max ?? 100)}" value="${escapeAttr(options.value ?? 50)}"${opt('disabled', options.disabled)}></label>`;
}

/** Dial, a range input. Knob size is Dial tokens on macOS. */
export function renderBnDial(options = {}) {
  return `<label data-bn="bn-dial"${opt('data-force', options.force)}>${escapeHtml(options.label || '')}<input type="range"${opt('id', options.id)} min="${escapeAttr(options.min ?? 0)}" max="${escapeAttr(options.max ?? 100)}" value="${escapeAttr(options.value ?? 25)}"${opt('disabled', options.disabled)}${opt('aria-valuetext', options.valueText)}></label>`;
}

/** Stepper: a number input between decrement and increment buttons. */
export function renderBnStepper(options = {}) {
  const inputId = idOf('stepper', options.id);
  return `<fieldset data-bn="bn-stepper"${opt('data-force', options.force)}${opt('disabled', options.disabled)}><legend>${escapeHtml(options.label || 'Value')}</legend><button data-bn="bn-stepper-dec" type="button" aria-controls="${escapeAttr(inputId)}"${opt('disabled', options.disabled)}>−</button><input type="number" id="${escapeAttr(inputId)}" value="${escapeAttr(options.value ?? 0)}"${opt('min', options.min)}${opt('max', options.max)} aria-label="${escapeAttr(options.label || 'Value')}"${opt('disabled', options.disabled)}><button data-bn="bn-stepper-inc" type="button" aria-controls="${escapeAttr(inputId)}"${opt('disabled', options.disabled)}>+</button></fieldset>`;
}

/** Determinate progress when value is set. */
export function renderBnProgress(options = {}) {
  const known = options.value != null;
  return `<progress data-bn="bn-progress"${opt('id', options.id)}${opt('data-force', options.force)}${known ? ` value="${escapeAttr(options.value)}"` : ''} max="${escapeAttr(options.max ?? 1)}" aria-label="${escapeAttr(options.label || 'Progress')}">${known ? '' : escapeHtml(options.label || '')}</progress>`;
}

/** Indeterminate progress. */
export function renderBnSpinner(options = {}) {
  return `<progress data-bn="bn-spinner"${opt('id', options.id)}${opt('data-force', options.force)} aria-label="${escapeAttr(options.label || 'Loading')}"></progress>`;
}

/** Text field. macOS insets come from Fields tokens. */
export function renderBnField(options = {}) {
  const inputId = idOf('field', options.id);
  const control = options.multiline
    ? `<textarea data-bn="bn-field-control" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder)}${opt('disabled', options.disabled)}>${escapeHtml(options.value || '')}</textarea>`
    : `<input data-bn="bn-field-control" type="${escapeAttr(options.type || 'text')}" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder)}${opt('value', options.value)}${opt('disabled', options.disabled)}>`;
  return `<label data-bn="bn-field"${opt('data-force', options.force)}>${escapeHtml(options.label || '')}${control}</label>`;
}

/** Search field inside a search element. */
export function renderBnSearch(options = {}) {
  const inputId = idOf('search', options.id);
  return `<search data-bn="bn-search" role="search" aria-label="${escapeAttr(options.label || 'Search')}"${opt('data-force', options.force)}><label for="${escapeAttr(inputId)}">${escapeHtml(options.label || 'Search')}</label><input type="search" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder || 'Search')}${opt('value', options.value)}${opt('disabled', options.disabled)}></search>`;
}

/** Combo box: text input plus datalist. macOS only in the kits. */
export function renderBnCombobox(options = {}) {
  const inputId = idOf('combo', options.id);
  const listId = `${inputId}-list`;
  const items = (options.items || [])
    .map(
      (item) =>
        `<option value="${escapeAttr(item.value || item.label)}">${escapeHtml(item.label)}</option>`,
    )
    .join('');
  return `<label data-bn="bn-combobox"${opt('data-force', options.force)}>${escapeHtml(options.label || '')}<input type="text" id="${escapeAttr(inputId)}" list="${escapeAttr(listId)}"${opt('value', options.value)}${opt('disabled', options.disabled)}><datalist id="${escapeAttr(listId)}">${items}</datalist></label>`;
}

/** Colour well, a native colour input. macOS size is Color Well tokens. */
export function renderBnColorWell(options = {}) {
  return `<label data-bn="bn-color-well"${opt('data-force', options.force)}>${escapeHtml(options.label || 'Color')}<input type="color"${opt('id', options.id)} value="${escapeAttr(options.value || '#0088ff')}"${opt('disabled', options.disabled)}></label>`;
}

/**
 * Colour picker. Swatches use the kit accent colours. The well opens the dialog.
 * @param {object} [options]
 */
export function renderBnColorPicker(options = {}) {
  const dialogId = idOf('color-picker', options.id);
  const colors = options.colors || [
    '#ff383c',
    '#ff8d28',
    '#ffcc00',
    '#34c759',
    '#00c8b3',
    '#00c3d0',
    '#00c0e8',
    '#0088ff',
    '#6155f5',
    '#cb30e0',
    '#ff2d55',
    '#ac7f5e',
  ];
  const swatches = colors
    .map(
      (color) =>
        `<li><button data-bn="bn-color-swatch" type="button" data-color="${escapeAttr(color)}" aria-label="${escapeAttr(color)}"></button></li>`,
    )
    .join('');
  return `<button data-bn="bn-color-well" type="button" commandfor="${escapeAttr(dialogId)}" command="show-modal" aria-haspopup="dialog"${opt('data-force', options.force)}>${escapeHtml(options.label || 'Color')}</button><dialog data-bn="bn-color-picker" id="${escapeAttr(dialogId)}"${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><p data-bn="bn-color-picker-title">${escapeHtml(options.label || 'Color')}</p><ul data-bn="bn-color-grid">${swatches}</ul></dialog>`;
}

/**
 * Date picker. Chips are 34px, radius 100. Selected day is a 38px circle.
 * @param {object} [options]
 */
export function renderBnDatePicker(options = {}) {
  const dialogId = idOf('date', options.id);
  const days = options.days || ['1', '2', '3', '4', '5', '6', '7'];
  const cells = days
    .map(
      (day) =>
        `<td><button data-bn="bn-date-day" type="button"${opt('data-selected', day === options.selected ? 'true' : null)}>${escapeHtml(day)}</button></td>`,
    )
    .join('');
  const chips = ['date', 'time']
    .map((key) => {
      const label = key === 'date' ? options.dateLabel || 'Date' : options.timeLabel || 'Time';
      return `<li><button data-bn="bn-date-chip" type="button" commandfor="${escapeAttr(dialogId)}" command="show-modal">${escapeHtml(label)}</button></li>`;
    })
    .join('');
  return `<menu data-bn="bn-date-chips">${chips}</menu><dialog data-bn="bn-date-picker" id="${escapeAttr(dialogId)}" aria-label="Date"${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><table data-bn="bn-date-grid"><caption>${escapeHtml(options.month || 'June')}</caption><tr>${cells}</tr></table></dialog>`;
}

/** List. Regular rows are 52px with 16px side padding. A label or footer wraps the group. */
export function renderBnList(options = {}) {
  const hue = { kept: null };
  const rows = (options.rows || [])
    .map((row) => {
      const source = typeof row === 'string' ? { title: row } : { ...row };
      if (source.mark || source.tint) {
        const paint = listTile(source, hue);
        source.tint = paint.tint;
        source.semantic = paint.semantic;
      }
      return renderBnListRow(source);
    })
    .join('');
  const ul = `<ul data-bn="bn-list"${opt('data-grouped', options.grouped ? 'true' : null)}${opt('id', options.id)}${opt('data-force', options.force)}>${rows}</ul>`;
  if (!options.label && !options.footer) return ul;
  const head = options.label
    ? `<h2 data-bn="bn-list-header">${escapeHtml(options.label)}</h2>`
    : '';
  const foot = options.footer
    ? `<p data-bn="bn-list-footer">${escapeHtml(options.footer)}</p>`
    : '';
  return `<section data-bn="bn-list-group">${head}${ul}${foot}</section>`;
}

/**
 * One list row. `tint` plus `mark` is the Settings icon tile.
 * swipe paints the captured blue action.
 */
export function renderBnListRow(options = {}) {
  const row = typeof options === 'string' ? { title: options } : options;
  const tile =
    row.mark || row.tint
      ? renderBnSymbol({
          tint: row.tint,
          mark: row.mark || String(row.title || '').slice(0, 1),
          semantic: row.semantic,
        })
      : '';
  const image = row.image
    ? `<img data-bn="bn-list-image" src="${escapeAttr(row.image)}" alt="${escapeAttr(row.imageAlt || '')}">`
    : '';
  const detail = row.detail ? `<p data-bn="bn-list-detail">${escapeHtml(row.detail)}</p>` : '';
  const value = row.value ? `<p data-bn="bn-list-value">${escapeHtml(row.value)}</p>` : '';
  const chevron = row.chevron ? `<i data-bn="bn-list-chevron" aria-hidden="true">›</i>` : '';
  const grabber = row.grabber ? `<i data-bn="bn-list-grabber" aria-hidden="true">≡</i>` : '';
  return `<li data-bn="bn-list-row"${opt('data-swipe', row.swipe ? 'true' : null)}>${image}${tile}<p data-bn="bn-list-title">${escapeHtml(row.title || '')}</p>${detail}${value}${chevron}${grabber}</li>`;
}

/** A–Z index beside a long list. */
export function renderBnIndexBar(options = {}) {
  const letters = options.letters || [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'];
  const items = letters
    .map((letter) => `<li><a href="#${escapeAttr(letter)}">${escapeHtml(letter)}</a></li>`)
    .join('');
  return `<nav data-bn="bn-index-bar" aria-label="${escapeAttr(options.label || 'Index')}"${opt('id', options.id)}${opt('data-force', options.force)}><ol>${items}</ol></nav>`;
}

/** Table. Alternating and selected colours are macOS tokens. */
export function renderBnTable(options = {}) {
  const head = (options.columns || []).map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = (options.rows || [])
    .map(
      (row, index) =>
        `<tr${opt('data-selected', index === options.selected ? 'true' : null)}>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');
  return `<table data-bn="bn-table"${opt('id', options.id)}${opt('data-force', options.force)}><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Menu of menuitem buttons. The menu element is the popover. */
export function renderBnMenu(options = {}) {
  const menuId = idOf('menu', options.id);
  const contract = options.contract || 'bn-menu';
  const items = (options.items || [])
    .map((item) => `<li role="none">${renderBnMenuItem(item)}</li>`)
    .join('');
  const popover = options.inline ? '' : ' popover="auto"';
  return `<menu data-bn="${escapeAttr(contract)}" id="${escapeAttr(menuId)}" role="menu" aria-label="${escapeAttr(options.label || 'Menu')}"${popover}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}>${items}</menu>`;
}

/** One menu item. */
export function renderBnMenuItem(options = {}) {
  const item = typeof options === 'string' ? { label: options } : options;
  return `<button data-bn="bn-menu-item" type="button" role="menuitem"${opt('disabled', item.disabled)}${opt('data-force', item.force)}>${escapeHtml(item.label || '')}</button>`;
}

/** Contextual menu. The menu itself is the popover; no extra wrapper. */
export function renderBnContextMenu(options = {}) {
  return renderBnMenu({
    ...options,
    label: options.label || 'Context menu',
    contract: 'bn-context-menu',
  });
}

function actionMenu(actions, attr) {
  return `<menu data-bn="${attr}">${actions}</menu>`;
}

/** Action sheet. 300px, padding 14, radius 34, frost medium. Actions are 48px. */
export function renderBnActionSheet(options = {}) {
  const actions = (options.actions || [])
    .map(
      (action) =>
        `<li><button data-bn="bn-action" type="button" data-role="${escapeAttr(action.role || 'none')}">${escapeHtml(action.label)}</button></li>`,
    )
    .join('');
  const titleId = options.titleId || idOf('action-title', options.id);
  return `<dialog data-bn="bn-action-sheet" aria-labelledby="${escapeAttr(titleId)}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><h2 data-bn="bn-action-title" id="${escapeAttr(titleId)}">${escapeHtml(options.title || 'Actions')}</h2><p data-bn="bn-action-message">${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Share sheet. Width and radii are Activity View dimension tokens. No Apple artwork. */
export function renderBnShareSheet(options = {}) {
  const actions = (options.actions || [])
    .map(
      (action) =>
        `<li><button data-bn="bn-share-action" type="button"><i data-bn="bn-share-glyph" aria-hidden="true">${escapeHtml(action.glyph || '•')}</i><b>${escapeHtml(action.label)}</b></button></li>`,
    )
    .join('');
  return `<dialog data-bn="bn-share-sheet" aria-label="${escapeAttr(options.label || 'Share')}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><menu data-bn="bn-share-row">${actions}</menu><button data-bn="bn-share-close" type="button">${escapeHtml(options.closeLabel || 'Close')}</button></dialog>`;
}

/** Alert dialog. Same glass metrics as the action sheet. */
export function renderBnAlert(options = {}) {
  const actions = (options.actions || [{ label: 'OK', role: 'default' }])
    .map(
      (action) =>
        `<li><button data-bn="bn-action" type="button" data-role="${escapeAttr(action.role || 'default')}">${escapeHtml(action.label)}</button></li>`,
    )
    .join('');
  const titleId = options.titleId || idOf('alert-title', options.id);
  return `<dialog data-bn="bn-alert" role="alertdialog" aria-labelledby="${escapeAttr(titleId)}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><h2 data-bn="bn-alert-title" id="${escapeAttr(titleId)}">${escapeHtml(options.title || 'Alert')}</h2><p data-bn="bn-alert-message">${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Dialog. Centered title, message, and a trailing action row on macOS. */
export function renderBnDialog(options = {}) {
  const actions = (options.actions || [])
    .map(
      (action) =>
        `<li><button data-bn="bn-action" type="button">${escapeHtml(action.label)}</button></li>`,
    )
    .join('');
  const titleId = options.titleId || idOf('dialog-title', options.id);
  const name = options.label
    ? ` aria-label="${escapeAttr(options.label)}"`
    : ` aria-labelledby="${escapeAttr(titleId)}"`;
  return `<dialog data-bn="bn-dialog"${name}${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><h2 data-bn="bn-dialog-title" id="${escapeAttr(titleId)}">${escapeHtml(options.title || 'Dialog')}</h2><p>${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Sheet. Top and bottom radii and the grabber are dimension tokens. */
export function renderBnSheet(options = {}) {
  const open = `<dialog data-bn="bn-sheet" aria-label="${escapeAttr(options.label || options.title || 'Sheet')}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('data-force', options.force)}><hr data-bn="bn-grabber"><h2 data-bn="bn-sheet-title">${escapeHtml(options.title || '')}</h2>`;
  const text = `<p data-bn="bn-sheet-body">${escapeHtml(options.body || '')}</p>`;
  const composed = `<section data-bn="bn-sheet-body">${options.content || ''}</section>`;
  return `${open}${options.content ? composed : text}</dialog>`;
}

/** Popover. Corner radius is the popover dimension token. The aside is the popover. */
export function renderBnPopover(options = {}) {
  const popId = idOf('popover', options.id);
  const popover = options.inline ? '' : ' popover="auto"';
  const aside = `<aside data-bn="bn-popover" id="${escapeAttr(popId)}"${popover}${opt('data-force', options.force)}><p>${escapeHtml(options.body || '')}</p></aside>`;
  // The inline catalog panel has no popover attribute. The live popover stays an aside.
  const inlinePanel = `<div data-bn="bn-popover" id="${escapeAttr(popId)}"${popover}${opt('data-present', 'inline')}${opt('data-force', options.force)}><p>${escapeHtml(options.body || '')}</p></div>`;
  const button = `<button data-bn="bn-popover-button" type="button" popovertarget="${escapeAttr(popId)}"${opt('data-force', options.force)}>${escapeHtml(options.label || 'More')}</button>`;
  return button + (options.inline ? inlinePanel : aside);
}

/** Tooltip, a hint popover. Inner stroke colour is a macOS token. */
export function renderBnTooltip(options = {}) {
  const tipId = idOf('tip', options.id);
  const present = options.inline ? ' data-present="inline"' : ' popover="hint"';
  return `<button data-bn="bn-tooltip-button" type="button" popovertarget="${escapeAttr(tipId)}"${opt('data-force', options.force)}>${escapeHtml(options.label || 'Info')}</button><p data-bn="bn-tooltip" id="${escapeAttr(tipId)}"${present}${opt('data-force', options.force)}>${escapeHtml(options.tip || '')}</p>`;
}

/** Notification, a status region. A floating card with title and message. */
export function renderBnNotification(options = {}) {
  return `<output data-bn="bn-notification" role="status"${opt('id', options.id)}${opt('data-force', options.force)}><strong data-bn="bn-notification-title">${escapeHtml(options.title || '')}</strong><p>${escapeHtml(options.message || '')}</p></output>`;
}

/** Page control. Dots are 8×8. Active is Labels/Primary, inactive Labels/Tertiary. */
export function renderBnPageControl(options = {}) {
  const count = options.count ?? 4;
  const current = options.current ?? 0;
  const dots = Array.from(
    { length: count },
    (_, index) =>
      `<button data-bn="bn-page-dot" type="button" role="radio" aria-checked="${index === current ? 'true' : 'false'}" aria-label="${escapeAttr(`Page ${index + 1}`)}"${opt('disabled', options.disabled)}></button>`,
  ).join('');
  // No native radiogroup element. The dots are radio buttons inside this group.
  return `<div data-bn="bn-page-control" role="radiogroup" aria-label="${escapeAttr(options.label || 'Pages')}"${opt('id', options.id)}${opt('data-force', options.force)}>${dots}</div>`;
}

/** Three dots, the same box as the other tab symbols. Not a disclosure mark. */
const TAB_ELLIPSIS =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="18" cy="12" r="1.35"/></svg>';

function tabLink(tab) {
  const icon = tab.icon ? glyph(tab.icon) : '';
  const label = tab.shortLabel || tab.label || '';
  return `<a data-bn="bn-tab" href="${escapeAttr(tab.href || '#')}"${opt('aria-current', tab.current ? 'page' : null)}>${icon}${tabLabel(label)}</a>`;
}

function tabLabel(text) {
  // The label is its own box so a narrow tab clips that word instead of painting into the next tab.
  return `<span data-bn="bn-tab-label">${escapeHtml(text || '')}</span>`;
}

/**
 * Tab bar. Selection colour is Miscellaneous/Tab Bar Selection.
 * `barLimit` keeps the first links in the bar. The rest stay in the document
 * behind a tab that matches the others: an ellipsis above the word More,
 * opening a popover menu. It is not a disclosure triangle.
 */
export function renderBnTabBar(options = {}) {
  const tabs = options.tabs || [];
  const limit = options.barLimit;
  const primary = limit ? tabs.slice(0, limit) : tabs;
  const rest = limit ? tabs.slice(limit) : [];
  const links = primary.map(tabLink).join('');
  const moreId = options.id ? `${options.id}-more` : nextId('tab-more');
  const moreLabel = options.moreLabel || 'More';
  const moreCurrent = rest.some((tab) => tab.current);
  const more = rest.length
    ? `<button data-bn="bn-tab" id="${escapeAttr(moreId)}-btn" type="button" popovertarget="${escapeAttr(moreId)}" aria-haspopup="menu"${opt('aria-current', moreCurrent ? 'page' : null)}>${glyph(TAB_ELLIPSIS)}${tabLabel(moreLabel)}</button><menu data-bn="bn-tab-more" id="${escapeAttr(moreId)}" popover="auto" anchor="${escapeAttr(moreId)}-btn" aria-label="${escapeAttr(moreLabel)}">${rest
        .map(
          (tab) =>
            `<li><a data-bn="bn-menu-item" href="${escapeAttr(tab.href || '#')}"${opt('aria-current', tab.current ? 'page' : null)}>${escapeHtml(tab.label)}</a></li>`,
        )
        .join('')}</menu>`
    : '';
  return `<nav data-bn="bn-tab-bar" aria-label="${escapeAttr(options.label || 'Tabs')}"${opt('id', options.id)}${opt('data-force', options.force)}>${links}${more}</nav>`;
}

/** Toolbar. A menu of commands; each item's li is display:contents. */
export function renderBnToolbar(options = {}) {
  const items = (options.items || [])
    .map(
      (item) =>
        `<li><button data-bn="bn-toolbar-item" type="button">${escapeHtml(item.label)}</button></li>`,
    )
    .join('');
  return `<menu data-bn="bn-toolbar" aria-label="${escapeAttr(options.label || 'Toolbar')}"${opt('id', options.id)}${opt('data-force', options.force)}>${items}</menu>`;
}

function sidebarLink(item) {
  const icon = item.icon ? glyph(item.icon) : '';
  return `<li><a data-bn="bn-sidebar-item" href="${escapeAttr(item.href || '#')}"${opt('aria-current', item.current ? 'page' : null)}>${icon}${escapeHtml(item.label)}</a></li>`;
}

/**
 * Sidebar. Active and inactive backgrounds are kit colours.
 * `sections` is `{ label, items }[]`. A flat `items` array still works.
 */
export function renderBnSidebar(options = {}) {
  const sections = options.sections || [{ items: options.items || [] }];
  const body = sections
    .map((section) => {
      const heading = section.label ? `<h2>${escapeHtml(section.label)}</h2>` : '';
      const items = (section.items || []).map(sidebarLink).join('');
      return `<section>${heading}<ul>${items}</ul></section>`;
    })
    .join('');
  const attrs = `${opt('id', options.id)}${opt('data-force', options.force)}`;
  const inner = `<nav aria-label="${escapeAttr(options.label || 'Sidebar')}">${body}</nav>`;
  const aside = `<aside data-bn="bn-sidebar"${attrs}>${inner}</aside>`;
  if (options.inline) return `<section data-bn="bn-sidebar"${attrs}>${inner}</section>`;
  return aside;
}

/** Window frame. Background is the macOS window-background token on that platform. */
export function renderBnWindow(options = {}) {
  return `<section data-bn="bn-window"${opt('id', options.id)}${opt('data-force', options.force)}><header data-bn="bn-window-titlebar"><h2>${escapeHtml(options.title || '')}</h2></header><section data-bn="bn-window-body">${options.content ? options.content : `<p>${escapeHtml(options.body || '')}</p>`}</section></section>`;
}

/** Menu bar. iOS status-bar height is a dimension token. The macOS bar is 24px. */
export function renderBnMenubar(options = {}) {
  const app = options.app
    ? `<a data-bn="bn-menubar-app" href="${escapeAttr(options.app.href || '/')}">${escapeHtml(options.app.label || '')}</a>`
    : '';
  const items = (options.items || [])
    .map((item) => {
      if (item.href) {
        const rel = /^https?:/i.test(item.href) ? ' rel="noopener"' : '';
        return `<a data-bn="bn-menubar-item" href="${escapeAttr(item.href)}"${rel}>${escapeHtml(item.label)}</a>`;
      }
      return `<button data-bn="bn-menubar-item" type="button">${escapeHtml(item.label)}</button>`;
    })
    .join('');
  return `<header data-bn="bn-menubar"${opt('id', options.id)}${opt('data-force', options.force)}>${app}${items}</header>`;
}

/** Disclosure, native details and summary. */
export function renderBnDisclosure(options = {}) {
  return `<details data-bn="bn-disclosure"${opt('id', options.id)}${opt('open', options.open)}${opt('data-force', options.force)}><summary>${escapeHtml(options.label || 'Details')}</summary><p>${escapeHtml(options.body || '')}</p></details>`;
}

/** Form of fields. macOS spacing follows the control-size tokens. */
export function renderBnForm(options = {}) {
  const fields = (options.fields || []).map((field) => renderBnField(field)).join('');
  return `<form data-bn="bn-form"${opt('id', options.id)}${opt('data-force', options.force)}>${fields}${renderBnButton(options.submitLabel || 'Submit', { variant: 'prominent', size: 'large', type: 'submit' })}</form>`;
}

/** Group box, native fieldset and legend. */
export function renderBnGroup(options = {}) {
  return `<fieldset data-bn="bn-group"${opt('id', options.id)}${opt('data-force', options.force)}><legend>${escapeHtml(options.label || '')}</legend><p>${escapeHtml(options.body || '')}</p></fieldset>`;
}

/** Image well: a file input that accepts images. */
export function renderBnImageWell(options = {}) {
  const inputId = idOf('image', options.id);
  const img = options.src
    ? `<img data-bn="bn-image-well-preview" src="${escapeAttr(options.src)}" alt="${escapeAttr(options.alt || '')}">`
    : '';
  return `<label data-bn="bn-image-well"${opt('data-force', options.force)}>${escapeHtml(options.label || 'Image')}<input type="file" id="${escapeAttr(inputId)}" accept="image/*"${opt('disabled', options.disabled)}>${img}</label>`;
}

/** Scroll region. macOS scrollbar colour is Miscellaneous/Scrollbar. */
export function renderBnScroll(options = {}) {
  return `<section data-bn="bn-scroll" tabindex="0"${opt('id', options.id)}${opt('data-force', options.force)}><p>${escapeHtml(options.body || '')}</p></section>`;
}

/**
 * Overlay scrollbar. A range control, so the thumb is a real widget.
 * Vertical is the default. Horizontal is aria-orientation="horizontal".
 */
export function renderBnScrollbar(options = {}) {
  const orientation = options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const value = options.value == null ? 40 : options.value;
  return `<input data-bn="bn-scrollbar" type="range" aria-orientation="${escapeAttr(orientation)}" aria-label="${escapeAttr(options.label || 'Scroll position')}" min="0" max="100" value="${escapeAttr(String(value))}"${opt('id', options.id)}${opt('disabled', options.disabled)}${opt('data-force', options.force)}>`;
}

/**
 * Refraction swatch. Blur, saturation, sheen, and the brand stage glow
 * stand in for a displacement shader. The host is a figure.
 */
export function renderBnRefraction(options = {}) {
  return `<figure data-bn="bn-refraction"${opt('id', options.id)}${opt('data-force', options.force)}><figcaption>${escapeHtml(options.label || 'Refraction')}</figcaption><p>${escapeHtml(options.body || 'Light bends through the glass.')}</p></figure>`;
}

/** Keyboard accessory bar. Key size follows the captured iPhone key (about 50×43, radius 8.5). */
export function renderBnInputAccessory(options = {}) {
  const keys = (options.keys || ['ABC', 'space', 'return'])
    .map((key) => `<li><button data-bn="bn-key" type="button">${escapeHtml(key)}</button></li>`)
    .join('');
  return `<menu data-bn="bn-input-accessory" aria-label="${escapeAttr(options.label || 'Input accessory')}"${opt('id', options.id)}${opt('data-force', options.force)}>${keys}</menu>`;
}

/** Empty state. Side and bottom padding 36, title semibold 22, description medium 22. */
export function renderBnEmptyState(options = {}) {
  const kind = options.kind || 'title';
  const symbol = kind === 'title' ? '' : '<i data-bn="bn-empty-symbol" aria-hidden="true"></i>';
  return `<section data-bn="bn-empty-state" data-kind="${escapeAttr(kind)}"${opt('id', options.id)}${opt('data-force', options.force)}>${symbol}<h2 data-bn="bn-empty-title">${escapeHtml(options.title || '')}</h2><p data-bn="bn-empty-description">${escapeHtml(options.description || '')}</p></section>`;
}

/**
 * App icon frame. Size is the App Icon token. Radius is 0.26 of that size
 * (kit grid 256, radius 66.56). No Apple artwork.
 */
export function renderBnAppIcon(options = {}) {
  return `<figure data-bn="bn-app-icon" role="img" aria-label="${escapeAttr(options.label || 'App')}"${opt('id', options.id)}${opt('data-force', options.force)}><figcaption>${escapeHtml(options.monogram || '')}</figcaption></figure>`;
}

/** Widget card. A titled article. The Widgets page fit did not yield a pixel size. */
export function renderBnWidget(options = {}) {
  return `<article data-bn="bn-widget"${opt('id', options.id)}${opt('data-force', options.force)}><h2 data-bn="bn-widget-title">${escapeHtml(options.title || '')}</h2><p>${escapeHtml(options.body || '')}</p></article>`;
}

/**
 * One material swatch from the kit (ultrathin through ultrathick).
 * The sample is a figure; the fill is the material token.
 */
export function renderBnMaterial(options = {}) {
  const name = options.name || 'medium';
  return `<figure data-bn="bn-material" data-material="${escapeAttr(name)}"${opt('id', options.id)}${opt('data-force', options.force)}><figcaption>${escapeHtml(options.label || name)}</figcaption></figure>`;
}

/** Metric tile. Equal height comes from the card grid, not from the page. */
export function renderBnMetric(options = {}) {
  const detail = options.detail
    ? `<p data-bn="bn-metric-detail">${escapeHtml(options.detail)}</p>`
    : '';
  return `<article data-bn="bn-metric"${opt('id', options.id)}${opt('data-force', options.force)}><p data-bn="bn-metric-value">${escapeHtml(String(options.value ?? ''))}</p><h3 data-bn="bn-metric-label">${escapeHtml(options.label || '')}</h3>${detail}</article>`;
}

/**
 * Navigation bar. Large Title is the default; pass large:false for the inline title.
 * @param {object} [options]
 */
export function renderBnNavBar(options = {}) {
  const large = options.large !== false;
  const back = options.back
    ? `<a data-bn="bn-nav-back" href="${escapeAttr(options.back.href || '/')}">${escapeHtml(options.back.label || 'Back')}</a>`
    : '';
  const trailing = (options.trailing || [])
    .map((item) => {
      const control = item.href
        ? `<a data-bn="bn-nav-action" href="${escapeAttr(item.href)}">${escapeHtml(item.label || '')}</a>`
        : renderBnButton(item.label || '', {
            variant: item.variant || 'borderless',
            size: item.size || 'small',
          });
      return `<li>${control}</li>`;
    })
    .join('');
  const menu = trailing
    ? `<menu data-bn="bn-nav-trailing" aria-label="Actions">${trailing}</menu>`
    : '';
  const subtitle = options.subtitle
    ? `<p data-bn="bn-nav-subtitle">${escapeHtml(options.subtitle)}</p>`
    : '';
  const heading = options.heading === 'h2' ? 'h2' : 'h1';
  const title = large
    ? ''
    : `<${heading} data-bn="bn-nav-title">${escapeHtml(options.title || '')}</${heading}>`;
  const largeTitle = large
    ? `<${heading} data-bn="bn-large-title">${escapeHtml(options.title || '')}</${heading}>`
    : '';
  return `<header data-bn="bn-nav-bar" data-large="${large ? 'true' : 'false'}"${opt('id', options.id)}${opt('data-force', options.force)}><nav aria-label="${escapeAttr(options.label || 'Navigation')}">${back}${title}${menu}</nav>${largeTitle}${subtitle}</header>`;
}

/** Inspector. Sections are field groups, not a second sidebar component. */
export function renderBnInspector(options = {}) {
  const sections = (options.sections || [])
    .map((section) => {
      const fields = (section.fields || []).map((field) => renderBnField(field)).join('');
      return `<section><h3>${escapeHtml(section.label || '')}</h3>${fields}</section>`;
    })
    .join('');
  const attrs = ` aria-label="${escapeAttr(options.title || 'Inspector')}"${opt('id', options.id)}${opt('data-force', options.force)}`;
  const inner = `<header><h2>${escapeHtml(options.title || 'Inspector')}</h2></header>${sections}`;
  const aside = `<aside data-bn="bn-inspector"${attrs}>${inner}</aside>`;
  if (options.inline) return `<section data-bn="bn-inspector"${attrs}>${inner}</section>`;
  return aside;
}

/** Card grid of metric tiles and widget cards. Rows share one height. */
export function renderBnCardGrid(options = {}) {
  const cards = (options.cards || [])
    .map((card) => {
      const body =
        card.value != null && card.value !== '' ? renderBnMetric(card) : renderBnWidget(card);
      return `<li>${body}</li>`;
    })
    .join('');
  return `<ul data-bn="bn-card-grid"${opt('id', options.id)}${opt('data-force', options.force)}>${cards}</ul>`;
}

/**
 * Hero. A glass window header: eyebrow, large title, lede, capsule actions.
 * @param {object} [options]
 */
export function renderBnHero(options = {}) {
  const actions = (options.actions || [])
    .map((action, index) =>
      renderBnButton(action.label || '', {
        variant: action.variant || (index === 0 ? 'prominent' : 'bordered'),
        size: action.size || 'large',
        href: action.href,
      }),
    )
    .join('');
  const eyebrow = options.eyebrow
    ? `<p data-bn="bn-hero-eyebrow">${escapeHtml(options.eyebrow)}</p>`
    : '';
  const lede = options.lede ? `<p data-bn="bn-hero-lede">${escapeHtml(options.lede)}</p>` : '';
  const nav = actions
    ? `<nav aria-label="${escapeAttr(options.label || 'Primary')}">${actions}</nav>`
    : '';
  const heading = options.heading === 'h2' ? 'h2' : 'h1';
  return `<header data-bn="bn-hero"${opt('id', options.id)}${opt('data-force', options.force)}>${eyebrow}<${heading}>${escapeHtml(options.title || '')}</${heading}>${lede}${nav}</header>`;
}

/**
 * Site footer. `groups` are macOS link columns. A flat `links` list is one column.
 */
export function renderBnFooter(options = {}) {
  const groups = options.groups || [{ label: options.note || '', links: options.links || [] }];
  const columns = groups
    .map((group) => {
      const links = (group.links || [])
        .map(
          (link) =>
            `<li><a href="${escapeAttr(link.href || '#')}">${escapeHtml(link.label || '')}</a></li>`,
        )
        .join('');
      const title = group.label ? `<p>${escapeHtml(group.label)}</p>` : '';
      const name = group.label || options.label || 'Footer';
      return `<nav aria-label="${escapeAttr(name)}">${title}<ul>${links}</ul></nav>`;
    })
    .join('');
  return `<footer data-bn="bn-footer"${opt('id', options.id)}${opt('data-force', options.force)}>${columns}</footer>`;
}

/** Dock. A glass row of equal targets. Marks are text, not a symbol font. */
export function renderBnDock(options = {}) {
  const items = (options.items || [])
    .map((item) => {
      const current = item.current ? ' aria-current="page"' : '';
      return `<li><a data-bn="bn-dock-item" href="${escapeAttr(item.href || '#')}"${current}>${escapeHtml(item.label || '')}</a></li>`;
    })
    .join('');
  return `<nav data-bn="bn-dock" aria-label="${escapeAttr(options.label || 'Dock')}"${opt('id', options.id)}${opt('data-force', options.force)}><ul>${items}</ul></nav>`;
}
