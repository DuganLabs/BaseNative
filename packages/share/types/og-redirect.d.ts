// Built with BaseNative — basenative.dev

export interface LandingMeta {
  title: string;
  description: string;
  imageUrl: string;
  canonicalUrl: string;
  siteName?: string;
  imageAlt?: string;
  themeColor?: string;
  redirectTo?: string;
  bodyHeading?: string;
  bodyTagline?: string;
  twitterCard?: string;
  imageSize?: { width?: number; height?: number };
}
export function buildLandingHtml(meta: LandingMeta): string;
export function escHtml(s: unknown): string;
