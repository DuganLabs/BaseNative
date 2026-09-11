import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmrProxy, findFreePort } from '../../packages/hmr/src/index.js';

// End-to-end proof, in a real browser, that a patch keeps the caret where the
// user left it. The page is deliberately BaseNative-shaped: a server-rendered
// HTML string with a `data-bn` markup contract, a form, a scrolled container,
// and an open <details> — exactly the state a `location.reload()` throws away.

const PAGE = (count, hint) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>HMR fixture</title>
  <style>
    #log { height: 120px; overflow-y: scroll; }
    #log p { margin: 0; height: 40px; }
    body { height: 3000px; }
  </style>
</head>
<body data-bn="hmr-fixture">
  <main>
    <h1>Tasks</h1>
    <form data-bn="task-form">
      <label for="title">Title</label>
      <input id="title" name="title" type="text" value="">
      ${hint ? '<p class="hint">A hint the server just added</p>' : ''}
      <textarea id="notes" name="notes">seed</textarea>
    </form>
    <p id="count">Count: ${count}</p>
    <div id="log">
      <p>one</p><p>two</p><p>three</p><p>four</p><p>five</p><p>six</p><p>seven</p>
    </div>
    <details id="more"><summary>More</summary><p>detail body ${count}</p></details>
  </main>
</body>
</html>`;

let statePath;
let dir;
let proxy;
let baseURL;
let upstream;

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bn-hmr-e2e-'));
  statePath = join(dir, 'page.state.json');
  writeFileSync(statePath, JSON.stringify({ count: 1, hint: false }));

  const upstreamPort = await findFreePort(41_000);
  upstream = createServer((req, res) => {
    // A route that answers 200 text/html with a body that is not a document —
    // what a crashed handler or a misconfigured error page actually looks like.
    if (req.url.startsWith('/garbage')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE(state.count, state.hint));
  });
  await new Promise((resolve) => upstream.listen(upstreamPort, '127.0.0.1', resolve));

  const publicPort = await findFreePort(41_100);
  proxy = createHmrProxy({
    targetPort: upstreamPort,
    port: publicPort,
    host: '127.0.0.1',
    roots: [dir],
    cwd: dir,
    debounceMs: 20,
    settleMs: 10,
    env: { NODE_ENV: 'development' },
  });
  await proxy.listen();
  baseURL = `http://127.0.0.1:${publicPort}`;
});

test.afterAll(async () => {
  await proxy?.close();
  await new Promise((resolve) => upstream?.close(resolve));
  rmSync(dir, { recursive: true, force: true });
});

/** Arm a listener for the next patch before editing a file. */
async function armPatchListener(page) {
  await page.evaluate(() => {
    window.__hmr = new Promise((resolve) => {
      document.addEventListener('bn:hmr:patched', (event) => resolve(event.detail), { once: true });
    });
    window.__reloaded = false;
    document.addEventListener('bn:hmr:reload', () => {
      window.__reloaded = true;
    });
  });
}

/** Wait for the client to connect before editing, or the update is missed. */
async function waitForHmrConnection(page) {
  await page.waitForFunction(
    async () => {
      const res = await fetch('/__bn_hmr/status');
      return (await res.json()).clients > 0;
    },
    undefined,
    { timeout: 10_000 }
  );
}

function edit(next) {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  writeFileSync(statePath, JSON.stringify({ ...state, ...next }));
}

test('the HMR client is injected as an external module script', async ({ page }) => {
  await page.goto(baseURL);
  const script = page.locator('script[data-bn-hmr]');
  await expect(script).toHaveCount(1);
  expect(await script.getAttribute('src')).toBe('/__bn_hmr/client.js');
  expect(await script.getAttribute('type')).toBe('module');
  expect(await script.innerHTML()).toBe('');
});

test('a patch preserves focus, caret, typed text, scroll and open state', async ({ page }) => {
  edit({ count: 1, hint: false });
  await page.goto(baseURL);
  await waitForHmrConnection(page);

  // Put the page into the state a full reload would destroy.
  const input = page.locator('#title');
  await input.click();
  await input.pressSequentially('Design token system', { delay: 5 });
  await page.locator('#notes').evaluate((el) => {
    el.value = 'a draft the user has not submitted';
  });
  await page.evaluate(() => {
    document.getElementById('log').scrollTop = 80;
    document.getElementById('more').open = true;
    window.scrollTo(0, 250);
    const title = document.getElementById('title');
    title.focus();
    title.setSelectionRange(6, 6);
    // An expando property, not an attribute: it exists only on this exact DOM
    // object, so reading it back proves the node itself survived the patch.
    title.bnProbe = 'original';
  });

  const before = await page.evaluate(() => ({
    active: document.activeElement.id,
    start: document.getElementById('title').selectionStart,
    end: document.getElementById('title').selectionEnd,
    value: document.getElementById('title').value,
    count: document.getElementById('count').textContent,
    logScroll: document.getElementById('log').scrollTop,
    pageScroll: Math.round(window.scrollY),
    detailsOpen: document.getElementById('more').open,
  }));

  await armPatchListener(page);
  const editedAt = Date.now();
  edit({ count: 2 });

  const detail = await page.evaluate(() => window.__hmr);
  const elapsed = Date.now() - editedAt;

  const after = await page.evaluate(() => ({
    active: document.activeElement.id,
    start: document.getElementById('title').selectionStart,
    end: document.getElementById('title').selectionEnd,
    value: document.getElementById('title').value,
    notes: document.getElementById('notes').value,
    count: document.getElementById('count').textContent,
    logScroll: document.getElementById('log').scrollTop,
    pageScroll: Math.round(window.scrollY),
    detailsOpen: document.getElementById('more').open,
    stamp: document.getElementById('title').bnProbe ?? null,
    reloaded: window.__reloaded,
    detailText: document.querySelector('#more p').textContent,
  }));

  console.log('[hmr e2e] stats   :', JSON.stringify(detail.stats));
  console.log('[hmr e2e] restored:', JSON.stringify(detail.restored));
  console.log('[hmr e2e] before  :', JSON.stringify(before));
  console.log('[hmr e2e] after   :', JSON.stringify(after));
  console.log(`[hmr e2e] file write -> patched: ${elapsed}ms`);

  // The patch really applied the new server render.
  expect(before.count).toBe('Count: 1');
  expect(after.count).toBe('Count: 2');
  expect(after.detailText).toBe('detail body 2');
  expect(after.reloaded).toBe(false);

  // …and none of the user's state moved.
  expect(after.active).toBe('title');
  expect(after.start).toBe(6);
  expect(after.end).toBe(6);
  expect(after.value).toBe('Design token system');
  expect(after.notes).toBe('a draft the user has not submitted');
  expect(after.logScroll).toBe(before.logScroll);
  expect(after.pageScroll).toBe(before.pageScroll);
  expect(after.detailsOpen).toBe(true);

  // Surviving the stamp proves the input was patched in place, not rebuilt.
  expect(after.stamp).toBe('original');

  // Focus never left, so nothing had to be restored.
  expect(detail.restored.focusUntouched).toBe(true);
  expect(detail.stats.inserted).toBe(0);
  expect(detail.stats.removed).toBe(0);
});

test('focus survives the server inserting a sibling above the focused field', async ({ page }) => {
  edit({ count: 1, hint: false });
  await page.goto(baseURL);
  await waitForHmrConnection(page);

  const input = page.locator('#title');
  await input.click();
  await input.pressSequentially('half a word', { delay: 5 });
  await page.evaluate(() => {
    const title = document.getElementById('title');
    title.setSelectionRange(4, 4);
    title.bnProbe = 'original';
  });

  await armPatchListener(page);
  edit({ hint: true });
  const detail = await page.evaluate(() => window.__hmr);

  const after = await page.evaluate(() => ({
    active: document.activeElement.id,
    start: document.getElementById('title').selectionStart,
    value: document.getElementById('title').value,
    stamp: document.getElementById('title').bnProbe ?? null,
    hint: document.querySelector('.hint')?.textContent ?? null,
  }));

  console.log('[hmr e2e] sibling-insert stats:', JSON.stringify(detail.stats));
  console.log('[hmr e2e] sibling-insert after:', JSON.stringify(after));

  expect(after.hint).toBe('A hint the server just added');
  expect(after.active).toBe('title');
  expect(after.start).toBe(4);
  expect(after.value).toBe('half a word');
  expect(after.stamp).toBe('original');
  // The hint element plus the whitespace text node around it — and nothing else
  // was rebuilt: 55 nodes were matched and reused in place.
  expect(detail.stats.inserted).toBeLessThanOrEqual(2);
  expect(detail.stats.removed).toBe(0);
  expect(detail.stats.matched).toBeGreaterThan(40);

  edit({ hint: false });
});

test('an unparseable response falls back to a full reload and says why', async ({ page }) => {
  edit({ count: 1, hint: false });

  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });

  await page.goto(baseURL);
  await waitForHmrConnection(page);

  // Point the client's re-fetch at the route that answers 200 text/html with a
  // body that is not a document, without leaving the page.
  await page.evaluate(() => history.replaceState(null, '', '/garbage'));

  edit({ count: 4 });

  await expect
    .poll(() => warnings.find((line) => line.includes('falling back to a full reload')), {
      timeout: 10_000,
    })
    .toBeTruthy();

  const reason = warnings.find((line) => line.includes('falling back to a full reload'));
  console.log('[hmr e2e] fallback :', reason);
  expect(reason).toContain('could not be parsed as an HTML document');
});
