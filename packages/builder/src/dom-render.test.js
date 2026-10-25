import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { defaultPalette } from './palette.js';
import { renderNodeToElement } from './dom-render.js';

const doc = new Window().document;

describe('renderNodeToElement — canvas markup carries the component contract', () => {
  test('a button node renders with a bare variant, not data-bn or data-variant', () => {
    const palette = defaultPalette();
    const node = { id: 'n1', type: 'button', props: { ...palette.get('button').defaults } };
    const el = renderNodeToElement(doc, node, palette);
    assert.equal(el.tagName, 'BUTTON');
    assert.equal(el.getAttribute('variant'), 'primary');
    assert.equal(el.hasAttribute('data-bn'), false);
    assert.equal(el.hasAttribute('data-variant'), false);
    assert.equal(el.hasAttribute('data-size'), false);
    assert.equal(el.hasAttribute('size'), false);
    assert.equal(el.getAttribute('type'), 'button');
    assert.equal(el.textContent, 'Click me');
  });

  test('the builder selection keys ride alongside the catalog addressing', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n2', type: 'button', props: { text: 'Go' } }, palette);
    assert.equal(el.dataset.bnType, 'button');
    assert.equal(el.dataset.bnNode, 'n2');
    assert.equal(el.hasAttribute('data-bn'), false);
  });

  test('a user-supplied data-bn prop still serialises, on a plain element', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n3', type: 'text', props: { text: 'Go', 'data-bn': 'custom' } }, palette);
    assert.equal(el.getAttribute('data-bn'), 'custom');
  });

  test('a hero node renders as the catalog figure with its figcaption specimen', () => {
    const palette = defaultPalette();
    const node = { id: 'n5', type: 'hero', props: { ...palette.get('hero').defaults } };
    const el = renderNodeToElement(doc, node, palette);
    assert.equal(el.tagName, 'FIGURE');
    assert.equal(el.getAttribute('variant'), 'stacked');
    assert.equal(el.hasAttribute('data-bn'), false);
    const caption = el.querySelector('figcaption');
    assert.ok(caption, 'hero renders its figcaption');
    assert.equal(caption.querySelector('h1').textContent, 'Title');
  });

  test('a checkbox node renders as the catalog label composition, state on the inner input', () => {
    const palette = defaultPalette();
    const node = { id: 'n6', type: 'checkbox', props: { text: 'Agree', checked: true } };
    const el = renderNodeToElement(doc, node, palette);
    assert.equal(el.tagName, 'LABEL');
    assert.equal(el.hasAttribute('checked'), false);
    const input = el.querySelector('input');
    assert.equal(input.getAttribute('variant'), 'checkbox');
    assert.equal(input.getAttribute('type'), 'checkbox');
    assert.equal(input.getAttribute('checked'), 'true');
    assert.match(el.textContent, /Agree/);
  });

  test('elements with no component counterpart get no data-bn', () => {
    const palette = defaultPalette();
    const el = renderNodeToElement(doc, { id: 'n4', type: 'heading', props: { level: 'h1', text: 'Hi' } }, palette);
    assert.equal(el.tagName, 'H1');
    assert.equal(el.hasAttribute('data-bn'), false);
  });

  test('a legacy organism keeps its data-bn token on the canvas', () => {
    const palette = defaultPalette();
    const node = { id: 'n7', type: 'window', props: { ...palette.get('window').defaults } };
    const el = renderNodeToElement(doc, node, palette);
    assert.equal(el.getAttribute('data-bn'), 'bn-window');
    assert.equal(el.hasAttribute('variant'), false);
  });
});
