/*
 * Type declarations for @basenative/ios/posture.
 */

/**
 * The posture media queries, as strings: the `spanning` posture
 * features and the Duo width classes derived from the `duoInner`
 * breakpoint token.
 */
export interface PostureMedia {
  readonly singlePane: string;
  readonly spanningVertical: string;
  readonly duoCover: string;
  readonly duoInner: string;
}

export declare const POSTURE_MEDIA: PostureMedia;

/**
 * The posture utility sheet — the two-segment pane grid, the crease
 * clearance, and the never-wider-than-a-segment cap, in `@layer layout`.
 */
export declare function postureCss(): string;
