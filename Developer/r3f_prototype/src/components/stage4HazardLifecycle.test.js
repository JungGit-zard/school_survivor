import fs from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  PRESSURE_CAULDRON_BOIL_LEAD_MS,
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
  getPressureCauldronExplosionTimes,
} from '../lib/stage4PressureCauldronHazard.js'
import { isPressureCauldronWarningBoundaryVisible } from '../lib/hazardWarningBoundary.js'
import { advanceRuntimeTime, getRuntimeElapsedMs, resetRuntimeTime } from '../lib/gameRuntimeTime.js'
import {
  MAX_GAMEPLAY_FRAME_DELTA,
  createGameplayFixedStepClock,
  runGameplayFixedSteps,
} from '../lib/gameplayFrameTime.js'
import {
  advanceB04SoupBlast,
  createB04SoupBlastState,
  getB04SoupBlastTrigger,
  startB04SoupBlast,
} from '../lib/b04SoupBlast.js'

const GAME_SOURCE = fs.readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')
const CANVAS_SOURCE = fs.readFileSync(new URL('./GameCanvas.jsx', import.meta.url), 'utf8')
const ENEMY_SOURCE = fs.readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
const REFS_SOURCE = fs.readFileSync(new URL('../lib/refs.js', import.meta.url), 'utf8')

// Game.jsx의 프레임 루프를 그대로 재현한다: playing일 때만 고정 스텝을 돌린다.
function runFrame(clock, rawDeltaSeconds, phase, samples) {
  const events = []
  if (phase !== 'playing') return events
  runGameplayFixedSteps(clock, rawDeltaSeconds, (fixedDelta) => {
    const previousElapsedMs = getRuntimeElapsedMs()
    const elapsedMs = advanceRuntimeTime(fixedDelta * 1000)
    events.push(...getPressureCauldronExplosionTimes(previousElapsedMs, elapsedMs, 'stage4', 'playing'))
    samples?.push({
      elapsedMs,
      visible: isPressureCauldronWarningBoundaryVisible(elapsedMs, 'stage4', 'playing'),
    })
  })
  return events
}

describe('Stage4 위험 생명주기 — playing 외 누적 없음', () => {
  beforeEach(() => resetRuntimeTime())

  it('pause 동안 게임시각과 폭발 이벤트가 전혀 누적되지 않는다', () => {
    const clock = createGameplayFixedStepClock()
    while (getRuntimeElapsedMs() < 12_000) runFrame(clock, 1 / 60, 'playing')
    const pausedAt = getRuntimeElapsedMs()
    expect(pausedAt).toBeGreaterThanOrEqual(12_000)
    expect(isPressureCauldronWarningBoundaryVisible(pausedAt, 'stage4', 'playing')).toBe(true)

    const pausedEvents = []
    for (let frame = 0; frame < 600; frame += 1) {
      pausedEvents.push(...runFrame(clock, 1 / 60, 'paused'))
      // pause 중에는 경계도 보이지 않는다.
      expect(isPressureCauldronWarningBoundaryVisible(getRuntimeElapsedMs(), 'stage4', 'paused')).toBe(false)
    }
    expect(pausedEvents).toEqual([])
    expect(getRuntimeElapsedMs()).toBe(pausedAt)
  })

  it('resume 뒤 경고 시간이 건너뛰어지지 않고 남은 구간이 그대로 이어진다', () => {
    const clock = createGameplayFixedStepClock()
    while (getRuntimeElapsedMs() < 12_200) runFrame(clock, 1 / 60, 'playing')
    const pausedAt = getRuntimeElapsedMs()

    for (let frame = 0; frame < 900; frame += 1) runFrame(clock, 1 / 60, 'paused')
    expect(getRuntimeElapsedMs()).toBe(pausedAt)

    // resume. 남은 예고 구간 전체에서 경계가 꺼지지 않아야 한다.
    const samples = []
    const events = []
    while (getRuntimeElapsedMs() < PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS) {
      events.push(...runFrame(clock, 1 / 60, 'playing', samples))
    }
    const warningStart = PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - PRESSURE_CAULDRON_BOIL_LEAD_MS
    const resumedWarningSamples = samples.filter(({ elapsedMs }) => (
      elapsedMs >= warningStart && elapsedMs < PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
    ))
    expect(resumedWarningSamples.length).toBeGreaterThan(0)
    expect(resumedWarningSamples.every(({ visible }) => visible)).toBe(true)
    // 남은 예고가 잘려 나가지 않았다: pause 시점부터 발동까지의 게임시각이 보존된다.
    expect(PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - pausedAt).toBeGreaterThan(2_000)
    expect(events).toEqual([PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS])
  })

  it('길게 멈췄다 돌아온 한 프레임이 과거 cue를 몰아 재생하지 않는다', () => {
    const clock = createGameplayFixedStepClock()
    while (getRuntimeElapsedMs() < 14_900) runFrame(clock, 1 / 60, 'playing')

    // 실제 벽시계로 60초 멈춘 뒤 돌아온 프레임. Rapier와 같은 0.5s 상한에 걸린다.
    const beforeResumeMs = getRuntimeElapsedMs()
    const events = runFrame(clock, 60, 'playing')
    expect(events).toEqual([PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS])
    // 60초가 아니라 상한 0.5초만 소비된다 → 한 프레임이 넘을 수 있는 15초 경계는 최대 1개.
    const consumedMs = getRuntimeElapsedMs() - beforeResumeMs
    expect(consumedMs).toBeLessThanOrEqual(MAX_GAMEPLAY_FRAME_DELTA * 1000 + 1)
    expect(consumedMs).toBeLessThan(PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS)
  })

  it('런 종료/gameKey 변경에 게임시각이 0으로 돌아가 다음 런의 예고가 처음부터 시작된다', () => {
    const clock = createGameplayFixedStepClock()
    while (getRuntimeElapsedMs() < 20_000) runFrame(clock, 1 / 60, 'playing')
    expect(getRuntimeElapsedMs()).toBeGreaterThan(PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS)

    // resetRuntimeRefs()가 호출하는 것과 같은 초기화.
    resetRuntimeTime()
    expect(getRuntimeElapsedMs()).toBe(0)
    expect(isPressureCauldronWarningBoundaryVisible(0, 'stage4', 'playing')).toBe(false)
    expect(getPressureCauldronExplosionTimes(0, 1_000, 'stage4', 'playing')).toEqual([])
    expect(REFS_SOURCE).toContain('resetRuntimeTime()')
  })
})

describe('Stage4 위험 생명주기 — 소유 구조 보존', () => {
  it('Game.jsx는 playing일 때만 게임시각을 전진시킨다', () => {
    const guardIndex = GAME_SOURCE.indexOf("if (useGameStore.getState().phase === 'playing') {")
    expect(guardIndex).toBeGreaterThan(-1)
    const advanceIndex = GAME_SOURCE.indexOf('advanceRuntimeTime(')
    expect(advanceIndex).toBeGreaterThan(guardIndex)
    // 가마솥 피해는 발동 순간에 다시 phase를 확인한 뒤에만 들어간다.
    expect(GAME_SOURCE).toContain("if (live.phase !== 'playing' || !isInsidePressureCauldronBlastRadius(playerPos.x, playerPos.z)) return")
    expect(GAME_SOURCE).toContain("source: 'stage4PressureCauldron',")
    // 기존 ignoreInvulnerability 경로 유지.
    expect(GAME_SOURCE).toContain('ignoreInvulnerability: true,')
  })

  it('gameKey 전체 Physics 리마운트가 그대로 유지된다', () => {
    expect(CANVAS_SOURCE).toContain('<Physics key={gameKey}')
    expect(CANVAS_SOURCE).toContain("paused={phase !== 'playing'}")
  })

  it('B04 국물 상태가 스폰·사망·슬롯 재사용마다 새로 만들어진다', () => {
    // 읽기 전용 잠금: 수동 정리가 아니라 상태 재생성이 정본이다.
    expect(ENEMY_SOURCE.match(/b04SoupBlastRef\.current = createB04SoupBlastState\(\)/g).length)
      .toBeGreaterThanOrEqual(3)
  })

  it('새 국물 상태는 이전 런의 원·피해·트리거를 들고 오지 않는다', () => {
    let state = createB04SoupBlastState()
    state = startB04SoupBlast(state, [{ x: 4, z: 0, radius: 1.1 }])
    state = advanceB04SoupBlast(state, 1_200)
    expect(state.phase).toBe('explode')

    // 사망/디스폰/슬롯 재사용 시점의 초기화.
    const reused = createB04SoupBlastState()
    expect(reused).toEqual({ phase: 'idle', elapsedMs: 0, circles: [], damagedPlayer: false, triggered: false })
    // 재사용된 슬롯은 HP 조건을 다시 만족해야만 발현한다 — 이전 공격이 재발하지 않는다.
    expect(getB04SoupBlastTrigger({ hpRatio: 0.9, state: reused })).toBe(false)
    expect(getB04SoupBlastTrigger({ hpRatio: 0.5, state: reused })).toBe(true)
    // 그리고 이전 상태는 끝까지 소진돼 다시 트리거되지 않는다.
    const finished = advanceB04SoupBlast(state, 250)
    expect(finished.phase).toBe('done')
    expect(getB04SoupBlastTrigger({ hpRatio: 0.1, state: finished })).toBe(false)
  })
})
