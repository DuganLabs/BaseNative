// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'calendar';
export const root = 'section';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * @typedef {object} CalendarEvent
 * @property {string} [id] Move identity (defaults to the title).
 * @property {string} date ISO date (yyyy-mm-dd) the event falls on.
 * @property {string} title
 * @property {string} at ISO datetime for the <time> element.
 * @property {string} timeLabel Human-readable time.
 *
 * @typedef {object} CalendarProps
 * @property {number} year
 * @property {number} month 1-12.
 * @property {string} [today] ISO date marked as today (defaults to the real today).
 * @property {string} [selected] ISO date marked selected.
 * @property {CalendarEvent[]} [events] Schedule-mode data.
 * @property {(drop: { eventId: string, date: string, hour: number, minute: number, datetime: string, sourceType: string }) => void} [onDrop]
 *   Reports a moveEvent with the legacy drag-and-drop payload shape.
 * @property {string} [prevHtml] A rendered previous-month control, in place of the calendar's own.
 * @property {string} [nextHtml] A rendered next-month control, in place of the calendar's own.
 * @property {string} [bodyHtml] Month mode: a rendered month table in
 *   place of the calendar's own grid (a static composition: it does not
 *   page). Without it the calendar renders its grid and pages it.
 * @property {string} [prevLabel] The previous-month button's text (default "Previous").
 * @property {string} [nextLabel] The next-month button's text (default "Next").
 * @property {(event: { year: number, month: number }) => void} [onMonthChange]
 * @property {string} [variant] month | schedule.
 */

/** @param {number} y @param {number} m @param {number} d */
function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** @param {CalendarProps} props */
export function create(props) {
  if (!props.year || !props.month) throw new TypeError('calendar: year and month are required');

  const variant = signal(props.variant ?? 'month');
  const prevHtml = signal(props.prevHtml ?? '');
  const nextHtml = signal(props.nextHtml ?? '');
  const bodyHtml = signal(props.bodyHtml ?? '');
  const todayIso =
    props.today ?? iso(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const year = signal(props.year);
  const month = signal(props.month);
  const prevLabel = signal(props.prevLabel ?? 'Previous');
  const nextLabel = signal(props.nextLabel ?? 'Next');
  const navVariant = signal('ghost');
  const tableVariant = signal('default');
  const weekdays = signal(WEEKDAYS);

  const title = computed(() => `${MONTH_NAMES[month() - 1]} ${year()}`);
  const isMonth = computed(() => variant() === 'month');
  const hasBody = computed(() => bodyHtml() !== '');
  const hasPrev = computed(() => prevHtml() !== '');
  const hasNext = computed(() => nextHtml() !== '');
  /** @param {number} delta */
  const shifted = (delta) => {
    const index = year() * 12 + (month() - 1) + delta;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  };
  const prevName = computed(() => {
    const p = shifted(-1);
    return `${prevLabel()} month, ${MONTH_NAMES[p.month - 1]} ${p.year}`;
  });
  const nextName = computed(() => {
    const n = shifted(1);
    return `${nextLabel()} month, ${MONTH_NAMES[n.month - 1]} ${n.year}`;
  });

  /** @param {number} delta */
  function page(delta) {
    const to = shifted(delta);
    year.set(to.year);
    month.set(to.month);
    props.onMonthChange?.({ year: to.year, month: to.month });
  }
  const prev = () => page(-1);
  const next = () => page(1);

  // The month grid: six weeks of seven days, Sunday-first, spilling
  // into the adjacent months. The caller renders it with the table
  // component (weekday names are the columns).
  const weeks = computed(() => {
    const y = year();
    const mo = month();
    const first = new Date(Date.UTC(y, mo - 1, 1));
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    /** @type {{ date: string, day: number, inMonth: boolean, isToday: boolean, isSelected: boolean, current: string | null }[][]} */
    const grid = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w += 1) {
      /** @type {typeof grid[number]} */
      const week = [];
      for (let d = 0; d < 7; d += 1) {
        const date = iso(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
        const isToday = date === todayIso;
        const isSelected = date === props.selected;
        week.push({
          date,
          day: cursor.getUTCDate(),
          inMonth: cursor.getUTCMonth() === mo - 1,
          isToday,
          isSelected,
          /* The table's aria-current values: today is the date, the
             selection is true; neither omits the attribute. */
          current: isToday ? 'date' : isSelected ? 'true' : null,
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  });

  const events = signal(props.events ?? []);
  /* The last move's announcement, for the host's live region — the
     legacy initialiser wrote these into its status element. */
  const status = signal('');

  const days = computed(() => {
    /** @type {Map<string, CalendarEvent[]>} */
    const byDate = new Map();
    for (const event of events()) {
      const list = byDate.get(event.date) ?? [];
      list.push(event);
      byDate.set(event.date, list);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, events]) => {
        const [y, m, d] = date.split('-').map(Number);
        const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
        return { date, label: `${weekday}, ${MONTH_NAMES[m - 1]} ${d}`, events };
      });
  });

  /**
   * Move an event to a new date/time — the model half of the legacy
   * drag-and-drop and keyboard select-then-place paths. The gestures
   * (HTML5 drag, arrow-key target selection) live in the composition
   * that renders the slots; the move, the onDrop report and the live-
   * region announcement live here. Returns whether the event moved.
   * @param {string} eventId The event's id (or its title).
   * @param {{ date: string, hour: number, minute: number }} target
   */
  function moveEvent(eventId, target) {
    const event = events().find((entry) => (entry.id ?? entry.title) === eventId);
    if (!event) return false;
    const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
    const datetime = `${target.date}T${pad(target.hour)}:${pad(target.minute)}`;
    const moved = {
      ...event,
      date: target.date,
      at: datetime,
      timeLabel: `${((target.hour + 11) % 12) + 1}:${pad(target.minute)} ${target.hour < 12 ? 'AM' : 'PM'}`,
    };
    events.set(events().map((entry) => (entry === event ? moved : entry)));
    props.onDrop?.({
      eventId,
      date: target.date,
      hour: target.hour,
      minute: target.minute,
      datetime,
      sourceType: 'event',
    });
    const [y, m, d] = target.date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    status.set(
      `Moved ${event.title} to ${weekday}, ${MONTH_NAMES[m - 1]} ${d} at ${moved.timeLabel}.`,
    );
    return true;
  }

  return {
    title,
    year,
    month,
    prevHtml,
    nextHtml,
    bodyHtml,
    variant,
    isMonth,
    hasBody,
    hasPrev,
    hasNext,
    prevLabel,
    nextLabel,
    prevName,
    nextName,
    navVariant,
    tableVariant,
    weekdays,
    weeks,
    days,
    events,
    status,
    prev,
    next,
    moveEvent,
    raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('calendar', 'month');
  registry.registerVariant('calendar', 'schedule');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const calendar = { name, root, create, registerVariants, template, styles };
export default calendar;
