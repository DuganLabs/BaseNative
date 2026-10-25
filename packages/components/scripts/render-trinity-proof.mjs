// Renders the Holy Trinity pilot proof page: the pilot trio composed the way
// an app composes them, plus the button's three files shown as the work.
// Run: node packages/components/scripts/render-trinity-proof.mjs [output.html]
import { readFile, writeFile } from 'node:fs/promises';
import { render } from '../../server/src/render.js';
import { loadRegistry, renderComponent, assembleStyles } from '../src/loader.js';

const registry = await loadRegistry();
const R = (name, props) => renderComponent(registry, render, name, props).html;

const buttons = [
  R('button', { label: 'Save draft' }),
  R('button', { label: 'Publish', variant: 'primary' }),
  R('button', { label: 'Cancel', variant: 'ghost' }),
  R('button', { label: 'Delete', variant: 'destructive' }),
  R('button', { label: 'Working', variant: 'primary', disabled: true }),
].join('\n      ');

const emailField = R('field', {
  label: 'Email', controlId: 'email',
  controlHtml: R('input', { id: 'email', value: '' }),
  hint: 'We only email about your jobs.',
});
const badInput = R('input', { id: 'email2', value: 'not-an-email', invalid: true });
const errorField = R('field', {
  label: 'Email', controlId: 'email2', controlHtml: badInput,
  hint: 'We only email about your jobs.', error: 'Enter a valid email address.',
});

const archiveDialog = R('dialog', {
  title: 'Archive this job?', body: 'Archived jobs leave the board but keep their history.',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Cancel', variant: 'ghost' }) + R('button', { label: 'Archive', variant: 'primary' }),
}).replace('<dialog', '<dialog open');

const deleteDialog = R('dialog', {
  title: 'Delete this lead?', body: 'The Delete button below is a plain default button — the destructive dialog variant re-points its tokens by scope.',
  variant: 'destructive',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Cancel', variant: 'ghost' }) + R('button', { label: 'Delete lead' }),
}).replace('<dialog', '<dialog open');


const badges = [
  R('badge', { label: 'Draft' }),
  R('badge', { label: 'New lead', variant: 'info' }),
  R('badge', { label: 'Paid', variant: 'success' }),
  R('badge', { label: 'Due soon', variant: 'warning' }),
  R('badge', { label: 'Overdue', variant: 'danger' }),
].join('\n      ');

const controls = [
  R('checkbox', { label: 'Licensed & insured', checked: true }),
  R('checkbox', { label: 'Offers financing' }),
  R('toggle', { label: 'Auto-book confirmed jobs', checked: true }),
  R('toggle', { label: 'Weekend work' }),
  R('radio', {
    legend: 'Arrival window', name: 'window', value: 'pm',
    options: [
      { value: 'am', label: 'Morning' },
      { value: 'pm', label: 'Afternoon' },
      { value: 'eve', label: 'Evening' },
    ],
  }),
  R('field', {
    label: 'Trade', controlId: 'trade',
    controlHtml: R('select', {
      id: 'trade', value: 'hvac',
      options: [
        { value: 'electrical', label: 'Electrical' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'hvac', label: 'HVAC' },
      ],
    }),
    hint: 'The trade decides which pricing engine runs.',
  }),
  R('field', {
    label: 'Job notes', controlId: 'notes',
    controlHtml: R('textarea', { id: 'notes', rows: 3, value: 'Gate code 4211. Dog on site.' }),
  }),
].join('\n      ');

const alerts = [
  R('alert', { title: 'Schedule updated', body: 'Two crews are out today; afternoon windows shifted by an hour.' }),
  R('alert', { title: 'Payment failed', body: 'The card on file was declined. Ask the customer for another method.', variant: 'danger' }),
].join('\n      ');

const jobCard = R('card', {
  title: 'Panel upgrade — 200A service',
  body: 'Permit pulled. Materials on site. Progress is tracked against the quote.',
  footerHtml: R('button', { label: 'Open job', variant: 'primary' }),
});
const uploadBar = R('progress', { value: 60 });

const css = await assembleStyles(registry, ['button', 'input', 'field', 'dialog', 'badge', 'checkbox', 'toggle', 'radio', 'textarea', 'select', 'alert', 'progress', 'card']);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const buttonHtml = await readFile(new URL('../src/button/index.html', import.meta.url), 'utf8');
const buttonCss = await readFile(new URL('../src/button/styles.css', import.meta.url), 'utf8');
const buttonJs = await readFile(new URL('../src/button/index.js', import.meta.url), 'utf8');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Holy Trinity pilot — proof</title>
<style>
${css}
</style>
<style>
  /* Proof-page chrome only — not component CSS. */
  body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem 1rem 4rem; background: var(--background-grouped); color: var(--label); }
  main { max-width: 44rem; margin: 0 auto; display: grid; gap: 2.5rem; }
  section { display: grid; gap: 1rem; min-width: 0; }
  article { min-width: 0; }
  @media (max-width: 40rem) {
    body { padding: 1.25rem .75rem 3rem; }
    article { padding: 1rem; }
    h1 { font-size: 1.25rem; }
  }
  h1 { font-size: 1.5rem; margin: 0; }
  h2 { font-size: 1.05rem; margin: 0; }
  p.note { color: var(--label-2); font-size: .875rem; margin: 0; }
  article { background: var(--background-grouped-2); border: 1px solid var(--separator); border-radius: .75rem; padding: 1.25rem; display: grid; gap: 1rem; }
  dialog { position: static; }
  pre { background: #111827; color: #f3f4f6; padding: 1rem; border-radius: .5rem; overflow-x: auto; font-size: .78rem; line-height: 1.5; }
</style>
</head>
<body>
<main>
  <section>
    <h1>Holy Trinity pilot — rendered proof</h1>
    <p class="note">Thirteen components — button, field+input, dialog, badge, checkbox, toggle, radio, textarea, select, alert, progress, card — each a directory of index.html / styles.css / index.js, rendered server-side through @basenative/server. Every style below comes from global tokens — the component sheets declare no values of their own.</p>
  </section>

  <section>
    <h2>Buttons — four registered variants, one disabled, one vanilla</h2>
    <article>
      <p>${buttons}</p>
      <p><button>Vanilla button — no variant attribute, untouched by the catalog</button></p>
    </article>
  </section>

  <section>
    <h2>Field + input — hint, then error</h2>
    <article>
      ${emailField}
      ${errorField}
    </article>
  </section>


  <section>
    <h2>Badges — one element, five registered tones</h2>
    <article>
      <p>${badges}</p>
    </article>
  </section>

  <section>
    <h2>Form controls — checkbox, switch, radio, select, textarea</h2>
    <article>
      ${controls}
    </article>
  </section>

  <section>
    <h2>Alerts — the variant picks the tone and the ARIA role</h2>
    ${alerts}
  </section>

  <section>
    <h2>Card + progress</h2>
    ${jobCard}
    <article>
      ${uploadBar}
    </article>
  </section>

  <section>
    <h2>Dialog — composed of buttons</h2>
    ${archiveDialog}
    ${deleteDialog}
  </section>

  <section>
    <h2>The work — button/ in full</h2>
    <pre>${esc(buttonHtml)}</pre>
    <pre>${esc(buttonCss)}</pre>
    <pre>${esc(buttonJs)}</pre>
  </section>
</main>
</body>
</html>
`;

const output = process.argv[2] ?? new URL('./trinity-proof.html', import.meta.url);
await writeFile(output, page);
console.log(`proof written to ${output}`);
