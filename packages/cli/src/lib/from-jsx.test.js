import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fromJsx } from './from-jsx.js';

describe('fromJsx', () => {
  it('rewrites the React habits a first draft emits', () => {
    const { code, notes } = fromJsx(`import { useState } from 'react';
export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button className="item" onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}`);
    assert.match(code, /const count = signal\(0\)/);
    assert.match(code, /class="item"/);
    assert.match(code, /@click="setCount\(count \+ 1\)"/);
    assert.match(code, /\{\{ count \}\}/);
    assert.ok(notes.some((n) => n.includes('count.set')));
  });

  it('turns an expression className into :class and htmlFor into for', () => {
    const { code } = fromJsx('<label htmlFor="email" className={on ? \'a\' : \'b\'}>Email</label>');
    assert.match(code, /for="email"/);
    assert.match(code, /:class="on \? 'a' : 'b'"/);
  });

  it('does not rewrite braces inside a script', () => {
    const { code } = fromJsx('<script>const o = { count };</script><p>{name}</p>');
    assert.match(code, /\{ count \}/);
    assert.match(code, /\{\{ name \}\}/);
  });
});