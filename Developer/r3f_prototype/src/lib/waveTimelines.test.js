import { describe, it, expect } from 'vitest'
import {
  WAVE_PHASES,
  STAGE2_WAVE_PHASES,
  STAGE3_WAVE_PHASES,
  STAGE4_WAVE_PHASES,
  STAGE4_SPAWN_TELEGRAPHS,
  getDefaultWavePhases,
} from './waveTimelines.js'
import { isBossPhase, getBossSpawnSec, STAGE4_BURST_EVENTS } from './burstEvents.js'

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

  it('RZL 2차 이완 창(72–92): 앰비언트 target↓·차저(E05) 제거로 80초 런좀비크루 대각 스파이크를 부각한다', () => {
    // 재설계(2026-07-18): RZL@80 이벤트가 그 순간의 주역으로 읽히게 웨이브가 비켜간다.
    const rzlPhase = STAGE3_WAVE_PHASES.find((p) => p.start === 72)
    const prevPhase = STAGE3_WAVE_PHASES.find((p) => p.end === 72)
    expect(rzlPhase.weights.E05).toBeUndefined()   // 차저 제거
    expect(rzlPhase.target).toBeLessThan(prevPhase.target)  // 앰비언트 이완
  })
})

describe('stage4 급식실 대탈출 타임라인', () => {
  it('getDefaultWavePhases: stage4는 STAGE4', () => {
    expect(getDefaultWavePhases('stage4')).toBe(STAGE4_WAVE_PHASES)
  })

  it('0~240s 빈틈·중복 없이 연속 커버, start<end', () => {
    expect(STAGE4_WAVE_PHASES[0].start).toBe(0)
    expect(STAGE4_WAVE_PHASES[STAGE4_WAVE_PHASES.length - 1].end).toBe(240)
    STAGE4_WAVE_PHASES.forEach((p, i) => {
      expect(p.start).toBeLessThan(p.end)
      if (i > 0) expect(p.start).toBe(STAGE4_WAVE_PHASES[i - 1].end)
    })
  })

  it('모든 phase weights 합 = 1.00', () => {
    STAGE4_WAVE_PHASES.forEach((p) => {
      const sum = Object.values(p.weights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1)
    })
  })

  it('target은 16~28 범위(작은 맵 밀도 억제 — 스3 피크 30 미만)', () => {
    const targets = STAGE4_WAVE_PHASES.map((p) => p.target)
    expect(Math.min(...targets)).toBeGreaterThanOrEqual(16)
    expect(Math.max(...targets)).toBeLessThanOrEqual(28)
  })

  it('bossPhase 필드를 하드코딩하지 않는다 (보스 구간은 파생)', () => {
    for (const phase of STAGE4_WAVE_PHASES) {
      expect(phase).not.toHaveProperty('bossPhase')
    }
  })

  it('보스@140 이후 잡몹 target 급감(보스 스포트라이트) — 피크(≥140 직전) 대비 낮다', () => {
    const bossSec = getBossSpawnSec('stage4')
    expect(bossSec).toBe(140)
    const peak = Math.max(...STAGE4_WAVE_PHASES.filter((p) => p.start < bossSec).map((p) => p.target))
    const bossPhases = STAGE4_WAVE_PHASES.filter((p) => isBossPhase(p.start, 'stage4'))
    // 첫 보스 구간 phase는 잡몹이 급감(16~20)
    expect(bossPhases[0].start).toBe(140)
    expect(bossPhases[0].target).toBeLessThanOrEqual(20)
    expect(bossPhases[0].target).toBeLessThan(peak)
  })

  it('E04 원거리는 전 구간 상시 등장(보스 구간 포함) — "안전지대 소멸" 시그니처', () => {
    // 12s 이후 모든 phase가 E04 weight를 보유한다(온보딩 0~12 제외).
    const afterIntro = STAGE4_WAVE_PHASES.filter((p) => p.start >= 12)
    expect(afterIntro.every((p) => p.weights.E04 > 0)).toBe(true)
    // 보스 구간에도 E04 유지.
    const bossPhases = STAGE4_WAVE_PHASES.filter((p) => isBossPhase(p.start, 'stage4'))
    expect(bossPhases.every((p) => p.weights.E04 > 0)).toBe(true)
  })

  it('탈출 스프린트(215~240)는 E01 다수', () => {
    const sprint = STAGE4_WAVE_PHASES.find((p) => p.start === 215)
    expect(sprint.end).toBe(240)
    expect(sprint.weights.E01).toBeGreaterThanOrEqual(0.5)
  })

  it('예고는 formation 버스트와 sec 1:1 정렬', () => {
    const formationSecs = STAGE4_BURST_EVENTS.filter((e) => e.formation).map((e) => e.sec)
    const telegraphSecs = STAGE4_SPAWN_TELEGRAPHS.map((t) => t.sec)
    expect(telegraphSecs).toEqual(formationSecs)
    expect(STAGE4_SPAWN_TELEGRAPHS.every((t) => typeof t.label === 'string' && t.label.length > 0)).toBe(true)
  })
})
