// Built with BaseNative — basenative.dev

export interface ManifestOpts {
  name: string;
  shortName?: string;
  description?: string;
  themeColor: string;
  backgroundColor?: string;
  startUrl?: string;
  display?: 'standalone' | 'minimal-ui' | 'fullscreen' | 'browser';
  scope?: string;
  iconBaseUrl?: string;
}

/** Builds a Web App Manifest object. */
export function buildManifest(opts: ManifestOpts): Record<string, any>;
/** Stringifies a manifest into pretty-printed JSON with a trailing newline. */
export function manifestJson(opts: ManifestOpts): string;
