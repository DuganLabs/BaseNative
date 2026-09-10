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
 * and events are bucketed into columns and positioned in rows by the local
 * calendar date and hour of their parsed `start`/`end` — so a UTC ISO
 * timestamp (`2025-06-03T03:00:00Z`) lands on the day it falls on in the
 * runtime's zone, not on the day its string happens to begin with. Pass
 * `timeZone` to bucket and position in an IANA zone instead.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { bindDrag, clearDragState, readDragData } from './internal/drag.js';

const DEFAULT_HOURS = { start: 7, end: 19 };
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = n => String(n).padStart(2, '0');

/**
 * Parse a date value as local time. `YYYY-MM-DD` would be parsed as UTC by
 * `new Date()`, which shifts the day in any non-UTC zone; build it locally.
 */
function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  const m = DATE_ONLY.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Local-time `YYYY-MM-DD` for a Date. */
function toLocalDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const zoneFormatters = new Map();

function zoneFormatter(timeZone) {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      throw new Error(
        `renderCalendar: unknown timeZone "${timeZone}" — pass an IANA zone name such as "Europe/London", or omit it to use the runtime's local zone`
      );
    }
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Calendar date (`YYYY-MM-DD`) and fractional hour of a datetime value, in the
 * runtime's local zone or in `timeZone` when given. Unparseable values yield
 * an empty date so the caller can skip them.
 */
function localParts(value, timeZone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '', hour: 0 };
  if (!timeZone) {
    return { date: toLocalDateString(d), hour: d.getHours() + d.getMinutes() / 60 };
  }
  const parts = zoneFormatter(timeZone).formatToParts(d);
  const get = type => Number(parts.find(p => p.type === type)?.value);
  return {
    date: `${get('year')}-${pad(get('month'))}-${pad(get('day'))}`,
    hour: (get('hour') % 24) + get('minute') / 60,
  };
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

function timeLabel(value, timeZone) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

const clampHour = h => Math.min(24, Math.max(0, h));

/**
 * Split every event into the per-day segments that fall inside `dates`. An
 * event whose local end date is after its start date is repeated in each
 * day column it covers, clipped to that day (start→24:00, 0:00→24:00, …,
 * 0:00→end); segments carry `continues` = 'after' | 'both' | 'before'.
 */
function daySegments(events, dates, partsOf) {
  const byDate = new Map(dates.map(d => [d, []]));
  for (const ev of events) {
    if (!ev || !ev.start) continue;
    const s = partsOf(ev.start);
    if (!s.date) continue;
    const e = ev.end ? partsOf(ev.end) : { date: '', hour: s.hour };
    const multiDay = Boolean(e.date && e.date > s.date);
    const lastDate = multiDay ? e.date : s.date;
    const sameDayEnd = e.date === s.date ? e.hour : s.hour;
    for (const date of dates) {
      if (date < s.date || date > lastDate) continue;
      const from = date === s.date ? s.hour : 0;
      const to = date === lastDate ? (multiDay ? e.hour : sameDayEnd) : 24;
      if (multiDay && date !== s.date && to <= 0) continue;
      const continues = !multiDay ? null : date === s.date ? 'after' : date === lastDate ? 'before' : 'both';
      byDate.get(date).push({ ev, from, to, continues });
    }
  }
  return byDate;
}

/**
 * Server-side render a weekly calendar grid with event blocks.
 *
 * Event title, assignee and emptyMessage are escaped text; ids, status and
 * color are escaped attributes.
 *
 * Events are bucketed into day columns by the local calendar date of their
 * parsed `start` (and `end`), never by string prefix, so UTC ISO timestamps
 * land on the correct day. An event that ends on a later local date than it
 * starts is repeated in every day column it covers, clipped to each day, with
 * `data-continues="after" | "both" | "before"` on the segments.
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
 * @param {object} [options.hours]         Working hours range. Whichever bound is
 *   omitted is derived from the rendered events: 7 (or 19) widened to cover the
 *   earliest start / latest end, clamped to 0–24.
 * @param {number} [options.hours.start]
 * @param {number} [options.hours.end]
 * @param {string} [options.timeZone]      IANA zone used to bucket and position
 *   events and to format their times; defaults to the runtime's local zone
 * @param {(value: string) => string} [options.toLocalDate]  Hook returning the
 *   `YYYY-MM-DD` day an event datetime belongs to; overrides day bucketing (and
 *   the `now` → today mapping) only — hour rows still come from `timeZone` /
 *   local getters
 * @param {Date|string|number|null} [options.now]  Instant used to mark today's
 *   header and column with `data-today` (the header also gets
 *   `aria-current="date"`); defaults to `new Date()`. Pass `null` for no marker.
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
    timeZone,
    toLocalDate,
    now = new Date(),
    emptyMessage = 'No events',
    id = nextId('calendar'),
    attrs = '',
  } = options;

  const partsOf = value => {
    const parts = localParts(value, timeZone);
    if (typeof toLocalDate !== 'function') return parts;
    const date = toLocalDate(value);
    return { date: typeof date === 'string' ? date : parts.date, hour: parts.hour };
  };

  const dates = weekDates(startDate);
  const segmentsByDate = daySegments(events, dates, partsOf);

  let hourStart = hours.start;
  let hourEnd = hours.end;
  if (hourStart == null || hourEnd == null) {
    let lo = hourStart ?? DEFAULT_HOURS.start;
    let hi = hourEnd ?? DEFAULT_HOURS.end;
    for (const segments of segmentsByDate.values()) {
      for (const { from, to } of segments) {
        lo = Math.min(lo, Math.floor(from));
        hi = Math.max(hi, Math.ceil(Math.max(to, from + 0.5)));
      }
    }
    hourStart = clampHour(hourStart ?? lo);
    hourEnd = clampHour(hourEnd ?? hi);
  }
  if (hourEnd <= hourStart) {
    hourEnd = Math.min(hourStart + 1, 24);
    hourStart = hourEnd - 1;
  }
  const totalHours = hourEnd - hourStart;

  let today = '';
  if (now != null && now !== false) {
    today = typeof now === 'string' && DATE_ONLY.test(now) ? now : partsOf(now).date;
  }
  const todayAttr = date => (date === today ? ' data-today' : '');

  // Header row: time gutter + 7 day columns
  const headerCells = dates.map(d =>
    `<div data-bn="calendar-day-header" data-date="${d}"${todayAttr(d)}${d === today ? ' aria-current="date"' : ''}>${formatDay(d)}</div>`
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
    const eventBlocks = segmentsByDate.get(date).map(({ ev, from, to, continues }) => {
      const topRow = Math.max(from - hourStart + 2, 2);
      const span = Math.max(to - from, 0.5);
      const rows = Math.max(1, Math.min(Math.ceil(span), totalHours - Math.floor(topRow - 2)));
      const statusAttr = ev.status ? ` data-status="${escapeAttr(ev.status)}"` : '';
      const continuesAttr = continues ? ` data-continues="${continues}"` : '';
      const colorStyle = ev.color ? ` --bn-calendar-event-color: ${escapeAttr(ev.color)};` : '';

      return `<div data-bn="calendar-event" draggable="true" data-event-id="${escapeAttr(ev.id)}"${continuesAttr}${statusAttr} title="${escapeAttr(ev.title)}" style="grid-row: ${topRow} / span ${rows};${colorStyle}">
  <span data-bn="calendar-event-title">${escapeText(ev.title)}</span>
  ${ev.assignee ? `<span data-bn="calendar-event-assignee">${escapeText(ev.assignee)}</span>` : ''}
  <span data-bn="calendar-event-time">${timeLabel(ev.start, timeZone)} – ${timeLabel(ev.end, timeZone)}</span>
</div>`;
    }).join('');

    // Drop zone cells for each hour
    const hourSlots = [];
    for (let h = hourStart; h < hourEnd; h++) {
      hourSlots.push(
        `<div data-bn="calendar-slot" data-date="${date}" data-hour="${h}" style="grid-row: ${h - hourStart + 2}"></div>`
      );
    }

    return `<div data-bn="calendar-day-column" data-date="${date}"${todayAttr(date)} style="grid-column: ${colIndex + 2}">
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
 * Minute offset of a drop inside an hour slot, from the pointer's vertical
 * position, rounded down to `snap`-minute steps. 0 when geometry is unavailable.
 */
function slotMinute(e, slot, snap) {
  const rect = typeof slot.getBoundingClientRect === 'function' ? slot.getBoundingClientRect() : null;
  if (!rect || !(rect.height > 0) || typeof e.clientY !== 'number') return 0;
  const fraction = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 0.999);
  const step = snap > 1 ? snap : 1;
  return Math.min(Math.floor((fraction * 60) / step) * step, 59);
}

/**
 * Client-side: Initialize drag-and-drop on a calendar container.
 *
 * Drops report the slot's `date` and integer `hour`, plus `minute` (the
 * pointer's offset within the slot, snapped down to `snapMinutes`) and
 * `datetime` (`YYYY-MM-DDTHH:MM`, a local datetime string ready for
 * `new Date()`).
 *
 * @param {HTMLElement} container  The [data-bn="calendar"] element
 * @param {object} callbacks
 * @param {function} callbacks.onDrop  Called with { eventId, date, hour, minute, datetime, sourceType }
 * @param {HTMLElement} [callbacks.dragSource]  Element whose `dragstart` events
 *   also supply payloads — a palette or sidebar of `renderPipelineBlock` cards
 *   outside the calendar. Defaults to the container (which always hears its own
 *   events). May be any element, including an ancestor of the container.
 * @param {number} [callbacks.snapMinutes=15]  Minute granularity of `minute`;
 *   1 (or less) reports exact minutes
 * @returns {{ destroy: () => void }}
 */
export function initCalendarDragDrop(container, callbacks = {}) {
  const { onDrop, dragSource, snapMinutes = 15 } = callbacks;

  function dragstart(e) {
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
  }

  const handle = bindDrag(container, {
    dragstart,

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
        const hour = parseInt(slot.dataset.hour, 10);
        const minute = slotMinute(e, slot, snapMinutes);
        onDrop({
          eventId: data.id,
          date: slot.dataset.date,
          hour,
          minute,
          datetime: `${slot.dataset.date}T${pad(hour)}:${pad(minute)}`,
          sourceType: data.type,
        });
      }
    },

    dragend() {
      clearDragState(container);
    },
  });

  const source = dragSource && dragSource !== container
    ? bindDrag(dragSource, {
        dragstart(e) {
          if (typeof container.contains === 'function' && container.contains(e.target)) return;
          dragstart(e);
        },
        dragend() {
          clearDragState(dragSource);
          clearDragState(container);
        },
      })
    : null;

  return {
    destroy() {
      handle.destroy();
      if (source) source.destroy();
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
