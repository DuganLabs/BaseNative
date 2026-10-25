// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'calendar';
export const root = 'section';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * @typedef {object} CalendarEvent
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
 * @property {string} [prevHtml] A rendered previous-month button.
 * @property {string} [nextHtml] A rendered next-month button.
 * @property {string} [bodyHtml] Month mode: the rendered month table
 *   (compose the table component from grid()).
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
  const todayIso = props.today ?? iso(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  const title = computed(() => `${MONTH_NAMES[props.month - 1]} ${props.year}`);
  const isMonth = computed(() => variant() === 'month');

  // The month grid: six weeks of seven days, Sunday-first, spilling
  // into the adjacent months. The caller renders it with the table
  // component (weekday names are the columns).
  const weeks = computed(() => {
    const first = new Date(Date.UTC(props.year, props.month - 1, 1));
    const start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    /** @type {{ date: string, day: number, inMonth: boolean, isToday: boolean, isSelected: boolean }[][]} */
    const grid = [];
    const cursor = new Date(start);
    for (let w = 0; w < 6; w += 1) {
      /** @type {typeof grid[number]} */
      const week = [];
      for (let d = 0; d < 7; d += 1) {
        const date = iso(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
        week.push({
          date,
          day: cursor.getUTCDate(),
          inMonth: cursor.getUTCMonth() === props.month - 1,
          isToday: date === todayIso,
          isSelected: date === props.selected,
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  });

  const days = computed(() => {
    /** @type {Map<string, CalendarEvent[]>} */
    const byDate = new Map();
    for (const event of props.events ?? []) {
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

  return { title, prevHtml, nextHtml, bodyHtml, variant, isMonth, weeks, days, raw };
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
