// Built with BaseNative — basenative.dev
/**
 * {{name}} — game shell.
 * Wires up the on-screen keyboard and mounts the lobby.
 */
import { mountKeyboard } from '@basenative/keyboard';
import { signal } from '@basenative/runtime';

const lives = signal(4);

const root = document.querySelector('#app');
if (root) {
  root.textContent = `Welcome to {{name}}. Lives: ${lives()}`;
  mountKeyboard?.(root, { onKey: (k) => console.log('key', k) });
}
