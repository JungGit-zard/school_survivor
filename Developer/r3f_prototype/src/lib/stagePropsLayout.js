// Stage prop catalog and layout helpers.
// The catalog is kept so old component modules and tests still have stable kind metadata.
// PROP_LAYOUT is intentionally empty: stage props are currently removed from gameplay.

/**
 * Common props passed to Props/* and Atmosphere/* components.
 *
 * @typedef {Object} StagePropProps
 * @property {[number, number, number]} pos World position [x, y, z].
 * @property {number} [rot] Y-axis rotation in radians. Defaults to 0.
 * @property {number} [scale] Uniform scale multiplier. Defaults to 1.
 * @property {boolean} [collides] When true, render as a fixed collision prop.
 */

export const PROP_KINDS = {
  fallen_desk: { category: 'prop', collidesDefault: true, footprint: { w: 1.6, d: 1.0 } },
  chair_pile: { category: 'prop', collidesDefault: true, footprint: { w: 1.2, d: 1.2 } },
  contaminated_locker: { category: 'prop', collidesDefault: true, footprint: { w: 1.0, d: 0.5 } },
  safety_cone: { category: 'prop', collidesDefault: true, footprint: { w: 0.5, d: 0.5 } },
  barricade_small: { category: 'prop', collidesDefault: true, footprint: { w: 1.8, d: 0.4 } },
  warning_tape: { category: 'prop', collidesDefault: false, footprint: { w: 2.0, d: 0.2 } },
  exam_paper: { category: 'atmosphere', collidesDefault: false, footprint: { w: 0.6, d: 0.6 } },
  pollution_puddle_static: { category: 'atmosphere', collidesDefault: false, footprint: { w: 1.4, d: 1.4 } },
  window_shadow_broken: { category: 'atmosphere', collidesDefault: false, footprint: { w: 2.0, d: 1.0 } },
}

export const PROP_LAYOUT = []

export const MAP_HALF_EXTENT = 48
export const MAP_AREA = (MAP_HALF_EXTENT * 2) ** 2
export const CENTRAL_EMPTY_RADIUS = 16
export const OUTER_RING_INNER = 24
export const OUTER_RING_OUTER = 48

export function isValidKind(kind) {
  return Object.prototype.hasOwnProperty.call(PROP_KINDS, kind)
}

export function isCollidable(entry) {
  if (!isValidKind(entry.kind)) return false
  const def = PROP_KINDS[entry.kind]
  return entry.collides !== undefined ? entry.collides : def.collidesDefault
}

export function hasPropInCentralRadius(layout, radius = CENTRAL_EMPTY_RADIUS) {
  return layout.some((entry) => {
    if (!isCollidable(entry)) return false
    const [x, , z] = entry.pos
    return Math.abs(x) < radius && Math.abs(z) < radius
  })
}

export function getBlockerAreaRatio(layout) {
  let blocked = 0
  for (const entry of layout) {
    if (!isCollidable(entry)) continue
    const def = PROP_KINDS[entry.kind]
    if (!def) continue
    blocked += def.footprint.w * def.footprint.d
  }
  return blocked / MAP_AREA
}

export function isInOuterRing(pos) {
  const [x, , z] = pos
  const ax = Math.abs(x)
  const az = Math.abs(z)
  if (ax > OUTER_RING_OUTER || az > OUTER_RING_OUTER) return false
  return ax >= OUTER_RING_INNER || az >= OUTER_RING_INNER
}

export function getEntriesByCategory(layout, category) {
  return layout.filter((entry) => PROP_KINDS[entry.kind]?.category === category)
}
