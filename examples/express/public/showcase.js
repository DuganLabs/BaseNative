// The showcase's demos are live server renders from the Holy Trinity
// catalog (examples/express/trinity-catalog.js) — this script wires only
// the page's own furniture: the section filter and the table-of-contents
// tracking. Component behaviour arrives with the catalog's hydration
// work, not with per-page copies of it.

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

ready(() => {
  wireShowcaseFilter();
  wireShowcaseToc();
});

function wireShowcaseFilter() {
  const input = document.querySelector('[data-bn-showcase-q]');
  const clear = document.querySelector('[data-bn-showcase-clear]');
  if (!input) return;
  const sections = [...document.querySelectorAll('[data-bn-showcase-section]')];
  const tocLinks = [...document.querySelectorAll('[data-bn-showcase-toc-link]')];
  const results = document.querySelector('[data-bn-showcase-search]') || document.documentElement;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const sec of sections) {
      const title = (sec.getAttribute('data-bn-title') || '').toLowerCase();
      const cat = (sec.getAttribute('data-bn-category') || '').toLowerCase();
      const captions = [...sec.querySelectorAll('figcaption')]
        .map((f) => f.textContent.toLowerCase())
        .join(' ');
      const match = !q || title.includes(q) || cat.includes(q) || captions.includes(q);
      sec.toggleAttribute('hidden', !match);
      if (match) visible++;
    }
    for (const link of tocLinks) {
      const id = link.getAttribute('data-bn-target');
      const target = id && document.getElementById(id);
      link.toggleAttribute('hidden', !target || target.hasAttribute('hidden'));
    }
    results.toggleAttribute('data-bn-showcase-empty', visible === 0);
  };
  input.addEventListener('input', apply);
  clear?.addEventListener('click', () => {
    input.value = '';
    apply();
    input.focus();
  });
}

function wireShowcaseToc() {
  const links = document.querySelectorAll('[data-bn-showcase-toc-link]');
  if (links.length === 0) return;
  const sections = [...document.querySelectorAll('[data-bn-showcase-section]')];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          for (const link of links) {
            if (link.getAttribute('data-bn-target') === id)
              link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          }
        }
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const sec of sections) observer.observe(sec);
}
