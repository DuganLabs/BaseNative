/**
 * Live Output — computed signals for the output panel display.
 * @module components/live-output
 */

import {
  calculateWallRBreakdown,
  calculateOverhangDepth,
  calculateWindowArea,
  detectCrossVentilation,
  checkAirtightnessRequirement,
  checkPassiveHouseCertifiable,
  renderWallCrossSection,
} from '../passive-house-engine.js';

import {
  EXTERIOR_PANELS,
  INTERIOR_PANELS,
  CAVITY_INSULATION,
  STUD_DEPTHS,
} from '../panel-catalog.js';

/**
 * @param {Function} computed
 * @param {{
 *   footprint: Function,
 *   ceilingHeight: Function,
 *   latitude: Function,
 *   windows: Function,
 *   exteriorPanel: Function,
 *   interiorPanel: Function,
 *   studDepth: Function,
 *   cavityInsulation: Function,
 * }} signals
 */
export function createOutputComputed(computed, signals) {
  const {
    footprint, ceilingHeight, latitude, windows,
    exteriorPanel, interiorPanel, studDepth, cavityInsulation,
  } = signals;

  const floorArea = computed(() => footprint().width * footprint().length);

  const cavityDepthInches = computed(() =>
    STUD_DEPTHS[studDepth()]?.depthInches ?? 5.5
  );

  const wallRBreakdown = computed(() => {
    const ext = EXTERIOR_PANELS[exteriorPanel()];
    const int = INTERIOR_PANELS[interiorPanel()];
    const ins = CAVITY_INSULATION[cavityInsulation()];
    return calculateWallRBreakdown(
      ext.rValue,
      cavityDepthInches(),
      ins.rPerInch,
      int.rValue
    );
  });

  const totalWallR = computed(() => wallRBreakdown().total);

  const overhangDepths = computed(() =>
    windows()
      .filter(w => w.wall === 'south')
      .map(w => ({
        id: w.id,
        overhangDepthFt: calculateOverhangDepth(w.height, latitude()),
      }))
  );

  const westHeatGainFlags = computed(() =>
    windows()
      .filter(w => w.wall === 'west')
      .map(w => {
        const sqft = calculateWindowArea(w);
        return { id: w.id, sqft: Math.round(sqft * 100) / 100, flagged: sqft > 4 };
      })
  );

  const crossVentilationOpportunity = computed(() =>
    detectCrossVentilation(windows())
  );

  const ervRequired = computed(() =>
    checkAirtightnessRequirement(totalWallR())
  );

  const passiveHouseCertifiable = computed(() =>
    checkPassiveHouseCertifiable(
      totalWallR(),
      windows().filter(w => w.wall === 'south'),
      windows().filter(w => w.wall === 'west'),
      ervRequired()
    )
  );

  const warnings = computed(() => {
    const w = [];
    const r = totalWallR();
    if (r < 20) {
      w.push({ level: 'error', message: 'Wall R-value below R-20 — does not meet minimum energy code.' });
    } else if (r < 40) {
      w.push({ level: 'warn', message: 'Wall R-value between R-20 and R-40 — meets code but not passive house standard.' });
    }

    const southWins = windows().filter(win => win.wall === 'south');
    if (southWins.length === 0 && windows().length > 0) {
      w.push({ level: 'warn', message: 'No south-facing windows — passive solar gain unavailable.' });
    }

    if (westHeatGainFlags().some(f => f.flagged)) {
      w.push({ level: 'warn', message: 'West-facing window exceeds 4 sqft — summer afternoon heat gain risk. Consider louvered shutters.' });
    }

    if (ervRequired()) {
      w.push({ level: 'info', message: 'ERV (energy recovery ventilator) required — envelope is airtight at R-40+.' });
    }

    if (!crossVentilationOpportunity() && windows().length >= 2) {
      w.push({ level: 'info', message: 'No cross-ventilation detected — add operable windows on opposite walls.' });
    }

    return w;
  });

  const wallCrossSection = computed(() => {
    const ext = EXTERIOR_PANELS[exteriorPanel()];
    const ins = CAVITY_INSULATION[cavityInsulation()];
    const int = INTERIOR_PANELS[interiorPanel()];
    const br = wallRBreakdown();
    return renderWallCrossSection(
      ext.name.split('+')[0].trim(),
      br.exterior,
      ins.name,
      br.cavity,
      int.name.split(' ').slice(0, 2).join(' '),
      br.interior
    );
  });

  return {
    floorArea,
    cavityDepthInches,
    wallRBreakdown,
    totalWallR,
    overhangDepths,
    westHeatGainFlags,
    crossVentilationOpportunity,
    ervRequired,
    passiveHouseCertifiable,
    warnings,
    wallCrossSection,
  };
}
