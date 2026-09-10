/**
 * XSS regression tests for SSR output escaping.
 *
 * render() previously performed no escaping at all, so any app rendering
 * user-supplied data was injectable. Unlike the evaluator sandbox escape, this
 * needed no malicious template — ordinary templates plus untrusted data.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';
import { raw } from '@basenative/runtime/shared/escape';

describe('text interpolation escaping', () => {
  it('escapes a script tag', () => {
    assert.equal(
      render('<p>{{ v }}</p>', { v: '<script>alert(1)</script>' }),
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
  });

  it('escapes an img onerror payload', () => {
    const out = render('<p>{{ v }}</p>', { v: '<img src=x onerror=alert(1)>' });
    assert.ok(!out.includes('<img'), 'raw tag reached the output');
    assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  it('escapes ampersands exactly once', () => {
    assert.equal(render('<p>{{ v }}</p>', { v: 'a & b' }), '<p>a &amp; b</p>');
    assert.equal(render('<p>{{ v }}</p>', { v: '&lt;' }), '<p>&amp;lt;</p>');
  });

  it('leaves static template markup untouched', () => {
    assert.equal(
      render('<p><strong>bold</strong> {{ v }}</p>', { v: 'x' }),
      '<p><strong>bold</strong> x</p>'
    );
  });

  it('renders null and undefined as empty, not as text', () => {
    assert.equal(render('<p>{{ v }}</p>', { v: null }), '<p></p>');
    assert.equal(render('<p>{{ v }}</p>', {}), '<p></p>');
  });
});

describe('attribute escaping', () => {
  it('prevents breaking out of a quoted attribute', () => {
    const out = render('<div title="{{ v }}">x</div>', { v: '" onmouseover="alert(1)' });
    assert.equal(out, '<div title="&quot; onmouseover=&quot;alert(1)">x</div>');
    // The decisive property: exactly one attribute survives.
    assert.ok(!/onmouseover=/.test(out.replace(/&quot;/g, '')) || out.includes('&quot;'));
  });

  it('escapes a bound :attr value', () => {
    assert.equal(
      render('<div :title="v">x</div>', { v: '"><script>alert(1)</script>' }),
      '<div title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">x</div>'
    );
  });

  it('escapes a bare double quote in a bound :attr value', () => {
    // Pins the final quote-strip at the attribute serialisation sink itself
    // (packages/server/src/render.js), not just the upstream escapeAttr() call.
    assert.equal(render('<div :title="v">x</div>', { v: 'x"y' }), '<div title="x&quot;y">x</div>');
  });
});

describe('URL scheme guard', () => {
  // HTML escaping cannot neutralise these: javascript:alert(1) contains no
  // character that escaping touches.
  for (const [label, value] of [
    ['javascript:', 'javascript:alert(1)'],
    ['mixed case', 'JaVaScRiPt:alert(1)'],
    ['leading space', ' javascript:alert(1)'],
    ['embedded tab', `java${String.fromCharCode(9)}script:alert(1)`],
    ['data: html', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript:', 'vbscript:msgbox(1)'],
  ]) {
    it(`drops the attribute for ${label}`, () => {
      const out = render('<a :href="v">go</a>', { v: value });
      assert.ok(!out.includes('href='), `emitted href for ${label}: ${out}`);
    });
  }

  it('preserves safe URLs and escapes their ampersands', () => {
    assert.equal(
      render('<a :href="v">go</a>', { v: 'https://example.com/x?a=1&b=2' }),
      '<a href="https://example.com/x?a=1&amp;b=2">go</a>'
    );
  });

  it('preserves relative paths and mailto', () => {
    assert.match(render('<a :href="v">go</a>', { v: '/about' }), /href="\/about"/);
    assert.match(render('<a :href="v">go</a>', { v: 'mailto:a@b.c' }), /href="mailto:a@b\.c"/);
  });

  it('guards every URL-bearing attribute, not just href', () => {
    assert.ok(!render('<img :src="v">', { v: 'javascript:alert(1)' }).includes('src='));
    assert.ok(!render('<form :action="v"></form>', { v: 'javascript:alert(1)' }).includes('action='));
  });

  it('reports a diagnostic when it blocks a URL', () => {
    const seen = [];
    render('<a :href="v">go</a>', { v: 'javascript:alert(1)' }, { onDiagnostic: (d) => seen.push(d) });
    assert.equal(seen.length, 1);
    assert.equal(seen[0].code, 'BN_UNSAFE_URL');
  });
});

describe('raw() opt-out', () => {
  it('inserts trusted markup unescaped', () => {
    assert.equal(render('<div>{{ v }}</div>', { v: raw('<em>ok</em>') }), '<div><em>ok</em></div>');
  });

  // Opting one value into raw must not silently make its neighbours raw too.
  it('still escapes non-raw values in the same text node', () => {
    assert.equal(
      render('<div>{{ a }}{{ b }}</div>', { a: raw('<em>ok</em>'), b: '<script>bad</script>' }),
      '<div><em>ok</em>&lt;script&gt;bad&lt;/script&gt;</div>'
    );
  });

  it('does not exempt a value from the URL scheme guard', () => {
    const out = render('<a :href="v">go</a>', { v: raw('javascript:alert(1)') });
    assert.ok(!out.includes('href='), `raw() bypassed the URL guard: ${out}`);
  });
});
