/*
 * Type declarations for @basenative/platform/components.
 *
 * Every control is a semantic host with `data-bn="bn-*"`. Options are a
 * bag the renderer reads; unknown keys are ignored. No class, no style.
 */

export type BnOptions = Record<string, unknown>;

export declare function nextId(prefix: string): string;
export declare function resetIds(): void;

export declare function renderBnButton(label?: string, options?: BnOptions): string;
export declare function renderBnPopupButton(options?: BnOptions): string;
export declare function renderBnPulldownButton(options?: BnOptions): string;
export declare function renderBnSegmented(options?: BnOptions): string;
export declare function renderBnSwitch(options?: BnOptions): string;
export declare function renderBnCheckbox(options?: BnOptions): string;
export declare function renderBnRadio(options?: BnOptions): string;
export declare function renderBnSlider(options?: BnOptions): string;
export declare function renderBnDial(options?: BnOptions): string;
export declare function renderBnStepper(options?: BnOptions): string;
export declare function renderBnProgress(options?: BnOptions): string;
export declare function renderBnSpinner(options?: BnOptions): string;
export declare function renderBnField(options?: BnOptions): string;
export declare function renderBnSearch(options?: BnOptions): string;
export declare function renderBnCombobox(options?: BnOptions): string;
export declare function renderBnColorWell(options?: BnOptions): string;
export declare function renderBnColorPicker(options?: BnOptions): string;
export declare function renderBnDatePicker(options?: BnOptions): string;
export declare function renderBnList(options?: BnOptions): string;
export declare function renderBnListRow(options?: BnOptions): string;
export declare function renderBnTable(options?: BnOptions): string;
export declare function renderBnMenu(options?: BnOptions): string;
export declare function renderBnMenuItem(options?: BnOptions): string;
export declare function renderBnContextMenu(options?: BnOptions): string;
export declare function renderBnActionSheet(options?: BnOptions): string;
export declare function renderBnShareSheet(options?: BnOptions): string;
export declare function renderBnAlert(options?: BnOptions): string;
export declare function renderBnDialog(options?: BnOptions): string;
export declare function renderBnSheet(options?: BnOptions): string;
export declare function renderBnPopover(options?: BnOptions): string;
export declare function renderBnTooltip(options?: BnOptions): string;
export declare function renderBnNotification(options?: BnOptions): string;
export declare function renderBnPageControl(options?: BnOptions): string;
export declare function renderBnTabBar(options?: BnOptions): string;
export declare function renderBnToolbar(options?: BnOptions): string;
export declare function renderBnSidebar(options?: BnOptions): string;
export declare function renderBnWindow(options?: BnOptions): string;
export declare function renderBnMenubar(options?: BnOptions): string;
export declare function renderBnDisclosure(options?: BnOptions): string;
export declare function renderBnForm(options?: BnOptions): string;
export declare function renderBnGroup(options?: BnOptions): string;
export declare function renderBnImageWell(options?: BnOptions): string;
export declare function renderBnScroll(options?: BnOptions): string;
export declare function renderBnScrollbar(options?: BnOptions): string;
export declare function renderBnRefraction(options?: BnOptions): string;
export declare function renderBnInputAccessory(options?: BnOptions): string;
export declare function renderBnEmptyState(options?: BnOptions): string;
export declare function renderBnAppIcon(options?: BnOptions): string;
export declare function renderBnWidget(options?: BnOptions): string;
export declare function renderBnMaterial(options?: BnOptions): string;
export declare function renderBnSymbol(options?: BnOptions): string;
export declare function renderBnBadge(label?: string, options?: BnOptions): string;
export declare function renderBnIndexBar(options?: BnOptions): string;
export declare function renderBnMetric(options?: BnOptions): string;
export declare function renderBnNavBar(options?: BnOptions): string;
export declare function renderBnInspector(options?: BnOptions): string;
export declare function renderBnCardGrid(options?: BnOptions): string;
export declare function renderBnHero(options?: BnOptions): string;
export declare function renderBnFooter(options?: BnOptions): string;
export declare function renderBnDock(options?: BnOptions): string;
