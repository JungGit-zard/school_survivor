import { describe, it, expect } from 'vitest'
import { getPullRadiusSq, setMagnetMultiplier } from './pickup.js'

// BASE_PULL_RADIUS 0.75 (레벨 0 = 자력 없음, 업그레이드 시 활성화)
const BASE = 0.75

describe('pickup magnet multiplier', () => {
  it('배율 1 → BASE²', () => {
    setMagnetMultiplier(1)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
  })

  it('자석 Lv.2 (배율 1.16) 적용 시 반지름이 BASE*1.16으로 변한다', () => {
    setMagnetMultiplier(1.16)
    expect(getPullRadiusSq()).toBeCloseTo((BASE * 1.16) ** 2, 5)
    setMagnetMultiplier(1) // restore
  })

  it('배율 0 → 반경 0 (자력 없음)', () => {
    setMagnetMultiplier(0)
    expect(getPullRadiusSq()).toBe(0)
    setMagnetMultiplier(1) // restore
  })

  it('비정상 배율(NaN, 음수)은 1로 폴백한다', () => {
    setMagnetMultiplier(NaN)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
    setMagnetMultiplier(-2)
    expect(getPullRadiusSq()).toBeCloseTo(BASE * BASE, 5)
    setMagnetMultiplier(1) // restore
  })
})
