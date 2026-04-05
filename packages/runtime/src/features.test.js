import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectBrowserFeatures, supportsFeature } from './features.js';

describe('browser feature detection', () => {
  it('detects available platform features', () => {
    const features = detectBrowserFeatures({
      HTMLElement: {
        prototype: {
          showPopover() {},
        },
      },
      HTMLDialogElement: {
        prototype: {
          showModal() {},
        },
      },
      CSS: {
        supports(rule) {
          return rule === 'anchor-name: --bn-anchor' || rule === 'appearance: base-select';
        },
      },
    });

    assert.deepEqual(features, {
      dialog: true,
      popover: true,
      anchorPositioning: false,
      baseSelect: true,
    });
  });

  it('returns false for unsupported features', () => {
    assert.equal(supportsFeature('popover', {}), false);
  });

  it('detects anchor positioning when both CSS rules supported', () => {
    const features = detectBrowserFeatures({
      CSS: {
        supports(rule) {
          return rule.includes('anchor-name') || rule.includes('position-anchor');
        },
      },
    });
    assert.equal(features.anchorPositioning, true);
  });

  it('detects webkit base-select variant', () => {
    const features = detectBrowserFeatures({
      CSS: {
        supports(rule) {
          return rule === '-webkit-appearance: base-select';
        },
      },
    });
    assert.equal(features.baseSelect, true);
  });

  it('all features false when target has no relevant APIs', () => {
    const features = detectBrowserFeatures({});
    assert.equal(features.dialog, false);
    assert.equal(features.popover, false);
    assert.equal(features.anchorPositioning, false);
    assert.equal(features.baseSelect, false);
  });

  it('supportsFeature returns true when dialog is present', () => {
    const target = {
      HTMLDialogElement: { prototype: { showModal() {} } },
    };
    assert.equal(supportsFeature('dialog', target), true);
  });

  it('supportsFeature returns false for missing CSS feature', () => {
    assert.equal(supportsFeature('anchorPositioning', {}), false);
  });
});
