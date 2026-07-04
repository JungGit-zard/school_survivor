import { describe, it, expect } from 'vitest'
import {
  WAVE_ZOMBIE_TYPES,
  phaseToEditorEntry,
  editorEntryToPhase,
  normalizeWaveEntries,
  buildWavePhasesFromEntries,
  minSecToSec,
  secToMin,
  secToRemainder,
} from './waveControl.js'
import { WAVE_PHASES, STAGE2_WAVE_PHASES, getDefaultWavePhases } from './waveTimelines.js'

describe('waveControl 변환', () => {
  it('phase → 편집 entry: 마리 수 = round(target × weight)', () => {
    const entry = phaseToEditorEntry({ start: 60, end: 72, target: 26, weights: { E01: 0.60, E03: 0.30, E02: 0.10 } })
    expect(entry).toMatchObject({ start: 60, end: 72, bossPhase: false })
    expect(entry.counts.E01).toBe(16) // 26×0.6=15.6→16
    expect(entry.counts.E03).toBe(8)
    expect(entry.counts.E02).toBe(3)
    expect(entry.counts.E06).toBe(0)
  })

  it('편집 entry → 엔진 phase: target=합계, weights=비율, bossPhase 보존', () => {
    const phase = editorEntryToPhase({
      start: 90, end: 120, bossPhase: true,
      counts: { E01: 10, E02: 5, E03: 0, E04: 0, E05: 5, E06: 0 },
    })
    expect(phase).toEqual({
      start: 90, end: 120, target: 20,
      weights: { E01: 0.5, E02: 0.25, E05: 0.25 },
      bossPhase: true,
    })
  })

  it('합계 0 또는 끝≤시작인 entry는 null (무효 웨이브)', () => {
    expect(editorEntryToPhase({ start: 0, end: 20, counts: {} })).toBeNull()
    expect(editorEntryToPhase({ start: 30, end: 30, counts: { E01: 5 } })).toBeNull()
    expect(editorEntryToPhase({ start: 40, end: 20, counts: { E01: 5 } })).toBeNull()
  })

  it('기본 타임라인 전체가 왕복 변환에서 시간·구성 좀비 종류를 보존한다', () => {
    for (const stagePhases of [WAVE_PHASES, STAGE2_WAVE_PHASES]) {
      for (const phase of stagePhases) {
        const back = editorEntryToPhase(phaseToEditorEntry(phase))
        expect(back.start).toBe(phase.start)
        expect(back.end).toBe(phase.end)
        expect(!!back.bossPhase).toBe(!!phase.bossPhase)
        expect(Object.keys(back.weights).sort()).toEqual(Object.keys(phase.weights).sort())
      }
    }
  })

  it('normalizeWaveEntries: 정렬·클램프·정수 강제', () => {
    const out = normalizeWaveEntries([
      { start: 100, end: 130, counts: { E01: 3.7 } },
      { start: -5, end: 9999, counts: { E01: 500, E02: -3 } },
    ])
    expect(out[0].start).toBe(0)          // 정렬 + 클램프
    expect(out[0].end).toBe(420)
    expect(out[0].counts.E01).toBe(200)   // count 상한
    expect(out[0].counts.E02).toBe(0)     // 음수 → 0
    expect(out[1].counts.E01).toBe(4)     // 반올림
    expect(normalizeWaveEntries(null)).toBeNull()
  })

  it('buildWavePhasesFromEntries: 유효 phase 없으면 null → 기본 타임라인 사용', () => {
    expect(buildWavePhasesFromEntries(null)).toBeNull()
    expect(buildWavePhasesFromEntries([])).toBeNull()
    expect(buildWavePhasesFromEntries([{ start: 0, end: 10, counts: {} }])).toBeNull()
    const phases = buildWavePhasesFromEntries([
      { start: 0, end: 30, counts: { E01: 12 } },
      { start: 10, end: 5, counts: { E01: 9 } }, // 무효 — 걸러짐
    ])
    expect(phases).toHaveLength(1)
    expect(phases[0]).toMatchObject({ start: 0, end: 30, target: 12, weights: { E01: 1 } })
  })

  it('분/초 헬퍼 왕복', () => {
    expect(minSecToSec(2, 48)).toBe(168)
    expect(secToMin(168)).toBe(2)
    expect(secToRemainder(168)).toBe(48)
    expect(minSecToSec(99, 0)).toBe(420) // 상한 클램프
  })

  it('좀비 타입 목록은 E01~E06 6종', () => {
    expect(WAVE_ZOMBIE_TYPES).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'])
    expect(getDefaultWavePhases('stage1')).toBe(WAVE_PHASES)
    expect(getDefaultWavePhases('stage2')).toBe(STAGE2_WAVE_PHASES)
  })
})
