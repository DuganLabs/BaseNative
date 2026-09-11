import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clientTag, injectClientScript, isFullDocument } from './inject.js';
import { CLIENT_MARKER, ROUTES } from './protocol.js';

const PAGE = '<!doctype html><html><head><title>t</title></head><body><main>hi</main></body></html>';

describe('injectClientScript', () => {
  it('inserts the client immediately before </body>', () => {
    const out = injectClientScript(PAGE);
    assert.ok(out.includes(clientTag()));
    assert.ok(out.indexOf(ROUTES.client) < out.indexOf('</body>'));
    assert.ok(out.indexOf('<main>hi</main>') < out.indexOf(ROUTES.client));
  });

  it('falls back to </html> when there is no body close tag', () => {
    const out = injectClientScript('<html><body>hi</html>');
    assert.ok(out.includes(ROUTES.client));
    assert.ok(out.indexOf(ROUTES.client) < out.indexOf('</html>'));
  });

  it('is idempotent', () => {
    const once = injectClientScript(PAGE);
    assert.equal(injectClientScript(once), once);
  });

  it('leaves fragments alone', () => {
    for (const fragment of ['<li>row</li>', '{"error":"boom"}', '', 'plain text']) {
      assert.equal(injectClientScript(fragment), fragment);
    }
  });

  it('honours a custom src', () => {
    const out = injectClientScript(PAGE, { src: '/dev/hmr.js' });
    assert.ok(out.includes('src="/dev/hmr.js"'));
  });
});

describe('CSP shape of the injected tag', () => {
  const tag = clientTag();

  it('is an external same-origin module script, never inline code', () => {
    assert.match(tag, /^<script type="module" src="\/__bn_hmr\/client\.js" data-bn-hmr><\/script>$/);
    assert.ok(!/>[^<]/.test(tag), 'the tag must have no inline body');
  });

  it('carries no nonce, no inline handler, and no javascript: URL', () => {
    assert.ok(!tag.includes('nonce'));
    assert.ok(!/\son[a-z]+=/i.test(tag));
    assert.ok(!tag.toLowerCase().includes('javascript:'));
  });

  it('is marked so the patcher will not remove it', () => {
    assert.ok(tag.includes(CLIENT_MARKER));
  });
});

describe('isFullDocument', () => {
  it('recognises documents and rejects fragments', () => {
    assert.equal(isFullDocument('<html><body></body></html>'), true);
    assert.equal(isFullDocument('<BODY>x</BODY>'), true);
    assert.equal(isFullDocument('<div>x</div>'), false);
    assert.equal(isFullDocument(undefined), false);
  });
});
