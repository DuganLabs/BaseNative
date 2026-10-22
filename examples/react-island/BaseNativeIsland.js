/**
 * Drop-in island for a React host.
 *
 * Mounts a BaseNative template inside a host element and hydrates it.
 * React stays a dependency of the host application. This file does not
 * add React to @basenative/runtime, and the runtime never imports it.
 *
 *   import { createElement } from 'react';
 *   import { BaseNativeIsland } from './BaseNativeIsland.js';
 *   import { signal } from '@basenative/runtime';
 *
 *   const count = signal(0);
 *   createElement(BaseNativeIsland, {
 *     template: '<button type="button" @click="count.set(count() + 1)">{{ count() }}</button>',
 *     context: { count },
 *   });
 */
import { createElement, useEffect, useRef } from 'react';
import { hydrate } from '@basenative/runtime';

export function BaseNativeIsland({ template, context }) {
  const host = useRef(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return undefined;
    node.innerHTML = template;
    const stop = hydrate(node, context);
    return () => {
      stop();
      node.innerHTML = '';
    };
  }, [template, context]);

  return createElement('div', { ref: host });
}
