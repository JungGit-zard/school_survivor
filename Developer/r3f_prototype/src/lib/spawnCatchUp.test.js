import { describe, it, expect, beforeEach } from 'vitest'
import {
  EMPTY_ARENA_MAX_SEC,
  advanceSpawnCatchUp,
  createSpawnCatchUpState,
  getSpawnCatchUpOffsetSec,
  publishSpawnCatchUpOffsetSec,
  resetSpawnCatchUpState,
} from './spawnCatchUp.js'

describe('spawnCatchUp', () => {
  beforeEach(() => {
    publishSpawnCatchUpOffsetSec(0)
  })

  it('빈 화면 상한은 2초다', () => {
    expect(EMPTY_ARENA_MAX_SEC).toBe(2)
  })

  it('적이 살아 있으면 오프셋이 움직이지 않고 빈 시간이 리셋된다', () => {
    const state = createSpawnCatchUpState()
    advanceSpawnCatchUp(state, { deltaSec: 1.5, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    expect(state.emptyForSec).toBeCloseTo(1.5)

    const jump = advanceSpawnCatchUp(state, { deltaSec: 1.5, liveEnemyCount: 1, spawnSec: 11.5, nextPendingSpawnSec: 30 })
    expect(jump).toBe(0)
    expect(state.offsetSec).toBe(0)
    expect(state.emptyForSec).toBe(0)
  })

  it('비어도 2초 미만이면 오프셋은 0이다', () => {
    const state = createSpawnCatchUpState()
    for (let i = 0; i < 19; i += 1) {
      advanceSpawnCatchUp(state, { deltaSec: 0.1, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    }
    expect(state.emptyForSec).toBeCloseTo(1.9)
    expect(state.offsetSec).toBe(0)
  })

  it('정확히 2초에 도달하면 다음 예정 스폰까지 스케줄 전체를 당긴다', () => {
    const state = createSpawnCatchUpState()
    advanceSpawnCatchUp(state, { deltaSec: 1.9, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    expect(state.offsetSec).toBe(0)

    const jump = advanceSpawnCatchUp(state, { deltaSec: 0.1, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    expect(jump).toBeCloseTo(20)
    expect(state.offsetSec).toBeCloseTo(20)
    expect(state.emptyForSec).toBe(0)
  })

  it('다음 예정 스폰이 없으면 오프셋은 불변이다 — 없는 스폰을 만들지 않는다', () => {
    const state = createSpawnCatchUpState()
    for (let i = 0; i < 100; i += 1) {
      advanceSpawnCatchUp(state, { deltaSec: 0.1, liveEnemyCount: 0, spawnSec: 220, nextPendingSpawnSec: null })
    }
    expect(state.offsetSec).toBe(0)
  })

  it('다음 예정 스폰이 이미 지난 시각이면 되감지 않는다', () => {
    const state = createSpawnCatchUpState()
    const jump = advanceSpawnCatchUp(state, { deltaSec: 3, liveEnemyCount: 0, spawnSec: 40, nextPendingSpawnSec: 24 })
    expect(jump).toBe(0)
    expect(state.offsetSec).toBe(0)
  })

  it('오프셋은 단조 증가로 누적된다', () => {
    const state = createSpawnCatchUpState()
    advanceSpawnCatchUp(state, { deltaSec: 2, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    expect(state.offsetSec).toBeCloseTo(20)

    // 30초 이벤트를 잡아치우고 다시 비었다. 실시간은 12초, spawnSec은 32초.
    advanceSpawnCatchUp(state, { deltaSec: 2, liveEnemyCount: 0, spawnSec: 32, nextPendingSpawnSec: 40 })
    expect(state.offsetSec).toBeCloseTo(28)
    expect(state.emptyForSec).toBe(0)
  })

  // 설계 확정(2026-08-22): 오프셋에 인위적 상한을 두지 않는다. 표를 다 당기고 오버타임 무한모드에
  // 일찍 진입하는 건 의도된 보상이며, 오버타임 구간에서도 캐치업은 계속 동작해야 한다.
  it('오프셋에 clamp가 없다 — 오버타임 30초 tick을 계속 당겨서 무한히 누적된다', () => {
    const state = createSpawnCatchUpState()
    const overtimeStartSec = 240
    const overtimeIntervalSec = 30
    let realSec = 220
    for (let tick = 0; tick < 20; tick += 1) {
      const spawnSec = realSec + state.offsetSec
      const nextOvertime = overtimeStartSec + tick * overtimeIntervalSec
      advanceSpawnCatchUp(state, {
        deltaSec: EMPTY_ARENA_MAX_SEC,
        liveEnemyCount: 0,
        spawnSec,
        nextPendingSpawnSec: nextOvertime,
      })
      realSec += EMPTY_ARENA_MAX_SEC
    }
    // 20번째 tick 시각 810초를 실시간 258초에 발화 — 오프셋이 상한 없이 누적됐다.
    expect(realSec).toBeCloseTo(260)
    expect(state.offsetSec).toBeCloseTo(810 - 258)
    expect(state.offsetSec).toBeGreaterThan(500)
  })

  it('빈 화면은 절대 2초를 넘기지 않는다 — 점프 즉시 다음 스폰 시각에 도달한다', () => {
    const state = createSpawnCatchUpState()
    let realSec = 100
    let longestEmptyStreak = 0
    // 표에 100/160/220초 이벤트가 남았다고 보고, 매 이벤트를 즉시 처치하는 극단 플레이를 흉내낸다.
    for (const nextEventSec of [160, 220, 240]) {
      let streak = 0
      let jumped = 0
      while (jumped === 0 && streak < 10) {
        jumped = advanceSpawnCatchUp(state, {
          deltaSec: 0.25,
          liveEnemyCount: 0,
          spawnSec: realSec + state.offsetSec,
          nextPendingSpawnSec: nextEventSec,
        })
        realSec += 0.25
        streak += 0.25
      }
      expect(jumped).toBeGreaterThan(0)
      longestEmptyStreak = Math.max(longestEmptyStreak, streak)
    }
    expect(longestEmptyStreak).toBeLessThanOrEqual(EMPTY_ARENA_MAX_SEC)
  })

  it('리셋하면 오프셋과 빈 시간이 모두 0으로 돌아간다', () => {
    const state = createSpawnCatchUpState()
    advanceSpawnCatchUp(state, { deltaSec: 2, liveEnemyCount: 0, spawnSec: 10, nextPendingSpawnSec: 30 })
    resetSpawnCatchUpState(state)
    expect(state).toEqual({ offsetSec: 0, emptyForSec: 0 })
  })

  it('게시된 오프셋은 HUD가 읽을 수 있고 음수/비유한값은 0으로 정규화된다', () => {
    expect(getSpawnCatchUpOffsetSec()).toBe(0)
    publishSpawnCatchUpOffsetSec(12.5)
    expect(getSpawnCatchUpOffsetSec()).toBe(12.5)
    publishSpawnCatchUpOffsetSec(Number.NaN)
    expect(getSpawnCatchUpOffsetSec()).toBe(0)
    publishSpawnCatchUpOffsetSec(-5)
    expect(getSpawnCatchUpOffsetSec()).toBe(0)
  })
})
