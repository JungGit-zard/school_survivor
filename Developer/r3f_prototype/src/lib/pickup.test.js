import { describe, it, expect } from 'vitest'
import { getPullRadiusSq, setMagnetMultiplier } from './pickup.js'

describe('pickup magnet multiplier', () => {
  it('기본값은 0.75 * 0.75 = 0.5625', () => {
    setMagnetMultiplier(1)
    expect(getPullRadiusSq()).toBeCloseTo(0.5625, 5)
  })

  it('자석 Lv.2 (배율 1.16) 적용 시 반지름이 0.75*1.16=0.87로 변한다', () => {
    setMagnetMultiplier(1.16)
    expect(getPullRadiusSq()).toBeCloseTo((0.75 * 1.16) ** 2, 5)
    setMagnetMultiplier(1) // restore
  })

  it('비정상 배율은 1로 폴백한다', () => {
    setMagnetMultiplier(NaN)
    expect(getPullRadiusSq()).toBeCloseTo(0.5625, 5)
    setMagnetMultiplier(0)
    expect(getPullRadiusSq()).toBeCloseTo(0.5625, 5)
    setMagnetMultiplier(-2)
    expect(getPullRadiusSq()).toBeCloseTo(0.5625, 5)
  })
})
