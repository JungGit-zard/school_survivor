import { describe, expect, it } from 'vitest'
import {
  PROP_KINDS,
  PROP_LAYOUT,
  MAP_HALF_EXTENT,
  CENTRAL_EMPTY_RADIUS,
  OUTER_RING_INNER,
  OUTER_RING_OUTER,
  isValidKind,
  isCollidable,
  hasPropInCentralRadius,
  getBlockerAreaRatio,
  isInOuterRing,
  getEntriesByCategory,
} from './stagePropsLayout.js'

describe('stagePropsLayout kind catalog', () => {
  it('keeps known prop kinds available for future reuse', () => {
    for (const id of ['fallen_desk', 'chair_pile', 'contaminated_locker', 'safety_cone', 'barricade_small', 'warning_tape']) {
      expect(PROP_KINDS[id]).toBeDefined()
      expect(PROP_KINDS[id].category).toBe('prop')
    }
  })

  it('keeps known atmosphere kinds available for future reuse', () => {
    for (const id of ['exam_paper', 'pollution_puddle_static', 'window_shadow_broken']) {
      expect(PROP_KINDS[id]).toBeDefined()
      expect(PROP_KINDS[id].category).toBe('atmosphere')
    }
  })

  it('warning_tape defaults to non-colliding', () => {
    expect(PROP_KINDS.warning_tape.collidesDefault).toBe(false)
  })

  it('all atmosphere kinds default to non-colliding', () => {
    for (const id of ['exam_paper', 'pollution_puddle_static', 'window_shadow_broken']) {
      expect(PROP_KINDS[id].collidesDefault).toBe(false)
    }
  })

  it('isValidKind only accepts catalog kinds', () => {
    expect(isValidKind('fallen_desk')).toBe(true)
    expect(isValidKind('bogus')).toBe(false)
  })
})

describe('stagePropsLayout layout policy', () => {
  it('has no placed prop or atmosphere entries', () => {
    expect(PROP_LAYOUT).toHaveLength(0)
  })

  it('all entries stay inside map bounds if layout is repopulated later', () => {
    for (const entry of PROP_LAYOUT) {
      const [x, , z] = entry.pos
      expect(Math.abs(x)).toBeLessThanOrEqual(MAP_HALF_EXTENT)
      expect(Math.abs(z)).toBeLessThanOrEqual(MAP_HALF_EXTENT)
    }
  })

  it('has no colliding prop in the central player space', () => {
    expect(hasPropInCentralRadius(PROP_LAYOUT, CENTRAL_EMPTY_RADIUS)).toBe(false)
  })

  it('has zero blocker area while props are removed', () => {
    expect(getBlockerAreaRatio(PROP_LAYOUT)).toBe(0)
  })

  it('has no prop entries visible near the iPhone SE opening view', () => {
    const visibleProps = PROP_LAYOUT.filter((entry) => {
      if (PROP_KINDS[entry.kind]?.category !== 'prop') return false
      if (isCollidable(entry)) return false
      const [x, , z] = entry.pos
      return Math.abs(x) <= 2.1 && Math.abs(z) <= 6.8
    })

    expect(visibleProps).toHaveLength(0)
  })

  it('has no atmosphere entries placed in the layout', () => {
    expect(getEntriesByCategory(PROP_LAYOUT, 'atmosphere')).toHaveLength(0)
  })
})

describe('stagePropsLayout helper edge cases', () => {
  it('isInOuterRing returns false for center', () => {
    expect(isInOuterRing([0, 0, 0])).toBe(false)
  })

  it('isInOuterRing returns true at the outer-ring inner edge', () => {
    expect(isInOuterRing([OUTER_RING_INNER, 0, 0])).toBe(true)
  })

  it('isInOuterRing returns true at map boundary', () => {
    expect(isInOuterRing([OUTER_RING_OUTER, 0, 0])).toBe(true)
  })

  it('isInOuterRing returns false outside map boundary', () => {
    expect(isInOuterRing([OUTER_RING_OUTER + 1, 0, 0])).toBe(false)
  })

  it('hasPropInCentralRadius returns false for an empty layout', () => {
    expect(hasPropInCentralRadius([], 16)).toBe(false)
  })

  it('hasPropInCentralRadius returns true for a colliding center entry', () => {
    expect(hasPropInCentralRadius([{ kind: 'fallen_desk', pos: [0, 0, 0] }], 16)).toBe(true)
  })

  it('isCollidable honors warning_tape collision overrides', () => {
    expect(isCollidable({ kind: 'warning_tape', pos: [0, 0, 0], collides: true })).toBe(true)
  })

  it('isCollidable returns false for unknown kinds', () => {
    expect(isCollidable({ kind: 'bogus', pos: [0, 0, 0] })).toBe(false)
  })

  it('getEntriesByCategory returns no entries while layout is empty', () => {
    expect(getEntriesByCategory(PROP_LAYOUT, 'prop')).toHaveLength(0)
    expect(getEntriesByCategory(PROP_LAYOUT, 'atmosphere')).toHaveLength(0)
  })
})
