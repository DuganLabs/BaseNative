function cssSupports(target, rule) {
  return Boolean(target?.CSS?.supports?.(rule));
}

export function detectBrowserFeatures(target = globalThis) {
  const elementProto = target?.HTMLElement?.prototype;
  const dialogProto = target?.HTMLDialogElement?.prototype;

  return {
    dialog: Boolean(dialogProto?.showModal),
    popover: Boolean(elementProto?.showPopover),
    anchorPositioning:
      cssSupports(target, 'anchor-name: --bn-anchor') &&
      cssSupports(target, 'position-anchor: --bn-anchor'),
    baseSelect:
      cssSupports(target, 'appearance: base-select') ||
      cssSupports(target, '-webkit-appearance: base-select'),
  };
}

export function supportsFeature(name, target = globalThis) {
  return Boolean(detectBrowserFeatures(target)[name]);
}

export const browserFeatures = detectBrowserFeatures();
