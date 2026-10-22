/*
 * Type declarations for @basenative/platform.
 *
 * One declaration file per JavaScript subpath. `types/exports.test.js`
 * asserts each file declares exactly the values that subpath exports.
 * The CSS subpaths declare nothing.
 */

export { kit, PROVENANCE, colorSlug, derivePalette, contrastRatio, FONT_STACK } from './tokens.js';
export { tokensCss } from './css.js';
export { detectPlatform, applyPlatform, initPlatform } from './platform.js';
export { catalogPage } from './catalog.js';
export {
  nextId,
  resetIds,
  renderBnButton,
  renderBnPopupButton,
  renderBnPulldownButton,
  renderBnSegmented,
  renderBnSwitch,
  renderBnCheckbox,
  renderBnRadio,
  renderBnSlider,
  renderBnDial,
  renderBnStepper,
  renderBnProgress,
  renderBnSpinner,
  renderBnField,
  renderBnSearch,
  renderBnCombobox,
  renderBnColorWell,
  renderBnColorPicker,
  renderBnDatePicker,
  renderBnList,
  renderBnListRow,
  renderBnTable,
  renderBnMenu,
  renderBnMenuItem,
  renderBnContextMenu,
  renderBnActionSheet,
  renderBnShareSheet,
  renderBnAlert,
  renderBnDialog,
  renderBnSheet,
  renderBnPopover,
  renderBnTooltip,
  renderBnNotification,
  renderBnPageControl,
  renderBnTabBar,
  renderBnToolbar,
  renderBnSidebar,
  renderBnWindow,
  renderBnMenubar,
  renderBnDisclosure,
  renderBnForm,
  renderBnGroup,
  renderBnImageWell,
  renderBnScroll,
  renderBnInputAccessory,
  renderBnEmptyState,
  renderBnAppIcon,
  renderBnWidget,
  renderBnMaterial,
} from './components.js';

export type { Rgb, DerivedColor, Provenance } from './tokens.js';
export type { PlatformChoice } from './platform.js';
export type { BnOptions } from './components.js';

/** What the 1024×594 kit screenshots could not settle. */
export interface VerifyItem {
  readonly id: string;
  readonly topic: string;
  readonly detail: string;
}

export declare const VERIFY: readonly VerifyItem[];
