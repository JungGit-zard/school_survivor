import { describe, it, expect } from 'vitest'
import { WAVE_PHASES, STAGE2_WAVE_PHASES, getDefaultWavePhases } from './waveTimelines.js'
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
