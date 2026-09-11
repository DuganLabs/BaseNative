import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyBatch, classifyChange, ROUTES, UPDATE } from './protocol.js';

describe('classifyChange', () => {
  it('treats stylesheets as a style-only swap', () => {
    assert.equal(classifyChange('public/app.css'), UPDATE.style);
    assert.equal(classifyChange('src/views/theme.CSS'), UPDATE.style);
  });

  it('treats browser-delivered JavaScript as a hard reload', () => {
    assert.equal(classifyChange('public/app.js'), UPDATE.hard);
    assert.equal(classifyChange('examples/express/public/basenative.js'), UPDATE.hard);
    assert.equal(classifyChange('static/vendor/chart.mjs'), UPDATE.hard);
    assert.equal(classifyChange('client/boot.js'), UPDATE.hard);
  });

  it('treats server code and templates as a soft patch', () => {
    assert.equal(classifyChange('server.js'), UPDATE.soft);
    assert.equal(classifyChange('src/page.js'), UPDATE.soft);
    assert.equal(classifyChange('views/home.html'), UPDATE.soft);
    assert.equal(classifyChange('data/tasks.json'), UPDATE.soft);
  });

  it('normalises Windows separators', () => {
    assert.equal(classifyChange('public\\app.js'), UPDATE.hard);
  });
});

describe('classifyBatch', () => {
  it('takes the most conservative kind in the batch', () => {
    assert.equal(classifyBatch(['a.css', 'b.css']), UPDATE.style);
    assert.equal(classifyBatch(['a.css', 'views/home.html']), UPDATE.soft);
    assert.equal(classifyBatch(['a.css', 'views/home.html', 'public/app.js']), UPDATE.hard);
  });

  it('defaults to style for an empty batch so nothing reloads by accident', () => {
    assert.equal(classifyBatch([]), UPDATE.style);
    assert.equal(classifyBatch(undefined), UPDATE.style);
  });
});

describe('routes', () => {
  it('all live under a single unlikely-to-collide prefix', () => {
    for (const route of Object.values(ROUTES)) {
      assert.match(route, /^\/__bn_hmr\//);
    }
  });
});
