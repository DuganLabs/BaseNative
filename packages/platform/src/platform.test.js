import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectPlatform, applyPlatform } from './platform.js';
import { handleRadioGroupKeydown, handleMenuKeydown } from './behavior.js';

function nav(ua, touch = 0) {
  return { userAgent: ua, maxTouchPoints: touch };
}

test('iPhone, iPad, and Mac resolve to the kit platforms', () => {
  assert.deepEqual(detectPlatform(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')), {
    platform: 'ios',
    device: 'iphone',
  });
  assert.deepEqual(detectPlatform(nav('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')), {
    platform: 'ios',
    device: 'ipad',
  });
  assert.deepEqual(detectPlatform(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')), {
    platform: 'macos',
    control: 'medium',
  });
});

test('a touch Mac is iPadOS, and a coarse pointer elsewhere is iOS', () => {
  assert.equal(detectPlatform(nav('Mozilla/5.0 (Macintosh)', 5)).platform, 'ios');
  assert.equal(detectPlatform(nav('Mozilla/5.0 (Linux)', 2)).device, 'iphone');
  const media = (query) => ({ matches: query === '(hover: none)' });
  assert.equal(detectPlatform(nav('Mozilla/5.0 (X11)'), media).platform, 'ios');
  assert.equal(
    detectPlatform(nav('Mozilla/5.0 (X11; Linux x86_64)'), () => ({ matches: false })).platform,
    'macos',
  );
});

test('applyPlatform does not overwrite an explicit choice', () => {
  const attrs = new Map();
  const root = {
    hasAttribute: (name) => attrs.has(name),
    getAttribute: (name) => attrs.get(name),
    setAttribute: (name, value) => attrs.set(name, value),
  };
  root.setAttribute('data-bn-platform', 'ios');
  applyPlatform(root, { platform: 'macos', control: 'large' });
  assert.equal(root.getAttribute('data-bn-platform'), 'ios');
  assert.equal(root.getAttribute('data-bn-control'), 'large');
});

test('arrow keys move a segmented radio group', () => {
  const radios = [0, 1, 2].map(() => ({
    attributes: {},
    hasAttribute(name) {
      return name === 'disabled' ? false : name in this.attributes;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {
      globalThis.document.activeElement = this;
    },
  }));
  radios[0].setAttribute('aria-checked', 'true');
  globalThis.document = { activeElement: radios[0] };
  const group = {
    getAttribute: () => null,
    querySelectorAll: () => radios,
  };
  const event = {
    key: 'ArrowRight',
    preventDefault() {
      this.prevented = true;
    },
  };
  handleRadioGroupKeydown(event, group);
  assert.equal(event.prevented, true);
  assert.equal(radios[1].getAttribute('aria-checked'), 'true');
  assert.equal(radios[0].getAttribute('aria-checked'), 'false');
  assert.equal(globalThis.document.activeElement, radios[1]);
});

test('escape closes a menu popover', () => {
  let hidden = false;
  const opener = {
    focus() {
      this.focused = true;
    },
  };
  const pop = {
    id: 'menu-1',
    hidePopover() {
      hidden = true;
    },
  };
  const menu = {
    closest: () => pop,
    ownerDocument: { querySelector: () => opener },
    querySelectorAll: () => [],
  };
  handleMenuKeydown({ key: 'Escape' }, menu);
  assert.equal(hidden, true);
  assert.equal(opener.focused, true);
});
