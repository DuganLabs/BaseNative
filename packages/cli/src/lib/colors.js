// Built with BaseNative — basenative.dev
/**
 * Tiny ANSI color helper. No deps. Honors NO_COLOR + non-TTY stdout.
 * Each helper takes a string and returns it wrapped in escape codes (or
 * unchanged if color is disabled). Cheap, branchless, ~100 LOC of overhead.
 */

const FORCE = process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === 'true';
const DISABLED =
  !FORCE &&
  (process.env.NO_COLOR != null ||
    process.env.TERM === 'dumb' ||
    (typeof process.stdout.isTTY === 'boolean' && !process.stdout.isTTY));

function wrap(open, close) {
  if (DISABLED) return (s) => String(s);
  return (s) => `\x1b[${open}m${s}\x1b[${close}m`;
}

export const c = {
  enabled: !DISABLED,
  reset: wrap(0, 0),
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  italic: wrap(3, 23),
  underline: wrap(4, 24),
  inverse: wrap(7, 27),
  black: wrap(30, 39),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  white: wrap(37, 39),
  gray: wrap(90, 39),
  // BaseNative brand: warm orange accent. Falls back to yellow when disabled.
  accent: DISABLED ? (s) => String(s) : (s) => `\x1b[38;5;208m${s}\x1b[39m`,
  bgGreen: wrap(42, 49),
  bgRed: wrap(41, 49),
};

const SYM = {
  ok: '✓',
  warn: '⚠',
  err: '✗',
  info: 'ℹ',
  arrow: '›',
  bullet: '•',
};

export const sym = SYM;

export function ok(msg) {
  console.log(`${c.green(SYM.ok)} ${msg}`);
}
export function warn(msg) {
  console.log(`${c.yellow(SYM.warn)} ${msg}`);
}
export function err(msg) {
  console.error(`${c.red(SYM.err)} ${msg}`);
}
export function info(msg) {
  console.log(`${c.cyan(SYM.info)} ${msg}`);
}
export function step(msg) {
  console.log(`${c.gray(SYM.arrow)} ${msg}`);
}

/**
 * Print the BaseNative banner — top of `bn` and `bn create`.
 */
export function banner() {
  const line = c.gray('─'.repeat(48));
  console.log('');
  console.log(`  ${c.accent(c.bold('▲ BaseNative'))}  ${c.dim('· basenative.dev')}`);
  console.log(`  ${line}`);
}

/**
 * Format a key/value pair with aligned padding.
 */
export function kv(key, value, width = 14) {
  return `  ${c.dim(key.padEnd(width))} ${value}`;
}

/**
 * Print a hint line (dim arrow + text).
 */
export function hint(msg) {
  console.log(`  ${c.gray('→ ' + msg)}`);
}
