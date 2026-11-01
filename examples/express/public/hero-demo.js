/**
 * The home hero's live counter. The server renders a static button (the
 * no-script view); this swaps in the template copy that carries the
 * directives and hydrates it with the same runtime every page loads, so
 * the code beside it is the code that runs.
 */
import { signal, hydrate } from '/basenative.js';

const mount = document.querySelector('[data-bn-hero-demo-live]');
const source = document.querySelector('template[data-bn-hero-demo-source]');

if (mount && source) {
  const count = signal(0);
  const increment = () => count.set(count() + 1);
  mount.replaceChildren(source.content.cloneNode(true));
  hydrate(mount, { count, increment });
}
