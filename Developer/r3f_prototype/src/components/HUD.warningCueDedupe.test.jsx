// @vitest-environment jsdom
// 경고 cue 중복 발행 회귀 락 — 2026-10-25 soundmini (결함 B).
//
// 경고 카운트다운 useMemo들은 phase !== 'playing'에서 null을 주고 elapsed는 pause 중
// 멈춘다. 그래서 pause→resume이 N→null→N(같은 값)이 되어 effect가 다시 돌고 같은 틱이
// 한 번 더 울렸다. 새 음원/ID/볼륨 없이 중복 발행만 끊었는지 고정한다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import HUD from './HUD.jsx'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { useGameStore } from '../store/useGameStore.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'

// stageConfig stage4: matildaWarningSec 205 / matildaSec 210, HUD 카운트다운 5초.
// 수치는 계약 §3 고정값이며 이 테스트는 읽기만 한다.
const MATILDA_SPAWN_SEC = 210
const MATILDA_IDS = new Set(['matildaWarningTick', 'matildaCountdownEnd'])

let captured = []
let unsubscribe
let mounted

function renderHud() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => {
    root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
  })
  mounted = { container, root }
  return mounted
}

function setRuntime(patch) {
  act(() => {
    useGameStore.setState(patch)
  })
}

function drainMatildaCues() {
  const ids = captured.filter((event) => MATILDA_IDS.has(event.id)).map((event) => event.id)
  captured = []
  return ids
}

function drainCueIds(predicate) {
  const ids = captured.filter(predicate).map((event) => event.id)
  captured = []
  return ids
}

beforeEach(() => {
  captured = []
  unsubscribe = subscribeSfx((event) => captured.push(event))
  // upstream resetGame은 해금되지 않은 스테이지 진입을 거절한다. Stage4 해금 증거는
  // 이전 스테이지 보스 사망 기록(stage3BossDefeats)이다.
  _resetFirebaseProgressForTests()
  _seedHydratedFirebaseProgressForTests({ uid: 'warning-cue-dedupe-test' }, { progress: { records: { stage3BossDefeats: 1 } } })
  expect(useGameStore.getState().resetGame('stage4')).not.toBe(false)
})

afterEach(() => {
  if (mounted) act(() => mounted.root.unmount())
  mounted = undefined
  unsubscribe?.()
  unsubscribe = undefined
})

describe('마틸다 205~210초 카운트다운 cue', () => {
  it('pause/resume이 같은 틱을 다시 울리지 않는다', () => {
    renderHud()

    // 205.5초 → 남은 4.5초 → 카운트 5. 첫 틱 1회.
    setRuntime({ phase: 'playing', elapsedMs: 205_500 })
    expect(drainMatildaCues()).toEqual(['matildaWarningTick'])

    // 일시정지: 경고가 null이 되지만 소리는 나지 않는다.
    setRuntime({ phase: 'paused', pauseSource: 'manual' })
    expect(drainMatildaCues()).toEqual([])

    // 재개: elapsed는 멈춘 그대로라 카운트가 5로 되돌아온다. 여기서 울리면 중복이다.
    setRuntime({ phase: 'playing', pauseSource: null })
    expect(drainMatildaCues()).toEqual([])

    // 일시정지를 반복해도 늘어나지 않는다.
    for (let round = 0; round < 3; round += 1) {
      setRuntime({ phase: 'paused', pauseSource: 'manual' })
      setRuntime({ phase: 'playing', pauseSource: null })
    }
    expect(drainMatildaCues()).toEqual([])
  })

  it('카운트가 실제로 줄어들면 초마다 정확히 한 번씩 울린다', () => {
    renderHud()
    setRuntime({ phase: 'playing', elapsedMs: 205_500 })
    expect(drainMatildaCues()).toEqual(['matildaWarningTick'])

    // 5 → 4 → 3 → 2 → 1. 마지막만 등장 스팅이다.
    const emitted = []
    for (const elapsedMs of [206_500, 207_500, 208_500, 209_500]) {
      setRuntime({ elapsedMs })
      emitted.push(...drainMatildaCues())
    }
    expect(emitted).toEqual([
      'matildaWarningTick',
      'matildaWarningTick',
      'matildaWarningTick',
      'matildaCountdownEnd',
    ])
  })

  it('마지막 1초의 등장 스팅이 pause/resume으로 반복되지 않는다', () => {
    renderHud()

    // 209.5초 → 남은 0.5초 → 카운트 1 → matildaCountdownEnd("지금 나온다").
    setRuntime({ phase: 'playing', elapsedMs: 209_500 })
    expect(drainMatildaCues()).toEqual(['matildaCountdownEnd'])

    for (let round = 0; round < 5; round += 1) {
      setRuntime({ phase: 'paused', pauseSource: 'manual' })
      setRuntime({ phase: 'playing', pauseSource: null })
    }
    // 마틸다는 아직 스폰도 하지 않았는데 등장 스팅이 다섯 번 더 울리던 자리다.
    expect(drainMatildaCues()).toEqual([])
    expect(useGameStore.getState().matildaSpawned).toBe(false)

    // 스폰 시각을 지나면 경고 자체가 사라지고 더는 울리지 않는다.
    setRuntime({ elapsedMs: MATILDA_SPAWN_SEC * 1000 })
    expect(drainMatildaCues()).toEqual([])
  })

  it('다음 런(gameKey 변경)에서는 같은 카운트 값이 다시 울린다', () => {
    renderHud()

    setRuntime({ phase: 'playing', elapsedMs: 209_500 })
    expect(drainMatildaCues()).toEqual(['matildaCountdownEnd'])
    const firstRunKey = useGameStore.getState().gameKey

    // 새 런 — resetGame이 gameKey를 올리고 elapsedMs를 0으로 되돌린다.
    act(() => useGameStore.getState().resetGame('stage4'))
    expect(useGameStore.getState().gameKey).toBe(firstRunKey + 1)
    captured = []

    // 중복 게이트가 런을 넘어 기억하면 이 틱이 통째로 삼켜진다.
    setRuntime({ phase: 'playing', elapsedMs: 209_500 })
    expect(drainMatildaCues()).toEqual(['matildaCountdownEnd'])
  })
})

describe('보스·편대 경고 cue', () => {
  it('보스 카운트다운이 pause/resume으로 중복되지 않는다', () => {
    renderHud()

    // stage4 보스 150초, 예고 리드 3초. 147.5초 → 카운트 3. 볼륨 0.5가 보스 경고.
    const isBossCountdown = (event) => event.id === 'bossWarning' && event.volume === 0.5
    setRuntime({ phase: 'playing', elapsedMs: 147_500, bossSpawned: false })
    expect(drainCueIds(isBossCountdown)).toEqual(['bossWarning'])

    setRuntime({ phase: 'paused', pauseSource: 'manual' })
    setRuntime({ phase: 'playing', pauseSource: null })
    expect(drainCueIds(isBossCountdown)).toEqual([])

    setRuntime({ elapsedMs: 148_500 })
    expect(drainCueIds(isBossCountdown)).toEqual(['bossWarning'])
  })

  it('편대 예고 라벨이 pause/resume으로 중복되지 않는다', () => {
    renderHud()

    // STAGE4_SPAWN_TELEGRAPHS 첫 항목: sec 60 / leadSec 2.5. 볼륨 0.6이 편대 경고.
    const isFormationWarning = (event) => event.id === 'bossWarning' && event.volume === 0.6
    setRuntime({ phase: 'playing', elapsedMs: 58_500 })
    expect(drainCueIds(isFormationWarning)).toEqual(['bossWarning'])

    for (let round = 0; round < 3; round += 1) {
      setRuntime({ phase: 'paused', pauseSource: 'manual' })
      setRuntime({ phase: 'playing', pauseSource: null })
    }
    // 같은 라벨이 유지되는 동안에는 한 번만 울린다.
    setRuntime({ elapsedMs: 59_500 })
    expect(drainCueIds(isFormationWarning)).toEqual([])

    // 다음 편대(sec 108)는 라벨이 달라 정상적으로 울린다.
    setRuntime({ elapsedMs: 106_500 })
    expect(drainCueIds(isFormationWarning)).toEqual(['bossWarning'])
  })
})
