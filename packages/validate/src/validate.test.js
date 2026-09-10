/**
 * Tests for @basenative/validate.
 *
 * The acceptance test for this package is not "does it flag the bad template" but
 * "could a model repair the template from the diagnostic alone, with no docs".
 * Several tests below assert on `suggestion` content for exactly that reason.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateTemplate } from './index.js';
import { ERROR, WARNING } from './codes.js';

/** All diagnostic codes raised for a source. */
const codesFor = (src, opts) => validateTemplate(src, opts).diagnostics.map((d) => d.code);
/** First diagnostic with the given code. */
const first = (src, code, opts) =>
  validateTemplate(src, opts).diagnostics.find((d) => d.code === code);

describe('valid templates', () => {
  it('accepts an @if / @else pair', () => {
    const r = validateTemplate(
      '<template @if="user"><p>{{ user.name }}</p></template><template @else><p>anon</p></template>'
    );
    assert.equal(r.valid, true);
    assert.deepEqual(r.diagnostics, []);
  });

  it('accepts a tracked @for with an attribute binding', () => {
    const r = validateTemplate(
      '<template @for="item of items; track item.id"><li :class="item.cls">{{ item.name }}</li></template>'
    );
    assert.equal(r.valid, true);
  });

  it('accepts @switch with @case and @default', () => {
    const r = validateTemplate(
      '<template @switch="status"><template @case="1">a</template><template @default>b</template></template>'
    );
    assert.equal(r.valid, true);
  });

  it('treats @click on a normal element as an event binding, not control flow', () => {
    const r = validateTemplate('<button @click="save()">go</button>');
    assert.equal(r.valid, true);
  });

  it('accepts @feature / @else, contributed by @basenative/flags', () => {
    const r = validateTemplate(
      '<template @feature="newDashboard"><p>New</p></template><template @else><p>Classic</p></template>'
    );
    assert.equal(r.valid, true);
    assert.deepEqual(r.diagnostics, []);
  });

  it('accepts @feature with no @else', () => {
    const r = validateTemplate('<template @feature="newDashboard"><p>New</p></template>');
    assert.equal(r.valid, true);
  });

  it('accepts @t on a normal element, contributed by @basenative/i18n', () => {
    const r = validateTemplate('<h1 @t="nav.home">Home</h1>');
    assert.equal(r.valid, true);
    assert.deepEqual(r.diagnostics, []);
  });
});

describe('BN_E_FOREIGN_DIRECTIVE', () => {
  it('flags Vue v-if and gives the BaseNative form', () => {
    const d = first('<div v-if="isAdmin">x</div>', 'BN_E_FOREIGN_DIRECTIVE');
    assert.equal(d.severity, ERROR);
    assert.match(d.message, /Vue/);
    assert.equal(d.suggestion, '<template @if="isAdmin">');
  });

  it('rewrites Vue v-for `in` to BaseNative `of` with a track expression', () => {
    const d = first('<li v-for="item in items">x</li>', 'BN_E_FOREIGN_DIRECTIVE');
    assert.equal(d.suggestion, '<template @for="item of items; track item.id">');
  });

  it('rewrites Angular *ngFor', () => {
    const d = first('<li *ngFor="let row of rows">x</li>', 'BN_E_FOREIGN_DIRECTIVE');
    assert.equal(d.suggestion, '<template @for="row of rows; track row.id">');
  });

  it('rewrites Angular property and event binding brackets', () => {
    assert.equal(first('<input [disabled]="busy">', 'BN_E_FOREIGN_DIRECTIVE').suggestion, ':disabled="busy"');
    assert.equal(first('<button (click)="save()">x</button>', 'BN_E_FOREIGN_DIRECTIVE').suggestion, '@click="save()"');
  });

  it('rewrites Svelte on: and bind:', () => {
    assert.equal(first('<button on:click="save()">x</button>', 'BN_E_FOREIGN_DIRECTIVE').suggestion, '@click="save()"');
    assert.equal(first('<input bind:value="name">', 'BN_E_FOREIGN_DIRECTIVE').suggestion, ':value="name"');
  });

  it('flags Alpine x-show', () => {
    assert.ok(codesFor('<div x-show="open">x</div>').includes('BN_E_FOREIGN_DIRECTIVE'));
  });

  // Highest-risk drift: @if IS a BaseNative directive name, so a model that knows
  // Angular 17 will plausibly reach for its block form, which does not parse at all.
  it('flags Angular 17 block control flow', () => {
    const d = first('@if (isAdmin) { <p>x</p> }', 'BN_E_FOREIGN_DIRECTIVE');
    assert.match(d.message, /Angular 17/);
    assert.match(d.suggestion, /<template @if=/);
  });

  it('flags Svelte block syntax', () => {
    assert.ok(codesFor('{#if user}<p>x</p>{/if}').includes('BN_E_FOREIGN_DIRECTIVE'));
  });

  it('flags foreign reactivity primitives', () => {
    for (const src of ['$state(0)', '$derived(a)', '$effect(fn)', 'useState(0)', 'useEffect(fn)', 'useMemo(fn)']) {
      assert.ok(codesFor(`<script>${src}</script>`).includes('BN_E_FOREIGN_DIRECTIVE'), src);
    }
  });

  it('points Svelte runes and React hooks at the right BaseNative primitive', () => {
    assert.match(first('<script>$state(0)</script>', 'BN_E_FOREIGN_DIRECTIVE').suggestion, /signal\(/);
    assert.match(first('<script>useMemo(f)</script>', 'BN_E_FOREIGN_DIRECTIVE').suggestion, /computed\(/);
  });
});

describe('BN_E_CONTROL_FLOW_ON_ELEMENT', () => {
  // On a non-template element every @name becomes an addEventListener, so this
  // class of mistake produces no runtime error at all — hence a dedicated code.
  it('flags @if on a normal element', () => {
    const d = first('<div @if="admin">x</div>', 'BN_E_CONTROL_FLOW_ON_ELEMENT');
    assert.equal(d.severity, ERROR);
    assert.match(d.message, /event listener/);
    assert.match(d.suggestion, /<template @if="admin">/);
  });

  it('flags @for on a normal element', () => {
    assert.ok(codesFor('<li @for="i of items; track i.id">x</li>').includes('BN_E_CONTROL_FLOW_ON_ELEMENT'));
  });
});

describe('BN_E_UNKNOWN_DIRECTIVE', () => {
  it('flags an undefined directive and lists the valid ones', () => {
    const d = first('<template @unless="a">x</template>', 'BN_E_UNKNOWN_DIRECTIVE');
    assert.match(d.suggestion, /@if/);
  });

  it('suggests a near match', () => {
    const d = first('<template @iff="a">x</template>', 'BN_E_UNKNOWN_DIRECTIVE');
    assert.match(d.suggestion, /Did you mean "@if"/);
  });

  it('does not flag @feature — it is a known template directive', () => {
    assert.ok(!codesFor('<template @feature="x">y</template>').includes('BN_E_UNKNOWN_DIRECTIVE'));
  });

  it('lists @feature among the valid directives in a suggestion', () => {
    const d = first('<template @unless="a">x</template>', 'BN_E_UNKNOWN_DIRECTIVE');
    assert.match(d.suggestion, /@feature/);
  });
});

describe('@feature (BN_E_CONTROL_FLOW_ON_ELEMENT / BN_E_ORPHAN_BRANCH)', () => {
  it('flags @feature on a normal element as an event listener, like @if', () => {
    const d = first('<div @feature="newDashboard">x</div>', 'BN_E_CONTROL_FLOW_ON_ELEMENT');
    assert.equal(d.severity, ERROR);
    assert.match(d.message, /event listener/);
  });

  it('does not flag @else governed by @feature as orphaned', () => {
    assert.ok(
      !codesFor(
        '<template @feature="x">a</template><template @else>b</template>'
      ).includes('BN_E_ORPHAN_BRANCH')
    );
  });

  it('still flags @else with neither a preceding @if nor @feature', () => {
    const d = first('<template @else>x</template>', 'BN_E_ORPHAN_BRANCH');
    assert.match(d.message, /@if/);
    assert.match(d.message, /@feature/);
  });

  it('does not run @feature\'s value through expression checking (it is a literal flag name)', () => {
    // A flag name with characters that are not valid expression syntax (a hyphen)
    // must not be flagged as a malformed expression.
    const r = validateTemplate('<template @feature="beta-search">x</template>');
    assert.equal(r.valid, true);
  });
});

describe('BN_E_ORPHAN_BRANCH', () => {
  it('flags @else with no preceding @if', () => {
    const d = first('<template @else>x</template>', 'BN_E_ORPHAN_BRANCH');
    assert.match(d.message, /@if/);
  });

  it('flags @empty with no preceding @for', () => {
    assert.ok(codesFor('<template @empty>x</template>').includes('BN_E_ORPHAN_BRANCH'));
  });

  it('flags @case outside a @switch', () => {
    assert.ok(codesFor('<template @case="1">x</template>').includes('BN_E_ORPHAN_BRANCH'));
  });

  it('does not flag @case inside a @switch', () => {
    assert.ok(
      !codesFor('<template @switch="s"><template @case="1">x</template></template>').includes('BN_E_ORPHAN_BRANCH')
    );
  });
});

describe('BN_E_MALFORMED_FOR', () => {
  it('errors when the expression does not match `item of items`', () => {
    const d = first('<template @for="items">x</template>', 'BN_E_MALFORMED_FOR');
    assert.equal(d.severity, ERROR);
    assert.match(d.suggestion, /of .*; track/);
  });

  // The runtime accepts a missing track, so reporting it as an error would make
  // the validator disagree with the thing it validates.
  it('warns rather than errors when track is missing', () => {
    const d = first('<template @for="i of items">x</template>', 'BN_E_MALFORMED_FOR');
    assert.equal(d.severity, WARNING);
    assert.equal(validateTemplate('<template @for="i of items">x</template>').valid, true);
    assert.equal(d.suggestion, '@for="i of items; track i.id"');
  });
});

describe('BN_E_EXPR_UNSUPPORTED', () => {
  it('flags syntax outside the CSP-safe subset', () => {
    for (const expr of ['(a => a + 1)(2)', 'a ?? b', 'a?.b']) {
      assert.ok(codesFor(`<p>{{ ${expr} }}</p>`).includes('BN_E_EXPR_UNSUPPORTED'), expr);
    }
  });

  it('names the remedy in the suggestion', () => {
    const d = first('<p>{{ (a => a)(1) }}</p>', 'BN_E_EXPR_UNSUPPORTED');
    assert.match(d.suggestion, /named function/);
  });

  // Statically catches the escape that reached Function through key coercion.
  it('flags blocked prototype and constructor access', () => {
    for (const expr of ['x.constructor', 'x["__proto__"]', 'x[["constructor"]]', 'x[{}]']) {
      assert.ok(codesFor(`<p>{{ ${expr} }}</p>`).includes('BN_E_EXPR_UNSUPPORTED'), expr);
    }
  });
});

describe('BN_E_UNBOUND_REF', () => {
  it('is silent when no context is supplied', () => {
    assert.deepEqual(codesFor('<p>{{ whatever }}</p>'), []);
  });

  it('flags a reference absent from the context', () => {
    const d = first('<p>{{ missing }}</p>', 'BN_E_UNBOUND_REF', { context: { present: 1 } });
    assert.equal(d.severity, WARNING);
  });

  it('suggests the nearest key for a typo', () => {
    const d = first('<p>{{ itmes }}</p>', 'BN_E_UNBOUND_REF', { context: { items: [] } });
    assert.match(d.suggestion, /Did you mean "items"/);
    assert.equal(d.confidence, 'medium');
  });

  it('drops to low confidence when nothing is close', () => {
    const d = first('<p>{{ zzzzzz }}</p>', 'BN_E_UNBOUND_REF', { context: { items: [] } });
    assert.equal(d.confidence, 'low');
  });

  it('does not flag a name bound by an enclosing @for', () => {
    const codes = codesFor(
      '<template @for="item of items; track item.id"><p>{{ item.name }}</p></template>',
      { context: { items: [] } }
    );
    assert.ok(!codes.includes('BN_E_UNBOUND_REF'));
  });

  it('does not flag $event or $el', () => {
    const codes = codesFor('<button @click="save($event)">x</button>', { context: { save: () => {} } });
    assert.ok(!codes.includes('BN_E_UNBOUND_REF'));
  });
});

describe('diagnostic shape', () => {
  it('every diagnostic carries the fields a model needs to self-repair', () => {
    const { diagnostics } = validateTemplate(
      '<div v-if="a">{{ b }}</div><template @else>x</template><template @for="c">y</template>',
      { context: {} }
    );
    assert.ok(diagnostics.length > 0);
    for (const d of diagnostics) {
      assert.ok(typeof d.code === 'string' && d.code.startsWith('BN_E_'), d.code);
      assert.ok([ERROR, WARNING].includes(d.severity), d.severity);
      assert.ok(d.message && d.message.length > 10, 'message too thin');
      assert.ok(d.suggestion && d.suggestion.length > 5, `no suggestion for ${d.code}`);
      assert.ok(Number.isInteger(d.span.line) && d.span.line >= 1);
      assert.ok(Number.isInteger(d.span.col) && d.span.col >= 1);
      assert.ok(['high', 'medium', 'low'].includes(d.confidence));
    }
  });

  it('reports spans on the correct line', () => {
    const d = first('<div>\n  <p v-if="a">x</p>\n</div>', 'BN_E_FOREIGN_DIRECTIVE');
    assert.equal(d.span.line, 2);
  });

  it('orders diagnostics by position', () => {
    const { diagnostics } = validateTemplate('<div v-if="a">x</div>\n<div v-show="b">y</div>');
    assert.ok(diagnostics.length >= 2);
    assert.ok(diagnostics[0].span.line <= diagnostics[1].span.line);
  });

  it('valid is false only when an error-severity diagnostic is present', () => {
    assert.equal(validateTemplate('<template @for="i of items">x</template>').valid, true);
    assert.equal(validateTemplate('<div v-if="a">x</div>').valid, false);
  });

  it('handles empty and non-string input without throwing', () => {
    for (const input of ['', null, undefined]) {
      assert.doesNotThrow(() => validateTemplate(input));
    }
  });
});
