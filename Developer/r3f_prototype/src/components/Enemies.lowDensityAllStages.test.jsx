import { describe, expect, it, vi } from 'vitest'

// Real Enemies hook/frame/RAF + real pool drain. No WebGL/physics/Firebase.
// Isolate timetable elapsedMs=0 and existing catch-up only; no detector,
// schedule queue, batch builder, cap, addEnemies or pool behavior is mocked.
describe('owner population priority in every accepted stage', () => {
  it.each(Array.from({ length: 10 }, (_, i) => `stage${i + 1}`))('%s spawns the whole E07x10+E01x10 batch in one drain after ten active low-density seconds', async (stageId) => {
    const React = await import('react')
    vi.resetModules()
    const refs = [], effects = [], cleanups = [], rafs = []
    let refIndex = 0, frame, rafTick = 0
    const state = { phase: 'playing', currentStageId: stageId, gameKey: 7901, elapsedMs: 0, bossSpawnSec: 150,
      matildaSpawned: false, player: { hp: 100, maxHp: 100, speed: 1 }, weapons: [],
      spawnBoss: vi.fn(), damagePlayer: vi.fn(), recordMissionEvent: vi.fn(), recordMissionEnemyKill: vi.fn() }
    vi.doMock('react', () => ({ ...React,
      useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: value => [value, vi.fn()], useCallback: callback => callback,
      useEffect: callback => effects.push(callback),
    }))
    vi.doMock('../store/useGameStore.js', () => ({ useGameStore: Object.assign(selector => selector(state), { getState: () => state }) }))
    vi.doMock('../lib/usePlayingFrame.js', () => ({ usePlayingFrame: callback => { frame = delta => { if (state.phase === 'playing') callback({}, delta) } } }))
    const catchUp = await import('../lib/spawnCatchUp.js')
    vi.doMock('../lib/spawnCatchUp.js', () => ({ ...catchUp, advanceSpawnCatchUp: vi.fn() }))
    vi.stubGlobal('requestAnimationFrame', callback => { rafs.push(callback); return rafs.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    let pool, spy
    const clearPool = () => { if (pool) for (let i = pool.highestActive; i >= 0; i--) if (pool.active[i]) pool.despawnIndex(i, pool.generation[i]) }
    const flush = () => { let count = 0; while (rafs.length) { expect(++count).toBeLessThan(100); rafTick++; rafs.shift()() } }
    try {
      const runtime = await import('./Enemies.jsx')
      const runtimeRefs = await import('../lib/refs.js')
      const { enemyTypeToCode } = await import('../lib/enemyEntityPool.js')
      pool = runtimeRefs.enemyPool; clearPool(); runtimeRefs.playerPos.set(0, 0, 0)
      runtime.default()
      for (const effect of effects) { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup) }
      // Consume any authored zero-second burst, without advancing active time.
      frame(0); flush(); clearPool()
      const ticks = []
      const original = pool.spawnInto.bind(pool)
      spy = vi.spyOn(pool, 'spawnInto').mockImplementation((...args) => { ticks.push(rafTick); return original(...args) })
      state.phase = 'paused'; frame(100); flush(); expect(pool.activeCount).toBe(0)
      state.phase = 'playing'; frame(9); flush(); expect(pool.activeCount).toBe(0)
      // Four globally living pooled zombies reset the streak (not camera count).
      const handle = { index: -1, generation: 0 }
      for (let i = 0; i < 4; i++) pool.spawnInto(handle, { type: 'E01', x: 0, y: 0, z: 0, hp: 8, maxHp: 8 })
      frame(1); flush(); clearPool(); spy.mockClear(); ticks.length = 0
      frame(9.999); flush(); expect(pool.activeCount).toBe(0)
      frame(0.001)
      // Scheduling alone cannot leak a partial max3/RAF batch.
      expect(pool.activeCount).toBe(0)
      flush()
      expect(spy).toHaveBeenCalledTimes(20)
      expect(pool.activeCount).toBe(20)
      expect(new Set(ticks).size).toBe(1)
      const entries = spy.mock.calls.map(([, entry]) => entry)
      expect(entries.filter(entry => entry.type === 'E07')).toHaveLength(10)
      expect(entries.filter(entry => entry.type === 'E01')).toHaveLength(10)
      expect(entries.every(entry => entry.hp > 0 && entry.maxHp === entry.hp)).toBe(true)
      for (const type of ['E07', 'E01']) expect(Array.from(pool.type).filter((code, i) => pool.active[i] && code === enemyTypeToCode(type))).toHaveLength(10)
      frame(20); flush(); expect(spy).toHaveBeenCalledTimes(20)
      // Queued regular waves reserve the existing cap: 19 remaining slots
      // cannot produce a partial reinforcement batch. Queue helpers are real.
      clearPool(); spy.mockClear()
      const queue = refs.find(ref => ref.current?.spawnDrain)?.current
      const { enqueuePooledEnemySpawn, resetPooledEnemySpawnDrainQueue } = await import('../lib/pooledEnemySpawnDrain.js')
      const cap = runtime.clampZombieSpawnRequest(10_000, {})
      for (let i = 0; i < cap - 19; i++) expect(enqueuePooledEnemySpawn(queue.spawnDrain, { type: 'E01', pos: [0, 0, 0] }, 0)).toBe(true)
      frame(10)
      expect(queue.scheduleCount).toBe(0)
      expect(spy).not.toHaveBeenCalled()
      resetPooledEnemySpawnDrainQueue(queue.spawnDrain); flush()
      frame(0.001)
      // Capacity may disappear between detector and RAF consumer: defer all20.
      for (let i = 0; i < cap - 19; i++) pool.spawnInto(handle, { type: 'E01', x: 0, y: 0, z: 0, hp: 8, maxHp: 8 })
      spy.mockClear(); flush()
      expect(spy).not.toHaveBeenCalled()
      expect(pool.activeCount).toBe(cap - 19)
      clearPool(); frame(0.001); flush()
      expect(spy).toHaveBeenCalledTimes(20)
      expect(pool.activeCount).toBe(20)
      // A newly queued whole batch may not survive a run/account epoch switch.
      frame(0); clearPool(); spy.mockClear(); frame(10); state.gameKey++; flush()
      expect(spy).not.toHaveBeenCalled()
      expect(pool.activeCount).toBe(0)
    } finally {
      for (const cleanup of cleanups.reverse()) cleanup()
      spy?.mockRestore(); clearPool()
      vi.doUnmock('react'); vi.doUnmock('../store/useGameStore.js'); vi.doUnmock('../lib/usePlayingFrame.js'); vi.doUnmock('../lib/spawnCatchUp.js')
      vi.unstubAllGlobals(); vi.resetModules()
    }
  })
})
