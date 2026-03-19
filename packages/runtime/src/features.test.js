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
});
