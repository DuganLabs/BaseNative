import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { defaultPalette } from './palette.js';
import { renderNodeToElement } from './dom-render.js';

const doc = new Window().document;

describe('renderNodeToElement — canvas markup carries the component contract', () => {
  test('a button node renders with data-bn="button" and data-variant, not a bare variant', () => {
    const palette = defaultPalette();
    const node = { id: 'n1', type: 'button', props: { ...palette.get('button').defaults } };
    const el = renderNodeToElement(doc, node, palette);
    assert.equal(el.tagName, 'BUTTON');
    assert.equal(el.getAttribute('data-bn'), 'button');
    assert.equal(el.dataset.variant, 'primary');
    assert.equal(el.dataset.size, 'default');
    assert.equal(el.hasAttribute('variant'), false);
    assert.equal(el.hasAttribute('size'), false);
    assert.equal(el.getAttribute('type'), 'button');
    assert.equal(el.textContent, 'Click me');
  });

  test('the builder selection key data-bn-type is kept alongside data-bn', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n2', type: 'button', props: { text: 'Go' } }, palette);
    assert.equal(el.dataset.bnType, 'button');
    assert.equal(el.dataset.bnNode, 'n2');
    assert.equal(el.getAttribute('data-bn'), 'button');
  });

  test('a user-supplied data-bn prop wins over the palette token', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n3', type: 'button', props: { text: 'Go', 'data-bn': 'custom' } }, palette);
    assert.equal(el.getAttribute('data-bn'), 'custom');
  });

  test('elements with no component counterpart get no data-bn', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n4', type: 'heading', props: { level: 'h1', text: 'Hi' } }, palette);
    assert.equal(el.tagName, 'H1');
    assert.equal(el.hasAttribute('data-bn'), false);
  });
});
