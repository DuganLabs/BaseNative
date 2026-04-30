/**
 * Accordion — collapsible sections using native <details>/<summary>.
 */
export function renderAccordion(options = {}) {
  const {
    items = [],
    multiple = false,
    id = `bn-accordion-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const exclusiveName = multiple ? '' : ` name="${id}"`;

  const sectionsHtml = items
    .map((item, _i) => {
      const open = item.open ? ' open' : '';
      return `<details data-bn="accordion-item"${exclusiveName}${open}>
  <summary data-bn="accordion-header">${item.title}</summary>
  <div data-bn="accordion-content">${item.content}</div>
</details>`;
    })
    .join('');

  return `<div data-bn="accordion" id="${id}" ${attrs}>${sectionsHtml}</div>`;
}
