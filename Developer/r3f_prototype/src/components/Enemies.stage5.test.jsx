import { beforeAll, describe, expect, it, vi } from 'vitest'

// Enemies.jsx/Enemy.jsx 모듈 그래프 첫 로드(변환 ~6초, 부하 시 더)는 테스트 대상이 아니라 준비 비용이다.
// 예전에는 첫 테스트 안에서 동적 import를 해서 기본 5초 제한에 걸렸다(HP 루프 자체는 수 ms).
// 로드는 beforeAll(별도 제한)로 옮기고, 루프 자체가 느려지면 잡히도록 루프 시간을 따로 단언한다.
let enemiesModule
let enemyModule
beforeAll(async () => {
  enemiesModule = await import('./Enemies.jsx')
  enemyModule = await import('./Enemy.jsx')
}, 120_000)

// Headless frame/RAF harness: executes production Enemies scheduler and pool drain.
// No WebGL/Rapier renderer and no Firebase network transport are started here.
describe('Stage5 production enemy runtime', () => {
  it('uses the next cumulative HP step for every approved zombie, without changing Stage1–4', () => {
    const { stageHpOverride, sameTypeZombieHpForStage } = enemiesModule
    const { ENEMY_STATS } = enemyModule
    const startedAt = performance.now()
    for (const [type, stats] of Object.entries(ENEMY_STATS)) {
      // Expansion actors have absolute contract HP; they must not inherit legacy cumulative scaling.
      const expansionActor = /^E(?:19|2[0-9]|3[0-3])$|^B0[5-9]$/.test(type)
      expect(stageHpOverride(type, 'stage5')?.hp ?? stats.hp, type).toBe(expansionActor ? stats.hp : Math.round(stats.hp * 1.2 ** 4))
      if (expansionActor) expect(stageHpOverride(type, 'stage5')).toBeUndefined()
      for (const [id, multiplier] of Object.entries({ stage1: 1, stage2: 1.2, stage3: 1.44, stage4: 1.728 })) {
        expect(sameTypeZombieHpForStage(stats.hp, id), `${id}:${type}`).toBe(Math.round(stats.hp * multiplier))
      }
    }
    // 타입 ~80개 × 스테이지 5개 순수 계산 — 느려지면 HP 경로에 진짜 비용이 생긴 것이다.
    expect(performance.now() - startedAt).toBeLessThan(250)
  })

  // 스펙 Part B §4-4·§4-5: 교무실 HP 배율·도지·B10·E04 12초 게이트.
  it('pins the Stage5 staff-room HP steps, doge 293, B10 3,241 and the 12s E04 fire gate', async () => {
    const { sameTypeZombieHpForStage, stageHpOverride, dogeHpForStage, STAGE_DENSITY_MULTIPLIER } = await import('./Enemies.jsx')
    const { ENEMY_STATS } = await import('./Enemy.jsx')
    const { getE04IntroSec } = await import('../lib/stage2ProjectileRules.js')
    const { isBossType } = await import('../lib/burstEvents.js')
    expect(sameTypeZombieHpForStage(8, 'stage5')).toBe(17)
    expect(sameTypeZombieHpForStage(70, 'stage5')).toBe(145)
    expect(ENEMY_STATS.B10).toMatchObject({ hp: 1563, speed: 0.5225, damage: 22, scale: 2, xp: 0, contactDist: 0.36, authoredAttackBoss: true })
    expect(stageHpOverride('B10', 'stage5')).toEqual({ hp: 3241 })
    expect(isBossType('B10')).toBe(true)
    expect(dogeHpForStage('stage5')).toBe(293)
    expect(dogeHpForStage('stage4')).toBe(266)
    expect(getE04IntroSec('stage5')).toBe(12)
    expect(getE04IntroSec('stage4')).toBe(18)
    expect(getE04IntroSec('stage3')).toBe(72)
    // 분석용 밀도 배율도 stage5에서 앵커 1로 떨어지지 않는다(_STAGE_BLEND_IDS).
    expect(Number.isFinite(STAGE_DENSITY_MULTIPLIER.stage5)).toBe(true)
    expect(STAGE_DENSITY_MULTIPLIER.stage5).toBeGreaterThan(0)
  })

  // Enemy.jsx(React+Rapier)는 이 하네스로 돌리지 않는다. B10 배선이 빠지지 않았는지만 소스로 묶는다.
  // 런타임 동작은 expansionAttackRuntime.test.js(패턴·격노)와 stage5ViceBoss.test.js(소집 트리거)가 본다.
  it('wires B10 into the shared attack runtime, the summon trigger/queue and pattern SFX in Enemy.jsx', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('if (isExpansionBoss(type) || authoredAttackBoss) {')
    expect(source).toContain('a.stageId=currentStageId;a.halfX=stageCombatConfig.bounds.halfX;a.halfZ=stageCombatConfig.bounds.halfZ')
    expect(source).toContain('stepB10SummonTriggers(')
    expect(source).toContain('pushBossSummon(store.gameKey,t.x,t.z,AUTHORED_ATTACK_BOSSES[type].typeCode)')
    expect(source).toContain('B10_SFX[snap.patternId]')
  })

  it('delivers the real Stage5 timetable, boss once, repeated reinforcements, pause and stale-run rejection', async () => {
    const React = await import('react')
    vi.resetModules()
    const refs = [], effects = [], cleanups = [], rafs = []
    let frame, refIndex = 0
    const specialUpdates = []
    let stateIndex = 0
    const state = { phase: 'playing', currentStageId: 'stage5', gameKey: 901, elapsedMs: 0, bossSpawnSec: 150,
      matildaSpawned: false, player: { hp: 1, maxHp: 100, speed: 1 }, weapons: [],
      spawnBoss: vi.fn(), damagePlayer: vi.fn(), recordMissionEvent: vi.fn(), recordMissionEnemyKill: vi.fn() }
    vi.doMock('react', () => ({ ...React,
      useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: value => { const index = stateIndex++; return [value, next => { if (index === 0) specialUpdates.push(next) }] },
      useCallback: callback => callback, useEffect: callback => effects.push(callback),
    }))
    vi.doMock('../store/useGameStore.js', () => ({ useGameStore: Object.assign(selector => selector(state), { getState: () => state }) }))
    vi.doMock('../lib/usePlayingFrame.js', () => ({ usePlayingFrame: callback => { frame = delta => { if (state.phase === 'playing') callback({}, delta) } } }))
    // Exact timetable isolation only: production catch-up has its own regression suite.
    const catchUp = await import('../lib/spawnCatchUp.js')
    vi.doMock('../lib/spawnCatchUp.js', () => ({ ...catchUp, advanceSpawnCatchUp: vi.fn() }))
    vi.stubGlobal('requestAnimationFrame', callback => { rafs.push(callback); return rafs.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    let pool, spy
    const clearPool = () => { if (pool) for (let i = pool.highestActive; i >= 0; i--) if (pool.active[i]) pool.despawnIndex(i, pool.generation[i]) }
    const flush = () => { let count = 0; while (rafs.length) { expect(++count).toBeLessThan(100); rafs.shift()() } }
    try {
      const runtime = await import('./Enemies.jsx')
      const runtimeRefs = await import('../lib/refs.js')
      const bursts = await import('../lib/burstEvents.js')
      const callLane = await import('../lib/stage5CallLane.js')
      const summonQueue = await import('../lib/bossSummonQueue.js')
      pool = runtimeRefs.enemyPool
      clearPool()
      spy = vi.spyOn(pool, 'spawnInto')
      runtimeRefs.playerPos.set(0, 0, 0)
      runtime.default()
      for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup) }
      const runtimeEvents = bursts.getRuntimeSpawnEventsForStage('stage5')
      // 플레이어 (0, 0) = 레인 L3(index 2, x 1.0~3.2). 전교 호출 descriptor는 2초 간격 펄스(양끝 1기씩)로 나온다.
      const playerLane = callLane.laneIndexForX(0)
      const expected = runtimeEvents.flatMap((event, eventIndex) => {
        if (!bursts.isRepeatingBurstEvent(event)) return [event]
        const expanded = []
        for (let tick = 0; ; tick++) {
          const sec = bursts.repeatingBurstSecAtTick(event, tick)
          if (sec === null) break
          if (event.formation === bursts.STAGE5_CALL_LANE_FORMATION) {
            const firstPulse = callLane.stage5CallLanePulseOffset(runtimeEvents, eventIndex, bursts.STAGE5_CALL_LANE_FORMATION)
            for (const pulse of callLane.createStage5CallLanePulses(event, playerLane, sec, firstPulse)) {
              expanded.push({ type: pulse.type, count: pulse.spawns.length, sec: pulse.atMs / 1000, callLane: true })
            }
          } else {
            expanded.push({ ...event, sec })
          }
        }
        return expanded
      })
      const callLaneEntries = []
      const times = [...new Set(expected.map(event => event.sec))].sort((a, b) => a - b)
      for (const sec of times) {
        clearPool(); spy.mockClear()
        state.elapsedMs = sec * 1000
        state.phase = 'paused'; frame(100); flush()
        expect(spy).not.toHaveBeenCalled()
        state.phase = 'playing'; frame(0.016); flush()
        const due = expected.filter(event => event.sec === sec && !bursts.isBossType(event.type))
        const spawned = spy.mock.calls.map(([, entry]) => entry)
        expect(spawned.length, `t=${sec}`).toBe(due.reduce((sum, event) => sum + (event.count ?? 1), 0))
        if (sec >= 73 && sec < 83) callLaneEntries.push(...spawned)
        for (const entry of spawned) {
          const { ENEMY_STATS } = await import('./Enemy.jsx')
          expect(entry.hp).toBe(Math.round(ENEMY_STATS[entry.type].hp * 1.2 ** 4))
          expect(entry.maxHp).toBe(entry.hp)
          // 교무실 경계 9.36 × 16(스펙 §2-1).
          expect(Math.abs(entry.x)).toBeLessThanOrEqual(9.36)
          expect(Math.abs(entry.z)).toBeLessThanOrEqual(16)
        }
        const before = spy.mock.calls.length
        frame(0.016); flush()
        expect(spy.mock.calls.length, `no duplicate t=${sec}`).toBe(before)
      }
      // 전교 호출 1회차(스폰 시계 73~83초): 플레이어가 서 있던 레인(L3, x 1.0~3.2) 양끝(z ±14.5)에서 정확히 10기.
      const lane = callLane.STAGE5_CALL_LANES[playerLane]
      expect(callLaneEntries).toHaveLength(10)
      expect(callLaneEntries.map((entry) => entry.type)).toEqual(['E03', 'E03', 'E03', 'E03', 'E03', 'E03', 'E03', 'E03', 'E07', 'E07'])
      for (const entry of callLaneEntries) {
        expect(entry.x).toBeGreaterThanOrEqual(lane.minX)
        expect(entry.x).toBeLessThanOrEqual(lane.maxX)
        expect(Math.abs(entry.z)).toBeGreaterThanOrEqual(13)
      }
      expect(callLaneEntries.filter((entry) => entry.z < 0)).toHaveLength(5)
      expect(callLaneEntries.filter((entry) => entry.z > 0)).toHaveLength(5)

      // B10 교무회의 소집: Enemy.jsx가 bossSummonQueue에 넣은 요청 1건 → 보스 중심 2.5u 링에 E57·E51·E54.
      // 이전 런(gameKey 다름) 요청은 버린다.
      clearPool(); spy.mockClear()
      summonQueue.pushBossSummon(state.gameKey - 1, 0, 0)
      summonQueue.pushBossSummon(state.gameKey, 0, -6)
      frame(0.016); flush()
      const summoned = spy.mock.calls.map(([, entry]) => entry)
      expect(summoned.map((entry) => entry.type)).toEqual(['E57', 'E51', 'E54'])
      for (const entry of summoned) {
        expect(Math.hypot(entry.x - 0, entry.z + 6)).toBeLessThan(2.5 + 2)
        expect(entry.hp).toBe(Math.round((await import('./Enemy.jsx')).ENEMY_STATS[entry.type].hp * 1.2 ** 4))
      }
      expect(summonQueue.getBossSummonQueueCount()).toBe(0)

      expect(state.spawnBoss).toHaveBeenCalledTimes(1)
      const bosses = specialUpdates.flatMap(update => Array.isArray(update) ? update : []).filter(entry => entry.type === 'B10')
      expect(bosses).toHaveLength(1)
      expect(bosses[0].statOverride.hp).toBe(3241)
      expect(specialUpdates.flatMap(update => Array.isArray(update) ? update : []).filter(entry => entry.type === 'B03')).toHaveLength(0)
      expect(bosses[0].statOverride.hp).toBeGreaterThan(0)
      // Old queued timetable may never cross into a new gameKey.
      clearPool(); spy.mockClear()
      state.elapsedMs = 240_000
      frame(0.016)
      state.gameKey++
      flush()
      expect(spy).not.toHaveBeenCalled()
      const effectStart = effects.length
      refIndex = 0; stateIndex = 0; state.elapsedMs = 5_000
      runtime.default()
      effects[effectStart]()
      frame(0.016); flush()
      // 5초 = E01×9 + E04×2 + E53×1(교무실 개편 §5-1: 오프닝 E01 12 → 9, 자리를 사수 2기에 양보).
      expect(spy.mock.calls).toHaveLength(12)
    } finally {
      for (const cleanup of cleanups.reverse()) cleanup()
      spy?.mockRestore(); clearPool()
      vi.doUnmock('react'); vi.doUnmock('../store/useGameStore.js'); vi.doUnmock('../lib/usePlayingFrame.js'); vi.doUnmock('../lib/spawnCatchUp.js')
      vi.unstubAllGlobals(); vi.resetModules()
    }
  })
})
