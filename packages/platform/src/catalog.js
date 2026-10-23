/**
 * One page that shows every control, both platforms, light and dark.
 * @returns {string} HTML document
 */
import { resetIds } from './ids.js';
import { VERIFY } from './verify.js';
import { escapeHtml } from './html.js';
import {
  renderBnActionSheet,
  renderBnAlert,
  renderBnAppIcon,
  renderBnButton,
  renderBnCheckbox,
  renderBnColorPicker,
  renderBnColorWell,
  renderBnCombobox,
  renderBnContextMenu,
  renderBnDatePicker,
  renderBnDial,
  renderBnDialog,
  renderBnDisclosure,
  renderBnEmptyState,
  renderBnField,
  renderBnForm,
  renderBnGroup,
  renderBnImageWell,
  renderBnInputAccessory,
  renderBnList,
  renderBnMenu,
  renderBnMenubar,
  renderBnNotification,
  renderBnPageControl,
  renderBnPopover,
  renderBnPopupButton,
  renderBnProgress,
  renderBnPulldownButton,
  renderBnRadio,
  renderBnScroll,
  renderBnScrollbar,
  renderBnRefraction,
  renderBnSearch,
  renderBnSegmented,
  renderBnShareSheet,
  renderBnSheet,
  renderBnSidebar,
  renderBnSlider,
  renderBnSpinner,
  renderBnStepper,
  renderBnSwitch,
  renderBnTabBar,
  renderBnTable,
  renderBnToolbar,
  renderBnTooltip,
  renderBnWidget,
  renderBnWindow,
  renderBnMaterial,
  renderBnBadge,
  renderBnCardGrid,
  renderBnDock,
  renderBnFooter,
  renderBnHero,
  renderBnIndexBar,
  renderBnInspector,
  renderBnMetric,
  renderBnNavBar,
  renderBnSymbol,
} from './components.js';

function stage(title, attrs, body) {
  return `<section data-bn="bn-catalog-stage" ${attrs}><h2 data-bn="bn-catalog-heading">${title}</h2>${body}</section>`;
}

function row(label, html) {
  return `<section data-bn="bn-catalog-row"><h3 data-bn="bn-catalog-label">${label}</h3><figure data-bn="bn-catalog-demo">${html}</figure></section>`;
}

function buttons() {
  const variants = ['prominent', 'bordered', 'borderless', 'glass', 'glass-prominent'];
  const sizes = ['large', 'medium', 'small'];
  return (
    variants
      .map((variant) =>
        sizes
          .map((size) => renderBnButton('Play', { variant, size, labelStyle: 'both', icon: '▶' }))
          .join(''),
      )
      .join('') +
    renderBnButton('Delete', { variant: 'prominent', destructive: true }) +
    renderBnButton('Delete', { variant: 'bordered', destructive: true }) +
    renderBnButton('', { variant: 'prominent', labelStyle: 'icon', icon: '+', text: 'Add' }) +
    renderBnButton('Off', { variant: 'prominent', disabled: true })
  );
}

const STATE_COLUMNS = [
  ['Rest', {}],
  ['Hover', { force: 'hover' }],
  ['Pressed', { force: 'active' }],
  ['Focus', { force: 'focus' }],
  ['Disabled', { force: 'disabled', disabled: true }],
  ['Selected', { pick: 'selected' }],
];

const SYMBOL_TINTS = [
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

function atomStates(tone = 'light') {
  return STATE_COLUMNS.map(([label, state]) => {
    if (state.pick === 'selected') {
      return row(
        label,
        [
          renderBnSwitch({ label: 'On', checked: true }),
          renderBnCheckbox({ label: 'Check', checked: true }),
          renderBnRadio({ label: 'Radio', checked: true, name: `atom-selected-${tone}` }),
          renderBnPageControl({ count: 3, current: 1 }),
        ].join(''),
      );
    }
    const buttons = ['prominent', 'bordered', 'borderless', 'glass', 'glass-prominent']
      .map((variant) => renderBnButton(variant, { variant, size: 'large', ...state }))
      .join('');
    const destructive = renderBnButton('Delete', {
      variant: 'prominent',
      destructive: true,
      size: 'large',
      ...state,
    });
    const tiles = SYMBOL_TINTS.map((tint) =>
      renderBnSymbol({ tint, mark: tint.slice(0, 1).toUpperCase(), force: state.force }),
    ).join('');
    const badges = ['red', 'blue', 'green', 'orange']
      .map((tint) => renderBnBadge('3', { tint, force: state.force }))
      .join('');
    return row(
      label,
      [
        buttons,
        destructive,
        tiles,
        badges,
        renderBnSwitch({ label: 'Off', force: state.force, disabled: state.disabled }),
        renderBnCheckbox({ label: 'Check', force: state.force, disabled: state.disabled }),
        renderBnRadio({
          label: 'Radio',
          name: `atom-${label}-${tone}`,
          force: state.force,
          disabled: state.disabled,
        }),
        renderBnSlider({ label: 'Level', force: state.force, disabled: state.disabled }),
        renderBnDial({ label: 'Dial', force: state.force, disabled: state.disabled }),
        renderBnStepper({
          label: 'Count',
          value: 2,
          force: state.force,
          disabled: state.disabled,
        }),
        renderBnProgress({ value: 0.4, force: state.force }),
        renderBnSpinner({ force: state.force }),
        renderBnField({
          label: 'Name',
          placeholder: 'Title',
          force: state.force,
          disabled: state.disabled,
        }),
        renderBnSearch({ label: `Find ${label}`, force: state.force, disabled: state.disabled }),
        renderBnColorWell({ force: state.force, disabled: state.disabled }),
        renderBnPageControl({
          count: 3,
          current: 1,
          force: state.force,
          disabled: state.disabled,
        }),
        renderBnAppIcon({ monogram: 'Bn', label: 'BaseNative', force: state.force }),
      ].join(''),
    );
  }).join('');
}

function moleculeStates() {
  return STATE_COLUMNS.map(([label, state]) => {
    if (state.pick === 'selected') {
      return row(
        label,
        [
          renderBnSegmented({
            size: 'large',
            segments: [
              { label: 'Days', value: 'd', selected: true },
              { label: 'Weeks', value: 'w' },
            ],
          }),
          renderBnDatePicker({ inline: true, open: true, selected: '4', month: 'June' }),
        ].join(''),
      );
    }
    return row(
      label,
      [
        renderBnPopupButton({
          label: 'Menu',
          items: [{ label: 'One', value: '1' }],
          ...state,
        }),
        renderBnPopupButton({
          label: 'Native',
          native: true,
          items: [{ label: 'One', value: '1' }],
          ...state,
        }),
        renderBnPulldownButton({ label: 'Actions', items: [{ label: 'Copy' }], ...state }),
        renderBnSegmented({
          size: 'large',
          segments: [
            { label: 'Days', value: 'd', selected: true },
            { label: 'Weeks', value: 'w' },
          ],
          ...state,
        }),
        renderBnCombobox({ label: 'City', items: [{ label: 'One' }], ...state }),
        renderBnList({
          grouped: true,
          rows: [{ title: 'Row', detail: 'Detail' }],
          force: state.force,
        }),
        renderBnList({
          grouped: true,
          rows: [{ title: 'Wi-Fi', tint: 'blue', mark: 'W' }],
          force: state.force,
        }),
        renderBnMenu({
          inline: true,
          label: 'Menu',
          items: [{ label: 'Copy', force: state.force }],
          force: state.force,
        }),
        renderBnContextMenu({
          inline: true,
          items: [{ label: 'Copy', force: state.force }],
          force: state.force,
        }),
        renderBnPopover({ inline: true, label: 'More', body: 'Note', ...state }),
        renderBnTooltip({ label: 'Info', tip: 'Hint', inline: true, ...state }),
        renderBnDisclosure({ label: 'Open', body: 'Body', open: true, ...state }),
        renderBnDisclosure({ label: 'Closed', body: 'Body', ...state }),
        renderBnIndexBar({ letters: ['A', 'B'], label: `Index ${label}`, ...state }),
        renderBnMetric({ value: '12', label: 'Items', ...state }),
        renderBnColorPicker({ inline: true, open: true, label: 'Accent', force: state.force }),
        renderBnDatePicker({
          inline: true,
          open: true,
          selected: '4',
          month: 'June',
          force: state.force,
        }),
      ].join(''),
    );
  }).join('');
}

function materialStates() {
  const names = ['ultrathin', 'thin', 'sm', 'medium', 'lg', 'thick', 'ultrathick', 'opaque'];
  return STATE_COLUMNS.filter(([, state]) => state.pick !== 'selected')
    .map(([label, state]) =>
      row(
        label,
        names.map((name) => renderBnMaterial({ name, label: name, force: state.force })).join(''),
      ),
    )
    .join('');
}

function organismStates() {
  return STATE_COLUMNS.map(([label, state]) => {
    if (state.pick === 'selected') {
      return row(
        label,
        [
          renderBnTabBar({
            label: 'Tabs selected',
            tabs: [{ label: 'Today', current: true }, { label: 'Library' }],
          }),
          renderBnSidebar({
            inline: true,
            label: 'Side selected',
            items: [{ label: 'Inbox', current: true }, { label: 'Archive' }],
          }),
          renderBnDock({
            items: [
              { label: 'Home', href: '/', current: true },
              { label: 'Docs', href: '/docs' },
            ],
          }),
          renderBnTable({
            columns: ['Name'],
            rows: [['Notes'], ['Mail']],
            selected: 0,
          }),
        ].join(''),
      );
    }
    return row(
      label,
      [
        renderBnNavBar({
          title: 'Title',
          heading: 'h2',
          label: `Nav large ${label}`,
          ...state,
        }),
        renderBnNavBar({
          title: 'Title',
          large: false,
          heading: 'h2',
          label: `Nav ${label}`,
          ...state,
        }),
        renderBnTabBar({
          label: `Tabs ${label}`,
          tabs: [{ label: 'Today', current: true }, { label: 'Library' }],
          ...state,
        }),
        renderBnTabBar({
          label: `More ${label}`,
          barLimit: 1,
          tabs: [{ label: 'Today', current: true }, { label: 'Library' }, { label: 'Search' }],
          ...state,
        }),
        renderBnToolbar({ label: `Tools ${label}`, items: [{ label: 'Edit' }], ...state }),
        renderBnSidebar({
          inline: true,
          label: `Side ${label}`,
          items: [{ label: 'Inbox', current: true }, { label: 'Archive' }],
          ...state,
        }),
        renderBnAlert({
          inline: true,
          open: true,
          title: `Alert ${label}`,
          message: 'Save this document?',
          ...state,
        }),
        renderBnSheet({
          inline: true,
          open: true,
          title: `Sheet ${label}`,
          body: 'Details',
          ...state,
        }),
        renderBnNotification({ title: 'Notice', message: label, ...state }),
        renderBnMenubar({ items: [{ label: 'File' }, { label: 'Edit' }], ...state }),
        renderBnDialog({
          inline: true,
          open: true,
          title: `Dialog ${label}`,
          message: 'Keep this?',
          ...state,
        }),
        renderBnActionSheet({
          inline: true,
          open: true,
          title: `Actions ${label}`,
          actions: [{ label: 'Copy' }],
          ...state,
        }),
        renderBnShareSheet({
          inline: true,
          open: true,
          actions: [{ label: 'Copy', glyph: 'C' }],
          ...state,
        }),
        renderBnInspector({
          inline: true,
          title: 'Inspector',
          sections: [{ label: 'Type', fields: [{ label: 'Name', placeholder: 'Title' }] }],
          ...state,
        }),
        renderBnCardGrid({
          cards: [{ value: '12', label: 'Items' }],
          ...state,
        }),
        renderBnCardGrid({
          cards: [{ title: 'Notes', body: 'Widget' }],
          ...state,
        }),
        renderBnHero({
          eyebrow: 'Runtime',
          title: 'BaseNative',
          heading: 'h2',
          lede: 'A glass window header.',
          actions: [{ label: 'Continue', variant: 'prominent' }],
          ...state,
        }),
        renderBnFooter({ note: 'BaseNative', links: [{ label: 'Docs', href: '/docs' }], ...state }),
        renderBnWindow({ title: 'Document', body: 'Body', ...state }),
        renderBnForm({
          fields: [{ label: 'Name', placeholder: 'Title' }],
          submitLabel: 'Save',
          ...state,
        }),
        renderBnGroup({ label: 'Group', body: 'Grouped', ...state }),
        renderBnEmptyState({ title: 'Empty', description: 'Nothing here.', ...state }),
        renderBnWidget({ title: 'Widget', body: 'Today', ...state }),
        renderBnScroll({ body: 'Scrollable notes.', ...state }),
        renderBnImageWell({ label: 'Image', ...state }),
        renderBnInputAccessory({ keys: ['space', 'return'], ...state }),
        renderBnDock({
          items: [
            { label: 'Home', href: '/', current: true },
            { label: 'Docs', href: '/docs' },
          ],
          ...state,
        }),
        renderBnTable({
          columns: ['Name'],
          rows: [['Notes'], ['Mail']],
          selected: 0,
          ...state,
        }),
      ].join(''),
    );
  }).join('');
}

function iosBody(tone = 'light') {
  return [
    row('Buttons', buttons()),
    row(
      'Pop-up and pull-down',
      renderBnPopupButton({
        label: 'Options',
        inline: false,
        items: [{ label: 'One' }, { label: 'Two' }],
      }) +
        renderBnPulldownButton({
          label: 'Actions',
          items: [{ label: 'Copy' }, { label: 'Share' }],
        }),
    ),
    row(
      'Segmented',
      renderBnSegmented({
        segments: [
          { label: 'Days', value: 'd', selected: true },
          { label: 'Weeks', value: 'w' },
          { label: 'Months', value: 'm' },
        ],
      }),
    ),
    row(
      'Switch, checkbox, radio',
      renderBnSwitch({ label: 'Wi-Fi', checked: true }) +
        renderBnCheckbox({ label: 'Remember', checked: true }) +
        renderBnRadio({ label: 'Option', name: 'ios-radio', checked: true }),
    ),
    row(
      'Slider and stepper',
      renderBnSlider({ label: 'Volume', value: 40 }) +
        renderBnStepper({ value: 3, label: 'Count' }),
    ),
    row(
      'Progress',
      renderBnProgress({ value: 0.4, label: 'Loading' }) + renderBnSpinner({ label: 'Busy' }),
    ),
    row(
      'Fields',
      renderBnField({ label: 'Name', placeholder: 'Required' }) +
        renderBnSearch({ label: `Search iOS ${tone}` }),
    ),
    row(
      'Color and date',
      renderBnColorWell({ value: '#0088ff' }) +
        renderBnColorPicker({ inline: true, label: 'Accent' }) +
        renderBnDatePicker({ inline: true, selected: '4', month: 'June' }),
    ),
    row(
      'List',
      renderBnList({
        grouped: true,
        rows: [
          { title: 'Airplane Mode', detail: 'Off' },
          { title: 'Wi-Fi', detail: 'Home', swipe: true },
        ],
      }),
    ),
    row(
      'Menu',
      renderBnMenu({
        inline: true,
        items: [{ label: 'Reply' }, { label: 'Forward' }, { label: 'Delete' }],
      }) + renderBnContextMenu({ inline: true, items: [{ label: 'Copy' }, { label: 'Look Up' }] }),
    ),
    row(
      'Alert and action sheet',
      renderBnAlert({
        inline: true,
        open: true,
        title: 'A Short Title Is Best',
        message: 'A message should be a short, complete sentence.',
        actions: [
          { label: 'Option', role: 'none' },
          { label: 'Delete', role: 'destructive' },
        ],
      }) +
        renderBnActionSheet({
          inline: true,
          open: true,
          title: 'A Short Title Is Best',
          message: 'A message should be a short, complete sentence.',
          actions: [
            { label: 'Delete', role: 'destructive' },
            { label: 'Keep', role: 'none' },
          ],
        }),
    ),
    row(
      'Sheet, popover, share',
      renderBnSheet({
        inline: true,
        open: true,
        title: 'Sheet',
        body: 'Grabber and corner radii come from the dimension tokens.',
      }) +
        renderBnPopover({
          inline: true,
          label: 'Info',
          body: 'Popover corner radius is a dimension token.',
        }) +
        renderBnShareSheet({
          inline: true,
          open: true,
          actions: [
            { label: 'Copy', glyph: 'C' },
            { label: 'Mail', glyph: 'M' },
          ],
        }),
    ),
    row(
      'Page control and tabs',
      renderBnPageControl({ count: 5, current: 2 }) +
        renderBnTabBar({
          label: `iOS tabs ${tone}`,
          tabs: [{ label: 'Today', current: true }, { label: 'Library' }, { label: 'Search' }],
        }),
    ),
    row(
      'Toolbar, sidebar, menu bar',
      renderBnToolbar({
        label: `iOS toolbar ${tone}`,
        items: [{ label: 'Edit' }, { label: 'Done' }],
      }) +
        renderBnSidebar({
          inline: true,
          label: `iOS sidebar ${tone}`,
          items: [{ label: 'Inbox', current: true }, { label: 'Archive' }],
        }) +
        renderBnMenubar({ items: [{ label: '9:41' }, { label: 'LTE' }] }),
    ),
    row(
      'Notification and empty',
      renderBnNotification({ title: 'Messages', message: 'New message' }) +
        renderBnEmptyState({ title: 'No Messages', description: 'New messages will appear here.' }),
    ),
    row(
      'App icon, widget, accessory',
      renderBnAppIcon({ monogram: 'B', label: 'BaseNative' }) +
        renderBnWidget({ title: 'Weather', body: '72°' }) +
        renderBnInputAccessory({ keys: ['ABC', 'space', 'return'] }),
    ),
  ].join('');
}

function macosBody(tone = 'light') {
  return [
    row(
      'Buttons',
      renderBnButton('Save', { variant: 'prominent', size: 'medium' }) +
        renderBnButton('Cancel', { variant: 'bordered', size: 'medium' }) +
        renderBnButton('More', { variant: 'borderless', size: 'medium' }) +
        renderBnButton('Delete', { variant: 'prominent', size: 'medium', destructive: true }),
    ),
    row(
      'Pop-up, pull-down, combo',
      renderBnPopupButton({
        native: true,
        label: 'Format',
        items: [
          { label: 'Plain', value: 'plain', selected: true },
          { label: 'Rich', value: 'rich' },
        ],
      }) +
        renderBnPulldownButton({ label: 'Share', items: [{ label: 'Mail' }, { label: 'Notes' }] }) +
        renderBnCombobox({ label: 'City', items: [{ label: 'Cupertino' }, { label: 'Austin' }] }),
    ),
    row(
      'Segmented',
      renderBnSegmented({
        size: 'small',
        segments: [
          { label: 'Day', value: 'd', selected: true },
          { label: 'Week', value: 'w' },
          { label: 'Month', value: 'm' },
        ],
      }),
    ),
    row(
      'Toggles',
      renderBnCheckbox({ label: 'Enabled', checked: true }) +
        renderBnRadio({ label: 'Selected', name: 'mac-radio', checked: true }) +
        renderBnSwitch({ label: 'On', checked: true }),
    ),
    row(
      'Slider, dial, stepper',
      renderBnSlider({ label: 'Level', value: 60 }) +
        renderBnDial({ label: 'Angle', value: 30 }) +
        renderBnStepper({ value: 2, label: 'Qty' }),
    ),
    row(
      'Fields and search',
      renderBnField({ label: 'Name', placeholder: 'Name' }) +
        renderBnSearch({ label: `Search macOS ${tone}`, placeholder: 'Search' }) +
        renderBnColorWell({ label: 'Color', value: '#0088ff' }),
    ),
    row(
      'Progress',
      renderBnProgress({ value: 0.65, label: 'Copying' }) + renderBnSpinner({ label: 'Working' }),
    ),
    row(
      'Table',
      renderBnTable({
        columns: ['Name', 'Kind'],
        rows: [
          ['Report', 'PDF'],
          ['Notes', 'Text'],
        ],
        selected: 0,
      }),
    ),
    row(
      'Menu and tooltip',
      renderBnMenu({
        inline: true,
        items: [{ label: 'New' }, { label: 'Open' }, { label: 'Close' }],
      }) + renderBnTooltip({ label: 'Help', tip: 'Shows more detail' }),
    ),
    row(
      'Alert and dialog',
      renderBnAlert({
        inline: true,
        open: true,
        title: 'Do you want to save?',
        message: 'Your changes will be lost if you don’t save.',
        actions: [
          { label: 'Don’t Save', role: 'none' },
          { label: 'Save', role: 'default' },
        ],
      }) +
        renderBnDialog({
          inline: true,
          open: true,
          title: 'Settings',
          message: 'Choose a folder.',
          actions: [{ label: 'Cancel' }, { label: 'Choose' }],
        }),
    ),
    row(
      'Disclosure, form, group',
      renderBnDisclosure({ open: true, label: 'Advanced', body: 'More options.' }) +
        renderBnGroup({ label: 'Account', body: 'Name and email.' }) +
        renderBnForm({
          fields: [{ label: 'Email', placeholder: 'name@example.com' }],
          submitLabel: 'Save',
        }),
    ),
    row(
      'Window, sidebar, toolbar',
      renderBnWindow({ title: 'Document', body: 'Window background is the kit token.' }) +
        renderBnSidebar({
          inline: true,
          label: `macOS sidebar ${tone}`,
          items: [{ label: 'Recents', current: true }, { label: 'Shared' }],
        }) +
        renderBnToolbar({
          label: `macOS toolbar ${tone}`,
          items: [{ label: 'Back' }, { label: 'Forward' }],
        }),
    ),
    row(
      'Scroll, image well, notification',
      renderBnScroll({
        body: 'Scrollbar colour is Miscellaneous/Scrollbar. The track itself is native.',
      }) +
        renderBnScrollbar({ label: 'Position', value: 35 }) +
        renderBnScrollbar({ orientation: 'horizontal', label: 'Horizontal position', value: 60 }) +
        renderBnRefraction({ label: 'Liquid glass', body: 'Sheen over the brand glow.' }) +
        renderBnImageWell({ label: 'Picture' }) +
        renderBnNotification({ title: 'Export complete', message: 'The file is in Downloads.' }),
    ),
  ].join('');
}

function usage(label, html) {
  return `<section data-bn="bn-catalog-row"><h3 data-bn="bn-catalog-label">${label}</h3><figure data-bn="bn-catalog-demo">${html}</figure><pre data-bn="bn-catalog-usage" tabindex="0"><code>${escapeHtml(html)}</code></pre></section>`;
}

/** Organisms. Copy the semantic HTML under each one. */
function organismRows() {
  const list = renderBnList({
    grouped: true,
    label: 'Settings',
    footer: 'Inset grouped list.',
    rows: [
      { title: 'Wi-Fi', value: 'Home', chevron: true, tint: 'blue', mark: 'W' },
      { title: 'Bluetooth', detail: 'On', tint: 'teal', mark: 'B' },
    ],
  });
  const hero = renderBnHero({
    eyebrow: 'Runtime',
    title: 'BaseNative',
    heading: 'h2',
    lede: 'A glass window header composed from the hero organism.',
    actions: [
      { label: 'Continue', variant: 'prominent' },
      { label: 'Cancel', variant: 'bordered' },
    ],
  });
  return [
    usage(
      'Navigation bar',
      renderBnNavBar({
        title: 'Settings',
        heading: 'h2',
        back: { label: 'Back', href: '/' },
        subtitle: 'Large Title',
      }),
    ),
    usage('Hero', hero),
    usage('Inset grouped list', list),
    usage(
      'Card grid',
      renderBnCardGrid({
        cards: [
          { value: '9.9KB', label: 'Runtime', detail: 'gzip' },
          { value: '45', label: 'Packages', detail: 'public' },
          { title: 'Notes', body: 'Widget' },
        ],
      }),
    ),
    usage(
      'Inspector',
      renderBnInspector({
        inline: true,
        title: 'Inspector',
        sections: [{ label: 'Type', fields: [{ label: 'Name', placeholder: 'Title' }] }],
      }),
    ),
    usage(
      'Dock',
      renderBnDock({
        items: [
          { label: 'Home', href: '/', current: true },
          { label: 'Docs', href: '/docs' },
        ],
      }),
    ),
    usage(
      'Footer',
      renderBnFooter({ note: 'BaseNative', links: [{ label: 'Docs', href: '/docs' }] }),
    ),
    row(
      'Badge and symbol',
      renderBnBadge('3') +
        renderBnSymbol({ tint: 'orange', mark: 'A' }) +
        renderBnMetric({ value: '72', label: 'Degrees', detail: 'Today' }) +
        renderBnIndexBar({ letters: ['A', 'B', 'C'], label: 'Index sample' }),
    ),
  ].join('');
}

/** Page compositions. Each piece is an existing organism renderer. */
function templateList() {
  return [
    renderBnNavBar({
      title: 'Library',
      large: false,
      heading: 'h2',
      label: 'Template library',
    }),
    renderBnSearch({ label: 'Template library search' }),
    renderBnList({
      grouped: true,
      rows: [
        { title: 'Airplane Mode', detail: 'Off' },
        { title: 'Wi-Fi', detail: 'Home' },
      ],
    }),
    renderBnTabBar({
      label: 'Template library tabs',
      tabs: [{ label: 'Today', current: true }, { label: 'Library' }],
    }),
  ].join('');
}

function templateWindow() {
  return renderBnWindow({
    title: 'Document',
    content: [
      renderBnToolbar({
        label: 'Template window toolbar',
        items: [{ label: 'Back' }, { label: 'Forward' }],
      }),
      renderBnSidebar({
        inline: true,
        label: 'Template window sidebar',
        items: [{ label: 'Recents', current: true }, { label: 'Shared' }],
      }),
      renderBnList({
        grouped: true,
        rows: [{ title: 'Notes', detail: 'Today' }],
      }),
    ].join(''),
  });
}

function templateSheet() {
  return renderBnSheet({
    inline: true,
    open: true,
    title: 'New item',
    label: 'Template sheet',
    content:
      renderBnField({ label: 'Name', placeholder: 'Title' }) +
      renderBnButton('Save', { variant: 'prominent' }),
  });
}

function previewAtomStates() {
  const columns = [
    ['Rest', {}],
    ['Hover', { force: 'hover' }],
    ['Pressed', { force: 'active' }],
    ['Focus', { force: 'focus' }],
    ['Disabled', { force: 'disabled', disabled: true }],
  ];
  return columns
    .map(([label, state]) =>
      row(
        label,
        [
          renderBnButton('Play', { variant: 'prominent', size: 'medium', ...state }),
          renderBnButton('Glass', { variant: 'glass', size: 'medium', ...state }),
          renderBnSymbol({ tint: 'blue', mark: 'A', force: state.force }),
          renderBnBadge('3', { force: state.force }),
          renderBnSwitch({
            label: 'On',
            checked: true,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnCheckbox({
            label: 'Check',
            checked: true,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnRadio({
            label: 'Radio',
            checked: true,
            name: `atom-${label}`,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnSlider({ label: 'Level', force: state.force, disabled: state.disabled }),
          renderBnDial({ label: 'Dial', force: state.force, disabled: state.disabled }),
          renderBnStepper({
            label: 'Count',
            value: 2,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnProgress({ value: 0.4, force: state.force }),
          renderBnSpinner({ force: state.force }),
          renderBnField({
            label: 'Name',
            placeholder: 'Title',
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnSearch({
            label: `Find ${label}`,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnColorWell({ force: state.force, disabled: state.disabled }),
          renderBnPageControl({
            count: 3,
            current: 1,
            force: state.force,
            disabled: state.disabled,
          }),
          renderBnAppIcon({ monogram: 'Bn', label: 'BaseNative', force: state.force }),
        ].join(''),
      ),
    )
    .join('');
}

function previewMoleculeStates() {
  const columns = [
    ['Rest', {}],
    ['Hover', { force: 'hover' }],
    ['Pressed', { force: 'active' }],
    ['Focus', { force: 'focus' }],
    ['Disabled', { force: 'disabled', disabled: true }],
  ];
  return columns
    .map(([label, state]) =>
      row(
        label,
        [
          renderBnPopupButton({
            label: 'Options',
            native: true,
            items: [{ label: 'One', value: '1' }],
            ...state,
          }),
          renderBnPulldownButton({ label: 'Actions', items: [{ label: 'Copy' }], ...state }),
          renderBnSegmented({
            size: 'large',
            segments: [
              { label: 'Days', value: 'd', selected: true },
              { label: 'Weeks', value: 'w' },
            ],
            ...state,
          }),
          renderBnCombobox({ label: 'City', items: [{ label: 'One' }], ...state }),
          renderBnList({
            grouped: true,
            rows: [{ title: 'Row', detail: 'Detail' }],
            force: state.force,
          }),
          renderBnMenu({
            inline: true,
            label: 'Menu',
            items: [{ label: 'Copy', force: state.force }],
            force: state.force,
          }),
          renderBnPopover({ inline: true, label: 'More', body: 'Note', ...state }),
          renderBnTooltip({ label: 'Info', tip: 'Hint', ...state }),
          renderBnDisclosure({ label: 'Details', body: 'Body', open: true, ...state }),
          renderBnIndexBar({ letters: ['A', 'B'], label: `Index ${label}`, ...state }),
          renderBnMetric({ value: '12', label: 'Items', ...state }),
        ].join(''),
      ),
    )
    .join('');
}

function previewOrganismStates() {
  const columns = [
    ['Rest', {}],
    ['Hover', { force: 'hover' }],
    ['Pressed', { force: 'active' }],
    ['Focus', { force: 'focus' }],
    ['Disabled', { force: 'disabled' }],
  ];
  return columns
    .map(([label, state]) =>
      row(
        label,
        [
          renderBnNavBar({
            title: 'Title',
            large: false,
            heading: 'h2',
            label: `Nav ${label}`,
            ...state,
          }),
          renderBnTabBar({
            label: `Tabs ${label}`,
            tabs: [{ label: 'Today', current: true }, { label: 'Library' }],
            ...state,
          }),
          renderBnToolbar({
            label: `Tools ${label}`,
            items: [{ label: 'Edit' }],
            ...state,
          }),
          renderBnSidebar({
            inline: true,
            label: `Side ${label}`,
            items: [{ label: 'Inbox', current: true }],
            ...state,
          }),
          renderBnAlert({
            inline: true,
            title: `Alert ${label}`,
            message: 'Save this document?',
            ...state,
          }),
          renderBnSheet({
            inline: true,
            title: `Sheet ${label}`,
            body: 'Details',
            ...state,
          }),
          renderBnNotification({ title: 'Notice', message: label, ...state }),
        ].join(''),
      ),
    )
    .join('');
}

function previewStages() {
  const materials = ['ultrathin', 'thin', 'sm', 'medium', 'lg', 'thick', 'ultrathick', 'opaque']
    .map((name) => renderBnMaterial({ name, label: name }))
    .join('');
  return [
    stage('Materials', 'data-bn-platform="ios"', row('Liquid Glass', materials)),
    stage('Atom states', 'data-bn-platform="ios"', previewAtomStates()),
    stage('Molecule states', 'data-bn-platform="ios"', previewMoleculeStates()),
    stage('Organism states', 'data-bn-platform="ios"', previewOrganismStates()),
  ].join('');
}

function measuredStages() {
  return [
    stage('Materials', 'data-bn-platform="ios" data-theme="light"', materialStates()),
    stage('Materials', 'data-bn-platform="ios" data-theme="dark"', materialStates()),
    stage('Atom states', 'data-bn-platform="ios" data-theme="light"', atomStates('light')),
    stage('Atom states', 'data-bn-platform="ios" data-theme="dark"', atomStates('dark')),
    stage('Molecule states', 'data-bn-platform="ios" data-theme="light"', moleculeStates()),
    stage('Molecule states', 'data-bn-platform="ios" data-theme="dark"', moleculeStates()),
    stage('Organism states', 'data-bn-platform="ios" data-theme="light"', organismStates()),
    stage('Organism states', 'data-bn-platform="ios" data-theme="dark"', organismStates()),
  ].join('');
}

/** Catalog sections, without a document shell. */
export function catalogBody(options = {}) {
  resetIds();
  const notes = VERIFY.map(
    (item) => `<li><strong>${item.topic}.</strong> ${item.detail}</li>`,
  ).join('');
  const typeSample = '<p data-bn="bn-catalog-type">Large Title at xxxLarge</p>';
  const title = options.omitTitle ? '' : '<h1>Platform catalog</h1>\n';
  return `<header data-bn="bn-catalog-header">
${title}<p>Atoms, molecules, organisms, and templates. Materials are translated from MIT stylesheets. Copy the semantic HTML under each organism.</p>
</header>
${options.measure ? measuredStages() : previewStages()}
${stage('Templates', 'data-bn-platform="ios"', row('List', templateList()) + row('Sheet', templateSheet()))}
${stage('macOS template', 'data-bn-platform="macos" data-bn-control="medium"', row('Window', templateWindow()))}
${stage('Organisms', 'data-bn-platform="ios"', organismRows())}
${stage('iOS', 'data-bn-platform="ios"', iosBody('light'))}
${stage('iOS dark', 'data-bn-platform="ios" data-theme="dark"', iosBody('dark'))}
${stage('iOS increased contrast', 'data-bn-platform="ios" data-bn-contrast="more"', row('Prominent and secondary label', renderBnButton('Continue') + '<p data-bn="bn-catalog-quiet">Secondary label</p>'))}
${stage('Dynamic Type xxxLarge', 'data-bn-platform="ios" data-bn-type="xxxlarge"', typeSample)}
${stage('macOS', 'data-bn-platform="macos" data-bn-control="medium"', macosBody('light'))}
${stage('macOS dark', 'data-bn-platform="macos" data-bn-control="medium" data-theme="dark"', macosBody('dark'))}
${stage('macOS Large control', 'data-bn-platform="macos" data-bn-control="large"', row('Capsule button', renderBnButton('Save', { variant: 'prominent' })))}
<section data-bn="bn-catalog-stage">
<h2 data-bn="bn-catalog-heading">What the screenshots could not settle</h2>
<ul data-bn="bn-catalog-verify">${notes}</ul>
</section>`;
}

/** Full catalog document. */
export function catalogPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BaseNative platform catalog</title>
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/materials.css">
<link rel="stylesheet" href="/components.css">
<link rel="stylesheet" href="/catalog.css">
</head>
<body data-bn="bn-catalog" data-bn-wallpaper="true">
${catalogBody()}
<script type="module" src="/src/platform.js"></script>
</body>
</html>`;
}
