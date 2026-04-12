/**
 * Footprint Input — mutation methods for footprint dimensions.
 * @module components/footprint-input
 */

/**
 * @param {Function} footprint - footprint signal
 * @param {Function} ceilingHeight - ceilingHeight signal
 * @param {Function} latitude - latitude signal
 */
export function createFootprintMethods(footprint, ceilingHeight, latitude) {
  return {
    setFootprintWidth(w) {
      footprint.set(prev => ({ ...prev, width: w }));
    },
    setFootprintLength(l) {
      footprint.set(prev => ({ ...prev, length: l }));
    },
    setCeilingHeight(h) {
      ceilingHeight.set(h);
    },
    setLatitude(lat) {
      latitude.set(lat);
    },
  };
}
