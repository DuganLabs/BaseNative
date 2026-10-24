import { readFileSync } from 'node:fs';
import { render } from '@basenative/server';

const template = readFileSync(new URL('./catalog.html', import.meta.url), 'utf-8');

export function renderCatalog(products, { title = 'Product Catalog', sale = true } = {}) {
  return render(template, { title, sale, products });
}
