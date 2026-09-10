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

// @__PURE__: detectBrowserFeatures only reads feature flags off `target`, so
// a bundler that doesn't use this binding (e.g. an entry point that pulls in
// @basenative/runtime for signals but never touches browserFeatures) can
// drop the call outright instead of keeping it as a dead-but-side-effecting
// assignment in the output.
export const browserFeatures = /* @__PURE__ */ detectBrowserFeatures();
