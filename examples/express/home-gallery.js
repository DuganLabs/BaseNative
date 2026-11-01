/**
 * The home gallery: a bento of live BaseNative components, each a real
 * catalog render over hand-authored props, staged in the same preview
 * figure the component pages use. Components with behaviour (tabs,
 * dialog, toast) record a live spec, so public/specimens.js mounts them
 * from the very props they render with; the rest are plain HTML that
 * works with no script at all.
 */
import { renderTrinity as r } from './trinity.js';

const tile = (slug, title, html, size = 'third') =>
  `<li data-bn-gallery-tile="${size}">` +
  '<figure data-bn-component-preview>' +
  `<figcaption><a href="/components/${slug}">${title}</a></figcaption>` +
  `<output>${html}</output>` +
  '</figure>' +
  '</li>';

/** @returns {{ html: string, liveSpecimens: object[] }} */
export function renderHomeGallery() {
  const liveSpecimens = [];
  const live = (spec) => liveSpecimens.push(spec);
  const ghost = (label) => r('button', { label, variant: 'ghost' });

  const buttons = [
    r('button', { label: 'Publish', variant: 'primary' }),
    r('button', { label: 'Save draft' }),
    r('button', { label: 'Cancel', variant: 'ghost' }),
    r('button', { label: 'Delete', variant: 'destructive' }),
  ].join('');

  const controls =
    r('segmented-control', {
      legend: 'View',
      name: 'home-view',
      value: 'week',
      options: [
        { value: 'day', label: 'Day' },
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
      ],
    }) +
    r('toggle', { label: 'Notifications', name: 'home-notify', checked: true }) +
    r('toggle', { label: 'Focus mode', name: 'home-focus' }) +
    r('checkbox', { label: 'Remember me', name: 'home-remember', value: 'yes', checked: true });

  const form =
    r('field', {
      label: 'Email',
      controlId: 'home-email',
      controlHtml: r('input', { id: 'home-email', type: 'email', value: 'ada@example.com' }),
      hint: 'We never share it.',
    }) +
    r('field', {
      label: 'Plan',
      controlId: 'home-plan',
      controlHtml: r('select', {
        id: 'home-plan',
        value: 'pro',
        variant: 'native',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
          { value: 'team', label: 'Team' },
        ],
      }),
    });

  const card =
    r('card', {
      title: 'Quarterly review',
      body: 'Revenue is up 18%. Three launches shipped on schedule and churn fell for the second quarter running.',
      footerHtml: r('button', { label: 'Open report', variant: 'primary' }),
    }) +
    r('progress', { value: 72 }) +
    [
      r('badge', { label: 'Shipped', variant: 'success' }),
      r('badge', { label: 'Beta', variant: 'info' }),
      r('badge', { label: 'Overdue', variant: 'danger' }),
    ].join('');

  const tabsProps = {
    id: 'home-tabs',
    label: 'Project views',
    name: 'home-tabs',
    tabs: [
      {
        value: 'overview',
        label: 'Overview',
        panelHtml: '<p>Six components shipped this week, every one in light and dark.</p>',
      },
      {
        value: 'activity',
        label: 'Activity',
        panelHtml: '<p>Tokens rebuilt, docs regenerated, the conformance suite green.</p>',
      },
      {
        value: 'settings',
        label: 'Settings',
        panelHtml: '<p>Theme, density and motion all follow the system by default.</p>',
      },
    ],
  };
  live({ name: 'tabs', props: tabsProps });

  const table = r('table', {
    variant: 'striped',
    caption: 'Releases',
    columns: ['Package', 'Version', 'Status'],
    rows: [
      [{ text: 'components', header: true }, '3.1', 'Stable'],
      [{ text: 'runtime', header: true }, '3.1', 'Stable'],
      [{ text: 'cli', header: true }, '3.1', 'Stable'],
    ],
  });

  const dialogProps = {
    id: 'home-dialog',
    title: 'Discard changes?',
    body: 'Your edits to this page will be lost.',
    closeHtml: ghost('Close'),
    footerHtml: ghost('Keep editing') + r('button', { label: 'Discard', variant: 'primary' }),
  };
  live({ name: 'dialog', props: dialogProps, open: true });
  const dialog = r('dialog', dialogProps).replace('<dialog ', '<dialog open ');

  const toastProps = {
    items: [
      { message: 'Changes saved', tone: 'success', dismissHtml: ghost('Dismiss') },
      { message: 'Sync paused — you are offline', tone: 'warning', dismissHtml: ghost('Dismiss') },
    ],
  };
  live({ name: 'toast', props: toastProps });

  const html =
    '<ul data-bn-gallery>' +
    tile('button', 'Button', buttons, 'half') +
    tile('segmented-control', 'Segmented control, toggle, checkbox', controls, 'half') +
    tile('field', 'Field, input, select', form) +
    tile('card', 'Card, progress, badge', card) +
    tile('tabs', 'Tabs', r('tabs', tabsProps), 'third-wide') +
    tile('table', 'Table', table) +
    tile('dialog', 'Dialog', dialog) +
    tile('toast', 'Toast', r('toast', toastProps), 'third-wide') +
    '</ul>';
  return { html, liveSpecimens };
}
