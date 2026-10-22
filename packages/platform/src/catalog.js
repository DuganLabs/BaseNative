/**
 * One page that shows every control, both platforms, light and dark.
 * @returns {string} HTML document
 */
import { resetIds } from './ids.js';
import { VERIFY } from './verify.js';
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

function iosBody() {
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
        renderBnSearch({ label: 'Search' }),
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
          tabs: [{ label: 'Today', current: true }, { label: 'Library' }, { label: 'Search' }],
        }),
    ),
    row(
      'Toolbar, sidebar, menu bar',
      renderBnToolbar({ items: [{ label: 'Edit' }, { label: 'Done' }] }) +
        renderBnSidebar({ items: [{ label: 'Inbox', current: true }, { label: 'Archive' }] }) +
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

function macosBody() {
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
        renderBnSearch({ label: 'Search', placeholder: 'Search' }) +
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
        renderBnSidebar({ items: [{ label: 'Recents', current: true }, { label: 'Shared' }] }) +
        renderBnToolbar({ items: [{ label: 'Back' }, { label: 'Forward' }] }),
    ),
    row(
      'Scroll, image well, notification',
      renderBnScroll({
        body: 'Scrollbar colour is Miscellaneous/Scrollbar. The track itself is native.',
      }) +
        renderBnImageWell({ label: 'Picture' }) +
        renderBnNotification({ title: 'Export complete', message: 'The file is in Downloads.' }),
    ),
  ].join('');
}

/** Full catalog document. */
export function catalogPage() {
  resetIds();
  const notes = VERIFY.map(
    (item) => `<li><strong>${item.topic}.</strong> ${item.detail}</li>`,
  ).join('');
  const typeSample = '<p data-bn="bn-catalog-type">Large Title at xxxLarge</p>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BaseNative platform catalog</title>
<link rel="stylesheet" href="/tokens.css">
<link rel="stylesheet" href="/components.css">
<link rel="stylesheet" href="/catalog.css">
</head>
<body data-bn="bn-catalog">
<header data-bn="bn-catalog-header">
<h1>Apple 27 platform catalog</h1>
<p>Kit values from the iOS and iPadOS 27 and macOS 27 Figma files. Increased contrast is derived. Components without a captured page were checked against the page screenshots, the tokens, and the HIG.</p>
</header>
${stage('iOS light', 'data-bn-platform="ios" data-theme="light"', iosBody())}
${stage('iOS dark', 'data-bn-platform="ios" data-theme="dark"', iosBody())}
${stage('iOS increased contrast', 'data-bn-platform="ios" data-theme="light" data-bn-contrast="more"', row('Prominent and secondary label', renderBnButton('Continue') + '<p data-bn="bn-catalog-quiet">Secondary label</p>'))}
${stage('Dynamic Type xxxLarge', 'data-bn-platform="ios" data-bn-type="xxxlarge"', typeSample)}
${stage('macOS light', 'data-bn-platform="macos" data-bn-control="medium" data-theme="light"', macosBody())}
${stage('macOS dark', 'data-bn-platform="macos" data-bn-control="medium" data-theme="dark"', macosBody())}
${stage('macOS Large control', 'data-bn-platform="macos" data-bn-control="large" data-theme="light"', row('Capsule button', renderBnButton('Save', { variant: 'prominent' })))}
<section data-bn="bn-catalog-stage">
<h2 data-bn="bn-catalog-heading">What the screenshots could not settle</h2>
<ul data-bn="bn-catalog-verify">${notes}</ul>
</section>
<script type="module" src="/src/platform.js"></script>
</body>
</html>`;
}
