/**
 * Configurator State — signal graph factory.
 *
 * Assembles all signals, computed signals, and mutation methods
 * into a single flat context object for hydrate().
 *
 * @module configurator-state
 */

import { WALLS } from './panel-catalog.js';
import { createFootprintMethods } from './components/footprint-input.js';
import { createWindowMethods } from './components/window-manager.js';
import { createPanelSelectorsComputed } from './components/panel-selector.js';
import { createOutputComputed } from './components/live-output.js';
import { createPanelScheduleComputed } from './components/panel-schedule.js';

/**
 * Create the full configurator state.
 *
 * @param {{signal: Function, computed: Function, batch: Function}} deps
 * @returns {Record<string, any>} flat context for hydrate()
 */
export function createState({ signal, computed, batch }) {
  // ─── Primary Signals ───────────────────────────────────────────
  const footprint = signal({ width: 20, length: 30 });
  const ceilingHeight = signal(108);
  const latitude = signal(37);
  const windows = signal([]);
  const exteriorPanel = signal('stucco-polyiso-4');
  const interiorPanel = signal('paint-ready-1');
  const studDepth = signal('2x6');
  const cavityInsulation = signal('closed-cell-spray');

  const signals = {
    footprint, ceilingHeight, latitude, windows,
    exteriorPanel, interiorPanel, studDepth, cavityInsulation,
  };

  // ─── Computed Signals ──────────────────────────────────────────
  const outputComputed = createOutputComputed(computed, signals);
  const panelSelectors = createPanelSelectorsComputed(computed);
  const scheduleComputed = createPanelScheduleComputed(computed, signals);

  // ─── Mutation Methods ──────────────────────────────────────────
  const footprintMethods = createFootprintMethods(footprint, ceilingHeight, latitude);
  const windowMethods = createWindowMethods(windows);

  // ─── Helpers ───────────────────────────────────────────────────
  function formatCurrency(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDecimal(n, places) {
    return Number(n).toFixed(places || 2);
  }

  // ─── Return flat context ───────────────────────────────────────
  return {
    // Primary signals (readable + settable from template)
    footprint,
    ceilingHeight,
    latitude,
    windows,
    exteriorPanel,
    interiorPanel,
    studDepth,
    cavityInsulation,

    // Derived computed signals
    ...outputComputed,
    ...scheduleComputed,

    // Catalog entry arrays for @for in selects
    ...panelSelectors,

    // Static data for template iteration
    wallOptions: WALLS,

    // Mutation methods
    ...footprintMethods,
    ...windowMethods,

    // Formatting helpers
    formatCurrency,
    formatDecimal,
    Math,
  };
}
