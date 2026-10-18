import { describe, expect, it, vi } from 'vitest'

// Headless frame/RAF harness: executes production Enemies scheduler and pool drain.
// No WebGL/Rapier renderer and no Firebase network transport are started here.
describe('Stage5 production enemy runtime', () => {
  it('uses the next cumulative HP step for every approved zombie, without changing Stage1–4', async () => {
    const { stageHpOverride, sameTypeZombieHpForStage } = await import('./Enemies.jsx')
    const { ENEMY_STATS } = await import('./Enemy.jsx')
    for (const [type, stats] of Object.entries(ENEMY_STATS)) {
      // Expansion actors have absolute contract HP; they must not inherit legacy cumulative scaling.
      const expansionActor = /^E(?:19|2[0-9]|3[0-3])$|^B0[5-9]$/.test(type)
      expect(stageHpOverride(type, 'stage5')?.hp ?? stats.hp, type).toBe(expansionActor ? stats.hp : Math.round(stats.hp * 1.2 ** 4))
      if (expansionActor) expect(stageHpOverride(type, 'stage5')).toBeUndefined()
      for (const [id, multiplier] of Object.entries({ stage1: 1, stage2: 1.2, stage3: 1.44, stage4: 1.728 })) {
        expect(sameTypeZombieHpForStage(stats.hp, id), `${id}:${type}`).toBe(Math.round(stats.hp * multiplier))
      }
    }
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
      pool = runtimeRefs.enemyPool
      clearPool()
      spy = vi.spyOn(pool, 'spawnInto')
      runtimeRefs.playerPos.set(0, 0, 0)
      runtime.default()
      for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup) }
      const expected = bursts.getRuntimeSpawnEventsForStage('stage5').flatMap(event => {
        if (!bursts.isRepeatingBurstEvent(event)) return [event]
        const expanded = []
        for (let tick = 0; ; tick++) {
          const sec = bursts.repeatingBurstSecAtTick(event, tick)
          if (sec === null) break
          expanded.push({ ...event, sec })
        }
        return expanded
      })
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
        for (const entry of spawned) {
          const { ENEMY_STATS } = await import('./Enemy.jsx')
          expect(entry.hp).toBe(Math.round(ENEMY_STATS[entry.type].hp * 1.2 ** 4))
          expect(entry.maxHp).toBe(entry.hp)
          expect(Math.abs(entry.x)).toBeLessThanOrEqual(7.5)
          expect(Math.abs(entry.z)).toBeLessThanOrEqual(19.2)
        }
        const before = spy.mock.calls.length
        frame(0.016); flush()
        expect(spy.mock.calls.length, `no duplicate t=${sec}`).toBe(before)
      }
      expect(state.spawnBoss).toHaveBeenCalledTimes(1)
      const bosses = specialUpdates.flatMap(update => Array.isArray(update) ? update : []).filter(entry => entry.type === 'B03')
      expect(bosses).toHaveLength(1)
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
      expect(spy.mock.calls).toHaveLength(12)
    } finally {
      for (const cleanup of cleanups.reverse()) cleanup()
      spy?.mockRestore(); clearPool()
      vi.doUnmock('react'); vi.doUnmock('../store/useGameStore.js'); vi.doUnmock('../lib/usePlayingFrame.js'); vi.doUnmock('../lib/spawnCatchUp.js')
      vi.unstubAllGlobals(); vi.resetModules()
    }
  })
})
