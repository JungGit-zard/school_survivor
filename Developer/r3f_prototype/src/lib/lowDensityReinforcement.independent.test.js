import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { countAliveSpecialZombies, buildLowDensityReinforcementBatch, countPendingZombieSchedules, clampZombieSpawnRequest, stageHpOverride } from '../components/Enemies.jsx'
import { getStageBounds } from './stageConfig.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
import { playerPos } from './refs.js'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { createPooledEnemySpawnDrainQueue, enqueuePooledEnemySpawn, drainPooledEnemySpawnQueue } from './pooledEnemySpawnDrain.js'
import {
  advanceLowDensityReinforcement as advance,
  createLowDensityReinforcementState as create,
  finishLowDensityReinforcement as finish,
  resetLowDensityReinforcementState as reset,
} from './lowDensityReinforcement.js'

describe('Team B independent runtime boundary audit', () => {
  it('global pooled count includes offscreen zombies and drops despawned zombies', () => {
    const pool = createEnemyEntityPool()
    const handles = Array.from({ length: 4 }, () => pool.spawn({ type: 'E01', x: 999, y: 0, z: 999, hp: 8, maxHp: 8 }))
    expect(step(create(), { aliveEnemyCount: pool.activeCount, deltaSec: 10 }).shouldSpawn).toBe(false)
    pool.despawn(handles[0])
    expect(step(create(), { aliveEnemyCount: pool.activeCount, deltaSec: 10 }).entries).toEqual(expected)
  })
  it('special count includes unrevealed boss/Matilda but excludes removals/dead/invalid/nonzombie', () => {
    const entries = [
      { id: 'boss', type: 'B02' }, { id: 'matilda', type: 'B01', isMatilda: true },
      { id: 'removed', type: 'B03' }, { id: 'dead', type: 'B01' },
      { id: 'invalid', type: 'B04' }, { id: 'doge', type: 'DOGE' },
    ]
    const bodies = new Map([
      ['boss', { translation: () => ({ x: 999, z: 999 }), isValid: () => true }],
      ['dead', { _enemyDead: true }], ['invalid', { isValid: () => false }],
    ])
    expect(countAliveSpecialZombies(entries, ['removed'], bodies)).toBe(2)
  })
  it.each(['stage1', 'stage2', 'stage3', 'stage4'])('%s safe batch contains ten actual E07 and ten E01', (id) => {
    const prior = playerPos.clone()
    try {
      playerPos.set(0, 0, 0)
      let seed = 17
      const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
      const batch = buildLowDensityReinforcementBatch({ id, bounds: getStageBounds(id), obstacles: getStageObjectSightObstacles(id) }, 20, random)
      expect(batch).toHaveLength(20)
      expect(batch.filter(e => e.type === 'E07')).toHaveLength(10)
      expect(batch.filter(e => e.type === 'E01')).toHaveLength(10)
      expect(new Set(batch.map(e => e.id)).size).toBe(20)
      for (const entry of batch) expect(entry.statOverride).toEqual(stageHpOverride(entry.type, id))
    } finally { playerPos.copy(prior) }
  })
  it('pending ring wrap counts reinforcement and dominance but excludes gold', () => {
    expect(countPendingZombieSchedules({ scheduleKind: Uint8Array.from([9, 1, 0, 8]), scheduleRead: 3, scheduleCount: 3 })).toBe(2)
  })
  it('global cap reserves existing pooled queue, not only alive zombies', () => {
    expect(clampZombieSpawnRequest(20, { pooledActive: 2, specialActive: 1, pooledQueued: 137 })).toBe(10)
  })
  it('existing drain demonstrates why deferred twenty is not immediate twenty', () => {
    const queue = createPooledEnemySpawnDrainQueue()
    for (let i = 0; i < 20; i += 1) enqueuePooledEnemySpawn(queue, { type: i < 10 ? 'E07' : 'E01' }, 1)
    const received = []
    const result = drainPooledEnemySpawnQueue(queue, 1, entry => { received.push(entry); return true })
    expect(result).toEqual({ consumed: 3, spawned: 3, remaining: 17 })
    expect(received.every(e => e.type === 'E07')).toBe(true)
  })
  it('source-wiring check: low-density dispatch must not defer its twenty zombies through max3 per RAF', () => {
    // Static wiring evidence only: this does not claim browser/RAF execution.
    const source = readFileSync(new URL('../components/Enemies.jsx', import.meta.url), 'utf8')
    const start = source.indexOf('} else if (kind === SCHEDULE_LOW_DENSITY_REINFORCEMENT)')
    expect(start).toBeGreaterThan(-1)
    const branch = source.slice(start, source.indexOf('} else if (kind === SCHEDULE_DOMINANCE_SWARM)', start))
    expect(branch).not.toMatch(/addEnemies\(batch,\s*true/)
  })
})

// Team B: owner requirement oracle, not implementation-derived expectations.
const expected = [{ type: 'E07', count: 10 }, { type: 'E01', count: 10 }]
const step = (state, options = {}) => advance(state, {
  phase: 'playing', stageId: 'stage1', gameKey: 1,
  aliveEnemyCount: 3, deltaSec: 1, ...options,
})

describe('Team B independent global low-density contract', () => {
  it.each([0, 1, 2, 3])('alive=%i fires exactly at ten playing seconds', (aliveEnemyCount) => {
    const state = create()
    expect(step(state, { aliveEnemyCount, deltaSec: 9.999 }).shouldSpawn).toBe(false)
    expect(step(state, { aliveEnemyCount, deltaSec: 0.001 })).toEqual({ shouldSpawn: true, entries: expected })
  })
  it('four living zombies interrupt the continuous streak', () => {
    const state = create()
    step(state, { deltaSec: 9 })
    expect(step(state, { aliveEnemyCount: 4, deltaSec: 0.01 }).shouldSpawn).toBe(false)
    expect(step(state, { deltaSec: 9.999 }).shouldSpawn).toBe(false)
    expect(step(state, { deltaSec: 0.001 }).entries).toEqual(expected)
  })
  it('sustained high density never fires', () => {
    expect(step(create(), { aliveEnemyCount: 4, deltaSec: 100 }).shouldSpawn).toBe(false)
  })
  it.each(['pause', 'paused', 'levelup', 'gameover', 'clear', 'title'])('%s does not advance playing time', (phase) => {
    const state = create()
    step(state, { deltaSec: 9 })
    expect(step(state, { phase, deltaSec: 1000 }).shouldSpawn).toBe(false)
    expect(step(state).entries).toEqual(expected)
  })
  it.each([{ stageId: 'stage2' }, { gameKey: 2 }])('identity change %j resets the old streak', (identity) => {
    const state = create()
    step(state, { deltaSec: 9 })
    expect(step(state, { ...identity }).shouldSpawn).toBe(false)
    expect(step(state, { ...identity, deltaSec: 9 }).entries).toEqual(expected)
  })
  it('explicit reset discards both pending and elapsed state', () => {
    const state = create()
    step(state, { deltaSec: 10 })
    reset(state)
    expect(step(state, { deltaSec: 9 }).shouldSpawn).toBe(false)
    expect(step(state).entries).toEqual(expected)
  })
  it('pending dispatch cannot double-fire, but a consumed reinforcement can recur', () => {
    const state = create()
    expect(step(state, { deltaSec: 10 }).entries).toEqual(expected)
    expect(step(state, { deltaSec: 100 }).shouldSpawn).toBe(false)
    finish(state)
    expect(step(state, { deltaSec: 9.999 }).shouldSpawn).toBe(false)
    expect(step(state, { deltaSec: 0.001 }).entries).toEqual(expected)
  })
  it.each([0, -1, NaN, Infinity])('invalid delta=%s cannot manufacture elapsed time', (deltaSec) => {
    const state = create()
    step(state, { deltaSec: 9 })
    expect(step(state, { deltaSec }).shouldSpawn).toBe(false)
    expect(step(state).entries).toEqual(expected)
  })
  it('600 fixed steps fire exactly once without a grace delay', () => {
    const state = create()
    for (let i = 0; i < 599; i += 1) expect(step(state, { deltaSec: 1 / 60 }).shouldSpawn).toBe(false)
    expect(step(state, { deltaSec: 1 / 60 }).entries).toEqual(expected)
  })
  it.each(['stage1', 'stage2', 'stage3', 'stage4'])('%s payload never substitutes mixed/tanker/overtime types', (stageId) => {
    expect(step(create(), { stageId, deltaSec: 10 }).entries).toEqual(expected)
  })
  it('spawn-clock offsets and dominance conditions cannot shorten or veto the timer', () => {
    const state = create()
    const unrelated = { offsetSec: 5000, spawnSec: 9000, currentHp: 1, isBossActive: true, isSpecialPatternActive: true }
    expect(step(state, { ...unrelated, deltaSec: 9 }).shouldSpawn).toBe(false)
    expect(step(state, unrelated).entries).toEqual(expected)
  })
  // Pending requests are not living zombies. Existing queue work must not erase
  // elapsed low-density time if there is enough global cap for the exact 20.
  it('pending spawn requests do not reset a real low-alive streak when twenty slots remain', () => {
    const state = create()
    step(state, { deltaSec: 9 })
    expect(step(state, { queuedEnemyCount: 1, availableSpawnSlots: 146 }).entries).toEqual(expected)
  })
  it('persistent pending requests are not miscounted as living zombies', () => {
    expect(step(create(), { queuedEnemyCount: 5, availableSpawnSlots: 142, deltaSec: 10 }).entries).toEqual(expected)
  })
  it.each([0, 1, 10, 19])('cap slots=%i retains the due full wave until twenty slots exist', (availableSpawnSlots) => {
    const state = create()
    expect(step(state, { availableSpawnSlots, deltaSec: 10 })).toEqual({ shouldSpawn: false, entries: [] })
    expect(state.pending).toBe(false)
    expect(state.lowForSec).toBe(10)
    expect(step(state, { availableSpawnSlots: 20, deltaSec: 0.001 }).entries).toEqual(expected)
    expect(step(state, { availableSpawnSlots: 20, deltaSec: 100 }).shouldSpawn).toBe(false)
  })
  it.each([127, 128, 147])('cap150 counts pooled queue=%i independently of alive=3', (pooledQueued) => {
    const availableSpawnSlots = clampZombieSpawnRequest(20, { pooledActive: 2, specialActive: 1, pooledQueued })
    const state = create()
    const result = step(state, { queuedEnemyCount: pooledQueued, availableSpawnSlots, deltaSec: 10 })
    expect(result).toEqual(availableSpawnSlots === 20 ? { shouldSpawn: true, entries: expected } : { shouldSpawn: false, entries: [] })
  })
  it('restart discards an undelivered cap-blocked streak', () => {
    const state = create()
    step(state, { availableSpawnSlots: 0, deltaSec: 10 })
    expect(step(state, { gameKey: 2, availableSpawnSlots: 20, deltaSec: 0.001 }).shouldSpawn).toBe(false)
    expect(step(state, { gameKey: 2, deltaSec: 9.999 }).entries).toEqual(expected)
  })
  it('insufficient cap does not silently turn the promised exact payload into E07-only partial success', () => {
    const result = step(create(), { availableSpawnSlots: 10, deltaSec: 10 })
    if (result.shouldSpawn) expect(result.entries).toEqual(expected)
    else expect(result.entries).toEqual([]) // documented cap blocker, not full success
  })
})
