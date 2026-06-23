import { describe, it, expect } from 'vitest'
import { getPullRadiusSq, setMagnetMultiplier } from './pickup.js'

// BASE_PULL_RADIUS 1.5 (기존 0.75의 2배 — 초반 수집 개선)
const BASE = 1.5

describe('pickup magnet multiplier', () => {
  it('기본값은 BASE_PULL_RADIUS² = 2.25', () => {
    setMagnetMultiplier(1)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
  })

  it('자석 Lv.2 (배율 1.16) 적용 시 반지름이 BASE*1.16으로 변한다', () => {
    setMagnetMultiplier(1.16)
    expect(getPullRadiusSq()).toBeCloseTo((BASE * 1.16) ** 2, 5)
    setMagnetMultiplier(1) // restore
  })

  it('비정상 배율은 1로 폴백한다', () => {
    setMagnetMultiplier(NaN)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
    setMagnetMultiplier(0)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
    setMagnetMultiplier(-2)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
  })
})
