/**
 * Passive House Physics Engine
 *
 * All functions are pure — no side effects, no signal dependency, no DOM access.
 * All R-values in imperial: ft²·°F·hr/BTU.
 * All dimensions: feet for length, inches for thickness/depth unless noted.
 *
 * @module passive-house-engine
 */

import {
  TRIM_EXTRUSIONS,
  PANEL_SHEET_AREA_SQFT,
  STUD_DEPTHS,
} from './panel-catalog.js';

/**
 * Calculate total wall R-value as sum of assembly layers.
 *
 * Formula:
 *   R_total = R_exterior + R_cavity + R_interior
 *   R_cavity = cavityDepthInches × insulationRPerInch
 *
 * @param {number} exteriorR - R-value of exterior panel
 * @param {number} cavityDepthInches - stud cavity depth in inches (3.5 or 5.5)
 * @param {number} insulationRPerInch - R-value per inch of cavity insulation material
 * @param {number} interiorR - R-value of interior panel
 * @returns {{exterior: number, cavity: number, interior: number, total: number}}
 */
export function calculateWallRBreakdown(exteriorR, cavityDepthInches, insulationRPerInch, interiorR) {
  const cavity = cavityDepthInches * insulationRPerInch;
  const total = exteriorR + cavity + interiorR;
  return {
    exterior: exteriorR,
    cavity: Math.round(cavity * 100) / 100,
    interior: interiorR,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Calculate minimum south-facing overhang depth to fully shade a window
 * at summer solstice noon.
 *
 * Solar geometry:
 *   Solar altitude at noon on summer solstice = 90° − latitude + 23.44°
 *   (23.44° is Earth's axial tilt / obliquity of the ecliptic)
 *
 * Overhang formula:
 *   overhangDepth = windowHeight / tan(solarAltitude)
 *
 * The overhang must project far enough that the shadow cast at the highest
 * sun angle covers the full window height.
 *
 * @param {number} windowHeightInches - window height in inches
 * @param {number} latitudeDeg - site latitude in degrees north
 * @returns {number} minimum overhang depth in feet (rounded to 2 decimal places)
 */
export function calculateOverhangDepth(windowHeightInches, latitudeDeg) {
  const solarAltitudeDeg = 90 - latitudeDeg + 23.44;
  // At latitudes below ~23.44° (tropics), solar altitude exceeds 90° at
  // summer solstice — the sun passes north of zenith. No south-facing
  // overhang can shade the window; return 0.
  if (solarAltitudeDeg >= 90) return 0;
  const solarAltitudeRad = solarAltitudeDeg * Math.PI / 180;
  const windowHeightFt = windowHeightInches / 12;
  const depth = windowHeightFt / Math.tan(solarAltitudeRad);
  return Math.round(Math.max(0, depth) * 100) / 100;
}

/**
 * Calculate window area in square feet from inch dimensions.
 *
 * Formula: area = (widthInches × heightInches) / 144
 *
 * @param {{width: number, height: number}} win - window dimensions in inches
 * @returns {number} area in square feet
 */
export function calculateWindowArea(win) {
  return (win.width * win.height) / 144;
}

/**
 * Detect cross-ventilation opportunity.
 *
 * Cross-ventilation requires operable windows on at least two opposite walls:
 * north↔south or east↔west. This enables passive cooling via stack effect
 * and wind-driven airflow.
 *
 * @param {Array<{wall: string, operable: boolean}>} windows
 * @returns {boolean} true if cross-ventilation is available
 */
export function detectCrossVentilation(windows) {
  const operableWalls = new Set(
    windows.filter(w => w.operable).map(w => w.wall)
  );
  return (operableWalls.has('north') && operableWalls.has('south'))
    || (operableWalls.has('east') && operableWalls.has('west'));
}

/**
 * Check if an energy recovery ventilator (ERV) is required.
 *
 * Passive house envelopes at or above R-40 are airtight enough that
 * natural infiltration cannot provide adequate fresh air. Mechanical
 * ventilation with heat recovery is required.
 *
 * @param {number} totalWallR
 * @returns {boolean} true if ERV is required
 */
export function checkAirtightnessRequirement(totalWallR) {
  return totalWallR >= 40;
}

/**
 * Master passive house certifiability check.
 *
 * Requirements:
 * 1. Total wall R-value >= 40
 * 2. All south-facing windows must have adequate overhangs (checked elsewhere;
 *    here we verify at least one south window exists for passive solar gain)
 * 3. No west-facing window > 4 sqft without shading (uncontrolled heat gain)
 * 4. ERV included when required (auto-satisfied at R >= 40)
 *
 * @param {number} totalWallR
 * @param {Array<{width: number, height: number}>} southWindows
 * @param {Array<{width: number, height: number}>} westWindows
 * @param {boolean} hasERV
 * @returns {boolean}
 */
export function checkPassiveHouseCertifiable(totalWallR, southWindows, westWindows, hasERV) {
  if (totalWallR < 40) return false;
  if (southWindows.length === 0) return false;
  const hasOversizedWest = westWindows.some(w => calculateWindowArea(w) > 4);
  if (hasOversizedWest) return false;
  if (totalWallR >= 40 && !hasERV) return false;
  return true;
}

/**
 * Generate full panel schedule / material takeoff.
 *
 * Calculates:
 * - Gross wall area = perimeter × (ceilingHeight / 12)
 * - Window opening area deducted
 * - Panel count based on 4×8 ft sheets (32 sqft each), rounded up
 * - Trim extrusion quantities:
 *   - 4 outside corners (one per building corner), height of ceiling
 *   - Base starter + top termination: full perimeter
 *   - J-channel: perimeter of each window opening
 *   - Window sills: width of each window
 * - Estimated costs and weights
 *
 * @param {{width: number, length: number}} footprint - in feet
 * @param {number} ceilingHeightInches
 * @param {{sku: string, rValue: number, sqftWeight: number, pricePerSqft: number}} extPanel
 * @param {{sku: string, rValue: number, sqftWeight: number, pricePerSqft: number}} intPanel
 * @param {string} studDepth - '2x4' or '2x6'
 * @param {Array<{width: number, height: number}>} windows - dimensions in inches
 * @returns {{
 *   grossWallArea: number,
 *   windowOpeningArea: number,
 *   netWallArea: number,
 *   exteriorPanels: {count: number, sku: string, totalSqft: number, weight: number, cost: number},
 *   interiorPanels: {count: number, sku: string, totalSqft: number, weight: number, cost: number},
 *   trim: Array<{sku: string, name: string, quantity: number, totalLengthFt: number, cost: number}>,
 *   insulation: {volumeCuFt: number},
 *   totalEstimatedCost: number,
 *   totalEstimatedWeight: number,
 * }}
 */
export function calculatePanelSchedule(footprint, ceilingHeightInches, extPanel, intPanel, studDepth, windows) {
  const ceilingHeightFt = ceilingHeightInches / 12;
  const perimeter = 2 * (footprint.width + footprint.length);
  const grossWallArea = perimeter * ceilingHeightFt;

  const windowOpeningArea = windows.reduce(
    (sum, w) => sum + calculateWindowArea(w), 0
  );
  const netWallArea = Math.max(0, grossWallArea - windowOpeningArea);

  const extCount = Math.ceil(netWallArea / PANEL_SHEET_AREA_SQFT);
  const intCount = Math.ceil(netWallArea / PANEL_SHEET_AREA_SQFT);

  const extTotalSqft = extCount * PANEL_SHEET_AREA_SQFT;
  const intTotalSqft = intCount * PANEL_SHEET_AREA_SQFT;

  const outsideCornerQty = 4;
  const outsideCornerLengthEach = ceilingHeightFt;
  const outsideCornerTotalFt = outsideCornerQty * outsideCornerLengthEach;
  const outsideCornerPieces = Math.ceil(outsideCornerTotalFt / TRIM_EXTRUSIONS['corner-outside'].lengthFt);

  const baseStarterTotalFt = perimeter;
  const baseStarterPieces = Math.ceil(baseStarterTotalFt / TRIM_EXTRUSIONS['base-starter'].lengthFt);

  const topTermTotalFt = perimeter;
  const topTermPieces = Math.ceil(topTermTotalFt / TRIM_EXTRUSIONS['top-termination'].lengthFt);

  const windowJambTotalFt = windows.reduce(
    (sum, w) => sum + 2 * (w.width / 12 + w.height / 12), 0
  );
  const jChannelPieces = Math.ceil(windowJambTotalFt / TRIM_EXTRUSIONS['j-channel'].lengthFt);

  const windowSillTotalFt = windows.reduce(
    (sum, w) => sum + w.width / 12, 0
  );
  const sillPieces = Math.ceil(windowSillTotalFt / TRIM_EXTRUSIONS['window-sill'].lengthFt);

  const trim = [
    {
      sku: TRIM_EXTRUSIONS['corner-outside'].sku,
      name: TRIM_EXTRUSIONS['corner-outside'].name,
      quantity: outsideCornerPieces,
      totalLengthFt: round2(outsideCornerTotalFt),
      cost: round2(outsideCornerPieces * TRIM_EXTRUSIONS['corner-outside'].pricePerLength),
    },
    {
      sku: TRIM_EXTRUSIONS['base-starter'].sku,
      name: TRIM_EXTRUSIONS['base-starter'].name,
      quantity: baseStarterPieces,
      totalLengthFt: round2(baseStarterTotalFt),
      cost: round2(baseStarterPieces * TRIM_EXTRUSIONS['base-starter'].pricePerLength),
    },
    {
      sku: TRIM_EXTRUSIONS['top-termination'].sku,
      name: TRIM_EXTRUSIONS['top-termination'].name,
      quantity: topTermPieces,
      totalLengthFt: round2(topTermTotalFt),
      cost: round2(topTermPieces * TRIM_EXTRUSIONS['top-termination'].pricePerLength),
    },
    {
      sku: TRIM_EXTRUSIONS['j-channel'].sku,
      name: TRIM_EXTRUSIONS['j-channel'].name,
      quantity: jChannelPieces,
      totalLengthFt: round2(windowJambTotalFt),
      cost: round2(jChannelPieces * TRIM_EXTRUSIONS['j-channel'].pricePerLength),
    },
    {
      sku: TRIM_EXTRUSIONS['window-sill'].sku,
      name: TRIM_EXTRUSIONS['window-sill'].name,
      quantity: sillPieces,
      totalLengthFt: round2(windowSillTotalFt),
      cost: round2(sillPieces * TRIM_EXTRUSIONS['window-sill'].pricePerLength),
    },
  ];

  const cavityDepth = STUD_DEPTHS[studDepth]?.depthInches ?? 5.5;
  const insulationVolumeCuFt = round2(netWallArea * (cavityDepth / 12));

  const extCost = round2(extTotalSqft * extPanel.pricePerSqft);
  const intCost = round2(intTotalSqft * intPanel.pricePerSqft);
  const trimCost = trim.reduce((s, t) => s + t.cost, 0);

  const extWeight = round2(extTotalSqft * extPanel.sqftWeight);
  const intWeight = round2(intTotalSqft * intPanel.sqftWeight);

  return {
    grossWallArea: round2(grossWallArea),
    windowOpeningArea: round2(windowOpeningArea),
    netWallArea: round2(netWallArea),
    exteriorPanels: { count: extCount, sku: extPanel.sku, totalSqft: extTotalSqft, weight: extWeight, cost: extCost },
    interiorPanels: { count: intCount, sku: intPanel.sku, totalSqft: intTotalSqft, weight: intWeight, cost: intCost },
    trim,
    insulation: { volumeCuFt: insulationVolumeCuFt },
    totalEstimatedCost: round2(extCost + intCost + trimCost),
    totalEstimatedWeight: round2(extWeight + intWeight),
  };
}

/**
 * Generate an ASCII cross-section diagram of the wall assembly.
 *
 * Renders a horizontal cross-section from exterior (left) to interior (right),
 * showing each layer with its R-value.
 *
 * @param {string} exteriorName
 * @param {number} exteriorR
 * @param {string} insulationName
 * @param {number} cavityR
 * @param {string} interiorName
 * @param {number} interiorR
 * @returns {string} multi-line ASCII art
 */
export function renderWallCrossSection(exteriorName, exteriorR, insulationName, cavityR, interiorName, interiorR) {
  const totalR = round2(exteriorR + cavityR + interiorR);
  const extWidth = Math.max(exteriorName.length + 2, Math.round(exteriorR / 4));
  const cavWidth = Math.max(insulationName.length + 2, Math.round(cavityR / 4));
  const intWidth = Math.max(interiorName.length + 2, Math.round(interiorR / 4));

  const extBar = '='.repeat(extWidth);
  const cavBar = ':'.repeat(cavWidth);
  const intBar = '-'.repeat(intWidth);

  const divider = '+' + '-'.repeat(extWidth) + '+' + '-'.repeat(cavWidth) + '+' + '-'.repeat(intWidth) + '+';

  const lines = [
    'EXTERIOR                                    INTERIOR',
    '   <--                                         -->',
    '',
    divider,
    '|' + extBar + '|' + cavBar + '|' + intBar + '|',
    '|' + center(exteriorName, extWidth) + '|' + center(insulationName, cavWidth) + '|' + center(interiorName, intWidth) + '|',
    '|' + center('R-' + exteriorR, extWidth) + '|' + center('R-' + cavityR, cavWidth) + '|' + center('R-' + interiorR, intWidth) + '|',
    '|' + extBar + '|' + cavBar + '|' + intBar + '|',
    divider,
    '',
    'Total Assembly R-Value: R-' + totalR,
  ];

  return lines.join('\n');
}

/** @param {string} text @param {number} width */
function center(text, width) {
  if (text.length >= width) return text.slice(0, width);
  const pad = width - text.length;
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

/** @param {number} n */
function round2(n) {
  return Math.round(n * 100) / 100;
}
