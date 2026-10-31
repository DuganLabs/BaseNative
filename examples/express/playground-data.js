/**
 * Page context for /playground.
 *
 * The page's chrome is rendered here, on the server, from the Holy
 * Trinity catalog in @basenative/components — the toolbar (carrying the
 * example select and the Reset/Run buttons), the tabs composite whose
 * panels hold the three editors, and the list-group the console fills —
 * through the package's own loader and @basenative/server's render().
 * No component markup or CSS is copied into this app. The site already
 * links trinity.css, which carries these components' sheets, so the
 * page does not load a second copy.
 *
 * The registry loads once at module scope (top-level await); every
 * request then renders from the same registry, synchronously, the way
 * the other site-data contexts work.
 */
import { render } from '@basenative/server';
import { raw } from '@basenative/runtime/shared/escape';
import { loadRegistry, renderComponent } from '../../packages/components/src/loader.js';
import { EXAMPLES } from './playground-examples.js';
import { highlightCode } from './highlight.js';

const registry = await loadRegistry();

const component = (name, props) => renderComponent(registry, render, name, props).html;

function paneHeader(title, note) {
  return `<header class="pane-head">
              <h2>${title}</h2>
              <p>${note}</p>
            </header>`;
}

function editor(lang, label, source) {
  return `<section class="editor">
              <pre class="gutter" aria-hidden="true">1</pre>
              <section class="sheet">
                <pre class="hl" aria-hidden="true"><code>${highlightCode(source)}</code></pre>
                <textarea id="ed-${lang}" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="${label}"></textarea>
              </section>
            </section>`;
}

function pane(lang, title, note, source, extra = '') {
  return `<article class="pane" data-pane="${lang}">
            ${paneHeader(title, note)}
            ${editor(lang, `${title} editor`, source)}
            ${extra}
          </article>`;
}

const consoleRegion = `<section class="console-region" aria-label="Console">
              <header class="console-head">
                <h3>Console</h3>
                ${component('button', { label: 'Clear', variant: 'ghost' })}
              </header>
              <section class="console-body" tabindex="0">
                <p class="console-empty" id="consoleEmpty">console.log output, runtime errors, and BaseNative template diagnostics (BN_ codes) land here.</p>
                ${component('list-group', { items: [] }).replace('<ul', '<ul id="consoleList"')}
              </section>
            </section>`;

const toolbarHtml = component('toolbar', {
  label: 'Playground controls',
  actionsHtml:
    `<label for="exampleSelect">Example</label>` +
    component('select', {
      id: 'exampleSelect',
      name: 'example',
      variant: 'native',
      label: 'Example',
      value: EXAMPLES[0].id,
      options: EXAMPLES.map((ex) => ({ value: ex.id, label: ex.label })),
    }) +
    component('button', { label: 'Reset' }) +
    component('button', { label: 'Run', variant: 'primary' }) +
    `<kbd aria-hidden="true">Ctrl/⌘ + Enter</kbd>`,
});

const editorsHtml = component('tabs', {
  id: 'editors',
  label: 'Code editors',
  name: 'editors',
  value: 'html',
  tabs: [
    {
      value: 'html',
      label: 'HTML',
      panelHtml: pane(
        'html',
        'HTML',
        'BaseNative template — {{ }}, @if, @for, @click, :attr',
        EXAMPLES[0].html,
      ),
    },
    {
      value: 'css',
      label: 'CSS',
      panelHtml: pane('css', 'CSS', 'Plain CSS, applied to the preview only', EXAMPLES[0].css),
    },
    {
      value: 'js',
      label: 'JS',
      panelHtml: pane(
        'js',
        'JS',
        'signal, computed, effect, batch, mount(ctx)',
        EXAMPLES[0].js,
        consoleRegion,
      ),
    },
  ],
});

export function getPlaygroundPageContext() {
  return {
    // Rendered component markup is package output over hand-authored
    // props — the same raw() trust assertion page.js makes for
    // component demos.
    chrome: raw(toolbarHtml),
    editors: raw(editorsHtml),
    // The examples are code samples the page's own script loads into
    // the editors; they are data, never markup, so the JSON rides in a
    // application/json block and the client parses it.
    examplesJson: raw(JSON.stringify(EXAMPLES)),
  };
}
