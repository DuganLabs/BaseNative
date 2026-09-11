import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { capture, pathTo, resolvePath, resolveRef, restore } from './preserve.js';

let window;
let document;

beforeEach(() => {
  window = new Window({ url: 'http://localhost:3000/' });
  document = window.document;
});

afterEach(async () => {
  try {
    document?.activeElement?.blur?.();
  } catch {
    /* nothing focused */
  }
  await window?.happyDOM?.abort?.();
  await window?.happyDOM?.close?.();
});

function body(html) {
  document.documentElement.innerHTML = `<head></head><body>${html}</body>`;
  return document;
}

describe('pathTo / resolvePath', () => {
  it('round-trips a deeply nested element', () => {
    const doc = body('<main><section><ul><li>a</li><li><b>deep</b></li></ul></section></main>');
    const target = doc.querySelector('b');
    const path = pathTo(target);
    assert.match(path, /^\/[0-9/]+$/);
    assert.equal(resolvePath(doc, path), target);
  });

  it('prefers an id, which survives reordering', () => {
    const doc = body('<p>x</p><p id="me">y</p>');
    assert.equal(pathTo(doc.getElementById('me')), '#me');
    assert.equal(resolvePath(doc, '#me'), doc.getElementById('me'));
  });

  it('returns null for paths that no longer resolve', () => {
    const doc = body('<p>x</p>');
    assert.equal(resolvePath(doc, '/1/9/9'), null);
    assert.equal(resolvePath(doc, '#gone'), null);
    assert.equal(resolvePath(doc, ''), null);
    assert.equal(resolvePath(doc, null), null);
  });

  it('ignores non-elements', () => {
    const doc = body('<p>x</p>');
    assert.equal(pathTo(doc.querySelector('p').firstChild), null);
    assert.equal(pathTo(null), null);
  });
});

describe('resolveRef', () => {
  it('falls back to the form field name when the path moved', () => {
    const doc = body('<form><p>new</p><input name="email"></form>');
    const found = resolveRef(doc, { path: '/1/0/0', tag: 'INPUT', name: 'email' });
    assert.equal(found, doc.querySelector('input'));
  });

  it('does not confuse two fields with different names', () => {
    const doc = body('<form><input name="a"><input name="b"></form>');
    const found = resolveRef(doc, { path: '/9/9', tag: 'INPUT', name: 'b' });
    assert.equal(found.getAttribute('name'), 'b');
  });

  it('tolerates a name that cannot be a selector', () => {
    const doc = body('<form><input name="a"></form>');
    assert.doesNotThrow(() => resolveRef(doc, { path: '/9', tag: 'INPUT', name: 'a"]b[' }));
  });
});

describe('capture / restore focus', () => {
  it('captures the caret and puts it back on a rebuilt node', () => {
    const doc = body('<input id="q" value="">');
    const input = doc.getElementById('q');
    input.focus();
    input.value = 'hello world';
    input.setSelectionRange(6, 11);

    const state = capture(doc);
    assert.equal(state.focus.tag, 'INPUT');
    assert.equal(state.focus.selection.start, 6);
    assert.equal(state.focus.selection.end, 11);

    // Simulate the patcher having replaced the element entirely.
    input.remove();
    const rebuilt = doc.createElement('input');
    rebuilt.id = 'q';
    rebuilt.value = 'hello world';
    doc.body.append(rebuilt);

    const result = restore(doc, state);
    assert.equal(result.focusRestored, true);
    assert.equal(result.focusUntouched, false);
    assert.equal(doc.activeElement, rebuilt);
    assert.equal(rebuilt.selectionStart, 6);
    assert.equal(rebuilt.selectionEnd, 11);
  });

  it('reports focusUntouched when the node never moved', () => {
    const doc = body('<input id="q">');
    doc.getElementById('q').focus();
    const state = capture(doc);
    const result = restore(doc, state);
    assert.equal(result.focusUntouched, true);
    assert.equal(result.focusRestored, true);
  });

  it('captures nothing when the body itself holds focus', () => {
    const doc = body('<p>x</p>');
    assert.equal(capture(doc).focus, null);
  });

  it('does not throw for input types with no selection API', () => {
    const doc = body('<input id="n" type="number" value="3">');
    doc.getElementById('n').focus();
    const state = capture(doc);
    assert.doesNotThrow(() => restore(doc, state));
    assert.equal(doc.activeElement, doc.getElementById('n'));
  });

  it('is a no-op for a missing snapshot', () => {
    const doc = body('<p>x</p>');
    assert.deepEqual(restore(doc, null), {
      focusRestored: false,
      focusUntouched: true,
      scrollers: 0,
      opened: 0,
    });
  });
});

describe('capture / restore scroll', () => {
  it('records and replays a scrolled container', () => {
    const doc = body('<div id="scroller">content</div>');
    const scroller = doc.getElementById('scroller');
    scroller.scrollTop = 420;
    scroller.scrollLeft = 30;

    const state = capture(doc);
    assert.equal(state.scroll.containers.length, 1);
    assert.equal(state.scroll.containers[0].top, 420);

    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;

    const result = restore(doc, state);
    assert.equal(result.scrollers, 1);
    assert.equal(scroller.scrollTop, 420);
    assert.equal(scroller.scrollLeft, 30);
  });

  it('ignores containers that are not scrolled', () => {
    const doc = body('<div>a</div><div>b</div>');
    assert.equal(capture(doc).scroll.containers.length, 0);
  });
});

describe('capture / restore open elements', () => {
  it('reopens a <details> that the patch closed', () => {
    const doc = body('<details id="d"><summary>s</summary></details>');
    const details = doc.getElementById('d');
    details.setAttribute('open', '');

    const state = capture(doc);
    assert.equal(state.open.length, 1);

    details.removeAttribute('open');
    const result = restore(doc, state);

    assert.equal(result.opened, 1);
    assert.equal(details.hasAttribute('open'), true);
  });

  it('leaves an element that is already open alone', () => {
    const doc = body('<details id="d" open><summary>s</summary></details>');
    const state = capture(doc);
    assert.equal(restore(doc, state).opened, 0);
  });
});
