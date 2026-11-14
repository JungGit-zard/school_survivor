import { beforeAll, describe, expect, it, vi } from 'vitest'

// 모듈 그래프 첫 로드(변환 수 초)는 준비 비용이라 beforeAll(별도 제한)에서 한다 — 첫 테스트가 기본 5초 제한에
// 걸리지 않게. 아래 테스트의 동적 import는 이 캐시를 그대로 쓴다.
beforeAll(async () => {
  await import('./Enemies.jsx')
  await import('./Enemy.jsx')
}, 120_000)

// Stage 6 「운동장 최후의 조회」 적 런타임(스펙 Part C C-4·C-5·C-6-4).
describe('Stage6 enemy data and overtime', () => {
  it('재사용 적은 ×2.48832, 신규·보스는 절대 HP', async () => {
    const { stageHpOverride } = await import('./Enemies.jsx')
    const { ENEMY_STATS } = await import('./Enemy.jsx')
    expect(stageHpOverride('E04', 'stage6').hp).toBe(80)
    expect(stageHpOverride('E01', 'stage6').hp).toBe(20)
    expect(stageHpOverride('E06', 'stage6').hp).toBe(796)
    expect(ENEMY_STATS.E19.hp).toBe(30)
    expect(ENEMY_STATS.B05.hp).toBe(4050)
    expect(stageHpOverride('E19', 'stage6')).toBeUndefined()
    expect(stageHpOverride('B05', 'stage6')).toBeUndefined()
  })

  it('오버타임 보강은 S6도 240초부터(S1~S5와 같다), 회차마다 +10% 상한 없음. 2부 후보 7~10은 300초 그대로', async () => {
    const { getOvertimeReinforcementStartSec, overtimeReinforcementCountForTick, shouldScheduleOvertimeReinforcement } = await import('./Enemies.jsx')
    for (const id of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']) expect(getOvertimeReinforcementStartSec(id), id).toBe(240)
    for (const id of ['stage7', 'stage8', 'stage9', 'stage10']) expect(getOvertimeReinforcementStartSec(id), id).toBe(300)
    expect(overtimeReinforcementCountForTick(3)).toBe(39)
    expect(shouldScheduleOvertimeReinforcement(-1, 240, 'stage6')).toEqual({ shouldSchedule: true, tick: 0 })
    expect(shouldScheduleOvertimeReinforcement(-1, 239.9, 'stage6').shouldSchedule).toBe(false)
  })

  it('buildExpansionBurstBatch: 5초 조회 줄 E19 10마리는 같은 z 가로줄, B05는 조회대 앞 (0, −17)', async () => {
    const { buildExpansionBurstBatch } = await import('./Enemies.jsx')
    const { getStageObjectSightObstacles } = await import('./StageObjects/stageObjectColliders.js')
    const { playerPos, screenBounds } = await import('../lib/refs.js')
    const savedScreen = { ...screenBounds }
    playerPos.set(0, 0, 4)
    Object.assign(screenBounds, { minX: -5, maxX: 5, minZ: 4 - 12.44, maxZ: 4 + 7.18 })
    try {
      const cache = { id: 'stage6', bounds: { halfX: 12, halfZ: 20 }, obstacles: getStageObjectSightObstacles('stage6') }
      const counts = { pooledActive: 0, specialActive: 0, pooledQueued: 0 }
      const row = buildExpansionBurstBatch(cache, { sec: 5, type: 'E19', count: 10, formation: 'assembly_row', side: 'top' }, counts)
      expect(row).toHaveLength(10)
      expect(new Set(row.map((e) => e.pos[2])).size).toBe(1)
      expect(row[0].pos[2]).toBeCloseTo(4 - 12.44 - 1, 6)
      const lanes = buildExpansionBurstBatch(cache, { sec: 124, type: 'E21', count: 6, formation: 'track_lanes' }, counts)
      expect(lanes.map((e) => [e.pos[0], e.pos[2]])).toEqual([[-9, -6], [9, -6], [-9, 0], [9, 0], [-9, 6], [9, 6]])
      const boss = buildExpansionBurstBatch(cache, { sec: 150, type: 'B05', count: 1 }, counts)
      expect([boss[0].pos[0], boss[0].pos[2]]).toEqual([0, -17])
      // 상한(150)이 차 있으면 줄도 먼저 잘린다.
      expect(buildExpansionBurstBatch(cache, { type: 'E19', count: 12, formation: 'assembly_row', side: 'top' }, { pooledActive: 145, specialActive: 1, pooledQueued: 0 })).toHaveLength(4)
    } finally {
      Object.assign(screenBounds, savedScreen)
      playerPos.set(0, 0, 0)
    }
  })
})

// Headless frame/RAF harness(Enemies.stage5.test.jsx와 같은 방식): 실제 Enemies 스케줄러와 풀 드레인을 돌린다.
describe('Stage6 production enemy runtime', () => {
  it('확장 코인 몬스터는 상한에 막히면 재시도하고, B05 소환 요청은 트랙 6지점 E21×6으로 나온다', async () => {
    const React = await import('react')
    vi.resetModules()
    const refs = [], effects = [], cleanups = [], rafs = []
    let frame, refIndex = 0, stateIndex = 0
    const state = { phase: 'playing', currentStageId: 'stage6', gameKey: 601, elapsedMs: 0, bossSpawnSec: 150,
      matildaSpawned: false, player: { hp: 100, maxHp: 100, speed: 1 }, weapons: [],
      spawnBoss: vi.fn(), damagePlayer: vi.fn(), recordMissionEvent: vi.fn(), recordMissionEnemyKill: vi.fn() }
    vi.doMock('react', () => ({ ...React,
      useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: value => { stateIndex++; return [value, () => {}] },
      useCallback: callback => callback, useEffect: callback => effects.push(callback),
    }))
    vi.doMock('../store/useGameStore.js', () => ({ useGameStore: Object.assign(selector => selector(state), { getState: () => state }) }))
    vi.doMock('../lib/usePlayingFrame.js', () => ({ usePlayingFrame: callback => { frame = delta => { if (state.phase === 'playing') callback({}, delta) } } }))
    const catchUp = await import('../lib/spawnCatchUp.js')
    vi.doMock('../lib/spawnCatchUp.js', () => ({ ...catchUp, advanceSpawnCatchUp: vi.fn() }))
    vi.stubGlobal('requestAnimationFrame', callback => { rafs.push(callback); return rafs.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    let pool, spy
    const clearPool = () => { if (pool) for (let i = pool.highestActive; i >= 0; i--) if (pool.active[i]) pool.despawnIndex(i, pool.generation[i]) }
    const flush = () => { let count = 0; while (rafs.length) { expect(++count).toBeLessThan(200); rafs.shift()() } }
    try {
      const runtime = await import('./Enemies.jsx')
      const runtimeRefs = await import('../lib/refs.js')
      const summonQueue = await import('../lib/bossSummonQueue.js')
      pool = runtimeRefs.enemyPool
      clearPool()
      spy = vi.spyOn(pool, 'spawnInto')
      runtimeRefs.playerPos.set(0, 0, 18)
      runtime.default()
      for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup) }

      // 89초까지 표대로 흘린다(코인 직전).
      for (let sec = 1; sec <= 89; sec += 1) { state.elapsedMs = sec * 1000; frame(0.016); flush() }
      // 90초: 동시 천장 150을 채워 코인 몬스터가 자리를 못 받게 한다.
      clearPool()
      for (let i = 0; i < 150; i += 1) pool.spawn({ type: 'E01', x: -11 + (i % 20) * 1.1, z: -15 + Math.floor(i / 20) * 1.1, hp: 20, maxHp: 20, spawnTimer: 300 })
      spy.mockClear()
      state.elapsedMs = 90_000; frame(0.016); flush()
      expect(spy.mock.calls.filter(([, e]) => e.type === 'E08')).toHaveLength(0)
      // 91초: 자리가 비면 같은 이벤트가 다시 시도돼 코인 몬스터가 나온다(30초 창 안).
      clearPool(); spy.mockClear()
      state.elapsedMs = 91_000; frame(0.016); flush()
      expect(spy.mock.calls.filter(([, e]) => e.type === 'E08')).toHaveLength(1)

      // B05 '운동장 10바퀴': Enemy.jsx가 넣는 소환 요청(보스 typeCode 32) → 트랙 6지점 E21×6. 다른 판 요청은 버린다.
      clearPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey - 1, 0, -17, 32)
      summonQueue.pushBossSummon(state.gameKey, 0, -17, 32)
      frame(0.016); flush()
      const summoned = spy.mock.calls.map(([, e]) => e)
      expect(summoned.map((e) => e.type)).toEqual(['E21', 'E21', 'E21', 'E21', 'E21', 'E21'])
      expect(summoned.map((e) => [e.x, e.z])).toEqual([[-9, -6], [9, -6], [-9, 0], [9, 0], [-9, 6], [9, 6]])
      expect(summoned.every((e) => e.hp === 36)).toBe(true)
      expect(summonQueue.getBossSummonQueueCount()).toBe(0)

      // 천장(150)이 꽉 찬 순간의 B05 시간 소환은 버리지 않고 미뤘다가 자리가 나면 나온다. 총 도착 수 = 요청 수(6).
      // 천장은 그대로 지킨다 — 빈 자리만큼만 나온다.
      state.bossAliveCount = 1
      const fillPool = () => { clearPool(); for (let i = 0; i < 150; i += 1) pool.spawn({ type: 'E01', x: -11 + (i % 20) * 1.1, z: -15 + Math.floor(i / 20) * 1.1, hp: 20, maxHp: 20, spawnTimer: 300 }) }
      const freeSlots = (n) => { let freed = 0; for (let i = 0; i <= pool.highestActive && freed < n; i += 1) if (pool.active[i] && pool.type[i] !== 19) { pool.despawnIndex(i, pool.generation[i]); freed += 1 } }
      const arrivedE21 = () => spy.mock.calls.filter(([, e]) => e.type === 'E21').length
      fillPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey, 0, -17, 32)
      frame(0.016); flush()
      expect(arrivedE21()).toBe(0)
      frame(0.016); flush()
      expect(arrivedE21()).toBe(0)
      freeSlots(2)
      frame(0.016); flush()
      expect(arrivedE21()).toBe(2)
      freeSlots(10)
      frame(0.016); flush()
      expect(arrivedE21()).toBe(6)
      for (let i = 0; i < 5; i += 1) { frame(0.016); flush() }
      expect(arrivedE21()).toBe(6)
      expect(spy.mock.calls.length).toBe(6)

      // 보스가 죽으면 미뤄 둔 몫은 폐기된다 — 처치 뒤에 자리가 나도 아무것도 나오지 않는다.
      fillPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey, 0, -17, 32)
      frame(0.016); flush()
      expect(arrivedE21()).toBe(0)
      state.bossAliveCount = 0
      clearPool()
      for (let i = 0; i < 5; i += 1) { frame(0.016); flush() }
      expect(arrivedE21()).toBe(0)
      // 보스가 다시 살아 있어도(다음 판 보스가 아니라 같은 판 재검사) 이미 버린 몫은 되살아나지 않는다.
      state.bossAliveCount = 1
      frame(0.016); flush()
      expect(arrivedE21()).toBe(0)
    } finally {
      for (const cleanup of cleanups.reverse()) cleanup()
      spy?.mockRestore(); clearPool()
      vi.doUnmock('react'); vi.doUnmock('../store/useGameStore.js'); vi.doUnmock('../lib/usePlayingFrame.js'); vi.doUnmock('../lib/spawnCatchUp.js')
      vi.unstubAllGlobals(); vi.resetModules()
    }
  })
})
