import { describe, it, expect } from 'vitest'
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

describe('stagePropsLayout — kind catalog', () => {
  it('R5의 6종 prop kind가 모두 정의되어 있다', () => {
    for (const id of ['fallen_desk', 'chair_pile', 'contaminated_locker', 'safety_cone', 'barricade_small', 'warning_tape']) {
      expect(PROP_KINDS[id]).toBeDefined()
      expect(PROP_KINDS[id].category).toBe('prop')
    }
  })

  it('R8의 3종 atmosphere kind가 모두 정의되어 있다', () => {
    for (const id of ['exam_paper', 'pollution_puddle_static', 'window_shadow_broken']) {
      expect(PROP_KINDS[id]).toBeDefined()
      expect(PROP_KINDS[id].category).toBe('atmosphere')
    }
  })

  it('warning_tape는 collidesDefault:false (R6 장식 전용)', () => {
    expect(PROP_KINDS.warning_tape.collidesDefault).toBe(false)
  })

  it('atmosphere kind는 모두 collidesDefault:false', () => {
    for (const id of ['exam_paper', 'pollution_puddle_static', 'window_shadow_broken']) {
      expect(PROP_KINDS[id].collidesDefault).toBe(false)
    }
  })

  it('isValidKind는 카탈로그 키만 true', () => {
    expect(isValidKind('fallen_desk')).toBe(true)
    expect(isValidKind('bogus')).toBe(false)
  })
})

describe('stagePropsLayout — layout 데이터 정책', () => {
  it('모든 entry의 kind가 PROP_KINDS에 존재', () => {
    for (const e of PROP_LAYOUT) {
      expect(isValidKind(e.kind)).toBe(true)
    }
  })

  it('모든 entry의 pos가 맵 boundary(±48) 안', () => {
    for (const e of PROP_LAYOUT) {
      const [x, , z] = e.pos
      expect(Math.abs(x)).toBeLessThanOrEqual(MAP_HALF_EXTENT)
      expect(Math.abs(z)).toBeLessThanOrEqual(MAP_HALF_EXTENT)
    }
  })

  it('R6: 중앙 ±16 unit (4 블록) 안에 prop 없음', () => {
    expect(hasPropInCentralRadius(PROP_LAYOUT, CENTRAL_EMPTY_RADIUS)).toBe(false)
  })

  it('R6 / AE1 : 충돌 가능 prop의 footprint 합 ≤ 맵 면적의 15%', () => {
    expect(getBlockerAreaRatio(PROP_LAYOUT)).toBeLessThanOrEqual(0.15)
  })

  it('R6 정책: 모든 prop entry는 outer ring (한 축 |coord| ≥ 24)', () => {
    for (const e of PROP_LAYOUT) {
      expect(isInOuterRing(e.pos)).toBe(true)
    }
  })

  it('warning_tape entry의 collides 실효값은 false', () => {
    for (const e of PROP_LAYOUT) {
      if (e.kind === 'warning_tape') {
        expect(isCollidable(e)).toBe(false)
      }
    }
  })

  it('R5의 6종 prop kind 모두 layout에 최소 1개 등장', () => {
    const seen = new Set(PROP_LAYOUT.filter((e) => PROP_KINDS[e.kind]?.category === 'prop').map((e) => e.kind))
    for (const id of ['fallen_desk', 'chair_pile', 'contaminated_locker', 'safety_cone', 'barricade_small', 'warning_tape']) {
      expect(seen.has(id)).toBe(true)
    }
  })

  it('R8의 3종 atmosphere kind 모두 layout에 최소 1개 등장', () => {
    const seen = new Set(PROP_LAYOUT.filter((e) => PROP_KINDS[e.kind]?.category === 'atmosphere').map((e) => e.kind))
    for (const id of ['exam_paper', 'pollution_puddle_static', 'window_shadow_broken']) {
      expect(seen.has(id)).toBe(true)
    }
  })
})

describe('stagePropsLayout — helper edge cases', () => {
  it('isInOuterRing: 중앙(0,0,0)은 false', () => {
    expect(isInOuterRing([0, 0, 0])).toBe(false)
  })

  it('isInOuterRing: outer 경계 (24,0,0)는 true', () => {
    expect(isInOuterRing([OUTER_RING_INNER, 0, 0])).toBe(true)
  })

  it('isInOuterRing: boundary 직전 (48,0,0)는 true', () => {
    expect(isInOuterRing([OUTER_RING_OUTER, 0, 0])).toBe(true)
  })

  it('isInOuterRing: boundary 초과 (49,0,0)는 false', () => {
    expect(isInOuterRing([OUTER_RING_OUTER + 1, 0, 0])).toBe(false)
  })

  it('hasPropInCentralRadius: 빈 layout은 false', () => {
    expect(hasPropInCentralRadius([], 16)).toBe(false)
  })

  it('hasPropInCentralRadius: 중앙에 entry 있으면 true', () => {
    expect(hasPropInCentralRadius([{ kind: 'fallen_desk', pos: [0, 0, 0] }], 16)).toBe(true)
  })

  it('isCollidable: warning_tape entry에 collides:true override하면 true 반영', () => {
    expect(isCollidable({ kind: 'warning_tape', pos: [0, 0, 0], collides: true })).toBe(true)
  })

  it('isCollidable: 미지정 kind는 false', () => {
    expect(isCollidable({ kind: 'bogus', pos: [0, 0, 0] })).toBe(false)
  })

  it('getEntriesByCategory: prop vs atmosphere 분리', () => {
    const props = getEntriesByCategory(PROP_LAYOUT, 'prop')
    const atm = getEntriesByCategory(PROP_LAYOUT, 'atmosphere')
    expect(props.length).toBeGreaterThan(0)
    expect(atm.length).toBeGreaterThan(0)
    expect(props.length + atm.length).toBe(PROP_LAYOUT.length)
  })
})
