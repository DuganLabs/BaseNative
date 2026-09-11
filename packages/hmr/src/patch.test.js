import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { canPatch, isCompatible, keyOf, parseDocument, patchDocument } from './patch.js';
import { capture, restore } from './preserve.js';

let window;
let parser;

beforeEach(() => {
  window = new Window({ url: 'http://localhost:3000/tasks' });
  parser = new window.DOMParser();
});

afterEach(async () => {
  try {
    window?.document?.activeElement?.blur?.();
  } catch {
    /* nothing focused */
  }
  await window?.happyDOM?.abort?.();
  await window?.happyDOM?.close?.();
});

/** Build a live document from a body fragment. */
function live(bodyHtml, headHtml = '<title>Tasks</title>') {
  const doc = window.document;
  doc.documentElement.innerHTML = `<head>${headHtml}</head><body>${bodyHtml}</body>`;
  return doc;
}

/** Parse a full page the way the client does after re-fetching the URL. */
function next(bodyHtml, headHtml = '<title>Tasks</title>') {
  return parseDocument(
    `<!doctype html><html><head>${headHtml}</head><body>${bodyHtml}</body></html>`,
    parser
  );
}

/* --------------------------------------------------------------- parsing */

describe('parseDocument', () => {
  it('parses a real page', () => {
    const doc = parseDocument('<!doctype html><html><body><p>ok</p></body></html>', parser);
    assert.ok(doc);
    assert.equal(doc.body.querySelector('p').textContent, 'ok');
  });

  it('rejects an empty body', () => {
    assert.equal(parseDocument('', parser), null);
    assert.equal(parseDocument('   \n  ', parser), null);
  });

  it('rejects a response with no markup at all', () => {
    assert.equal(parseDocument('{"error":"route crashed"}', parser), null);
    assert.equal(parseDocument('Internal Server Error', parser), null);
  });

  it('rejects a non-string body', () => {
    assert.equal(parseDocument(null, parser), null);
    assert.equal(parseDocument({ nope: true }, parser), null);
  });

  it('rejects a parser that throws', () => {
    const throwing = {
      parseFromString() {
        throw new Error('boom');
      },
    };
    assert.equal(parseDocument('<html><body>x</body></html>', throwing), null);
  });
});

/* -------------------------------------------------- the no-churn guarantee */

describe('an unchanged render touches nothing', () => {
  it('records zero mutations and keeps every node identity', () => {
    const markup = `
      <header id="top"><h1>Tasks</h1></header>
      <ul id="list"><li data-bn-key="1">Design</li><li data-bn-key="2">Ship</li></ul>
      <p>Count: 2</p>`;
    const doc = live(markup);

    const before = [...doc.body.querySelectorAll('*')];
    const records = [];
    const observer = new window.MutationObserver((list) => records.push(...list));
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    const result = patchDocument(doc, next(markup));
    observer.takeRecords().forEach((record) => records.push(record));
    observer.disconnect();

    assert.equal(result.ok, true);
    assert.deepEqual(
      {
        inserted: result.stats.inserted,
        removed: result.stats.removed,
        attrsChanged: result.stats.attrsChanged,
        textChanged: result.stats.textChanged,
      },
      { inserted: 0, removed: 0, attrsChanged: 0, textChanged: 0 }
    );
    assert.equal(records.length, 0, 'an identical render must produce no DOM mutations');

    const after = [...doc.body.querySelectorAll('*')];
    assert.equal(after.length, before.length);
    for (let i = 0; i < before.length; i++) {
      assert.equal(after[i], before[i], `node ${i} was replaced`);
    }
  });

  it('does not re-set an attribute that already holds the same value', () => {
    const doc = live('<section class="card" data-state="open"><p>same</p></section>');
    const result = patchDocument(doc, next('<section class="card" data-state="open"><p>same</p></section>'));
    assert.equal(result.stats.attrsChanged, 0);
  });

  it('only rewrites the text node that actually changed', () => {
    const doc = live('<p id="a">same</p><p id="b">before</p>');
    const a = doc.getElementById('a').firstChild;
    const b = doc.getElementById('b').firstChild;

    const result = patchDocument(doc, next('<p id="a">same</p><p id="b">after</p>'));

    assert.equal(result.stats.textChanged, 1);
    assert.equal(doc.getElementById('a').firstChild, a, 'unchanged text node was replaced');
    assert.equal(doc.getElementById('b').firstChild, b, 'changed text node should be reused');
    assert.equal(b.nodeValue, 'after');
  });
});

/* ------------------------------------------------------------------ focus */

describe('focus and caret survive a patch', () => {
  it('keeps the caret mid-word while sibling content re-renders', () => {
    const doc = live(`
      <form>
        <input id="title" name="title" value="">
        <p id="count">Count: 1</p>
      </form>`);

    const input = doc.getElementById('title');
    input.focus();
    input.value = 'Design token system';
    input.setSelectionRange(6, 6);

    assert.equal(doc.activeElement, input);

    const state = capture(doc);
    const result = patchDocument(
      doc,
      next(`
      <form>
        <input id="title" name="title" value="">
        <p id="count">Count: 2</p>
      </form>`)
    );
    const restored = restore(doc, state);

    assert.equal(result.ok, true);
    assert.equal(doc.getElementById('title'), input, 'the focused input must be the same node');
    assert.equal(doc.activeElement, input);
    assert.equal(input.value, 'Design token system');
    assert.equal(input.selectionStart, 6);
    assert.equal(input.selectionEnd, 6);
    assert.equal(restored.focusUntouched, true, 'focus should never have left in the first place');
    assert.equal(doc.getElementById('count').textContent, 'Count: 2');
  });

  it('keeps a selection range, not just a collapsed caret', () => {
    const doc = live('<input id="q" name="q" value=""><span id="s">a</span>');
    const input = doc.getElementById('q');
    input.focus();
    input.value = 'hot module replacement';
    input.setSelectionRange(4, 10);

    const state = capture(doc);
    patchDocument(doc, next('<input id="q" name="q" value=""><span id="s">b</span>'));
    restore(doc, state);

    assert.equal(input.selectionStart, 4);
    assert.equal(input.selectionEnd, 10);
  });

  it('keeps focus when a sibling is inserted above the focused field', () => {
    const doc = live(`
      <form>
        <input id="title" name="title" value="">
      </form>`);
    const input = doc.getElementById('title');
    input.focus();
    input.value = 'typed';
    input.setSelectionRange(5, 5);

    const state = capture(doc);
    const result = patchDocument(
      doc,
      next(`
      <form>
        <p class="hint">New helper text</p>
        <input id="title" name="title" value="">
      </form>`)
    );
    restore(doc, state);

    assert.equal(result.ok, true);
    assert.equal(doc.getElementById('title'), input);
    assert.equal(doc.activeElement, input);
    assert.equal(input.value, 'typed');
    assert.equal(input.selectionStart, 5);
    assert.equal(doc.querySelector('.hint').textContent, 'New helper text');
  });

  it('restores focus by path when the focused node had to be rebuilt', () => {
    const doc = live('<main><div><input name="email" type="text" value=""></div></main>');
    const input = doc.querySelector('input');
    input.focus();
    input.value = 'a@b.co';

    const state = capture(doc);
    // A tag change forces a genuine replacement — the fallback path.
    const result = patchDocument(
      doc,
      next('<main><section><input name="email" type="text" value=""></section></main>')
    );
    const restored = restore(doc, state);

    assert.equal(result.ok, true);
    const rebuilt = doc.querySelector('input');
    assert.notEqual(rebuilt, input, 'this case is only interesting if the node really was replaced');
    assert.equal(restored.focusUntouched, false);
    assert.equal(restored.focusRestored, true);
    assert.equal(doc.activeElement, rebuilt);
  });
});

/* ------------------------------------------------------------- form state */

describe('form state', () => {
  it('keeps what the user typed when the source default did not change', () => {
    const doc = live('<input id="a" name="a" value="default">');
    const input = doc.getElementById('a');
    input.value = 'user typed this';

    patchDocument(doc, next('<input id="a" name="a" value="default" class="wide">'));

    assert.equal(input.value, 'user typed this');
    assert.equal(input.getAttribute('class'), 'wide');
  });

  it('adopts the new default when the developer changed it', () => {
    const doc = live('<input id="a" name="a" value="old">');
    const input = doc.getElementById('a');
    input.value = 'user typed this';

    patchDocument(doc, next('<input id="a" name="a" value="new">'));

    assert.equal(input.value, 'new');
  });

  it('keeps a checkbox the user ticked', () => {
    const doc = live('<input id="c" name="c" type="checkbox">');
    const box = doc.getElementById('c');
    box.checked = true;

    patchDocument(doc, next('<input id="c" name="c" type="checkbox" class="big">'));

    assert.equal(box.checked, true);
  });

  it('keeps textarea text the user typed', () => {
    const doc = live('<textarea id="t" name="t">seed</textarea>');
    const area = doc.getElementById('t');
    area.value = 'a much longer draft';

    patchDocument(doc, next('<textarea id="t" name="t">seed</textarea>'));

    assert.equal(area.value, 'a much longer draft');
  });
});

/* --------------------------------------------------------- open elements */

describe('open dialogs and details', () => {
  it('does not close a <dialog> whose server render has no open attribute', () => {
    const doc = live('<dialog id="d"><p>body</p></dialog>');
    const dialog = doc.getElementById('d');
    dialog.setAttribute('open', '');

    patchDocument(doc, next('<dialog id="d"><p>body changed</p></dialog>'));

    assert.equal(dialog.hasAttribute('open'), true);
    assert.equal(dialog.querySelector('p').textContent, 'body changed');
  });

  it('does not collapse an open <details>', () => {
    const doc = live('<details id="x"><summary>More</summary><p>1</p></details>');
    doc.getElementById('x').setAttribute('open', '');

    patchDocument(doc, next('<details id="x"><summary>More</summary><p>2</p></details>'));

    assert.equal(doc.getElementById('x').hasAttribute('open'), true);
  });

  it('still removes ordinary attributes the render dropped', () => {
    const doc = live('<p id="p" class="old" data-x="1">t</p>');
    patchDocument(doc, next('<p id="p">t</p>'));
    assert.equal(doc.getElementById('p').hasAttribute('class'), false);
    assert.equal(doc.getElementById('p').hasAttribute('data-x'), false);
  });
});

/* ---------------------------------------------------------- keyed lists */

describe('keyed reconciliation', () => {
  it('moves a keyed row instead of rebuilding the list', () => {
    const doc = live(
      '<ul><li data-bn-key="a">A</li><li data-bn-key="b">B</li><li data-bn-key="c">C</li></ul>'
    );
    const [a, b, c] = [...doc.querySelectorAll('li')];

    const result = patchDocument(
      doc,
      next('<ul><li data-bn-key="c">C</li><li data-bn-key="a">A</li><li data-bn-key="b">B</li></ul>')
    );

    const after = [...doc.querySelectorAll('li')];
    assert.equal(result.ok, true);
    assert.deepEqual(after, [c, a, b]);
    assert.equal(result.stats.inserted, 0);
    assert.equal(result.stats.removed, 0);
  });

  it('removes only the deleted row', () => {
    const doc = live(
      '<ul><li data-bn-key="a">A</li><li data-bn-key="b">B</li><li data-bn-key="c">C</li></ul>'
    );
    const [a, , c] = [...doc.querySelectorAll('li')];

    const result = patchDocument(
      doc,
      next('<ul><li data-bn-key="a">A</li><li data-bn-key="c">C</li></ul>')
    );

    assert.deepEqual([...doc.querySelectorAll('li')], [a, c]);
    assert.equal(result.stats.removed, 1);
    assert.equal(result.stats.inserted, 0);
  });

  it('does not let an unkeyed incoming node steal a keyed live node', () => {
    const doc = live('<div><span id="keep">k</span></div>');
    const keep = doc.getElementById('keep');
    patchDocument(doc, next('<div><span>fresh</span><span id="keep">k</span></div>'));
    assert.equal(doc.getElementById('keep'), keep);
    assert.equal(doc.querySelector('div').firstElementChild.textContent, 'fresh');
  });
});

/* -------------------------------------------------------------- opt-out */

describe('data-bn-hmr-skip', () => {
  it('leaves an imperatively built subtree completely alone', () => {
    const doc = live('<bn-canvas data-bn-hmr-skip><b>built at runtime</b></bn-canvas>');
    const canvas = doc.querySelector('bn-canvas');
    const inner = canvas.firstElementChild;

    const result = patchDocument(doc, next('<bn-canvas data-bn-hmr-skip></bn-canvas>'));

    assert.equal(result.stats.skipped, 1);
    assert.equal(canvas.firstElementChild, inner);
    assert.equal(canvas.textContent, 'built at runtime');
  });
});

/* ------------------------------------------------------------ head nodes */

describe('the head', () => {
  it('does not re-request a stylesheet whose href is unchanged', () => {
    const doc = live('<p>x</p>', '<title>t</title><link rel="stylesheet" href="/app.css">');
    const link = doc.querySelector('link');

    patchDocument(doc, next('<p>y</p>', '<title>t</title><link rel="stylesheet" href="/app.css">'));

    assert.equal(doc.querySelector('link'), link);
  });

  it('updates the title in place', () => {
    const doc = live('<p>x</p>', '<title>Old</title>');
    const title = doc.querySelector('title');
    patchDocument(doc, next('<p>x</p>', '<title>New</title>'));
    assert.equal(doc.querySelector('title'), title);
    assert.equal(title.textContent, 'New');
  });
});

/* ----------------------------------------------------------- the fallback */

describe('the fallback to a full reload', () => {
  it('refuses a document with no body', () => {
    const result = patchDocument(window.document, { documentElement: {}, body: null });
    assert.equal(result.ok, false);
    assert.match(result.reason, /no <body>/);
  });

  it('refuses a document with no document element', () => {
    const result = patchDocument(window.document, {});
    assert.equal(result.ok, false);
    assert.match(result.reason, /no document element/);
  });

  it('refuses a render whose structure shares nothing with the live page', () => {
    const doc = live('<main><p>app</p></main>');
    const result = patchDocument(doc, next('<form><input name="email"></form>'));
    assert.equal(result.ok, false);
    assert.match(result.reason, /structure diverged/);
    assert.equal(doc.querySelector('main').textContent, 'app', 'a refused patch must not mutate');
  });

  it('canPatch accepts a render that still shares a top-level tag', () => {
    const doc = live('<main><p>app</p></main><footer>f</footer>');
    assert.deepEqual(canPatch(doc, next('<main><h1>new</h1></main>')), { ok: true });
  });

  it('reports a reason rather than throwing when the patch blows up', () => {
    const doc = live('<main>a</main>');
    const broken = next('<main>b</main>');
    Object.defineProperty(broken, 'head', {
      get() {
        throw new Error('detached');
      },
    });
    const result = patchDocument(doc, broken);
    assert.equal(result.ok, false);
    assert.match(result.reason, /the patch threw \(detached\)/);
  });
});

/* --------------------------------------------------------------- helpers */

describe('keyOf', () => {
  it('prefers an explicit key, then an id', () => {
    const doc = live('<i id="x" data-bn-key="k"></i><i id="y"></i><i></i>');
    const [a, b, c] = [...doc.querySelectorAll('i')];
    assert.equal(keyOf(a), 'k:k');
    assert.equal(keyOf(b), '#y');
    assert.equal(keyOf(c), null);
  });

  it('keys head nodes by what identifies them', () => {
    const doc = live('<p>x</p>', '<title>t</title><link rel="stylesheet" href="/a.css"><meta name="x" content="1">');
    assert.equal(keyOf(doc.querySelector('title')), 'title');
    assert.equal(keyOf(doc.querySelector('link')), 'link:stylesheet:/a.css');
    assert.equal(keyOf(doc.querySelector('meta')), 'meta:x');
  });

  it('keys form controls by name so a re-render can find them', () => {
    const doc = live('<input name="email">');
    assert.equal(keyOf(doc.querySelector('input')), 'INPUT[email]');
  });
});

describe('isCompatible', () => {
  it('rejects different tags and different keys', () => {
    const doc = live('<div id="a"></div><div id="b"></div><span></span>');
    const [a, b] = [...doc.querySelectorAll('div')];
    const span = doc.querySelector('span');
    assert.equal(isCompatible(a, b), false);
    assert.equal(isCompatible(a, span), false);
    assert.equal(isCompatible(a, a), true);
  });
});
