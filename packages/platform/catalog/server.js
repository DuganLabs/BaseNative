/**
 * Serves the platform catalog. `node catalog/server.js [port]`.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogPage } from '../src/catalog.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 4317);

const files = {
  '/tokens.css': ['src/tokens.css', 'text/css'],
  '/components.css': ['src/components.css', 'text/css'],
  '/catalog.css': ['src/catalog.css', 'text/css'],
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(catalogPage());
    return;
  }
  const known = files[url.pathname];
  if (known) {
    res.writeHead(200, { 'content-type': `${known[1]}; charset=utf-8` });
    res.end(readFileSync(join(root, known[0])));
    return;
  }
  if (url.pathname.startsWith('/src/') && url.pathname.endsWith('.js')) {
    const rel = normalize(url.pathname.slice(1));
    if (rel.startsWith('..') || !rel.startsWith('src/')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(readFileSync(join(root, rel)));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`catalog http://127.0.0.1:${port}`);
});
