import { describe, it, expect, beforeEach } from 'vitest'
import { getPullRadiusSq, setMagnetMultiplier, stepMagnetPull } from './pickup.js'
import { playerPos } from './refs.js'

// 수집 시작 반경 1.2 (레벨 0도 부드러운 흡입 시작, 업그레이드 시 확장)
const BASE = 1.2

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

describe('pickup smooth attraction step', () => {
  beforeEach(() => {
    playerPos.set(0, 0, 0)
    setMagnetMultiplier(0)
  })

  it('레벨 0에서도 1.2 반경 안의 교과서는 즉시 사라지지 않고 플레이어 쪽으로 부드럽게 끌린다', () => {
    const pRef = { current: { x: 1.0, y: 0.13, z: 0 } }

    const result = stepMagnetPull(pRef, 1 / 60)

    expect(result).toBe('pulled')
    expect(pRef.current.x).toBeLessThan(1.0)
    expect(pRef.current.x).toBeGreaterThan(0.2)
  })

  it('플레이어 중심에 충분히 가까워진 뒤에만 collected를 반환한다', () => {
    const pRef = { current: { x: 0.18, y: 0.13, z: 0 } }

    expect(stepMagnetPull(pRef, 1 / 60)).toBe('collected')
  })

  it('자석 업그레이드는 기본 흡입 반경 밖의 교과서를 추가로 끌어온다', () => {
    setMagnetMultiplier(1.16)
    const pRef = { current: { x: 1.3, y: 0.13, z: 0 } }

    const result = stepMagnetPull(pRef, 1 / 60)

    expect(result).toBe('pulled')
    expect(pRef.current.x).toBeLessThan(1.3)
  })
})
