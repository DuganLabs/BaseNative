import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resetIds } from './ids.js';
import * as ui from './components.js';

const samples = [
  [
    'renderBnButton',
    () => ui.renderBnButton('Play', { variant: 'prominent', labelStyle: 'both', icon: '▶' }),
  ],
  ['renderBnPopupButton', () => ui.renderBnPopupButton({ label: 'More', items: [{ label: 'A' }] })],
  ['renderBnPulldownButton', () => ui.renderBnPulldownButton({ items: [{ label: 'A' }] })],
  [
    'renderBnSegmented',
    () => ui.renderBnSegmented({ segments: [{ label: 'A', value: 'a', selected: true }] }),
  ],
  ['renderBnSwitch', () => ui.renderBnSwitch({ label: 'On', checked: true })],
  ['renderBnCheckbox', () => ui.renderBnCheckbox({ label: 'Yes' })],
  ['renderBnRadio', () => ui.renderBnRadio({ label: 'Yes', name: 'n' })],
  ['renderBnSlider', () => ui.renderBnSlider({ label: 'Vol' })],
  ['renderBnDial', () => ui.renderBnDial({ label: 'Turn' })],
  ['renderBnStepper', () => ui.renderBnStepper({ value: 1 })],
  ['renderBnProgress', () => ui.renderBnProgress({ value: 0.2 })],
  ['renderBnSpinner', () => ui.renderBnSpinner()],
  ['renderBnField', () => ui.renderBnField({ label: 'Name' })],
  ['renderBnSearch', () => ui.renderBnSearch()],
  ['renderBnCombobox', () => ui.renderBnCombobox({ items: [{ label: 'A' }] })],
  ['renderBnColorWell', () => ui.renderBnColorWell()],
  ['renderBnColorPicker', () => ui.renderBnColorPicker({ inline: true })],
  ['renderBnDatePicker', () => ui.renderBnDatePicker({ inline: true, selected: '1' })],
  ['renderBnList', () => ui.renderBnList({ rows: [{ title: 'Row', detail: 'On' }] })],
  ['renderBnListRow', () => ui.renderBnListRow({ title: 'Row' })],
  ['renderBnTable', () => ui.renderBnTable({ columns: ['A'], rows: [['1']] })],
  ['renderBnMenu', () => ui.renderBnMenu({ inline: true, items: ['One'] })],
  ['renderBnMenuItem', () => ui.renderBnMenuItem('One')],
  ['renderBnContextMenu', () => ui.renderBnContextMenu({ inline: true, items: ['Copy'] })],
  [
    'renderBnActionSheet',
    () =>
      ui.renderBnActionSheet({
        inline: true,
        title: 'T',
        actions: [{ label: 'Go', role: 'none' }],
      }),
  ],
  [
    'renderBnShareSheet',
    () => ui.renderBnShareSheet({ inline: true, actions: [{ label: 'Copy' }] }),
  ],
  ['renderBnAlert', () => ui.renderBnAlert({ inline: true, title: 'T', message: 'M' })],
  ['renderBnDialog', () => ui.renderBnDialog({ inline: true, title: 'T' })],
  ['renderBnSheet', () => ui.renderBnSheet({ inline: true, title: 'T' })],
  ['renderBnPopover', () => ui.renderBnPopover({ inline: true, body: 'Hi' })],
  ['renderBnTooltip', () => ui.renderBnTooltip({ tip: 'Hi' })],
  ['renderBnNotification', () => ui.renderBnNotification({ title: 'T', message: 'M' })],
  ['renderBnPageControl', () => ui.renderBnPageControl({ count: 3, current: 1 })],
  ['renderBnTabBar', () => ui.renderBnTabBar({ tabs: [{ label: 'Today', current: true }] })],
  ['renderBnToolbar', () => ui.renderBnToolbar({ items: [{ label: 'Edit' }] })],
  ['renderBnSidebar', () => ui.renderBnSidebar({ items: [{ label: 'Inbox', current: true }] })],
  ['renderBnWindow', () => ui.renderBnWindow({ title: 'Doc' })],
  ['renderBnMenubar', () => ui.renderBnMenubar({ items: [{ label: 'File' }] })],
  ['renderBnDisclosure', () => ui.renderBnDisclosure({ label: 'More', body: 'Body' })],
  ['renderBnForm', () => ui.renderBnForm({ fields: [{ label: 'Email' }] })],
  ['renderBnGroup', () => ui.renderBnGroup({ label: 'Group', body: 'Body' })],
  ['renderBnImageWell', () => ui.renderBnImageWell()],
  ['renderBnScroll', () => ui.renderBnScroll({ body: 'Scroll' })],
  ['renderBnInputAccessory', () => ui.renderBnInputAccessory()],
  ['renderBnEmptyState', () => ui.renderBnEmptyState({ title: 'Empty', description: 'None' })],
  ['renderBnAppIcon', () => ui.renderBnAppIcon({ monogram: 'B' })],
  ['renderBnWidget', () => ui.renderBnWidget({ title: 'W', body: 'B' })],
  ['renderBnMaterial', () => ui.renderBnMaterial({ name: 'thick', label: 'Thick' })],
];

test('every control emits its bn contract and no class or style', () => {
  resetIds();
  assert.ok(samples.length >= 45);
  for (const [name, render] of samples) {
    const html = render();
    assert.match(html, /data-bn="bn-/, name);
    assert.equal(html.includes(' class='), false, name);
    assert.equal(html.includes(' style='), false, name);
  }
});

test('text is escaped', () => {
  const html = ui.renderBnButton('<script>');
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('tab bar overflow is a tab, not a disclosure', () => {
  resetIds();
  const html = ui.renderBnTabBar({
    id: 'tabs',
    barLimit: 1,
    tabs: [
      { label: 'Home', href: '/', current: true, icon: '<svg></svg>' },
      { label: 'Docs', href: '/docs' },
    ],
  });
  assert.equal(html.includes('<details'), false);
  assert.equal(html.includes('<summary'), false);
  assert.match(html, /popovertarget="tabs-more"/);
  assert.match(html, /data-bn="bn-tab"/);
  assert.match(html, /<circle /);
  assert.match(html, /href="\/docs"/);
});

test('alert, switch, segmented, and page control expose their roles', () => {
  resetIds();
  assert.match(ui.renderBnAlert({ title: 'T' }), /role="alertdialog"/);
  assert.match(ui.renderBnSwitch({ checked: true }), /role="switch"/);
  assert.match(ui.renderBnSegmented({ segments: [] }), /role="radiogroup"/);
  assert.match(ui.renderBnPageControl({ count: 2, current: 0 }), /aria-checked="true"/);
  assert.match(ui.renderBnButton('Add', { labelStyle: 'icon', text: 'Add' }), /aria-label="Add"/);
});

test('attrs rejects class and style', async () => {
  const { attrs } = await import('./html.js');
  assert.throws(() => attrs({ class: 'x' }), /cannot set class/);
  assert.throws(() => attrs({ style: 'color:red' }), /cannot set style/);
});
