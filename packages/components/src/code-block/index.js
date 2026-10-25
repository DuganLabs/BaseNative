// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'code-block';
export const root = 'figure';

/**
 * The code block: a figure whose caption is the block's header bar —
 * the file name or language, plus any caller-rendered actions (a copy
 * button) — and whose body is the code itself in a pre. The code is
 * data, interpolated and escaped like any other text; nothing in the
 * block is highlighted or executed by the component. The catalog's
 * other figure (the avatar) owns the default and tone addresses on
 * this element; the code block's address is "code".
 *
 * @typedef {object} CodeBlockProps
 * @property {string} code The code text; rendered escaped in the pre.
 * @property {string} [caption] Header-bar text (a file name or language).
 * @property {string} [actionsHtml] Rendered actions for the header bar.
 * @property {string} [variant] A registered variant name.
 */

/** @param {CodeBlockProps} props */
export function create(props) {
  if (!props.code) throw new TypeError('code-block: code is required');

  const code = signal(props.code);
  const caption = signal(props.caption ?? '');
  const actionsHtml = signal(props.actionsHtml ?? '');
  const variant = signal(props.variant ?? 'code');
  const hasHeader = computed(() => caption() !== '' || actionsHtml() !== '');

  return { code, caption, actionsHtml, variant, hasHeader, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('code-block', 'code');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const codeBlock = { name, root, create, registerVariants, template, styles };
export default codeBlock;
