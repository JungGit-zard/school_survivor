import { describe, expect, it } from 'vitest'
import {
  POST_EXIT_WAVE_GROWTH_RATE,
  STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS,
  STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS,
  getBurstEventsForStage,
  isRepeatingBurstEvent,
  postExitRepeatWaveIndex,
  postExitWaveCount,
  repeatingBurstSecAtTick,
  repeatingBurstTickCount,
} from './burstEvents.js'
import { ESCAPE_PORTAL_OPEN_SEC } from './stageConfig.js'
import { MAX_ENEMIES } from './enemyEntityPool.js'
import { clampZombieSpawnRequest, overtimeReinforcementCountForTick, repeatingBurstSpawnCountForTick } from '../components/Enemies.jsx'

// 2026-10-31 Terry: 탈출구 개방 후 정기 대량 웨이브는 회차마다 기본의 10%씩(선형) 늘어난다.
describe('post-exit periodic wave growth', () => {
  it('uses linear growth round(base x (1 + 0.1 n)) with n = 0 for the first wave', () => {
    expect(POST_EXIT_WAVE_GROWTH_RATE).toBe(0.1)
    expect(postExitWaveCount(30, 0)).toBe(30)
    expect(postExitWaveCount(30, 1)).toBe(33)
    expect(postExitWaveCount(30, 5)).toBe(45)
    expect(postExitWaveCount(10, 1)).toBe(11)
    expect(postExitWaveCount(10, 5)).toBe(15)
    expect(postExitWaveCount(3, 1)).toBe(3)
    expect(postExitWaveCount(3, 5)).toBe(5)
    // 선형이다 — 복리라면 30 x 1.1^10 = 78이다.
    expect(postExitWaveCount(30, 10)).toBe(60)
    // 개방 전(-1)은 기본 그대로.
    expect(postExitWaveCount(10, -1)).toBe(10)
  })

  it('applies to overtime reinforcement in every stage, with no count ceiling of its own', () => {
    // 스테이지와 무관한 한 식이다(스테이지별 차이는 시작 시각뿐).
    expect(overtimeReinforcementCountForTick(0)).toBe(30)
    expect(overtimeReinforcementCountForTick(1)).toBe(33)
    expect(overtimeReinforcementCountForTick(5)).toBe(45)
    expect(overtimeReinforcementCountForTick(100)).toBe(330)
  })

  it('grows Stage 3 boss-phase 10s reinforcement only from the exit-open tick', () => {
    const [green, smiling] = STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS
    // 150~200초 6회는 개방 전 — 기존 마릿수 그대로.
    for (let tick = 0; tick < 6; tick += 1) {
      expect(repeatingBurstSecAtTick(green, tick)).toBeLessThan(ESCAPE_PORTAL_OPEN_SEC)
      expect(postExitRepeatWaveIndex(green, tick, ESCAPE_PORTAL_OPEN_SEC)).toBe(-1)
      expect(postExitWaveCount(green.count, postExitRepeatWaveIndex(green, tick, ESCAPE_PORTAL_OPEN_SEC))).toBe(10)
    }
    // 210초 tick이 n=0.
    expect(repeatingBurstSecAtTick(green, 6)).toBe(210)
    const counts = (evt) => Array.from({ length: repeatingBurstTickCount(evt) }, (_, tick) =>
      postExitWaveCount(evt.count, postExitRepeatWaveIndex(evt, tick, ESCAPE_PORTAL_OPEN_SEC)))
    expect(counts(green)).toEqual([10, 10, 10, 10, 10, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    expect(counts(smiling)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5])
  })

  it('leaves pre-exit repeating bursts unchanged', () => {
    for (const evt of STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS) {
      for (let tick = 0; tick < repeatingBurstTickCount(evt); tick += 1) {
        expect(postExitRepeatWaveIndex(evt, tick, ESCAPE_PORTAL_OPEN_SEC)).toBe(-1)
      }
    }
    // Stage 5 20초 반복(160~240)은 개방 후 220초 1회만 해당 — n=0이라 기존과 같다.
    for (const evt of getBurstEventsForStage('stage5').filter(isRepeatingBurstEvent)) {
      const post = Array.from({ length: repeatingBurstTickCount(evt) }, (_, t) => postExitRepeatWaveIndex(evt, t, ESCAPE_PORTAL_OPEN_SEC))
      expect(post).toEqual([-1, -1, -1, 0])
    }
  })

  it('is clipped only by the existing concurrent-zombie cap, which stays at 150', () => {
    expect(MAX_ENEMIES).toBe(150)
    // 빈 필드에서도 n=41(153마리 요청)부터 단일 웨이브가 천장에 잘린다.
    expect(overtimeReinforcementCountForTick(40)).toBe(150)
    expect(overtimeReinforcementCountForTick(41)).toBe(153)
    expect(clampZombieSpawnRequest(overtimeReinforcementCountForTick(41), { pooledActive: 0, specialActive: 0, pooledQueued: 0 })).toBe(150)
    // 필드에 120마리가 있으면 n=1(33)부터 30으로 잘린다.
    expect(clampZombieSpawnRequest(overtimeReinforcementCountForTick(1), { pooledActive: 120, specialActive: 0, pooledQueued: 0 })).toBe(30)
    expect(clampZombieSpawnRequest(overtimeReinforcementCountForTick(5), { pooledActive: 150, specialActive: 0, pooledQueued: 0 })).toBe(0)
  })

  it('clamps repeating post-exit reinforcement to free slots before positions are computed', () => {
    const [green] = STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS
    const empty = { pooledActive: 0, specialActive: 0, pooledQueued: 0 }
    // 자리가 있으면 기존과 같은 마릿수(개방 전 10, 개방 후 n=0..8 → 10..18).
    const full = Array.from({ length: repeatingBurstTickCount(green) }, (_, tick) =>
      repeatingBurstSpawnCountForTick(green, tick, ESCAPE_PORTAL_OPEN_SEC, empty))
    expect(full).toEqual([10, 10, 10, 10, 10, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    // 천장 근처에서는 남은 칸만큼만(대기열 포함), 꽉 차면 0.
    expect(repeatingBurstSpawnCountForTick(green, 14, ESCAPE_PORTAL_OPEN_SEC, { pooledActive: 140, specialActive: 2, pooledQueued: 3 })).toBe(5)
    expect(repeatingBurstSpawnCountForTick(green, 14, ESCAPE_PORTAL_OPEN_SEC, { pooledActive: MAX_ENEMIES, specialActive: 0, pooledQueued: 0 })).toBe(0)
  })
})
