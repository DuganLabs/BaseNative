import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';

describe('render', () => {
  it('renders expressions with the shared CSP-safe evaluator', () => {
    const html = render('<p>{{ count + 1 }}</p>', { count: 2 });
    assert.equal(html, '<p>3</p>');
  });

  it('renders tracked loops and emits hydratable markers when requested', () => {
    const html = render(`
      <ul>
        <template @for="item of items; track item.id">
          <li>{{ item.name }}</li>
        </template>
      </ul>
    `, {
      items: [
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Beta' },
      ],
    }, {
      hydratable: true,
    });

    assert.match(html, /<!--bn:for-->/);
    assert.match(html, /<!--bn:for:item:key=1-->/);
    assert.match(html, /<li>Alpha<\/li>/);
    assert.match(html, /<li>Beta<\/li>/);
  });

  it('reports duplicate tracked keys during server render', () => {
    const diagnostics = [];
    render(`
      <template @for="item of items; track item.id">
        <p>{{ item.name }}</p>
      </template>
    `, {
      items: [
        { id: 1, name: 'Alpha' },
        { id: 1, name: 'Duplicate' },
      ],
    }, {
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic);
      },
    });

    assert.ok(diagnostics.some(entry => entry.code === 'BN_FOR_DUPLICATE_TRACK_KEY'));
  });
});
