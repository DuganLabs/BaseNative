/**
 * Calendar / Pipeline block — drag-and-drop scheduling component.
 *
 * Renders a CSS-grid-based weekly calendar with movable event blocks. Events
 * move by native HTML5 drag and drop, or by select-then-place: one tap/click
 * (or Enter/Space) picks an event up, one tap/click on a slot (or arrow keys
 * then Enter) drops it. No external dependencies.
 *
 * Usage (SSR):
 *   renderCalendar({
 *     startDate: '2025-06-02',
 *     events: [{ id: '1', title: 'Job', start: '2025-06-02T09:00', end: '2025-06-02T11:00', ... }],
 *     hours: { start: 7, end: 19 },
 *   })
 *
 * Client-side: initCalendarDragDrop(container, { onDrop }) — hears drags,
 * taps/clicks and the keyboard alike and reports every move through onDrop.
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
import { renderBadge } from './badge.js';
import { attrsSuffix } from './internal/attrs.js';
import { bindDrag, clearDragState, clearDropTargets, readDragData } from './internal/drag.js';

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
 * The select-then-place instructions, rendered once per calendar / pipeline
 * as a visually hidden node that every movable block is `aria-describedby`.
 */
const CALENDAR_HELP =
  'Press Enter or Space to pick up, arrow keys to move by time and day, Enter to drop, Escape to cancel; or tap the event, then a time slot.';
const PIPELINE_HELP =
  'Press Enter or Space to pick up, Up and Down to reorder, Left and Right to change column, Enter to drop, Escape to cancel; or tap the card, then a column.';

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
  const helpId = escapeAttr(`${id}-help`);

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

  // Time gutter labels. The gutter and the day columns are subgrids spanning
  // the outer grid's rows `2 / -1` (see components.css), so their local row 1
  // *is* the first hour row: hour `h` is local row `h - hourStart + 1`. The
  // slots and events below share that numbering, or they land one row below
  // the label that describes them.
  const timeLabels = [];
  for (let h = hourStart; h < hourEnd; h++) {
    const label = h <= 12 ? `${h}am` : `${h - 12}pm`;
    timeLabels.push(
      `<div data-bn="calendar-time-label" data-hour="${h}" style="grid-row: ${h - hourStart + 1}">${h === 12 ? '12pm' : label}</div>`
    );
  }

  // Day columns with drop zones
  const dayColumns = dates.map((date, colIndex) => {
    const eventBlocks = segmentsByDate.get(date).map(({ ev, from, to, continues }) => {
      // Grid rows are integers; the sub-hour remainder trimmed off the top
      // (`lead`) and bottom (`trail`) of the block travels in custom properties
      // that components.css turns into an inset offset within the row span.
      const clampedFrom = Math.min(Math.max(from, hourStart), hourEnd);
      const clampedTo = Math.min(Math.max(to, clampedFrom + 0.5), hourEnd);
      const startOffset = clampedFrom - hourStart;
      const endOffset = clampedTo - hourStart;
      const firstRow = Math.floor(startOffset);
      const lastRow = Math.max(Math.ceil(endOffset), firstRow + 1);
      const rows = lastRow - firstRow;
      const topRow = firstRow + 1;
      const lead = startOffset - firstRow;
      const trail = lastRow - endOffset;
      const statusAttr = ev.status ? ` data-status="${escapeAttr(ev.status)}"` : '';
      const continuesAttr = continues ? ` data-continues="${continues}"` : '';
      const colorStyle = ev.color ? ` --bn-calendar-event-color: ${escapeAttr(ev.color)};` : '';
      const offsetStyle =
        lead > 0 || trail > 0
          ? ` --bn-calendar-event-rows: ${rows}; --bn-calendar-event-lead: ${lead}; --bn-calendar-event-trail: ${trail};`
          : '';
      // The block's visible start, for the keyboard path's initial target.
      let startHour = Math.floor(clampedFrom);
      let startMinute = Math.round((clampedFrom - startHour) * 60);
      if (startMinute === 60) {
        startHour += 1;
        startMinute = 0;
      }

      return `<div data-bn="calendar-event" draggable="true" tabindex="0" aria-describedby="${helpId}" data-date="${date}" data-hour="${startHour}" data-minute="${startMinute}" data-event-id="${escapeAttr(ev.id)}"${continuesAttr}${statusAttr} title="${escapeAttr(ev.title)}" style="grid-row: ${topRow} / span ${rows};${colorStyle}${offsetStyle}">
  <span data-bn="calendar-event-title">${escapeText(ev.title)}</span>
  ${ev.assignee ? `<span data-bn="calendar-event-assignee">${escapeText(ev.assignee)}</span>` : ''}
  <span data-bn="calendar-event-time">${timeLabel(ev.start, timeZone)} – ${timeLabel(ev.end, timeZone)}</span>
</div>`;
    }).join('');

    // Drop zone cells for each hour
    const hourSlots = [];
    for (let h = hourStart; h < hourEnd; h++) {
      hourSlots.push(
        `<div data-bn="calendar-slot" data-date="${date}" data-hour="${h}" style="grid-row: ${h - hourStart + 1}"></div>`
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
  <p data-bn="calendar-help" id="${helpId}">${CALENDAR_HELP}</p>
  <div data-bn="calendar-status" aria-live="polite" aria-atomic="true"></div>
  ${events.length === 0 ? `<div data-bn="calendar-empty">${escapeText(emptyMessage)}</div>` : ''}
</div>`;
}

/**
 * Render a pipeline/kanban block for use outside the calendar
 * (e.g., sidebar cards that can be dragged, or picked up and placed, onto the
 * calendar). The block is focusable; pass `attrs: 'aria-describedby="…"'` to
 * point it at the calendar's `[data-bn="calendar-help"]` node (`<id>-help`).
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

  return `<div data-bn="pipeline-block" draggable="true" tabindex="0" data-block-id="${escapeAttr(id)}"${statusAttr}${attrsSuffix(attrs)}>
  <span data-bn="pipeline-block-title">${escapeText(title)}</span>
  ${subtitle ? `<span data-bn="pipeline-block-subtitle">${escapeText(subtitle)}</span>` : ''}
</div>`;
}

/**
 * Render one kanban card. Title, subtitle, description and badge are escaped
 * text; `actions` and `footer` are HTML slots.
 */
function renderPipelineCard(card, helpId) {
  const statusAttr = card.status ? ` data-status="${escapeAttr(card.status)}"` : '';
  const badge = card.badge
    ? renderBadge(escapeText(card.badge), { variant: card.badgeVariant || 'default' })
    : '';
  return `<article data-bn="pipeline-card" data-card-id="${escapeAttr(card.id)}" draggable="true" tabindex="0" aria-describedby="${helpId}"${statusAttr} title="${escapeAttr(card.title)}">
  <div data-bn="pipeline-card-title">${escapeText(card.title)}</div>${badge}
  ${card.subtitle ? `<div data-bn="pipeline-card-subtitle">${escapeText(card.subtitle)}</div>` : ''}
  ${card.description ? `<div data-bn="pipeline-card-description">${escapeText(card.description)}</div>` : ''}
  ${card.actions ? `<div data-bn="pipeline-card-actions">${card.actions}</div>` : ''}
  ${card.footer ? `<footer data-bn="pipeline-card-footer">${card.footer}</footer>` : ''}
</article>`;
}

/**
 * Render a kanban-style pipeline view with draggable columns and cards.
 *
 * Column titles, card title/subtitle/description/badge and emptyMessage are
 * escaped text; ids and status are escaped attributes. Each column is a
 * `<section aria-labelledby>` pointing at its header, which shows the title
 * and a count (the number of cards placed in the column unless `count` is
 * given). Cards are focusable and `aria-describedby` the wrapper's
 * `[data-bn="pipeline-help"]` instructions; a `[data-bn="pipeline-status"]`
 * polite live region announces pick-up and drop for `initPipelineDragDrop`.
 *
 * @param {object} options
 * @param {Array} options.columns - Column definitions: [{ id: 'new', title: 'New Leads', count?: 3 }, ...]
 * @param {Array} options.cards - Card definitions: [{ id: 'c1', columnId: 'new', title: 'Acme Corp', ... }, ...]
 * @param {string} [options.cards[].badge]        Escaped text rendered as a badge under the title
 * @param {string} [options.cards[].badgeVariant] Badge variant, default 'default'
 * @param {string} [options.cards[].actions]      HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.cards[].footer]       HTML slot: not escaped; pass trusted markup only
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

  const helpId = escapeAttr(`${id}-help`);
  const columnElems = columns.map(col => {
    const colCards = cards.filter(c => c.columnId === col.id);
    const headingId = escapeAttr(`${id}-column-${col.id}`);
    const count = col.count ?? colCards.length;
    const cardsHtml = colCards.map(card => renderPipelineCard(card, helpId)).join('');

    return `<section data-bn="pipeline-column" data-column-id="${escapeAttr(col.id)}" aria-labelledby="${headingId}">
  <header data-bn="pipeline-column-header" id="${headingId}"><span data-bn="pipeline-column-title">${escapeText(col.title)}</span><span data-bn="pipeline-column-count">${escapeText(count)}</span></header>
  <div data-bn="pipeline-column-cards">
    ${cardsHtml || `<div data-bn="pipeline-empty">${escapeText(emptyMessage)}</div>`}
  </div>
</section>`;
  }).join('');

  return `<div data-bn="pipeline" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
  ${columnElems}
  <p data-bn="pipeline-help" id="${helpId}">${PIPELINE_HELP}</p>
  <div data-bn="pipeline-status" aria-live="polite" aria-atomic="true"></div>
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

/** `YYYY-MM-DD` shifted by `days`, in local time. */
function shiftDate(date, days) {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/** "9:30 AM" for the live region. */
function clockText(hour, minute) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
}

const isActivate = e => e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';

/** Arrow key → [columns or days, steps] for the keyboard path of both initialisers. */
const KEY_MOVES = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/** Write to the component's polite live region, when it rendered one. */
function announce(container, bn, text) {
  const region = typeof container.querySelector === 'function' ? container.querySelector(`[data-bn="${bn}"]`) : null;
  if (region) region.textContent = text;
}

function itemLabel(el, fallback) {
  const title = typeof el.getAttribute === 'function' ? el.getAttribute('title') : null;
  return title || fallback;
}

/**
 * Client-side: make a rendered calendar's events movable, by drag and drop, by
 * tap/click and by keyboard. Every path reports the move through `onDrop`
 * with the same payload, so a consumer wires one callback.
 *
 * - **Drag and drop.** Native HTML5: drag an event (or a `renderPipelineBlock`
 *   from `dragSource`) onto a slot. `minute` is the pointer's offset within the
 *   slot, snapped down to `snapMinutes`.
 * - **Select, then place.** One tap or click on an event picks it up
 *   (`data-picked`; a second on the same event cancels); one tap or click on a
 *   slot drops it there, `minute` from the tap's position as for a drop. This
 *   is the single-pointer alternative to dragging that touch needs.
 * - **Keyboard.** Events are focusable. Enter or Space picks the focused event
 *   up, with the pending target at its own slot (`data-drop-target`); ArrowUp /
 *   ArrowDown move the target by `snapMinutes`, ArrowLeft / ArrowRight by a
 *   day, within the rendered slots; Enter or Space drops; Escape cancels.
 *
 * Pick-up, each move and the drop are announced in the calendar's
 * `[data-bn="calendar-status"]` live region. A drag started while an event is
 * picked cancels the pick.
 *
 * Drops report the slot's `date` and integer `hour`, plus `minute` and
 * `datetime` (`YYYY-MM-DDTHH:MM`, a local datetime string ready for
 * `new Date()`).
 *
 * @param {HTMLElement} container  The [data-bn="calendar"] element
 * @param {object} callbacks
 * @param {function} callbacks.onDrop  Called with { eventId, date, hour, minute, datetime, sourceType }
 * @param {HTMLElement} [callbacks.dragSource]  Element whose `dragstart`,
 *   `click` and `keydown` events also supply payloads — a palette or sidebar of
 *   `renderPipelineBlock` cards outside the calendar. Defaults to the container
 *   (which always hears its own events). May be any element, including an
 *   ancestor of the container.
 * @param {number} [callbacks.snapMinutes=15]  Minute granularity of `minute`
 *   and of the keyboard's ArrowUp / ArrowDown step; 1 (or less) reports exact
 *   minutes
 * @returns {{ destroy: () => void }}
 */
export function initCalendarDragDrop(container, callbacks = {}) {
  const { onDrop, dragSource, snapMinutes = 15 } = callbacks;
  const step = snapMinutes > 1 ? snapMinutes : 1;
  const say = text => announce(container, 'calendar-status', text);
  const query = selector => (typeof container.querySelector === 'function' ? container.querySelector(selector) : null);
  const slotAt = (date, hour) => query(`[data-bn="calendar-slot"][data-date="${date}"][data-hour="${hour}"]`);

  let picked = null;
  let target = null;

  function itemOf(node) {
    const event = node.closest('[data-event-id]');
    if (event) return { type: 'event', id: event.dataset.eventId, el: event };
    const block = node.closest('[data-block-id]');
    if (block) return { type: 'pipeline', id: block.dataset.blockId, el: block };
    return null;
  }

  const label = () => itemLabel(picked.el, picked.id);

  function release() {
    if (picked) picked.el.removeAttribute('data-picked');
    picked = null;
    target = null;
    clearDropTargets(container);
  }

  function cancel() {
    if (!picked) return;
    const moved = label();
    release();
    say(`Cancelled moving ${moved}.`);
  }

  function initialTarget(el) {
    const { date, hour, minute } = el.dataset ?? {};
    if (date && hour != null) return { date, hour: parseInt(hour, 10), minute: parseInt(minute, 10) || 0 };
    const first = query('[data-bn="calendar-slot"]');
    return first ? { date: first.dataset.date, hour: parseInt(first.dataset.hour, 10), minute: 0 } : null;
  }

  function showTarget() {
    clearDropTargets(container);
    const slot = target && slotAt(target.date, target.hour);
    if (slot) slot.setAttribute('data-drop-target', '');
  }

  function pick(item) {
    release();
    picked = item;
    item.el.setAttribute('data-picked', '');
    target = initialTarget(item.el);
    showTarget();
    say(
      target
        ? `Picked up ${label()}. Use the arrow keys to choose a new time, Enter to drop, Escape to cancel.`
        : `Picked up ${label()}. Choose a time slot to drop it on, or press Escape to cancel.`
    );
  }

  function place(date, hour, minute) {
    const moved = label();
    const sourceType = picked.type;
    const eventId = picked.id;
    release();
    if (onDrop) {
      onDrop({
        eventId,
        date,
        hour,
        minute,
        datetime: `${date}T${pad(hour)}:${pad(minute)}`,
        sourceType,
      });
    }
    say(`Moved ${moved} to ${formatDay(date)} at ${clockText(hour, minute)}.`);
  }

  function shiftTarget(from, days, minutes) {
    let minute = from.minute + minutes;
    const carry = Math.floor(minute / 60);
    minute -= carry * 60;
    return { date: days ? shiftDate(from.date, days) : from.date, hour: from.hour + carry, minute };
  }

  function dragstart(e) {
    release();
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

  function click(e) {
    const item = itemOf(e.target);
    if (item) {
      if (picked && picked.el === item.el) cancel();
      else pick(item);
      return;
    }
    if (!picked) return;
    const slot = e.target.closest('[data-bn="calendar-slot"]');
    if (slot) place(slot.dataset.date, parseInt(slot.dataset.hour, 10), slotMinute(e, slot, snapMinutes));
  }

  function keydown(e) {
    if (e.key === 'Escape') {
      if (picked) {
        e.preventDefault();
        cancel();
      }
      return;
    }
    if (isActivate(e)) {
      const item = itemOf(e.target);
      if (picked && (!item || item.el === picked.el)) {
        e.preventDefault();
        if (target) place(target.date, target.hour, target.minute);
        return;
      }
      if (item) {
        e.preventDefault();
        pick(item);
      }
      return;
    }
    const move = KEY_MOVES[e.key];
    if (!move || !picked || !target) return;
    e.preventDefault();
    const next = shiftTarget(target, move[0], move[1] * step);
    if (!slotAt(next.date, next.hour)) return;
    target = next;
    showTarget();
    say(`${formatDay(next.date)} at ${clockText(next.hour, next.minute)}. Press Enter to drop ${label()} here.`);
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
      release();
      clearDragState(container);
    },

    click,
    keydown,
  });

  const outside = fn => e => {
    if (typeof container.contains === 'function' && container.contains(e.target)) return;
    fn(e);
  };
  const source = dragSource && dragSource !== container
    ? bindDrag(dragSource, {
        dragstart: outside(dragstart),
        dragend() {
          release();
          clearDragState(dragSource);
          clearDragState(container);
        },
        click: outside(click),
        keydown: outside(keydown),
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
 * Index the dragged card should take among the target column's cards (the
 * dragged card itself excluded): the index of the card under the pointer, +1
 * when the pointer is in its lower half, or the column's length when dropped
 * on empty space.
 */
function dropPosition(e, cardArea, draggedId) {
  const all = typeof cardArea.querySelectorAll === 'function'
    ? Array.from(cardArea.querySelectorAll('[data-card-id]'))
    : [];
  const others = all.filter(c => c.dataset?.cardId !== draggedId);
  const over = e.target.closest('[data-card-id]');
  if (!over) return others.length;
  if (over.dataset?.cardId === draggedId) return Math.max(all.indexOf(over), 0);
  const index = others.indexOf(over);
  if (index < 0) return others.length;
  const rect = typeof over.getBoundingClientRect === 'function' ? over.getBoundingClientRect() : null;
  const below = Boolean(rect && rect.height > 0 && typeof e.clientY === 'number' && e.clientY > rect.top + rect.height / 2);
  return below ? index + 1 : index;
}

/**
 * Client-side: make a rendered pipeline's cards movable, by drag and drop, by
 * tap/click and by keyboard. Every path reports the move through `onCardMove`
 * with the same payload.
 *
 * - **Drag and drop.** Native HTML5: drag a card onto a column's card area.
 * - **Select, then place.** One tap or click on a card picks it up
 *   (`data-picked`; a second on the same card cancels); one tap or click in a
 *   column — on empty space or on a card, above or below its middle — drops it
 *   there, at the same `position` a drop at that point would report.
 * - **Keyboard.** Cards are focusable. Enter or Space picks the focused card
 *   up, with the pending target at its own place (the target column's card
 *   area gets `data-drop-target`); ArrowUp / ArrowDown move the position,
 *   ArrowLeft / ArrowRight the column; Enter or Space drops; Escape cancels.
 *
 * Pick-up, each move and the drop are announced in the pipeline's
 * `[data-bn="pipeline-status"]` live region.
 *
 * `position` is the index the card should occupy among the target column's
 * cards after the move (excluding itself): the index of the card under the
 * pointer, one more when the pointer is in that card's lower half, or the
 * column's card count when dropped on empty space. Pass it straight to
 * `createPipelineState().moveCard(cardId, targetColumnId, position)`.
 *
 * @param {HTMLElement} container  The [data-bn="pipeline"] element
 * @param {object} callbacks
 * @param {function} callbacks.onCardMove  Called with { cardId, targetColumnId, position }
 * @returns {{ destroy: () => void }}
 */
export function initPipelineDragDrop(container, callbacks = {}) {
  const { onCardMove } = callbacks;
  const say = text => announce(container, 'pipeline-status', text);
  const queryAll = (root, selector) =>
    typeof root.querySelectorAll === 'function' ? Array.from(root.querySelectorAll(selector)) : [];
  const queryOne = (root, selector) => (typeof root.querySelector === 'function' ? root.querySelector(selector) : null);
  const columns = () => queryAll(container, '[data-column-id]');
  const columnOf = columnId => columns().find(c => c.dataset?.columnId === columnId) ?? null;
  const columnTitle = column => queryOne(column, '[data-bn="pipeline-column-title"]')?.textContent || column.dataset.columnId;

  let picked = null;
  let target = null;

  const label = () => itemLabel(picked.el, picked.id);
  const othersIn = column => queryAll(column, '[data-card-id]').filter(c => c.dataset?.cardId !== picked.id);

  function release() {
    if (picked) picked.el.removeAttribute('data-picked');
    picked = null;
    target = null;
    clearDropTargets(container);
  }

  function cancel() {
    if (!picked) return;
    const moved = label();
    release();
    say(`Cancelled moving ${moved}.`);
  }

  function showTarget() {
    clearDropTargets(container);
    const column = target && columnOf(target.columnId);
    const area = column && queryOne(column, '[data-bn="pipeline-column-cards"]');
    if (area) area.setAttribute('data-drop-target', '');
  }

  function pick(card) {
    release();
    picked = { id: card.dataset.cardId, el: card };
    card.setAttribute('data-picked', '');
    const column = card.closest('[data-column-id]');
    if (column) {
      target = { columnId: column.dataset.columnId, position: Math.max(queryAll(column, '[data-card-id]').indexOf(card), 0) };
    } else {
      const first = columns()[0];
      target = first ? { columnId: first.dataset.columnId, position: 0 } : null;
    }
    showTarget();
    say(`Picked up ${label()}. Use the arrow keys to choose a column and position, Enter to drop, Escape to cancel.`);
  }

  function place(columnId, position) {
    const moved = label();
    const cardId = picked.id;
    const column = columnOf(columnId);
    release();
    if (onCardMove) onCardMove({ cardId, targetColumnId: columnId, position });
    say(`Moved ${moved} to ${column ? columnTitle(column) : columnId}, position ${position + 1}.`);
  }

  function click(e) {
    const card = e.target.closest('[data-card-id]');
    if (card && (!picked || picked.el === card)) {
      if (picked) cancel();
      else pick(card);
      return;
    }
    if (!picked) return;
    const cardArea = e.target.closest('[data-bn="pipeline-column-cards"]');
    const column = cardArea && cardArea.closest('[data-column-id]');
    if (column) place(column.dataset.columnId, dropPosition(e, cardArea, picked.id));
  }

  function keydown(e) {
    if (e.key === 'Escape') {
      if (picked) {
        e.preventDefault();
        cancel();
      }
      return;
    }
    if (isActivate(e)) {
      const card = e.target.closest('[data-card-id]');
      if (picked && (!card || card === picked.el)) {
        e.preventDefault();
        if (target) place(target.columnId, target.position);
        return;
      }
      if (card) {
        e.preventDefault();
        pick(card);
      }
      return;
    }
    const move = KEY_MOVES[e.key];
    if (!move || !picked || !target) return;
    e.preventDefault();
    const all = columns();
    const column = all[all.findIndex(c => c.dataset?.columnId === target.columnId) + move[0]];
    if (!column) return;
    const max = othersIn(column).length;
    const position = Math.min(Math.max(target.position + move[1], 0), max);
    target = { columnId: column.dataset.columnId, position };
    showTarget();
    say(`${columnTitle(column)}, position ${position + 1} of ${max + 1}. Press Enter to drop ${label()} here.`);
  }

  return bindDrag(container, {
    dragstart(e) {
      const card = e.target.closest('[data-card-id]');
      if (!card) return;
      release();

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
        clearDropTargets(container);
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
          position: dropPosition(e, cardArea, data.cardId),
        });
      }
    },

    dragend() {
      release();
      clearDragState(container);
    },

    click,
    keydown,
  });
}
