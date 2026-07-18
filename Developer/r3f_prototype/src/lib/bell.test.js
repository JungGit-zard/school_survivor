import { describe, expect, it } from 'vitest'
import { getBellSonicRingConfigs, BELL_VISUAL_SCALE, BELL_NOTE_LIFETIME_MS, createBellNoteSpecs } from './bell.js'

describe('bell sonic wave visual config', () => {
  it('uses only concentric circular rings for the attack effect', () => {
    const rings = getBellSonicRingConfigs()

    expect(rings).toHaveLength(4)
    expect(rings.every((ring) => ring.shape === 'ring')).toBe(true)
    expect(rings.every((ring) => ring.geometry === 'torus')).toBe(true)
  })

  it('staggers ring scale and opacity so circles read as a spreading sound wave', () => {
    const rings = getBellSonicRingConfigs()

    expect(rings.map((ring) => ring.scaleOffset)).toEqual([0, 0.16, 0.32, 0.48])
    expect(rings.map((ring) => ring.opacityMult)).toEqual([1, 0.78, 0.56, 0.34])
  })
})

describe('bell 1.5x visual + 2D music notes (2026-07-04)', () => {
  it('그래픽 배율은 1.5 — 공격 판정 반경과 무관한 순수 시각 상수', () => {
    expect(BELL_VISUAL_SCALE).toBe(1.5)
  })

  it('음표 스펙: 개수·♪♫ 교대·범위·순차 딜레이', () => {
    let seed = 3
    const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    const specs = createBellNoteSpecs(3, random)

    expect(specs).toHaveLength(3)
    expect(specs.map((s) => s.variant)).toEqual(['single', 'double', 'single'])
    specs.forEach((s, i) => {
      expect(s.dist).toBeGreaterThanOrEqual(0.35)
      expect(s.dist).toBeLessThanOrEqual(0.65)
      expect(s.riseHeight).toBeGreaterThanOrEqual(0.85)
      expect(s.scale).toBeGreaterThanOrEqual(0.5)
      expect(s.delayMs).toBe(i * 90)
    })
    expect(BELL_NOTE_LIFETIME_MS).toBeGreaterThan(520) // 음표가 링보다 오래 남는다
  })
})
