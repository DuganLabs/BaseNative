/*
 * Type declarations for @basenative/platform/platform.
 */

export interface PlatformChoice {
  platform: 'ios' | 'macos';
  device?: string;
  control?: string;
}

export interface MatchMedia {
  (query: string): { matches: boolean };
}

/**
 * iPhone/iPod → ios iphone; iPad, or a touch Mac, → ios ipad;
 * a Mac → macos medium; a coarse pointer otherwise → ios iphone; else macos medium.
 */
export declare function detectPlatform(nav?: Navigator, matchMedia?: MatchMedia): PlatformChoice;

/**
 * Write `data-bn-platform`, and device or control size, only where the attribute is absent.
 */
export declare function applyPlatform(root: Element, detected?: PlatformChoice): PlatformChoice;

/**
 * Apply the platform and bind menu, segmented, and toolbar keyboard behaviour.
 * Returns null when no document is available.
 */
export declare function initPlatform(
  root?: Element,
  env?: { document?: Document },
): PlatformChoice | null;
