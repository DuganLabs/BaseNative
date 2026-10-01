/* Declarations for @basenative/theme/audit. */

import type { Theme } from './index.js';

export { AA_TEXT, AA_LARGE, AA_NONTEXT } from './contrast.js';

/** Re-exported so a consumer can name a slot or a family in its own pairing rows. */
export {
  BADGE_SLOTS,
  SIGNAL_CHANNELS,
  signalVar,
  slotVar,
  surfaceVar,
  inkVar,
  roleVar,
} from './index.js';

/** One row of the accessibility contract. */
export interface Pairing {
  /** Human-readable, and what a failure is reported under. */
  label: string;
  /** Foreground custom-property name, e.g. `--bn-theme-ink-muted`. */
  fg: string;
  /** Background custom-property name. */
  bg: string;
  /** The threshold that applies — `AA_TEXT` or `AA_NONTEXT`. */
  min: number;
}

/** The tuple form, as the Greenput table was written. */
export type PairingTuple = readonly [label: string, fg: string, bg: string, min: number];

export type PairingInput = Pairing | PairingTuple;

export interface PairingResult extends Pairing {
  /** The measured ratio, or `0` when the chain did not resolve. */
  ratio: number;
  pass: boolean;
  /** The resolver's message, when a `var()` chain did not resolve. */
  error?: string;
}

/** Thrown by `assertPairings` / `assertThemeContrast`. Carries every failing row. */
export declare class ContrastError extends Error {
  constructor(summary: string, failures: PairingResult[]);
  name: 'ContrastError';
  failures: PairingResult[];
}

/**
 * Measures every pairing against a stylesheet carrying ONE activation context.
 * A row whose chain does not resolve is reported, not thrown, so one typo does
 * not hide the other forty rows.
 */
export declare function auditPairings(
  themeCss: string,
  pairings: readonly PairingInput[],
): PairingResult[];

/** Measures every pairing and throws listing every failure. */
export declare function assertPairings(
  themeCss: string,
  pairings: readonly PairingInput[],
  summary?: string,
): void;

/**
 * The pairings every theme ships by construction, written from the theme's own
 * shape — including a row for every signal family it declares, assigned to a
 * slot or not. Extend it, do not replace it.
 */
export declare function defaultPairings(theme: Theme): Pairing[];

/**
 * `defaultPairings` plus anything extra, measured once per scheme the theme
 * renders in. The one line a property puts in its test file.
 */
export declare function assertThemeContrast(
  theme: Theme,
  extra?: readonly PairingInput[],
): void;
