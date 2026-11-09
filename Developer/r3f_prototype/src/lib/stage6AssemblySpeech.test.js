// Stage 6 '훈화 말씀' 스케줄(스펙 Part C C-7).
import { describe, expect, it } from 'vitest'
import { EXPANSION_HAZARDS, getExpansionStageHazards } from './expansionContent.js'
import { STAGE6_SFX, advanceAssemblySpeech, createAssemblySpeechState, emitAssemblySpeechRing, getAssemblySpeechCues } from './stage6AssemblySpeech.js'
import { clearExpansionAttacks, expansionAttackContains } from './expansionAttackRuntime.js'

const H06 = EXPANSION_HAZARDS.H06

function sweep(fromSec, toSec, step = 1 / 60) {
  const cues = []
  for (let t = fromSec; t < toSec; t += step) cues.push(...getAssemblySpeechCues(H06, t, t + step))
  return cues
}

describe('H06 데이터', () => {
  it('조회대 스피커 원점 (0, −19), 30초 간격 30~120초, 고리 2개(0/0.8초), 피해 12, 플레이어 거리 반지름', () => {
    expect(getExpansionStageHazards('stage6').map((h) => h.id)).toEqual(['H06'])
    expect(getExpansionStageHazards('stage7')).toEqual([])
    expect(H06).toMatchObject({ originUnits: [0, -19], firstSec: 30, intervalSec: 30, endExclusiveSec: 150, ringDelaysMs: [0, 800], preCueLeadMs: 1000, retryMs: 250, maxRetries: 4 })
    expect(H06.pattern).toMatchObject({ shape: 'annulus', windupMs: 1600, activeMs: 350, recoveryMs: 600, widthUnits: 1.2, damage: 12,
      radiusMode: 'player_distance', radiusPaddingUnits: 0.6, minRangeUnits: 2, maxRangeUnits: 40, ignoresSightBlockers: true, maxHitsPerTarget: 1 })
  })
})

describe('getAssemblySpeechCues', () => {
  it('0→240초를 1/60초로 훑으면 emit 8회(30·30.8·60·60.8·90·90.8·120·120.8), preCue 4회(29·59·89·119), tutorial 1회(27.5)', () => {
    const cues = sweep(0, 240)
    const emits = cues.filter((c) => c.kind === 'emit')
    expect(emits.map((c) => c.atSec)).toEqual([30, 30.8, 60, 60.8, 90, 90.8, 120, 120.8])
    expect(emits.map((c) => c.ring)).toEqual([0, 1, 0, 1, 0, 1, 0, 1])
    expect(cues.filter((c) => c.kind === 'preCue').map((c) => c.atSec)).toEqual([29, 59, 89, 119])
    expect(cues.filter((c) => c.kind === 'tutorial').map((c) => c.atSec)).toEqual([27.5])
  })

  it('150초 이후에는 아무것도 없다(보스가 훈화를 넘겨받는다)', () => {
    expect(sweep(150, 400)).toEqual([])
  })

  it('역행·같은 시각은 신호가 없다', () => {
    expect(getAssemblySpeechCues(H06, 31, 29)).toEqual([])
    expect(getAssemblySpeechCues(H06, 30, 30)).toEqual([])
  })
})

describe('advanceAssemblySpeech', () => {
  it('발신 성공은 1회로 끝나고, 실패는 250ms 간격 최대 4회 재시도 뒤 그 고리만 건너뛴다', () => {
    const state = createAssemblySpeechState(1)
    const tried = []
    let failUntil = Infinity
    const tryEmit = (entry) => { tried.push(entry.ring); return tried.length > failUntil }
    const cues = []
    // 성공 케이스
    failUntil = 0
    advanceAssemblySpeech(state, H06, 29.99, 30.01, tryEmit, (cue) => cues.push(cue.kind))
    expect(state.emitted).toBe(1)
    expect(state.pending).toHaveLength(0)
    // 실패 케이스: 0.8초 고리가 계속 실패 → 4회 재시도 후 건너뜀(총 5회 시도)
    tried.length = 0
    failUntil = Infinity
    let t = 30.79
    advanceAssemblySpeech(state, H06, t, 30.81, tryEmit)
    for (let i = 0; i < 10; i += 1) { advanceAssemblySpeech(state, H06, t + 0.02, t + 0.3, tryEmit); t += 0.28 }
    expect(tried).toHaveLength(5)
    expect(state.skipped).toBe(1)
    expect(state.pending).toHaveLength(0)
  })

  it('tutorial·preCue는 onCue로만 나간다(SFX/HUD), 발신 대기열에 들어가지 않는다', () => {
    const state = createAssemblySpeechState(1)
    const seen = []
    advanceAssemblySpeech(state, H06, 27, 29.5, () => true, (cue) => seen.push(cue.kind))
    expect(seen).toEqual(['tutorial', 'preCue'])
    expect(state.pending).toHaveLength(0)
    expect(STAGE6_SFX).toMatchObject({ micFeedback: 'stage6MicFeedback', speechRingPulse: 'stage6SpeechRingPulse', schoolChime: 'stage6SchoolChime',
      relayWhistle: 'stage6RelayWhistle', anthemSting: 'stage6AnthemSting', gateOpen: 'stage6GateOpen' })
  })
})

describe('emitAssemblySpeechRing — 2번째 고리는 동심 물결(wave 4)', () => {
  const ctx = { gameKey: 7, playerX: 0, playerZ: 0, stageId: 'stage6', halfX: 12, halfZ: 20 }

  it('1번째 고리는 플레이어를 지나고(외반경 19.6), 2번째 고리는 같은 원점에서 +1.8u(21.4) — 플레이어가 1번째 띠 위에 서 있어도 건너뛰지 않는다', () => {
    clearExpansionAttacks()
    expect(H06.followUpRingOffsetUnits).toBe(1.8)
    const state = createAssemblySpeechState(7)
    const ring1 = emitAssemblySpeechRing(state, H06, { cycle: 0, ring: 0 }, ctx)
    expect(ring1.rangeUnits).toBeCloseTo(19.6, 9)
    expect(ring1.originXZ).toEqual([0, -19])
    const ring2 = emitAssemblySpeechRing(state, H06, { cycle: 0, ring: 1 }, ctx)
    expect(ring2).not.toBeNull()
    expect(ring2.rangeUnits).toBeCloseTo(21.4, 9)
    expect(ring2.originXZ).toEqual([0, -19])
    // 2번째 고리는 플레이어를 다시 겨누지 않는다 — 지금 자리(1번째 띠)는 2번째 띠 밖이다.
    expect(expansionAttackContains(ring2, 0, 0)).toBe(false)
    expect(expansionAttackContains(ring2, 0, 1.8)).toBe(true)
    clearExpansionAttacks()
  })

  it('1번째 고리가 건너뛰어졌으면 2번째 고리는 기존 규칙(플레이어 거리)으로 낸다', () => {
    clearExpansionAttacks()
    const state = createAssemblySpeechState(7)
    const ring2 = emitAssemblySpeechRing(state, H06, { cycle: 3, ring: 1 }, ctx)
    expect(ring2.rangeUnits).toBeCloseTo(19.6, 9)
    clearExpansionAttacks()
  })
})

