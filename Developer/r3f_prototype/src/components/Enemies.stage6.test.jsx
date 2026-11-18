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

  it('buildExpansionBurstBatch: 5초 조회 줄 E19 10마리는 같은 z 가로줄, B05는 조회대 앞 (0, −11)(2026-11-18 축소 17 × 28u)', async () => {
    const { buildExpansionBurstBatch } = await import('./Enemies.jsx')
    const { getStageObjectSightObstacles } = await import('./StageObjects/stageObjectColliders.js')
    const { playerPos, screenBounds } = await import('../lib/refs.js')
    const savedScreen = { ...screenBounds }
    playerPos.set(0, 0, 4)
    Object.assign(screenBounds, { minX: -5, maxX: 5, minZ: 4 - 12.44, maxZ: 4 + 7.18 })
    try {
      const cache = { id: 'stage6', bounds: { halfX: 8.5, halfZ: 14 }, obstacles: getStageObjectSightObstacles('stage6') }
      const counts = { pooledActive: 0, specialActive: 0, pooledQueued: 0 }
      const row = buildExpansionBurstBatch(cache, { sec: 5, type: 'E19', count: 10, formation: 'assembly_row', side: 'top' }, counts)
      expect(row).toHaveLength(10)
      expect(new Set(row.map((e) => e.pos[2])).size).toBe(1)
      // 2026-11-19: 줄은 화면 끝에서 1u + 몸 반경(E19 0.373u) 밖.
      expect(row[0].pos[2]).toBeCloseTo(4 - 12.44 - 1 - 0.28 * 4 / 3, 5)
      // 계주 지점(x ±5.5)은 이 화면(x ±5)에서 1u + 몸 반경 안이라 버리지 않고 바로 바깥(트랙 띠 쪽)으로 옮겨 6마리 모두 나온다.
      const lanes = buildExpansionBurstBatch(cache, { sec: 124, type: 'E21', count: 6, formation: 'track_lanes' }, counts)
      expect(lanes).toHaveLength(6)
      for (const { pos: [x, , z] } of lanes) {
        expect(Math.abs(x)).toBeGreaterThanOrEqual(5.5)
        expect(Math.abs(x) > 5 + 1.3 || z < screenBounds.minZ - 1.3 || z > screenBounds.maxZ + 1.3).toBe(true)
      }
      const boss = buildExpansionBurstBatch(cache, { sec: 150, type: 'B05', count: 1 }, counts)
      expect([boss[0].pos[0], boss[0].pos[2]]).toEqual([0, -11])
      // 상한(150)이 차 있으면 줄도 먼저 잘린다.
      expect(buildExpansionBurstBatch(cache, { type: 'E19', count: 12, formation: 'assembly_row', side: 'top' }, { pooledActive: 145, specialActive: 1, pooledQueued: 0 })).toHaveLength(4)
    } finally {
      Object.assign(screenBounds, savedScreen)
      playerPos.set(0, 0, 0)
    }
  })
})

// 2026-11-19 증명: 스테이지 6 시간표 전체(보스 B05·치프 E104 제외, B05 '운동장 10바퀴' 소환 포함)를 플레이 영역 격자의 모든 플레이어
// 자리에서 실제 배치 함수(buildExpansionBurstBatch)로 내 보면, 세로 폰 화면 사각형(게임과 같은 식 — 프로브 updateScreenBounds가
// Enemies.jsx가 읽는 screenBounds를 채운다) 안에 몸이 걸치는 스폰이 하나도 없고(1u 여백 + 몸 반경까지), 마릿수도 하나도 줄지 않는다.
describe('Stage6 spawns never start on screen (phone portrait, whole timeline × player grid)', () => {
  it('비면제 스폰 전부 화면 사각형 + 1u + 몸 반경 밖, 요청 마릿수 그대로', async () => {
    const { buildExpansionBurstBatch } = await import('./Enemies.jsx')
    const { ENEMY_STATS } = await import('./Enemy.jsx')
    const { getStageObjectSightObstacles } = await import('./StageObjects/stageObjectColliders.js')
    const { playerPos, screenBounds } = await import('../lib/refs.js')
    const { updateScreenBounds } = await import('../lib/stageRuntimeProbe.js')
    const { getBurstEventsForStage, isBossType } = await import('../lib/burstEvents.js')
    const { isChiefType } = await import('../lib/stageChiefContent.js')
    const { EXPANSION_BOSSES } = await import('../lib/expansionContent.js')
    const { getPlayerMovementBounds } = await import('../lib/playerMovementBounds.js')
    const savedScreen = { ...screenBounds }
    const cache = { id: 'stage6', bounds: { halfX: 8.5, halfZ: 14 }, obstacles: getStageObjectSightObstacles('stage6') }
    const counts = { pooledActive: 0, specialActive: 0, pooledQueued: 0 }
    const events = [...getBurstEventsForStage('stage6').filter((e) => !isBossType(e.type) && !isChiefType(e.type)),
      { type: EXPANSION_BOSSES.B05.summon.type, count: EXPANSION_BOSSES.B05.summon.count, formation: EXPANSION_BOSSES.B05.summon.formation }]
    const move = getPlayerMovementBounds('stage6')
    let seed = 99
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    const bad = []
    let spawned = 0
    try {
      for (let ix = 0; ix <= 6; ix += 1) for (let iz = 0; iz <= 8; iz += 1) {
        const px = move.minX + (move.maxX - move.minX) * ix / 6
        const pz = move.minZ + (move.maxZ - move.minZ) * iz / 8
        playerPos.set(px, 0, pz)
        updateScreenBounds('stage6', 8.5, 14)
        expect(screenBounds.maxX - screenBounds.minX).toBeCloseTo(8.42, 1)
        for (const evt of events) {
          const batch = buildExpansionBurstBatch(cache, evt, counts, random)
          expect(batch.length, JSON.stringify({ px, pz, evt })).toBe(evt.count ?? 1)
          for (const { type, pos: [x, , z] } of batch) {
            spawned += 1
            const r = 0.28 * (ENEMY_STATS[type]?.scale ?? 1) * 4 / 3
            const p = 1 + r
            if (x >= screenBounds.minX - p && x <= screenBounds.maxX + p && z >= screenBounds.minZ - p && z <= screenBounds.maxZ + p) bad.push({ px, pz, type, x, z, formation: evt.formation })
          }
        }
      }
    } finally {
      Object.assign(screenBounds, savedScreen)
      playerPos.set(0, 0, 0)
    }
    expect(spawned).toBeGreaterThan(63 * 190)
    expect(bad.slice(0, 5)).toEqual([])
  }, 300_000)
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

      // 2026-11-19 A8 ②: 5초 조회 줄 E19×10은 같은 몸이 2초에 걸쳐 고르게 나온다(스케줄러 → 드레인, 프레임 콜백에서 직접 스폰하지 않는다).
      const e19At = []
      for (let t = 1; t <= 75; t += 1) {
        state.elapsedMs = t * 100; frame(0.016); flush()
        for (let d = 0; d < 4; d += 1) { frame(0.016); flush() } // 드레인(프레임당 3마리)이 따라잡게 한다
        const n = spy.mock.calls.filter(([, e]) => e.type === 'E19').length
        e19At.push([t / 10, n])
      }
      const countAt = (sec) => e19At.find(([t]) => t >= sec - 1e-9)[1]
      expect(countAt(4.9)).toBe(0)
      expect(countAt(5.0)).toBeGreaterThanOrEqual(1)
      expect(countAt(5.0)).toBeLessThanOrEqual(2)
      expect(countAt(6.0)).toBeGreaterThanOrEqual(5)
      expect(countAt(6.0)).toBeLessThanOrEqual(7)
      expect(countAt(6.7)).toBeLessThan(10)
      expect(countAt(7.0)).toBe(10)
      // 2026-11-19 A8 ①: 스6 풀 좀비 몸 접촉(E19 작성 10)은 store.damagePlayer에 10 × 0.6 = 6으로 들어간다.
      clearPool(); state.damagePlayer.mockClear()
      runtimeRefs.playerPos.set(0, 0, 0)
      pool.spawn({ type: 'E19', x: 0.1, z: 0, hp: 30, maxHp: 30, spawnTimer: 1000 })
      for (let f = 0; f < 30 && state.damagePlayer.mock.calls.length === 0; f += 1) { frame(0.016); flush() }
      expect(state.damagePlayer.mock.calls.length).toBeGreaterThan(0)
      expect(state.damagePlayer.mock.calls[0][0]).toBeCloseTo(6, 9)
      clearPool(); state.damagePlayer.mockClear()
      runtimeRefs.playerPos.set(0, 0, 18)
      spy.mockClear()
      // 89초까지 표대로 흘린다(코인 직전).
      for (let sec = 8; sec <= 89; sec += 1) { state.elapsedMs = sec * 1000; frame(0.016); flush() }
      // 90초: 동시 천장 150을 채워 코인 몬스터가 자리를 못 받게 한다.
      clearPool()
      for (let i = 0; i < 150; i += 1) pool.spawn({ type: 'E01', x: -7.7 + (i % 15) * 1.1, z: -13 + Math.floor(i / 15) * 1.1, hp: 20, maxHp: 20, spawnTimer: 300 })
      spy.mockClear()
      state.elapsedMs = 90_000; frame(0.016); flush()
      expect(spy.mock.calls.filter(([, e]) => e.type === 'E08')).toHaveLength(0)
      // 91초: 자리가 비면 같은 이벤트가 다시 시도돼 코인 몬스터가 나온다(30초 창 안).
      clearPool(); spy.mockClear()
      state.elapsedMs = 91_000; frame(0.016); flush()
      expect(spy.mock.calls.filter(([, e]) => e.type === 'E08')).toHaveLength(1)

      // B05 '운동장 10바퀴': Enemy.jsx가 넣는 소환 요청(보스 typeCode 32) → 트랙 6지점 E21×6. 다른 판 요청은 버린다.
      clearPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey - 1, 0, -11, 32)
      summonQueue.pushBossSummon(state.gameKey, 0, -11, 32)
      frame(0.016); flush()
      const summoned = spy.mock.calls.map(([, e]) => e)
      expect(summoned.map((e) => e.type)).toEqual(['E21', 'E21', 'E21', 'E21', 'E21', 'E21'])
      expect(summoned.map((e) => [e.x, e.z])).toEqual([[-5.5, -4.2], [5.5, -4.2], [-5.5, 0], [5.5, 0], [-5.5, 4.2], [5.5, 4.2]])
      expect(summoned.every((e) => e.hp === 36)).toBe(true)
      expect(summonQueue.getBossSummonQueueCount()).toBe(0)

      // 천장(150)이 꽉 찬 순간의 B05 시간 소환은 버리지 않고 미뤘다가 자리가 나면 나온다. 총 도착 수 = 요청 수(6).
      // 천장은 그대로 지킨다 — 빈 자리만큼만 나온다.
      state.bossAliveCount = 1
      const fillPool = () => { clearPool(); for (let i = 0; i < 150; i += 1) pool.spawn({ type: 'E01', x: -7.7 + (i % 15) * 1.1, z: -13 + Math.floor(i / 15) * 1.1, hp: 20, maxHp: 20, spawnTimer: 300 }) }
      const freeSlots = (n) => { let freed = 0; for (let i = 0; i <= pool.highestActive && freed < n; i += 1) if (pool.active[i] && pool.type[i] !== 19) { pool.despawnIndex(i, pool.generation[i]); freed += 1 } }
      const arrivedE21 = () => spy.mock.calls.filter(([, e]) => e.type === 'E21').length
      fillPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey, 0, -11, 32)
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
      summonQueue.pushBossSummon(state.gameKey, 0, -11, 32)
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
