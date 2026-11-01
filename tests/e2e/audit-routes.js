// The routes and widths every audit suite walks: the site's pages and one
// page per catalog component.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'components',
  'src',
);
const COMPONENTS = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SRC, d.name, 'index.html')))
  .map((d) => d.name);

export const ROUTES = [
  '/',
  '/compare/',
  '/components/',
  '/docs/',
  '/ai/',
  '/playground/',
  '/builder/',
  ...COMPONENTS.map((c) => `/components/${c}/`),
];
export const WIDTHS = [320, 393, 768, 1024, 1100, 1280, 1440];
