// @basenative/icons — JS entry.
// Re-exports the icon reset stylesheet as a string so consumers can
// inline it via @basenative/server's `criticalCss` render option without
// needing a build step or a filesystem read at runtime.

export const iconResetCss =
  ':where(svg):not([width]):not([height]){width:1em;height:1em}' +
  'svg[data-bn-icon],.bn-icon{width:1em;height:1em}';
