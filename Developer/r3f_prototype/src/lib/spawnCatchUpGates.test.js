import { describe, expect, it } from 'vitest'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { createEnemySimulationRuntime } from './enemySimulation.js'
import { BOSS_TELEGRAPH_LEAD_SEC, EMPTY_ARENA_MAX_SEC } from './spawnCatchUp.js'
import { countPendingZombieSchedules, nextPendingSpawnSec } from '../components/Enemies.jsx'

// balanceqa 판정(2026-08-22, Developer/agent_room/balanceqa_spawn_catchup_2026-08-22.md)이 낸
// 결함 3건의 회귀 테스트다. 전부 스폰 캐치업이 시각 게이트를 앞당기면서 생긴 부작용이다.

function spawnE04(pool, x = 5, z = 0) {
  return pool.spawn({ type: 'E04', x, y: 0, z, hp: 100, maxHp: 100, visualScale: 1, spawnTimer: 900 })
}

function ctx(overrides = {}) {
  return { delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 12, halfZ: 12, elapsedSec: 100, ...overrides }
}

describe('P1 — E04 발사 게이트는 bossPressure와 같은 시계를 본다', () => {
  // 결함: 발사 하한 introSec은 실시간, 억제 조건 bossPressure는 스폰 시계였다.
  // 캐치업이 보스를 실시간 24초로 당기면 발사 창 [72, 24)가 공집합이 되어 한 발도 못 쏜다.
  it('spawnSec이 introSec을 넘으면 실시간이 아직 이르러도 발사한다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawnE04(pool)
    let fired = 0
    // 실시간 30초 — 예전이라면 elapsedSec < 72라 무조건 차단됐다.
    runtime.step(pool, ctx({ elapsedSec: 30, spawnSec: 72, onRangedFire: () => { fired += 1 } }))
    expect(fired).toBe(1)
  })

  it('spawnSec이 introSec 미만이면 실시간이 지났어도 발사하지 않는다', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawnE04(pool)
    let fired = 0
    runtime.step(pool, ctx({ elapsedSec: 120, spawnSec: 71, onRangedFire: () => { fired += 1 } }))
    expect(fired).toBe(0)
  })

  it('spawnSec을 안 넘기는 호출자는 실시간 elapsedSec으로 폴백한다 — 기존 거동 불변', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    spawnE04(pool)
    let fired = 0
    runtime.step(pool, ctx({ elapsedSec: 71, onRangedFire: () => { fired += 1 } }))
    expect(fired).toBe(0)
    runtime.step(pool, ctx({ elapsedSec: 72, onRangedFire: () => { fired += 1 } }))
    expect(fired).toBe(1)
  })

  it('캐치업 오프셋이 커도 발사 창 길이가 보존된다 — 스폰 시계 [72, 150)', () => {
    // 오프셋 126초(보스가 실시간 24초에 등장). 두 게이트가 같은 시계를 보므로
    // 스폰 시계 기준 발사 가능 구간은 오프셋과 무관하게 78초 그대로다.
    const offsetSec = 126
    const bossSpawnSec = 150
    const introSec = 72
    let firableSec = 0
    for (let realSec = 0; realSec < 210; realSec += 1) {
      const spawnSec = realSec + offsetSec
      const bossPressure = spawnSec >= bossSpawnSec && realSec < 210
      if (spawnSec >= introSec && !bossPressure) firableSec += 1
    }
    // 스폰 시계 72~149 = 78초 구간 중, 실시간 0초 시점에 이미 spawnSec 126이므로
    // 남은 구간은 [126, 150) = 24초다. 창이 사라지지(0초) 않는 것이 핵심이다.
    expect(firableSec).toBe(24)
    expect(firableSec).toBeGreaterThan(0)
  })
})

describe('P2 — 보스 앵커 앞에서 점프를 끊어 HUD 경고 시간을 확보한다', () => {
  const bossTable = [
    { sec: 40, type: 'E01', count: 6 },
    { sec: 150, type: 'B01', count: 1 },
  ]
  const flags = () => new Uint8Array(bossTable.length)

  it('다음 후보가 보스면 보스 시각 3초 전을 낸다', () => {
    const at = nextPendingSpawnSec(bossTable, Uint8Array.from([1, 0]), new Int16Array(2).fill(-1), 50, 'stage1', -1)
    expect(at).toBe(150 - BOSS_TELEGRAPH_LEAD_SEC)
    expect(BOSS_TELEGRAPH_LEAD_SEC).toBe(3)
  })

  it('이미 3초 전 지점을 지났으면 되감지 않고 보스 시각을 낸다', () => {
    const at = nextPendingSpawnSec(bossTable, Uint8Array.from([1, 0]), new Int16Array(2).fill(-1), 148, 'stage1', -1)
    expect(at).toBe(150)
  })

  it('보스가 아닌 후보는 그대로 낸다 — 일반 버스트에 lead를 적용하지 않는다', () => {
    const at = nextPendingSpawnSec(bossTable, flags(), new Int16Array(2).fill(-1), 10, 'stage1', -1)
    expect(at).toBe(40)
  })

  it('보스보다 이른 오버타임 tick이 이기면 lead가 붙지 않는다', () => {
    // spawnSec 250 → 다음 오버타임 tick 270이 유일 후보(보스는 이미 발화).
    const at = nextPendingSpawnSec(bossTable, Uint8Array.from([1, 1]), new Int16Array(2).fill(-1), 250, 'stage1', 0)
    expect(at).toBe(270)
  })
})

describe('P2 — 빈 화면 판정은 좀비 스폰 대기만 센다', () => {
  const SCHEDULE_GOLD = 1
  const SCHEDULE_DOGE = 2
  const SCHEDULE_BURST = 5
  const SCHEDULE_OVERTIME = 7

  function queueWith(kinds) {
    const scheduleKind = new Uint8Array(64)
    kinds.forEach((kind, index) => { scheduleKind[index] = kind })
    return { scheduleKind, scheduleRead: 0, scheduleCount: kinds.length }
  }

  it('골드만 대기 중이면 아레나는 비어 있다 — 캐치업을 막지 않는다', () => {
    expect(countPendingZombieSchedules(queueWith([SCHEDULE_GOLD, SCHEDULE_GOLD]))).toBe(0)
  })

  it('버스트·오버타임·도지 대기는 "안 비었다"로 센다', () => {
    expect(countPendingZombieSchedules(queueWith([SCHEDULE_BURST]))).toBe(1)
    expect(countPendingZombieSchedules(queueWith([SCHEDULE_OVERTIME]))).toBe(1)
    expect(countPendingZombieSchedules(queueWith([SCHEDULE_DOGE]))).toBe(1)
  })

  it('섞여 있으면 좀비 종류만 골라 센다', () => {
    expect(countPendingZombieSchedules(queueWith([SCHEDULE_GOLD, SCHEDULE_BURST, SCHEDULE_GOLD, SCHEDULE_OVERTIME]))).toBe(2)
  })

  it('링버퍼가 감긴 상태(scheduleRead > 0)에서도 정확히 센다', () => {
    const queue = queueWith([])
    queue.scheduleKind[62] = SCHEDULE_GOLD
    queue.scheduleKind[63] = SCHEDULE_BURST
    queue.scheduleKind[0] = SCHEDULE_BURST
    queue.scheduleRead = 62
    queue.scheduleCount = 3
    expect(countPendingZombieSchedules(queue)).toBe(2)
  })

  it('빈 대기열과 잘못된 입력은 0이다', () => {
    expect(countPendingZombieSchedules(queueWith([]))).toBe(0)
    expect(countPendingZombieSchedules(null)).toBe(0)
    expect(countPendingZombieSchedules({})).toBe(0)
  })

  it('빈 화면 상한 상수는 2초 그대로다', () => {
    expect(EMPTY_ARENA_MAX_SEC).toBe(2)
  })
})
