import { describe, expect, it } from 'vitest'
import {
  ciHalfWidth,
  ciInsideWindow,
  clusterBootstrap,
  median,
  medianCI,
  pairedProportionDiff,
  pairedRatioMedian,
  proportionCI,
  wilsonInterval,
} from './balanceProbeStats.js'

describe('balanceProbeStats', () => {
  it('Wilson 95% CI가 교과서 값과 맞는다(80/100 → 0.711~0.867)', () => {
    const ci = wilsonInterval(80, 100)
    expect(ci.rate).toBe(0.8)
    expect(ci.low).toBeCloseTo(0.7112, 3)
    expect(ci.high).toBeCloseTo(0.8667, 3)
  })

  it('100시드 단일 이항 표본으로는 p=0.5의 95% CI 반폭이 5pp 아래로 내려가지 않는다(T-P4 문구 점검)', () => {
    expect(ciHalfWidth(wilsonInterval(50, 100))).toBeGreaterThan(0.09)
    expect(ciHalfWidth(wilsonInterval(300, 600))).toBeLessThan(0.05)
  })

  it('부트스트랩은 고정 시드라 같은 입력이면 같은 CI를 낸다', () => {
    const clusters = Array.from({ length: 40 }, (_, i) => [i % 3 === 0 ? 1 : 0, i % 2])
    expect(clusterBootstrap(clusters)).toEqual(clusterBootstrap(clusters))
  })

  it('시드 클러스터 비율 CI는 점추정을 감싼다', () => {
    const clusters = Array.from({ length: 100 }, (_, i) => Array.from({ length: 6 }, (_, j) => ((i * 7 + j * 3) % 10) < 7))
    const ci = proportionCI(clusters)
    expect(ci.n).toBe(600)
    expect(ci.rate).toBeCloseTo(0.7, 5)
    expect(ci.low).toBeLessThan(0.7)
    expect(ci.high).toBeGreaterThan(0.7)
  })

  it('같은 시드 짝비교: 같은 결과끼리는 차이 CI가 정확히 [0, 0]이다', () => {
    const before = Array.from({ length: 100 }, (_, i) => [i % 2 === 0, i % 5 === 0])
    const diff = pairedProportionDiff(before, before)
    expect(diff).toMatchObject({ diff: 0, low: 0, high: 0, discordant: { afterOnly: 0, beforeOnly: 0 } })
    const ratio = pairedRatioMedian(before.map((c) => c.map((v) => (v ? 10 : 5))), before.map((c) => c.map((v) => (v ? 10 : 5))))
    expect(ratio).toMatchObject({ ratio: 1, low: 1, high: 1 })
  })

  it('짝비교 차이의 부호와 불일치 쌍을 센다', () => {
    const before = Array.from({ length: 100 }, () => [true])
    const after = Array.from({ length: 100 }, (_, i) => [i >= 20])
    const diff = pairedProportionDiff(before, after)
    expect(diff.diff).toBeCloseTo(-0.2, 10)
    expect(diff.discordant).toEqual({ afterOnly: 0, beforeOnly: 20 })
    expect(diff.high).toBeLessThan(0)
    expect(() => pairedProportionDiff(before, after.slice(1))).toThrow()
  })

  it('연속 지표 비율 중앙값: before 0 시드는 빼고 센다', () => {
    const before = [[0], [10], [10], [20]]
    const after = [[5], [15], [15], [30]]
    const result = pairedRatioMedian(before, after)
    expect(result.excluded).toBe(1)
    expect(result.ratio).toBe(1.5)
  })

  it('판정 도우미: CI 전체가 창 안일 때만 통과', () => {
    expect(ciInsideWindow({ low: 0.42, high: 0.53 }, 0.4, 0.55)).toBe(true)
    expect(ciInsideWindow({ low: 0.38, high: 0.5 }, 0.4, 0.55)).toBe(false)
    expect(median([3, 1, 2])).toBe(2)
    expect(medianCI([[1], [2], [3], [4]]).median).toBe(2.5)
  })
})
