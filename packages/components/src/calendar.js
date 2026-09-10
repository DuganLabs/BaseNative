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
 *
 * All dates are interpreted in local time: a bare `YYYY-MM-DD` startDate is the
 * local midnight of that day (not UTC), day columns are keyed by local date,
 * and event rows are computed from local hours.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { bindDrag, clearDragState, readDragData } from './internal/drag.js';

/**
 * Parse a date value as local time. `YYYY-MM-DD` would be parsed as UTC by
 * `new Date()`, which shifts the day in any non-UTC zone; build it locally.
 */
function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Local-time `YYYY-MM-DD` for a Date. */
function toLocalDateString(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Format an ISO date string to a short day label.
 */
function formatDay(dateStr) {
  const d = parseLocalDate(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Get array of date strings (YYYY-MM-DD, local) for a week starting at startDate.
 */
function weekDates(startDate) {
  const dates = [];
  const d = parseLocalDate(startDate);
  for (let i = 0; i < 7; i++) {
    dates.push(toLocalDateString(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function localHour(value) {
  const d = new Date(value);
  return d.getHours() + d.getMinutes() / 60;
}

function timeLabel(value) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Server-side render a weekly calendar grid with event blocks.
 *
 * Event title, assignee and emptyMessage are escaped text; ids, status and
 * color are escaped attributes.
 *
 * @param {object} options
 * @param {string} options.startDate      ISO date for the week start (Monday); local time
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
 * @param {string} [options.id]            Defaults to nextId('calendar')
 * @param {string} [options.attrs]         Raw attribute markup appended to the wrapper; not escaped
 * @returns {string} HTML
 */
export function renderCalendar(options = {}) {
  const {
    startDate,
    events = [],
    hours = {},
    emptyMessage = 'No events',
    id = nextId('calendar'),
    attrs = '',
  } = options;

  const hourStart = hours.start ?? 7;
  const hourEnd = hours.end ?? 19;
  const totalHours = hourEnd - hourStart;
  const dates = weekDates(startDate);

  // Header row: time gutter + 7 day columns
  const headerCells = dates.map(d =>
    `<div data-bn="calendar-day-header" data-date="${d}">${formatDay(d)}</div>`
  ).join('');

  // Time gutter labels. Row 1 of the grid is the day-header row (see
  // `grid-template-rows: auto repeat(...)` in components.css), so hour rows
  // start at row 2 — the same convention used by the slots and events below.
  // Labels must share that convention or they land one row above the
  // slot/event they describe.
  const timeLabels = [];
  for (let h = hourStart; h < hourEnd; h++) {
    const label = h <= 12 ? `${h}am` : `${h - 12}pm`;
    timeLabels.push(
      `<div data-bn="calendar-time-label" data-hour="${h}" style="grid-row: ${h - hourStart + 2}">${h === 12 ? '12pm' : label}</div>`
    );
  }

  // Day columns with drop zones
  const dayColumns = dates.map((date, colIndex) => {
    const dayEvents = events.filter(e => e.start && e.start.startsWith(date));

    const eventBlocks = dayEvents.map(ev => {
      const startHour = localHour(ev.start);
      const endHour = localHour(ev.end);
      const topRow = Math.max(startHour - hourStart + 2, 2);
      const span = Math.max(endHour - startHour, 0.5);
      const statusAttr = ev.status ? ` data-status="${escapeAttr(ev.status)}"` : '';
      const colorStyle = ev.color ? ` --bn-calendar-event-color: ${escapeAttr(ev.color)};` : '';

      return `<div data-bn="calendar-event" draggable="true" data-event-id="${escapeAttr(ev.id)}"${statusAttr} title="${escapeAttr(ev.title)}" style="grid-row: ${topRow} / span ${Math.ceil(span)};${colorStyle}">
  <span data-bn="calendar-event-title">${escapeText(ev.title)}</span>
  ${ev.assignee ? `<span data-bn="calendar-event-assignee">${escapeText(ev.assignee)}</span>` : ''}
  <span data-bn="calendar-event-time">${timeLabel(ev.start)} – ${timeLabel(ev.end)}</span>
</div>`;
    }).join('');

    // Drop zone cells for each hour
    const hourSlots = [];
    for (let h = hourStart; h < hourEnd; h++) {
      hourSlots.push(
        `<div data-bn="calendar-slot" data-date="${date}" data-hour="${h}" style="grid-row: ${h - hourStart + 2}"></div>`
      );
    }

    return `<div data-bn="calendar-day-column" data-date="${date}" style="grid-column: ${colIndex + 2}">
  ${hourSlots.join('')}
  ${eventBlocks}
</div>`;
  }).join('');

  return `<div data-bn="calendar" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
  <div data-bn="calendar-grid" style="--bn-calendar-hours: ${totalHours}; --bn-calendar-cols: 7;">
    <div data-bn="calendar-corner"></div>
    ${headerCells}
    <div data-bn="calendar-time-gutter">
      ${timeLabels.join('')}
    </div>
    ${dayColumns}
  </div>
  ${events.length === 0 ? `<div data-bn="calendar-empty">${escapeText(emptyMessage)}</div>` : ''}
</div>`;
}

/**
 * Render a pipeline/kanban block for use outside the calendar
 * (e.g., sidebar cards that can be dragged onto the calendar).
 *
 * @param {object} options
 * @param {string} options.id
 * @param {string} options.title      Escaped text
 * @param {string} [options.subtitle] Escaped text
 * @param {string} [options.status]
 * @param {string} [options.attrs]    Raw attribute markup appended to the block; not escaped
 * @returns {string} HTML
 */
export function renderPipelineBlock(options = {}) {
  const { id, title, subtitle, status, attrs = '' } = options;
  const statusAttr = status ? ` data-status="${escapeAttr(status)}"` : '';

  return `<div data-bn="pipeline-block" draggable="true" data-block-id="${escapeAttr(id)}"${statusAttr}${attrsSuffix(attrs)}>
  <span data-bn="pipeline-block-title">${escapeText(title)}</span>
  ${subtitle ? `<span data-bn="pipeline-block-subtitle">${escapeText(subtitle)}</span>` : ''}
</div>`;
}

/**
 * Render a kanban-style pipeline view with draggable columns and cards.
 *
 * Column titles, card title/subtitle/description and emptyMessage are escaped
 * text; ids and status are escaped attributes.
 *
 * @param {object} options
 * @param {Array} options.columns - Column definitions: [{ id: 'new', title: 'New Leads' }, ...]
 * @param {Array} options.cards - Card definitions: [{ id: 'c1', columnId: 'new', title: 'Acme Corp', ... }, ...]
 * @param {string} [options.id] - Container ID; defaults to nextId('pipeline')
 * @param {string} [options.emptyMessage] - Message when no cards
 * @param {string} [options.attrs] - Raw attribute markup appended to the wrapper; not escaped
 * @returns {string} HTML
 */
export function renderPipeline(options = {}) {
  const {
    columns = [],
    cards = [],
    id = nextId('pipeline'),
    emptyMessage = 'No items',
    attrs = '',
  } = options;

  const columnElems = columns.map(col => {
    const colCards = cards.filter(c => c.columnId === col.id);
    const cardsHtml = colCards.map(card => {
      const statusAttr = card.status ? ` data-status="${escapeAttr(card.status)}"` : '';
      return `<article data-bn="pipeline-card" data-card-id="${escapeAttr(card.id)}" draggable="true"${statusAttr} title="${escapeAttr(card.title)}">
  <div data-bn="pipeline-card-title">${escapeText(card.title)}</div>
  ${card.subtitle ? `<div data-bn="pipeline-card-subtitle">${escapeText(card.subtitle)}</div>` : ''}
  ${card.description ? `<div data-bn="pipeline-card-description">${escapeText(card.description)}</div>` : ''}
</article>`;
    }).join('');

    return `<section data-bn="pipeline-column" data-column-id="${escapeAttr(col.id)}">
  <header data-bn="pipeline-column-header">${escapeText(col.title)}</header>
  <div data-bn="pipeline-column-cards">
    ${cardsHtml || `<div data-bn="pipeline-empty">${escapeText(emptyMessage)}</div>`}
  </div>
</section>`;
  }).join('');

  return `<div data-bn="pipeline" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
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

  return bindDrag(container, {
    dragstart(e) {
      const event = e.target.closest('[data-event-id]');
      const block = e.target.closest('[data-block-id]');
      if (event) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'event',
          id: event.dataset.eventId,
        }));
        e.dataTransfer.effectAllowed = 'move';
        event.setAttribute('data-dragging', '');
      } else if (block) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'pipeline',
          id: block.dataset.blockId,
        }));
        e.dataTransfer.effectAllowed = 'copy';
        block.setAttribute('data-dragging', '');
      }
    },

    dragover(e) {
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (slot) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.setAttribute('data-drop-target', '');
      }
    },

    dragleave(e) {
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (slot) {
        slot.removeAttribute('data-drop-target');
      }
    },

    drop(e) {
      e.preventDefault();
      const slot = e.target.closest('[data-bn="calendar-slot"]');
      if (!slot) return;

      slot.removeAttribute('data-drop-target');

      const data = readDragData(e);
      if (data && onDrop) {
        onDrop({
          eventId: data.id,
          date: slot.dataset.date,
          hour: parseInt(slot.dataset.hour, 10),
          sourceType: data.type,
        });
      }
    },

    dragend() {
      clearDragState(container);
    },
  });
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

  return bindDrag(container, {
    dragstart(e) {
      const card = e.target.closest('[data-card-id]');
      if (!card) return;

      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'pipeline-card',
        cardId: card.dataset.cardId,
      }));
      e.dataTransfer.effectAllowed = 'move';
      card.setAttribute('data-dragging', '');
    },

    dragover(e) {
      const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
      if (cardArea) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cardArea.setAttribute('data-drop-target', '');
      }
    },

    dragleave(e) {
      if (!e.target.closest('[data-card-id]')) {
        container.querySelectorAll('[data-drop-target]').forEach(el =>
          el.removeAttribute('data-drop-target')
        );
      }
    },

    drop(e) {
      e.preventDefault();
      const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
      if (!cardArea) return;

      cardArea.removeAttribute('data-drop-target');

      const data = readDragData(e);
      const targetColumn = cardArea.closest('[data-column-id]');
      if (data && onCardMove && targetColumn) {
        onCardMove({
          cardId: data.cardId,
          targetColumnId: targetColumn.dataset.columnId,
          position: null,
        });
      }
    },

    dragend() {
      clearDragState(container);
    },
  });
}
