/**
 * Panel Catalog — Passive House ADU Configurator
 *
 * All R-values use imperial units (ft²·°F·hr/BTU).
 * Polyiso R-value ≈ 6.5 per inch of foam core.
 *
 * @module panel-catalog
 */

/** @typedef {{sku: string, name: string, coreThickness: number, rValue: number, sqftWeight: number, pricePerSqft: number}} ExteriorPanel */
/** @typedef {{sku: string, name: string, face: string, thickness: number, rValue: number, sqftWeight: number, pricePerSqft: number}} InteriorPanel */
/** @typedef {{name: string, rPerInch: number}} CavityInsulation */
/** @typedef {{sku: string, name: string, lengthFt: number, pricePerLength: number}} TrimExtrusion */

/** @type {Record<string, ExteriorPanel>} */
export const EXTERIOR_PANELS = {
  'stucco-polyiso-2': {
    sku: 'EXT-SP-2',
    name: 'Smooth Stucco + 2" Polyiso',
    coreThickness: 2,
    rValue: 13,
    sqftWeight: 3.2,
    pricePerSqft: 8.50,
  },
  'stucco-polyiso-4': {
    sku: 'EXT-SP-4',
    name: 'Smooth Stucco + 4" Polyiso',
    coreThickness: 4,
    rValue: 26,
    sqftWeight: 4.8,
    pricePerSqft: 12.75,
  },
  'stucco-polyiso-6': {
    sku: 'EXT-SP-6',
    name: 'Smooth Stucco + 6" Polyiso',
    coreThickness: 6,
    rValue: 39,
    sqftWeight: 6.4,
    pricePerSqft: 17.00,
  },
};

/** @type {Record<string, InteriorPanel>} */
export const INTERIOR_PANELS = {
  'paint-ready-1': {
    sku: 'INT-PR-1',
    name: 'Smooth Paint-Ready 1"',
    face: 'paint-ready',
    thickness: 1,
    rValue: 6.5,
    sqftWeight: 1.8,
    pricePerSqft: 4.25,
  },
  'paint-ready-1.5': {
    sku: 'INT-PR-1.5',
    name: 'Smooth Paint-Ready 1.5"',
    face: 'paint-ready',
    thickness: 1.5,
    rValue: 10,
    sqftWeight: 2.2,
    pricePerSqft: 5.50,
  },
  'acoustic-1': {
    sku: 'INT-AC-1',
    name: 'Acoustic Treatment 1"',
    face: 'acoustic',
    thickness: 1,
    rValue: 6.5,
    sqftWeight: 2.1,
    pricePerSqft: 6.00,
  },
  'acoustic-1.5': {
    sku: 'INT-AC-1.5',
    name: 'Acoustic Treatment 1.5"',
    face: 'acoustic',
    thickness: 1.5,
    rValue: 10,
    sqftWeight: 2.4,
    pricePerSqft: 6.50,
  },
  'faux-brick-1': {
    sku: 'INT-FB-1',
    name: 'Faux Brick Veneer 1"',
    face: 'faux-brick',
    thickness: 1,
    rValue: 6.5,
    sqftWeight: 2.8,
    pricePerSqft: 9.75,
  },
  'faux-brick-1.5': {
    sku: 'INT-FB-1.5',
    name: 'Faux Brick Veneer 1.5"',
    face: 'faux-brick',
    thickness: 1.5,
    rValue: 10,
    sqftWeight: 3.2,
    pricePerSqft: 11.00,
  },
};

/** @type {Record<string, CavityInsulation>} */
export const CAVITY_INSULATION = {
  'fiberglass-batt': { name: 'Fiberglass Batt', rPerInch: 3.2 },
  'mineral-wool': { name: 'Mineral Wool (Rockwool)', rPerInch: 3.8 },
  'closed-cell-spray': { name: 'Closed-Cell Spray Foam', rPerInch: 6.5 },
  'open-cell-spray': { name: 'Open-Cell Spray Foam', rPerInch: 3.7 },
  'dense-pack-cellulose': { name: 'Dense-Pack Cellulose', rPerInch: 3.5 },
};

/** @type {Record<string, TrimExtrusion>} */
export const TRIM_EXTRUSIONS = {
  'corner-outside': { sku: 'TRIM-CO', name: 'Outside Corner', lengthFt: 10, pricePerLength: 18.00 },
  'corner-inside': { sku: 'TRIM-CI', name: 'Inside Corner', lengthFt: 10, pricePerLength: 16.00 },
  'j-channel': { sku: 'TRIM-JC', name: 'J-Channel (Window Jamb)', lengthFt: 10, pricePerLength: 12.00 },
  'base-starter': { sku: 'TRIM-BS', name: 'Base Starter Strip', lengthFt: 10, pricePerLength: 14.00 },
  'top-termination': { sku: 'TRIM-TT', name: 'Top Termination', lengthFt: 10, pricePerLength: 15.00 },
  'window-sill': { sku: 'TRIM-WS', name: 'Window Sill', lengthFt: 4, pricePerLength: 22.00 },
};

/** @type {string[]} */
export const WALLS = ['north', 'south', 'east', 'west'];

/** @type {Record<string, {label: string, depthInches: number}>} */
export const STUD_DEPTHS = {
  '2x4': { label: '2x4 (3.5")', depthInches: 3.5 },
  '2x6': { label: '2x6 (5.5")', depthInches: 5.5 },
};

/** Standard panel sheet dimensions */
export const PANEL_SHEET_WIDTH_FT = 4;
export const PANEL_SHEET_HEIGHT_FT = 8;
export const PANEL_SHEET_AREA_SQFT = 32;

/** Stud spacing on-center */
export const STUD_SPACING_OC_INCHES = 16;
