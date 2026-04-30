/**
 * Calendar / Pipeline block — drag-and-drop scheduling component.
 *
 * Renders a CSS-grid-based weekly calendar with draggable event blocks.
 * Uses native HTML5 Drag and Drop API. No external dependencies.
 *
 * Usage (SSR):
 *   renderCalendar({
 *     startDate: '2025-06-02',
 *     events: [{ id: '1', title: 'Job', start: '2025-06-02T09:00', end: '2025-06-02T11:00', ... }],
 *     hours: { start: 7, end: 19 },
 *   })
 *
 * Client-side: initCalendarDragDrop(container, { onDrop })
 */

/**
 * Format an ISO date string to a short day label.
 */
function formatDay(dateStr) {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Get array of date strings (YYYY-MM-DD) for a week starting at startDate.
 */
function weekDates(startDate) {
  const dates = [];
  const d = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const iso = d.toISOString().split('T')[0];
    dates.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Server-side render a weekly calendar grid with event blocks.
 *
 * @param {object} options
 * @param {string} options.startDate      ISO date for the week start (Monday)
 * @param {Array}  options.events         Array of event objects
 * @param {string} options.events[].id
 * @param {string} options.events[].title
 * @param {string} options.events[].start ISO datetime
 * @param {string} options.events[].end   ISO datetime
 * @param {string} [options.events[].status]   Optional status for styling
 * @param {string} [options.events[].color]    Optional CSS color override
 * @param {string} [options.events[].assignee] Optional assignee name
 * @param {object} [options.hours]         Working hours range
 * @param {number} [options.hours.start=7]
 * @param {number} [options.hours.end=19]
 * @param {string} [options.emptyMessage='No events']
 * @param {string} [options.id]
 * @param {string} [options.attrs]
 * @returns {string} HTML
 */
export function renderCalendar(options = {}) {
  const {
    startDate,
    events = [],
    hours = {},
    emptyMessage = 'No events',
    id = `bn-calendar-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const hourStart = hours.start ?? 7;
  const hourEnd = hours.end ?? 19;
  const totalHours = hourEnd - hourStart;
  const dates = weekDates(startDate);

  // Header row: time gutter + 7 day columns
  const headerCells = dates
    .map((d) => `<div data-bn="calendar-day-header" data-date="${d}">${formatDay(d)}</div>`)
    .join('');

  // Time gutter labels
  const timeLabels = [];
  for (let h = hourStart; h < hourEnd; h++) {
    const label = h <= 12 ? `${h}am` : `${h - 12}pm`;
    timeLabels.push(
      `<div data-bn="calendar-time-label" data-hour="${h}" style="grid-row: ${h - hourStart + 2}">${h === 12 ? '12pm' : label}</div>`,
    );
  }

  // Day columns with drop zones
  const dayColumns = dates
    .map((date, colIndex) => {
      const dayEvents = events.filter((e) => e.start && e.start.startsWith(date));

      const eventBlocks = dayEvents
        .map((ev) => {
          const startHour = new Date(ev.start).getHours() + new Date(ev.start).getMinutes() / 60;
          const endHour = new Date(ev.end).getHours() + new Date(ev.end).getMinutes() / 60;
          const topRow = Math.max(startHour - hourStart + 2, 2);
          const span = Math.max(endHour - startHour, 0.5);
          const statusAttr = ev.status ? ` data-status="${ev.status}"` : '';
          const colorStyle = ev.color ? ` --bn-calendar-event-color: ${ev.color};` : '';

          return `<div data-bn="calendar-event" draggable="true" data-event-id="${ev.id}"${statusAttr} style="grid-row: ${topRow} / span ${Math.ceil(span)};${colorStyle}">
  <span data-bn="calendar-event-title">${ev.title}</span>
  ${ev.assignee ? `<span data-bn="calendar-event-assignee">${ev.assignee}</span>` : ''}
  <span data-bn="calendar-event-time">${new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
</div>`;
        })
        .join('');

      // Drop zone cells for each hour
      const hourSlots = [];
      for (let h = hourStart; h < hourEnd; h++) {
        hourSlots.push(
          `<div data-bn="calendar-slot" data-date="${date}" data-hour="${h}" style="grid-row: ${h - hourStart + 2}"></div>`,
        );
      }

      return `<div data-bn="calendar-day-column" data-date="${date}" style="grid-column: ${colIndex + 2}">
  ${hourSlots.join('')}
  ${eventBlocks}
</div>`;
    })
    .join('');

  return `<div data-bn="calendar" id="${id}" ${attrs}>
  <div data-bn="calendar-grid" style="--bn-calendar-hours: ${totalHours}; --bn-calendar-cols: 7;">
    <div data-bn="calendar-corner"></div>
    ${headerCells}
    <div data-bn="calendar-time-gutter">
      ${timeLabels.join('')}
    </div>
    ${dayColumns}
  </div>
  ${events.length === 0 ? `<div data-bn="calendar-empty">${emptyMessage}</div>` : ''}
</div>`;
}

/**
 * Render a pipeline/kanban block for use outside the calendar
 * (e.g., sidebar cards that can be dragged onto the calendar).
 *
 * @param {object} options
 * @param {string} options.id
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {string} [options.status]
 * @param {string} [options.attrs]
 * @returns {string} HTML
 */
export function renderPipelineBlock(options = {}) {
  const { id, title, subtitle, status, attrs = '' } = options;
  const statusAttr = status ? ` data-status="${status}"` : '';

  return `<div data-bn="pipeline-block" draggable="true" data-block-id="${id}"${statusAttr} ${attrs}>
  <span data-bn="pipeline-block-title">${title}</span>
  ${subtitle ? `<span data-bn="pipeline-block-subtitle">${subtitle}</span>` : ''}
</div>`;
}

/**
 * Render a kanban-style pipeline view with draggable columns and cards.
 *
 * @param {object} options
 * @param {Array} options.columns - Column definitions: [{ id: 'new', title: 'New Leads' }, ...]
 * @param {Array} options.cards - Card definitions: [{ id: 'c1', columnId: 'new', title: 'Acme Corp', ... }, ...]
 * @param {string} [options.id] - Container ID
 * @param {string} [options.emptyMessage] - Message when no cards
 * @param {string} [options.attrs] - Additional attributes
 * @returns {string} HTML
 */
export function renderPipeline(options = {}) {
  const {
    columns = [],
    cards = [],
    id = `bn-pipeline-${Math.random().toString(36).slice(2)}`,
    emptyMessage = 'No items',
    attrs = '',
  } = options;

  const columnElems = columns
    .map((col) => {
      const colCards = cards.filter((c) => c.columnId === col.id);
      const cardsHtml = colCards
        .map((card) => {
          const statusAttr = card.status ? ` data-status="${card.status}"` : '';
          return `<article data-bn="pipeline-card" data-card-id="${card.id}" draggable="true"${statusAttr}>
  <div data-bn="pipeline-card-title">${card.title}</div>
  ${card.subtitle ? `<div data-bn="pipeline-card-subtitle">${card.subtitle}</div>` : ''}
  ${card.description ? `<div data-bn="pipeline-card-description">${card.description}</div>` : ''}
</article>`;
        })
        .join('');

      return `<section data-bn="pipeline-column" data-column-id="${col.id}">
  <header data-bn="pipeline-column-header">${col.title}</header>
  <div data-bn="pipeline-column-cards">
    ${cardsHtml || `<div data-bn="pipeline-empty">${emptyMessage}</div>`}
  </div>
</section>`;
    })
    .join('');

  return `<div data-bn="pipeline" id="${id}" ${attrs}>
  ${columnElems}
</div>`;
}

/**
 * Client-side: Initialize drag-and-drop on a calendar container.
 *
 * @param {HTMLElement} container  The [data-bn="calendar"] element
 * @param {object} callbacks
 * @param {function} callbacks.onDrop  Called with { eventId, date, hour, sourceType }
 * @returns {{ destroy: () => void }}
 */
export function initCalendarDragDrop(container, callbacks = {}) {
  const { onDrop } = callbacks;

  function handleDragStart(e) {
    const event = e.target.closest('[data-event-id]');
    const block = e.target.closest('[data-block-id]');
    if (event) {
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          type: 'event',
          id: event.dataset.eventId,
        }),
      );
      e.dataTransfer.effectAllowed = 'move';
      event.setAttribute('data-dragging', '');
    } else if (block) {
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          type: 'pipeline',
          id: block.dataset.blockId,
        }),
      );
      e.dataTransfer.effectAllowed = 'copy';
      block.setAttribute('data-dragging', '');
    }
  }

  function handleDragOver(e) {
    const slot = e.target.closest('[data-bn="calendar-slot"]');
    if (slot) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.setAttribute('data-drop-target', '');
    }
  }

  function handleDragLeave(e) {
    const slot = e.target.closest('[data-bn="calendar-slot"]');
    if (slot) {
      slot.removeAttribute('data-drop-target');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('[data-bn="calendar-slot"]');
    if (!slot) return;

    slot.removeAttribute('data-drop-target');

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (onDrop) {
        onDrop({
          eventId: data.id,
          date: slot.dataset.date,
          hour: parseInt(slot.dataset.hour, 10),
          sourceType: data.type,
        });
      }
    } catch {
      /* ignore malformed drag data */
    }
  }

  function handleDragEnd() {
    container
      .querySelectorAll('[data-dragging]')
      .forEach((el) => el.removeAttribute('data-dragging'));
    container
      .querySelectorAll('[data-drop-target]')
      .forEach((el) => el.removeAttribute('data-drop-target'));
  }

  container.addEventListener('dragstart', handleDragStart);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragleave', handleDragLeave);
  container.addEventListener('drop', handleDrop);
  container.addEventListener('dragend', handleDragEnd);

  return {
    destroy() {
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      container.removeEventListener('dragend', handleDragEnd);
    },
  };
}

/**
 * Client-side: Initialize drag-and-drop on a pipeline container.
 *
 * @param {HTMLElement} container  The [data-bn="pipeline"] element
 * @param {object} callbacks
 * @param {function} callbacks.onCardMove  Called with { cardId, targetColumnId, position }
 * @returns {{ destroy: () => void }}
 */
export function initPipelineDragDrop(container, callbacks = {}) {
  const { onCardMove } = callbacks;

  function handleDragStart(e) {
    const card = e.target.closest('[data-card-id]');
    if (!card) return;

    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        type: 'pipeline-card',
        cardId: card.dataset.cardId,
      }),
    );
    e.dataTransfer.effectAllowed = 'move';
    card.setAttribute('data-dragging', '');
  }

  function handleDragOver(e) {
    const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
    if (cardArea) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      cardArea.setAttribute('data-drop-target', '');
    }
  }

  function handleDragLeave(e) {
    if (!e.target.closest('[data-card-id]')) {
      container
        .querySelectorAll('[data-drop-target]')
        .forEach((el) => el.removeAttribute('data-drop-target'));
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
    if (!cardArea) return;

    cardArea.removeAttribute('data-drop-target');

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const targetColumn = cardArea.closest('[data-column-id]');
      if (onCardMove && targetColumn) {
        onCardMove({
          cardId: data.cardId,
          targetColumnId: targetColumn.dataset.columnId,
          position: null,
        });
      }
    } catch {
      /* ignore malformed drag data */
    }
  }

  function handleDragEnd() {
    container
      .querySelectorAll('[data-dragging]')
      .forEach((el) => el.removeAttribute('data-dragging'));
    container
      .querySelectorAll('[data-drop-target]')
      .forEach((el) => el.removeAttribute('data-drop-target'));
  }

  container.addEventListener('dragstart', handleDragStart);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragleave', handleDragLeave);
  container.addEventListener('drop', handleDrop);
  container.addEventListener('dragend', handleDragEnd);

  return {
    destroy() {
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      container.removeEventListener('dragend', handleDragEnd);
    },
  };
}
