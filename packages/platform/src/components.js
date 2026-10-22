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
  const labelAttr = labelStyle === 'icon' ? ` aria-label="${escapeAttr(options.text ?? label)}"` : '';
  const style = options.style ? ` data-style="${escapeAttr(options.style)}"` : '';
  const selected = options.selected ? ' data-selected="true" aria-pressed="true"' : '';
  const control =
    options.size === 'mini' || options.size === 'xl' ? ` data-bn-control="${escapeAttr(options.size)}"` : '';
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
    return `<select data-bn="bn-popup-button"${opt('id', options.id)}${opt('disabled', options.disabled)}>${items}</select>`;
  }
  const menuId = idOf('popup-menu', options.menuId);
  const button = `<button data-bn="bn-popup-button" type="button" popovertarget="${escapeAttr(menuId)}"${opt('id', options.id)}${opt('disabled', options.disabled)}>${escapeHtml(options.label || 'Options')}${glyph('▾')}</button>`;
  return `${button}${renderBnMenu({ id: menuId, items: options.items || [], label: options.label || 'Options' })}`;
}

/** Pull-down button opening a popover menu. */
export function renderBnPulldownButton(options = {}) {
  const menuId = idOf('pulldown-menu', options.menuId);
  const button = `<button data-bn="bn-pulldown-button" type="button" popovertarget="${escapeAttr(menuId)}"${opt('id', options.id)}>${escapeHtml(options.label || 'Actions')}${glyph('▾')}</button>`;
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
  return `<fieldset data-bn="bn-segmented" data-size="${escapeAttr(options.size || 'large')}" role="radiogroup" aria-label="${escapeAttr(options.label || 'Segments')}"${opt('id', options.id)}>${radios}</fieldset>`;
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
  return `<label data-bn="bn-checkbox"><input type="checkbox" id="${escapeAttr(inputId)}"${opt('checked', options.checked && !options.mixed)}${opt('disabled', options.disabled)}${mixed}>${escapeHtml(options.label || '')}</label>`;
}

/** Radio. macOS size comes from Radio Button tokens. */
export function renderBnRadio(options = {}) {
  const inputId = idOf('radio', options.id);
  return `<label data-bn="bn-radio"><input type="radio" name="${escapeAttr(options.name || 'bn-radio')}" id="${escapeAttr(inputId)}"${opt('checked', options.checked)}${opt('disabled', options.disabled)}>${escapeHtml(options.label || '')}</label>`;
}

/** Slider. macOS knob and track insets come from Slider tokens. */
export function renderBnSlider(options = {}) {
  return `<label data-bn="bn-slider">${escapeHtml(options.label || '')}<input type="range"${opt('id', options.id)} min="${escapeAttr(options.min ?? 0)}" max="${escapeAttr(options.max ?? 100)}" value="${escapeAttr(options.value ?? 50)}"${opt('disabled', options.disabled)}></label>`;
}

/** Dial, a range input. Knob size is Dial tokens on macOS. */
export function renderBnDial(options = {}) {
  return `<label data-bn="bn-dial">${escapeHtml(options.label || '')}<input type="range"${opt('id', options.id)} min="${escapeAttr(options.min ?? 0)}" max="${escapeAttr(options.max ?? 100)}" value="${escapeAttr(options.value ?? 25)}"${opt('aria-valuetext', options.valueText)}></label>`;
}

/** Stepper: a number input between decrement and increment buttons. */
export function renderBnStepper(options = {}) {
  const inputId = idOf('stepper', options.id);
  return `<fieldset data-bn="bn-stepper"><legend>${escapeHtml(options.label || 'Value')}</legend><button data-bn="bn-stepper-dec" type="button" aria-controls="${escapeAttr(inputId)}">−</button><input type="number" id="${escapeAttr(inputId)}" value="${escapeAttr(options.value ?? 0)}"${opt('min', options.min)}${opt('max', options.max)} aria-label="${escapeAttr(options.label || 'Value')}"><button data-bn="bn-stepper-inc" type="button" aria-controls="${escapeAttr(inputId)}">+</button></fieldset>`;
}

/** Determinate progress when value is set. */
export function renderBnProgress(options = {}) {
  const known = options.value != null;
  return `<progress data-bn="bn-progress"${opt('id', options.id)}${known ? ` value="${escapeAttr(options.value)}"` : ''} max="${escapeAttr(options.max ?? 1)}" aria-label="${escapeAttr(options.label || 'Progress')}">${known ? '' : escapeHtml(options.label || '')}</progress>`;
}

/** Indeterminate progress. */
export function renderBnSpinner(options = {}) {
  return `<progress data-bn="bn-spinner"${opt('id', options.id)} aria-label="${escapeAttr(options.label || 'Loading')}"></progress>`;
}

/** Text field. macOS insets come from Fields tokens. */
export function renderBnField(options = {}) {
  const inputId = idOf('field', options.id);
  const control = options.multiline
    ? `<textarea data-bn="bn-field-control" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder)}${opt('disabled', options.disabled)}>${escapeHtml(options.value || '')}</textarea>`
    : `<input data-bn="bn-field-control" type="${escapeAttr(options.type || 'text')}" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder)}${opt('value', options.value)}${opt('disabled', options.disabled)}>`;
  return `<label data-bn="bn-field">${escapeHtml(options.label || '')}${control}</label>`;
}

/** Search field inside a search element. */
export function renderBnSearch(options = {}) {
  const inputId = idOf('search', options.id);
  return `<search data-bn="bn-search" role="search"><label for="${escapeAttr(inputId)}">${escapeHtml(options.label || 'Search')}</label><input type="search" id="${escapeAttr(inputId)}"${opt('placeholder', options.placeholder || 'Search')}${opt('value', options.value)}></search>`;
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
  return `<label data-bn="bn-combobox">${escapeHtml(options.label || '')}<input type="text" id="${escapeAttr(inputId)}" list="${escapeAttr(listId)}"${opt('value', options.value)}><datalist id="${escapeAttr(listId)}">${items}</datalist></label>`;
}

/** Colour well, a native colour input. macOS size is Color Well tokens. */
export function renderBnColorWell(options = {}) {
  return `<label data-bn="bn-color-well">${escapeHtml(options.label || 'Color')}<input type="color"${opt('id', options.id)} value="${escapeAttr(options.value || '#0088ff')}"></label>`;
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
  return `<button data-bn="bn-color-well" type="button" commandfor="${escapeAttr(dialogId)}" command="show-modal" aria-haspopup="dialog">${escapeHtml(options.label || 'Color')}</button><dialog data-bn="bn-color-picker" id="${escapeAttr(dialogId)}"${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}><p data-bn="bn-color-picker-title">${escapeHtml(options.label || 'Color')}</p><ul data-bn="bn-color-grid">${swatches}</ul></dialog>`;
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
  return `<menu data-bn="bn-date-chips">${chips}</menu><dialog data-bn="bn-date-picker" id="${escapeAttr(dialogId)}" aria-label="Date"${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}><table data-bn="bn-date-grid"><caption>${escapeHtml(options.month || 'June')}</caption><tr>${cells}</tr></table></dialog>`;
}

/** List. Regular rows are 52px with 16px side padding. */
export function renderBnList(options = {}) {
  const rows = (options.rows || []).map((row) => renderBnListRow(row)).join('');
  return `<ul data-bn="bn-list"${opt('data-grouped', options.grouped ? 'true' : null)}${opt('id', options.id)}>${rows}</ul>`;
}

/** One list row. swipe paints the captured blue action. */
export function renderBnListRow(options = {}) {
  const row = typeof options === 'string' ? { title: options } : options;
  const detail = row.detail ? `<p data-bn="bn-list-detail">${escapeHtml(row.detail)}</p>` : '';
  return `<li data-bn="bn-list-row"${opt('data-swipe', row.swipe ? 'true' : null)}><p data-bn="bn-list-title">${escapeHtml(row.title || '')}</p>${detail}</li>`;
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
  return `<table data-bn="bn-table"${opt('id', options.id)}><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Menu of menuitem buttons. The menu element is the popover. */
export function renderBnMenu(options = {}) {
  const menuId = idOf('menu', options.id);
  const contract = options.contract || 'bn-menu';
  const items = (options.items || [])
    .map((item) => `<li>${renderBnMenuItem(item)}</li>`)
    .join('');
  const popover = options.inline ? '' : ' popover="auto"';
  return `<menu data-bn="${escapeAttr(contract)}" id="${escapeAttr(menuId)}" aria-label="${escapeAttr(options.label || 'Menu')}"${popover}${opt('data-present', options.inline ? 'inline' : null)}>${items}</menu>`;
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
  return `<dialog data-bn="bn-action-sheet"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}><h2 data-bn="bn-action-title">${escapeHtml(options.title || '')}</h2><p data-bn="bn-action-message">${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Share sheet. Width and radii are Activity View dimension tokens. No Apple artwork. */
export function renderBnShareSheet(options = {}) {
  const actions = (options.actions || [])
    .map(
      (action) =>
        `<li><button data-bn="bn-share-action" type="button"><i data-bn="bn-share-glyph" aria-hidden="true">${escapeHtml(action.glyph || '•')}</i><b>${escapeHtml(action.label)}</b></button></li>`,
    )
    .join('');
  return `<dialog data-bn="bn-share-sheet" aria-label="${escapeAttr(options.label || 'Share')}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}><menu data-bn="bn-share-row">${actions}</menu><button data-bn="bn-share-close" type="button">${escapeHtml(options.closeLabel || 'Close')}</button></dialog>`;
}

/** Alert dialog. Same glass metrics as the action sheet. */
export function renderBnAlert(options = {}) {
  const actions = (options.actions || [{ label: 'OK', role: 'default' }])
    .map(
      (action) =>
        `<li><button data-bn="bn-action" type="button" data-role="${escapeAttr(action.role || 'default')}">${escapeHtml(action.label)}</button></li>`,
    )
    .join('');
  return `<dialog data-bn="bn-alert" role="alertdialog"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('aria-labelledby', options.titleId)}><h2 data-bn="bn-alert-title"${opt('id', options.titleId)}>${escapeHtml(options.title || '')}</h2><p data-bn="bn-alert-message">${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Dialog. Centered title, message, and a trailing action row on macOS. */
export function renderBnDialog(options = {}) {
  const actions = (options.actions || [])
    .map(
      (action) => `<li><button data-bn="bn-action" type="button">${escapeHtml(action.label)}</button></li>`,
    )
    .join('');
  return `<dialog data-bn="bn-dialog"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}${opt('aria-label', options.label)}><h2 data-bn="bn-dialog-title">${escapeHtml(options.title || '')}</h2><p>${escapeHtml(options.message || '')}</p>${actionMenu(actions, 'bn-action-list')}</dialog>`;
}

/** Sheet. Top and bottom radii and the grabber are dimension tokens. */
export function renderBnSheet(options = {}) {
  return `<dialog data-bn="bn-sheet" aria-label="${escapeAttr(options.label || 'Sheet')}"${opt('id', options.id)}${opt('open', options.open)}${opt('data-present', options.inline ? 'inline' : null)}><hr data-bn="bn-grabber"><h2 data-bn="bn-sheet-title">${escapeHtml(options.title || '')}</h2><p data-bn="bn-sheet-body">${escapeHtml(options.body || '')}</p></dialog>`;
}

/** Popover. Corner radius is the popover dimension token. The aside is the popover. */
export function renderBnPopover(options = {}) {
  const popId = idOf('popover', options.id);
  const popover = options.inline ? '' : ' popover="auto"';
  return `<button data-bn="bn-popover-button" type="button" popovertarget="${escapeAttr(popId)}">${escapeHtml(options.label || 'More')}</button><aside data-bn="bn-popover" id="${escapeAttr(popId)}"${popover}${opt('data-present', options.inline ? 'inline' : null)}><p>${escapeHtml(options.body || '')}</p></aside>`;
}

/** Tooltip, a hint popover. Inner stroke colour is a macOS token. */
export function renderBnTooltip(options = {}) {
  const tipId = idOf('tip', options.id);
  return `<button data-bn="bn-tooltip-button" type="button" popovertarget="${escapeAttr(tipId)}">${escapeHtml(options.label || 'Info')}</button><p data-bn="bn-tooltip" id="${escapeAttr(tipId)}" popover="hint">${escapeHtml(options.tip || '')}</p>`;
}

/** Notification, a status region. A floating card with title and message. */
export function renderBnNotification(options = {}) {
  return `<output data-bn="bn-notification" role="status"${opt('id', options.id)}><strong data-bn="bn-notification-title">${escapeHtml(options.title || '')}</strong><p>${escapeHtml(options.message || '')}</p></output>`;
}

/** Page control. Dots are 8×8. Active is Labels/Primary, inactive Labels/Tertiary. */
export function renderBnPageControl(options = {}) {
  const count = options.count ?? 4;
  const current = options.current ?? 0;
  const dots = Array.from(
    { length: count },
    (_, index) =>
      `<button data-bn="bn-page-dot" type="button" role="radio" aria-checked="${index === current ? 'true' : 'false'}" aria-label="${escapeAttr(`Page ${index + 1}`)}"></button>`,
  ).join('');
  return `<nav data-bn="bn-page-control" role="radiogroup" aria-label="${escapeAttr(options.label || 'Pages')}"${opt('id', options.id)}>${dots}</nav>`;
}

function tabLink(tab) {
  const icon = tab.icon ? glyph(tab.icon) : '';
  return `<a data-bn="bn-tab" href="${escapeAttr(tab.href || '#')}"${opt('aria-current', tab.current ? 'page' : null)}>${icon}${escapeHtml(tab.label)}</a>`;
}

/**
 * Tab bar. Selection colour is Miscellaneous/Tab Bar Selection.
 * `barLimit` keeps the first links in the bar and the rest in a More disclosure,
 * so every destination stays in the document.
 */
export function renderBnTabBar(options = {}) {
  const tabs = options.tabs || [];
  const limit = options.barLimit;
  const primary = limit ? tabs.slice(0, limit) : tabs;
  const rest = limit ? tabs.slice(limit) : [];
  const links = primary.map(tabLink).join('');
  const more = rest.length
    ? `<details data-bn="bn-tab-more"><summary>${escapeHtml(options.moreLabel || 'More')}</summary><ul>${rest
        .map(
          (tab) =>
            `<li><a href="${escapeAttr(tab.href || '#')}"${opt('aria-current', tab.current ? 'page' : null)}>${escapeHtml(tab.label)}</a></li>`,
        )
        .join('')}</ul></details>`
    : '';
  return `<nav data-bn="bn-tab-bar" aria-label="${escapeAttr(options.label || 'Tabs')}"${opt('id', options.id)}>${links}${more}</nav>`;
}

/** Toolbar. A menu of commands; each item's li is display:contents. */
export function renderBnToolbar(options = {}) {
  const items = (options.items || [])
    .map(
      (item) =>
        `<li><button data-bn="bn-toolbar-item" type="button">${escapeHtml(item.label)}</button></li>`,
    )
    .join('');
  return `<menu data-bn="bn-toolbar" aria-label="${escapeAttr(options.label || 'Toolbar')}"${opt('id', options.id)}>${items}</menu>`;
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
  return `<aside data-bn="bn-sidebar"${opt('id', options.id)}><nav aria-label="${escapeAttr(options.label || 'Sidebar')}">${body}</nav></aside>`;
}

/** Window frame. Background is the macOS window-background token on that platform. */
export function renderBnWindow(options = {}) {
  return `<section data-bn="bn-window"${opt('id', options.id)}><header data-bn="bn-window-titlebar"><h2>${escapeHtml(options.title || '')}</h2></header><section data-bn="bn-window-body"><p>${escapeHtml(options.body || '')}</p></section></section>`;
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
  return `<header data-bn="bn-menubar"${opt('id', options.id)}>${app}${items}</header>`;
}

/** Disclosure, native details and summary. */
export function renderBnDisclosure(options = {}) {
  return `<details data-bn="bn-disclosure"${opt('id', options.id)}${opt('open', options.open)}><summary>${escapeHtml(options.label || 'Details')}</summary><p>${escapeHtml(options.body || '')}</p></details>`;
}

/** Form of fields. macOS spacing follows the control-size tokens. */
export function renderBnForm(options = {}) {
  const fields = (options.fields || []).map((field) => renderBnField(field)).join('');
  return `<form data-bn="bn-form"${opt('id', options.id)}>${fields}${renderBnButton(options.submitLabel || 'Submit', { variant: 'prominent', size: 'large', type: 'submit' })}</form>`;
}

/** Group box, native fieldset and legend. */
export function renderBnGroup(options = {}) {
  return `<fieldset data-bn="bn-group"${opt('id', options.id)}><legend>${escapeHtml(options.label || '')}</legend><p>${escapeHtml(options.body || '')}</p></fieldset>`;
}

/** Image well: a file input that accepts images. */
export function renderBnImageWell(options = {}) {
  const inputId = idOf('image', options.id);
  const img = options.src
    ? `<img data-bn="bn-image-well-preview" src="${escapeAttr(options.src)}" alt="${escapeAttr(options.alt || '')}">`
    : '';
  return `<label data-bn="bn-image-well">${escapeHtml(options.label || 'Image')}<input type="file" id="${escapeAttr(inputId)}" accept="image/*">${img}</label>`;
}

/** Scroll region. macOS scrollbar colour is Miscellaneous/Scrollbar. */
export function renderBnScroll(options = {}) {
  return `<section data-bn="bn-scroll" tabindex="0"${opt('id', options.id)}><p>${escapeHtml(options.body || '')}</p></section>`;
}

/** Keyboard accessory bar. Key size follows the captured iPhone key (about 50×43, radius 8.5). */
export function renderBnInputAccessory(options = {}) {
  const keys = (options.keys || ['ABC', 'space', 'return'])
    .map((key) => `<li><button data-bn="bn-key" type="button">${escapeHtml(key)}</button></li>`)
    .join('');
  return `<menu data-bn="bn-input-accessory" aria-label="${escapeAttr(options.label || 'Input accessory')}"${opt('id', options.id)}>${keys}</menu>`;
}

/** Empty state. Side and bottom padding 36, title semibold 22, description medium 22. */
export function renderBnEmptyState(options = {}) {
  const kind = options.kind || 'title';
  const symbol = kind === 'title' ? '' : '<i data-bn="bn-empty-symbol" aria-hidden="true"></i>';
  return `<section data-bn="bn-empty-state" data-kind="${escapeAttr(kind)}"${opt('id', options.id)}>${symbol}<h2 data-bn="bn-empty-title">${escapeHtml(options.title || '')}</h2><p data-bn="bn-empty-description">${escapeHtml(options.description || '')}</p></section>`;
}

/**
 * App icon frame. Size is the App Icon token. Radius is 0.26 of that size
 * (kit grid 256, radius 66.56). No Apple artwork.
 */
export function renderBnAppIcon(options = {}) {
  return `<figure data-bn="bn-app-icon" role="img" aria-label="${escapeAttr(options.label || 'App')}"${opt('id', options.id)}><figcaption>${escapeHtml(options.monogram || '')}</figcaption></figure>`;
}

/** Widget card. A titled article. The Widgets page fit did not yield a pixel size. */
export function renderBnWidget(options = {}) {
  return `<article data-bn="bn-widget"${opt('id', options.id)}><h2 data-bn="bn-widget-title">${escapeHtml(options.title || '')}</h2><p>${escapeHtml(options.body || '')}</p></article>`;
}

/**
 * One material swatch from the kit (ultrathin through ultrathick).
 * The sample is a figure; the fill is the material token.
 */
export function renderBnMaterial(options = {}) {
  const name = options.name || 'medium';
  return `<figure data-bn="bn-material" data-material="${escapeAttr(name)}"${opt('id', options.id)}><figcaption>${escapeHtml(options.label || name)}</figcaption></figure>`;
}
