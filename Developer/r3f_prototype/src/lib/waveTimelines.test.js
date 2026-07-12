import { describe, it, expect } from 'vitest'
import { WAVE_PHASES, STAGE2_WAVE_PHASES, STAGE3_WAVE_PHASES, getDefaultWavePhases } from './waveTimelines.js'
import { isBossPhase } from './burstEvents.js'

describe('waveTimelines 기본 타임라인', () => {
  it('getDefaultWavePhases: stage2는 STAGE2, 그 외 stage1', () => {
    expect(getDefaultWavePhases('stage1')).toBe(WAVE_PHASES)
    expect(getDefaultWavePhases('stage2')).toBe(STAGE2_WAVE_PHASES)
    expect(getDefaultWavePhases(undefined)).toBe(WAVE_PHASES)
  })

  it('어느 phase도 bossPhase 필드를 하드코딩하지 않는다 (보스 구간은 파생)', () => {
    for (const phase of [...WAVE_PHASES, ...STAGE2_WAVE_PHASES]) {
      expect(phase).not.toHaveProperty('bossPhase')
    }
  })

  it('보스 구간은 보스 등장 시각(2:00) 기준으로 파생된다', () => {
    // 2:00(120s) 이후 시작 phase만 보스 구간
    const stage2Boss = STAGE2_WAVE_PHASES.filter((p) => isBossPhase(p.start, 'stage2'))
    expect(stage2Boss.every((p) => p.start >= 120)).toBe(true)
    // 120s 미만 phase는 보스 구간 아님
    const stage2Pre = STAGE2_WAVE_PHASES.filter((p) => p.start < 120)
    expect(stage2Pre.every((p) => !isBossPhase(p.start, 'stage2'))).toBe(true)
  })
})

describe('stage3 총력전 타임라인', () => {
  it('getDefaultWavePhases: stage3는 STAGE3', () => {
    expect(getDefaultWavePhases('stage3')).toBe(STAGE3_WAVE_PHASES)
  })

  it('12구간·240s 커버·start<end·오름차순 연속', () => {
    expect(STAGE3_WAVE_PHASES).toHaveLength(12)
    expect(STAGE3_WAVE_PHASES[0].start).toBe(0)
    expect(STAGE3_WAVE_PHASES[STAGE3_WAVE_PHASES.length - 1].end).toBe(240)
    STAGE3_WAVE_PHASES.forEach((p, i) => {
      expect(p.start).toBeLessThan(p.end)
      if (i > 0) expect(p.start).toBe(STAGE3_WAVE_PHASES[i - 1].end)
    })
  })

  it('모든 phase weights 합 ≈ 1', () => {
    STAGE3_WAVE_PHASES.forEach((p) => {
      const sum = Object.values(p.weights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1)
    })
  })

  it('bossPhase 필드를 하드코딩하지 않는다 (보스 구간은 파생)', () => {
    for (const phase of STAGE3_WAVE_PHASES) {
      expect(phase).not.toHaveProperty('bossPhase')
    }
  })

  it('조기 도입 사슬: E04 34s·E05 52s·E06 108s (스2 대비 앞당김)', () => {
    const firstOf = (type) => STAGE3_WAVE_PHASES.find((p) => p.weights[type])?.start
    expect(firstOf('E04')).toBe(34)
    expect(firstOf('E05')).toBe(52)
    expect(firstOf('E06')).toBe(108)
  })
})
