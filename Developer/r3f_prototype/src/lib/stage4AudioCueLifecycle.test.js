// @vitest-environment jsdom
// Stage4 기존 cue 수명 회귀 락 — 2026-10-25 soundmini.
//
// 이 파일은 새 SOUND_MAP 키/음원/캡/믹스를 만들지 않는다. 현재 cue 배선이
//   (1) 오디오 실패에 게임 진행·판정을 맡기지 않는지
//   (2) pause/death/런 종료/gameKey 변경에 cue가 살아남아 나중에 몰아 울리지 않는지
// 만 고정한다. 계약 §2 soundmini 행: "muted/autoplay 실패에도 시각·피해·진행 동일".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitSfx, subscribeSfx } from './sfxEvents.js'
import { useGameStore } from '../store/useGameStore.js'
import {
  _seedHydratedFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
} from './firebaseProgress.js'
import {
  PRESSURE_CAULDRON_BOIL_LEAD_MS,
  PRESSURE_CAULDRON_BURST_DURATION_MS,
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
  getPressureCauldronExplosionTimes,
  getPressureCauldronHazardVisual,
} from './stage4PressureCauldronHazard.js'
import {
  B04_SOUP_BLAST_EXPLOSION_MS,
  B04_SOUP_BLAST_TELEGRAPH_MS,
  advanceB04SoupBlast,
  createB04SoupBlastState,
  startB04SoupBlast,
} from './b04SoupBlast.js'
import {
  advanceMatildaEntryGrace,
  canSpawnMatildaEntry,
  cancelMatildaEntryGrace,
  createMatildaEntryGrace,
} from './matildaEntryGrace.js'

// 오디오 계층이 통째로 고장난 상태(muted/autoplay 차단/Howl 생성 실패)의 최악 모델.
// 실제 SfxLayer 구독자는 Howler를 동기로 호출하므로 throw가 emit 호출자에게 전파된다.
function subscribeFailingAudioLayer() {
  return subscribeSfx(() => {
    throw new Error('audio unavailable (muted / autoplay blocked / Howl construction failed)')
  })
}

describe('emitSfx 안전 호출 경계', () => {
  it('구독자가 throw해도 emitSfx가 throw하지 않는다', () => {
    const unsubscribe = subscribeFailingAudioLayer()
    try {
      expect(() => emitSfx({ id: 'stageClear' })).not.toThrow()
    } finally {
      unsubscribe()
    }
  })

  it('throw한 구독자가 나머지 구독자를 막지 않는다', () => {
    const before = vi.fn()
    const after = vi.fn()
    const unsubscribers = [subscribeSfx(before), subscribeFailingAudioLayer(), subscribeSfx(after)]
    try {
      emitSfx({ id: 'bossClearJingle' })
    } finally {
      unsubscribers.forEach((off) => off())
    }
    expect(before).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
  })

  it('emit 뒤에 오는 호출자 코드가 계속 실행된다', () => {
    const unsubscribe = subscribeFailingAudioLayer()
    let progressionRan = false
    try {
      // useGameStore.clearStage / Enemy 사망 처리와 같은 모양:
      // emit → (진행/해금 기록). emit이 throw하면 뒷줄이 사라진다.
      emitSfx({ id: 'bossDeath' })
      progressionRan = true
    } finally {
      unsubscribe()
    }
    expect(progressionRan).toBe(true)
  })
})

describe('오디오 실패와 Stage4 진행/판정 분리', () => {
  let unsubscribe

  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    // upstream resetGame은 잠긴 스테이지 진입을 거절한다. Stage4 해금 증거 = stage3BossDefeats.
    _seedHydratedFirebaseProgressForTests(undefined, { progress: { records: { stage3BossDefeats: 1 } } })
    expect(useGameStore.getState().resetGame('stage4')).not.toBe(false)
  })

  afterEach(() => {
    unsubscribe?.()
    unsubscribe = undefined
  })

  it('오디오가 전부 실패해도 보스 처치 기록(= 영구 해금 선행조건)이 남는다', () => {
    useGameStore.setState({ phase: 'playing', bossAliveCount: 1, bossDefeated: false })
    unsubscribe = subscribeFailingAudioLayer()

    // recordBossDefeat은 bossClearJingle emit 뒤에 return true가 온다.
    expect(() => useGameStore.getState().recordBossDefeat()).not.toThrow()

    const state = useGameStore.getState()
    expect(state.bossDefeated).toBe(true)
    expect(state.bossAliveCount).toBe(0)
  })

  it('오디오가 전부 실패해도 포탈 탈출 클리어가 기록되고, Stage4는 목록 밖 Stage5로 넘어가지 않는다', async () => {
    useGameStore.setState({ phase: 'playing' })
    const beforeKey = useGameStore.getState().gameKey
    unsubscribe = subscribeFailingAudioLayer()

    // clearStage는 stageClear emit → _onRunEnd 순서다. 오디오 예외가 클리어 판정을 막으면 안 된다.
    expect(() => useGameStore.getState().clearStage()).not.toThrow()
    expect(useGameStore.getState().phase).toBe('cleared')
    expect(useGameStore.getState().escapeResult?.stageId).toBe('stage4')

    // 계약 §3 + 릴리스 경계: Stage4가 종착이다. 진행 시도는 거절되고 같은 런에 머문다.
    expect(await useGameStore.getState().continueToNextStage()).toBe(false)
    const state = useGameStore.getState()
    expect(state.gameKey).toBe(beforeKey)
    expect(state.currentStageId).toBe('stage4')
    expect(state.phase).toBe('cleared')
  })

  it('오디오가 전부 실패해도 피해와 사망 판정이 그대로 남는다', () => {
    useGameStore.setState((s) => ({ phase: 'playing', player: { ...s.player, hp: 10, invulnerable: false } }))
    unsubscribe = subscribeFailingAudioLayer()

    // playerHit emit은 피해 반영 set()보다 앞에 있다.
    expect(() => useGameStore.getState().damagePlayer(4)).not.toThrow()
    expect(useGameStore.getState().player.hp).toBe(6)

    useGameStore.setState((s) => ({ player: { ...s.player, invulnerable: false } }))
    // playerDeath emit은 _onRunEnd('gameover')보다 앞에 있다.
    expect(() => useGameStore.getState().damagePlayer(999, { ignoreInvulnerability: true, source: 'stage4PressureCauldron' })).not.toThrow()

    const state = useGameStore.getState()
    expect(state.phase).toBe('gameover')
    expect(state.deathCause).toBe('stage4PressureCauldron')
  })
})

describe('가마솥 cue 수명 — 취소와 몰아재생 금지', () => {
  it('playing 외에는 발동 이벤트를 전혀 내주지 않는다', () => {
    for (const phase of ['paused', 'levelup', 'gameover', 'cleared']) {
      expect(getPressureCauldronExplosionTimes(14_900, 15_100, 'stage4', phase)).toEqual([])
      expect(getPressureCauldronHazardVisual(14_900, 'stage4', phase)).toEqual({ boiling: false, bursting: false })
    }
  })

  it('stage4가 아니면 발동 이벤트를 내주지 않는다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage5']) {
      expect(getPressureCauldronExplosionTimes(14_900, 15_100, stageId, 'playing')).toEqual([])
    }
  })

  it('한 주기의 발동을 정확히 한 번만 내준다', () => {
    expect(getPressureCauldronExplosionTimes(14_900, 15_010, 'stage4', 'playing'))
      .toEqual([PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS])
    // 같은 주기를 다시 지나가도 재발행 없음 — 창이 소비 시점으로 전진했기 때문.
    expect(getPressureCauldronExplosionTimes(15_010, 15_120, 'stage4', 'playing')).toEqual([])
  })

  it('pause로 멈춘 게임시계는 재개 때 과거 주기를 몰아 재생하지 않는다', () => {
    // 게임시계(advanceRuntimeTime)는 playing 외에 전진하지 않는다. 벽시계로 10분을
    // 멈춰 있어도 재개 직후의 (previous, next) 창은 한 프레임분이라 미발행 주기가 쌓이지 않는다.
    const pausedAt = 14_990
    const firstResumedStep = pausedAt + 1000 / 60
    expect(getPressureCauldronExplosionTimes(pausedAt, firstResumedStep, 'stage4', 'playing'))
      .toEqual([PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS])
    // 전진량 0(정지 프레임)에는 아무것도 내주지 않는다.
    expect(getPressureCauldronExplosionTimes(pausedAt, pausedAt, 'stage4', 'playing')).toEqual([])
    // 되감김/음수 창도 과거 폭발을 되살리지 않는다.
    expect(getPressureCauldronExplosionTimes(30_000, 15_000, 'stage4', 'playing')).toEqual([])
    // 한 프레임이 Rapier 정책 상한(0.5s)까지 늘어나도 15초 주기는 최대 1회다.
    const maxFrameMs = 500
    for (let start = 0; start < PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS * 3; start += maxFrameMs) {
      expect(getPressureCauldronExplosionTimes(start, start + maxFrameMs, 'stage4', 'playing').length)
        .toBeLessThanOrEqual(1)
    }
  })

  it('예고 3초와 발동 250ms 구간이 겹치지 않아 한 주기에 두 cue가 동시에 서지 않는다', () => {
    const interval = PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
    const boilStart = interval - PRESSURE_CAULDRON_BOIL_LEAD_MS
    expect(getPressureCauldronHazardVisual(boilStart, 'stage4', 'playing')).toEqual({ boiling: true, bursting: false })
    expect(getPressureCauldronHazardVisual(interval - 1, 'stage4', 'playing')).toEqual({ boiling: true, bursting: false })
    expect(getPressureCauldronHazardVisual(interval, 'stage4', 'playing')).toEqual({ boiling: false, bursting: true })
    expect(getPressureCauldronHazardVisual(interval + PRESSURE_CAULDRON_BURST_DURATION_MS - 1, 'stage4', 'playing'))
      .toEqual({ boiling: false, bursting: true })
    expect(getPressureCauldronHazardVisual(interval + PRESSURE_CAULDRON_BURST_DURATION_MS, 'stage4', 'playing'))
      .toEqual({ boiling: false, bursting: false })
  })
})

describe('B04 국물 cue 수명 — 전이 1회', () => {
  it('telegraph→explode와 explode→done 전이가 각각 한 번만 나타난다', () => {
    let state = startB04SoupBlast(createB04SoupBlastState(), [{ x: 1, z: 1, radius: 1.1 }])
    expect(state.phase).toBe('telegraph')

    const step = 1000 / 60
    const transitions = []
    for (let elapsed = 0; elapsed < B04_SOUP_BLAST_TELEGRAPH_MS + B04_SOUP_BLAST_EXPLOSION_MS + 500; elapsed += step) {
      const next = advanceB04SoupBlast(state, step)
      if (next.phase !== state.phase) transitions.push(next.phase)
      state = next
    }
    expect(transitions).toEqual(['explode', 'done'])
  })

  it('보스 사망으로 상태가 비워지면 예약된 explode가 뒤늦게 살아나지 않는다', () => {
    const live = startB04SoupBlast(createB04SoupBlastState(), [{ x: 1, z: 1, radius: 1.1 }])
    // Enemy.jsx 사망 처리가 하는 일과 동일: 새 상태로 교체.
    const cleared = createB04SoupBlastState()
    expect(cleared.phase).toBe('idle')
    expect(advanceB04SoupBlast(cleared, 10_000).phase).toBe('idle')
    // 버려진 참조를 더 돌려도 살아 있는 상태로 되돌아오지 않는다.
    expect(advanceB04SoupBlast(live, 10_000)).not.toBe(cleared)
    expect(cleared.circles).toEqual([])
  })

  it('done 이후에는 더 전진하지 않는다', () => {
    const done = { ...createB04SoupBlastState(), phase: 'done', triggered: true }
    expect(advanceB04SoupBlast(done, 60_000).phase).toBe('done')
  })
})

describe('마틸다 등장 cue 수명 — gameKey/스테이지/런 종료 취소', () => {
  const entryOf = () => createMatildaEntryGrace({ stageId: 'stage4', gameKey: 7, delayMs: 5000 })

  it('취소된 뒤에는 아무리 전진해도 스폰하지 않는다', () => {
    const entry = entryOf()
    cancelMatildaEntryGrace(entry)
    expect(advanceMatildaEntryGrace(entry, 600)).toBe(false)
  })

  it('정확히 한 번만 스폰을 허용한다', () => {
    const entry = entryOf()
    let fired = 0
    for (let step = 0; step < 1000; step += 1) {
      if (advanceMatildaEntryGrace(entry, 1 / 60)) fired += 1
    }
    expect(fired).toBe(1)
  })

  it('gameKey 변경·스테이지 변경·런 종료는 스폰 자격을 잃게 한다', () => {
    const entry = entryOf()
    const live = { matildaSpawned: true, currentStageId: 'stage4', gameKey: 7, phase: 'playing' }
    expect(canSpawnMatildaEntry(entry, live)).toBe(true)
    expect(canSpawnMatildaEntry(entry, { ...live, gameKey: 8 })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { ...live, currentStageId: 'stage5' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { ...live, phase: 'gameover' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { ...live, phase: 'cleared' })).toBe(false)
    expect(canSpawnMatildaEntry(entry, { ...live, matildaSpawned: false })).toBe(false)
  })

  it('벽시계가 아니라 게임시계로만 전진한다 — pause 동안 유예가 녹지 않는다', () => {
    const entry = entryOf()
    // pause 중에는 usePlayingFrame이 콜백을 돌리지 않으므로 전진량이 0이다.
    expect(advanceMatildaEntryGrace(entry, 0)).toBe(false)
    expect(entry.remainingMs).toBe(5000)
    expect(advanceMatildaEntryGrace(entry, -120)).toBe(false)
    expect(entry.remainingMs).toBe(5000)
  })
})
