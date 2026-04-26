// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defineStation } from '../src/define-station.js';
import { Queue } from '../src/queue.js';
import { OpenAICompatClient } from '../src/client.js';
import { Runner } from '../src/runner.js';

describe('defineStation', () => {
  it('wires client + queue + runner', () => {
    const s = defineStation({ tunnelUrl: 'http://x' });
    assert.ok(s.client instanceof OpenAICompatClient);
    assert.ok(s.queue instanceof Queue);
    assert.ok(s.runner instanceof Runner);
    assert.ok(s.templates['docstring-coverage']);
  });

  it('throws when tunnelUrl missing', () => {
    assert.throws(() => defineStation({}));
  });

  it('threads fallback config into the client', () => {
    const s = defineStation({
      tunnelUrl: 'http://primary',
      fallback: { url: 'http://fallback', model: 'fbm' },
    });
    assert.equal(s.client.fallbackUrl, 'http://fallback');
    assert.equal(s.client.fallbackModel, 'fbm');
  });

  it('returned object is frozen', () => {
    const s = defineStation({ tunnelUrl: 'http://x' });
    assert.throws(() => { s.runner = null; });
  });
});
