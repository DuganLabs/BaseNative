import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWallRBreakdown,
  calculateOverhangDepth,
  calculateWindowArea,
  detectCrossVentilation,
  checkAirtightnessRequirement,
  checkPassiveHouseCertifiable,
  calculatePanelSchedule,
  renderWallCrossSection,
} from './passive-house-engine.js';

describe('calculateWallRBreakdown', () => {
  it('sums all three layers correctly', () => {
    const r = calculateWallRBreakdown(26, 5.5, 6.5, 6.5);
    assert.equal(r.exterior, 26);
    assert.equal(r.cavity, 35.75);
    assert.equal(r.interior, 6.5);
    assert.equal(r.total, 68.25);
  });

  it('returns zero cavity R with zero insulation R/inch', () => {
    const r = calculateWallRBreakdown(13, 3.5, 0, 6.5);
    assert.equal(r.cavity, 0);
    assert.equal(r.total, 19.5);
  });

  it('handles 2x4 with fiberglass', () => {
    const r = calculateWallRBreakdown(13, 3.5, 3.2, 6.5);
    assert.equal(r.cavity, 11.2);
    assert.equal(r.total, 30.7);
  });

  it('handles 2x6 with mineral wool', () => {
    const r = calculateWallRBreakdown(39, 5.5, 3.8, 10);
    assert.equal(r.cavity, 20.9);
    assert.equal(r.total, 69.9);
  });
});

describe('calculateOverhangDepth', () => {
  it('calculates correct overhang for 48" window at 37° latitude', () => {
    // altitude = 90 - 37 + 23.44 = 76.44°
    // overhang = (48/12) / tan(76.44° × PI/180) = 4 / 4.117 ≈ 0.97 ft
    const depth = calculateOverhangDepth(48, 37);
    assert.ok(depth > 0.9 && depth < 1.1, `Expected ~0.97, got ${depth}`);
  });

  it('returns larger overhang at higher latitudes', () => {
    const d37 = calculateOverhangDepth(48, 37);
    const d45 = calculateOverhangDepth(48, 45);
    assert.ok(d45 > d37, `45° (${d45}) should need more overhang than 37° (${d37})`);
  });

  it('returns smaller overhang for shorter windows', () => {
    const tall = calculateOverhangDepth(60, 37);
    const short = calculateOverhangDepth(36, 37);
    assert.ok(tall > short);
  });

  it('returns 0 at equatorial latitude (sun passes north of zenith)', () => {
    const depth = calculateOverhangDepth(48, 0);
    assert.equal(depth, 0);
  });
});

describe('calculateWindowArea', () => {
  it('converts 36×48 inches to 12 sqft', () => {
    assert.equal(calculateWindowArea({ width: 36, height: 48 }), 12);
  });

  it('converts 24×24 inches to 4 sqft', () => {
    assert.equal(calculateWindowArea({ width: 24, height: 24 }), 4);
  });

  it('handles small windows', () => {
    assert.equal(calculateWindowArea({ width: 12, height: 12 }), 1);
  });
});

describe('detectCrossVentilation', () => {
  it('true when operable windows on north+south', () => {
    assert.equal(detectCrossVentilation([
      { wall: 'north', operable: true },
      { wall: 'south', operable: true },
    ]), true);
  });

  it('true when operable windows on east+west', () => {
    assert.equal(detectCrossVentilation([
      { wall: 'east', operable: true },
      { wall: 'west', operable: true },
    ]), true);
  });

  it('false when windows only on one wall', () => {
    assert.equal(detectCrossVentilation([
      { wall: 'south', operable: true },
      { wall: 'south', operable: true },
    ]), false);
  });

  it('false when opposite windows are not operable', () => {
    assert.equal(detectCrossVentilation([
      { wall: 'north', operable: false },
      { wall: 'south', operable: true },
    ]), false);
  });

  it('false with empty windows array', () => {
    assert.equal(detectCrossVentilation([]), false);
  });

  it('true with mixed walls as long as one pair is opposite and operable', () => {
    assert.equal(detectCrossVentilation([
      { wall: 'north', operable: true },
      { wall: 'east', operable: false },
      { wall: 'south', operable: true },
      { wall: 'west', operable: false },
    ]), true);
  });
});

describe('checkAirtightnessRequirement', () => {
  it('true at exactly R-40', () => {
    assert.equal(checkAirtightnessRequirement(40), true);
  });

  it('true above R-40', () => {
    assert.equal(checkAirtightnessRequirement(68.25), true);
  });

  it('false below R-40', () => {
    assert.equal(checkAirtightnessRequirement(39.99), false);
  });
});

describe('checkPassiveHouseCertifiable', () => {
  it('true with R-40+, south windows, small west windows, ERV', () => {
    assert.equal(checkPassiveHouseCertifiable(
      45,
      [{ width: 36, height: 48 }],
      [{ width: 24, height: 24 }],
      true
    ), true);
  });

  it('false when R < 40', () => {
    assert.equal(checkPassiveHouseCertifiable(
      35, [{ width: 36, height: 48 }], [], true
    ), false);
  });

  it('false when west window > 4 sqft', () => {
    assert.equal(checkPassiveHouseCertifiable(
      45,
      [{ width: 36, height: 48 }],
      [{ width: 36, height: 48 }],
      true
    ), false);
  });

  it('false with no south windows', () => {
    assert.equal(checkPassiveHouseCertifiable(45, [], [], true), false);
  });

  it('false without ERV when required', () => {
    assert.equal(checkPassiveHouseCertifiable(
      45, [{ width: 36, height: 48 }], [], false
    ), false);
  });

  it('true with west window exactly 4 sqft (boundary)', () => {
    assert.equal(checkPassiveHouseCertifiable(
      45,
      [{ width: 36, height: 48 }],
      [{ width: 24, height: 24 }],
      true
    ), true);
  });
});

describe('calculatePanelSchedule', () => {
  const extPanel = { sku: 'EXT-SP-4', rValue: 26, sqftWeight: 4.8, pricePerSqft: 12.75 };
  const intPanel = { sku: 'INT-PR-1', rValue: 6.5, sqftWeight: 1.8, pricePerSqft: 4.25 };

  it('computes correct gross wall area for 20×30 at 9ft ceiling', () => {
    const s = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', []);
    // perimeter = 2*(20+30) = 100 ft, ceiling = 9 ft → 900 sqft
    assert.equal(s.grossWallArea, 900);
  });

  it('computes non-zero panel counts', () => {
    const s = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', []);
    assert.ok(s.exteriorPanels.count > 0);
    assert.ok(s.interiorPanels.count > 0);
    assert.ok(s.totalEstimatedCost > 0);
  });

  it('deducts window openings from net wall area', () => {
    const noWin = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', []);
    const withWin = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', [
      { width: 36, height: 48 },
      { width: 36, height: 48 },
    ]);
    assert.ok(withWin.netWallArea < noWin.netWallArea);
    assert.equal(withWin.windowOpeningArea, 24);
  });

  it('includes trim extrusions', () => {
    const s = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', []);
    assert.ok(s.trim.length > 0);
    // Corner, base, and top trim always present; window trim is 0 with no windows
    assert.ok(s.trim.some(t => t.quantity > 0));
  });

  it('computes insulation volume', () => {
    const s = calculatePanelSchedule({ width: 20, length: 30 }, 108, extPanel, intPanel, '2x6', []);
    // net 900 sqft × 5.5"/12 ≈ 412.5 cuft
    assert.ok(s.insulation.volumeCuFt > 400);
  });
});

describe('renderWallCrossSection', () => {
  it('returns a multi-line string', () => {
    const art = renderWallCrossSection('Stucco', 26, 'Spray Foam', 35.75, 'Paint-Ready', 6.5);
    assert.ok(art.includes('\n'));
  });

  it('includes layer names', () => {
    const art = renderWallCrossSection('Stucco', 26, 'Spray Foam', 35.75, 'Paint-Ready', 6.5);
    assert.ok(art.includes('Stucco'));
    assert.ok(art.includes('Spray Foam'));
    assert.ok(art.includes('Paint-Ready'));
  });

  it('includes total R-value', () => {
    const art = renderWallCrossSection('Stucco', 26, 'Spray Foam', 35.75, 'Paint-Ready', 6.5);
    assert.ok(art.includes('R-68.25'));
  });
});
