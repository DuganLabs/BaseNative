// Built with BaseNative — basenative.dev
// Path helpers — used by the bn-claude CLI to locate the bundled templates.

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the package root (one above src/). */
export const PACKAGE_ROOT = resolve(__dirname, '..');

/** Each template kind we ship — directory under PACKAGE_ROOT, target under .claude/. */
export const TEMPLATE_KINDS = [
  { name: 'agents', src: 'agents', dest: 'agents', glob: '*.md' },
  { name: 'skills', src: 'skills', dest: 'skills', glob: '*.md' },
  { name: 'commands', src: 'commands', dest: 'commands', glob: '*.md' },
  { name: 'hooks', src: 'hooks', dest: 'hooks', glob: '*.sh', mode: 0o755 },
];

/** The settings template ships separately from the kinds above. */
export const SETTINGS_TEMPLATE = join(PACKAGE_ROOT, 'settings', 'settings.template.json');
export const CLAUDE_MD_TEMPLATE = join(PACKAGE_ROOT, 'CLAUDE.md.tmpl');
