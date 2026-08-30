import { describe, expect, it } from 'vitest'
import {
  createDominanceSwarmSpawnPlan,
  createDominanceSwarmState,
  evaluateDominanceSwarm,
  recordDominanceSwarmSpawn,
  recordEmptyField,
  recordEnemyKill,
  recordPlayerDamage,
} from './dominanceSwarmRespawn.js'

describe('Dominance Swarm Respawn', () => {
  it('spawns weak bonus enemies when the player is safely dominating an empty field', () => {
    const state = createDominanceSwarmState()
    for (let i = 0; i < 8; i += 1) recordEnemyKill(state, 16_000 + i * 500)
    recordEmptyField(state, 20_000)
    recordEmptyField(state, 22_000)

    const result = evaluateDominanceSwarm(state, {
      nowMs: 26_000,
      currentHp: 90,
      maxHp: 100,
      activeEnemyCount: 1,
      queuedEnemyCount: 0,
      stageId: 'stage1',
    })

    expect(result.shouldSpawn).toBe(true)
    expect(result.reason).toBe('dominant-player')
    expect(result.spawnCount).toBeGreaterThanOrEqual(6)
    expect(result.dominanceScore).toBeGreaterThanOrEqual(2.2)
  })


  it('adds weak bonus enemies even when domination is expressed by an empty screen, not only kill count', () => {
    const state = createDominanceSwarmState()
    recordEmptyField(state, 20_000)
    recordEmptyField(state, 22_000)

    const result = evaluateDominanceSwarm(state, {
      nowMs: 24_000,
      currentHp: 100,
      maxHp: 100,
      activeEnemyCount: 0,
      queuedEnemyCount: 0,
      stageId: 'stage1',
    })

    expect(result.shouldSpawn).toBe(true)
    expect(result.reason).toBe('dominant-player')
    expect(result.spawnCount).toBe(6)
    expect(result.recentEmptyFieldCount).toBe(2)
  })

  it('does not punish weak or recently damaged players', () => {
    const state = createDominanceSwarmState()
    for (let i = 0; i < 10; i += 1) recordEnemyKill(state, 16_000 + i * 400)
    recordEmptyField(state, 20_000)
    recordEmptyField(state, 22_000)
    recordPlayerDamage(state, 30, 24_000)

    expect(evaluateDominanceSwarm(state, { nowMs: 27_000, currentHp: 80, maxHp: 100, activeEnemyCount: 0 }).reason).toBe('recent-damage')
  })

  it('respects cooldowns and active enemy cap', () => {
    const state = createDominanceSwarmState()
    for (let i = 0; i < 12; i += 1) recordEnemyKill(state, 16_000 + i * 300)
    recordEmptyField(state, 20_000)
    recordEmptyField(state, 22_000)
    recordDominanceSwarmSpawn(state, 24_000)

    expect(evaluateDominanceSwarm(state, { nowMs: 27_000, currentHp: 100, maxHp: 100, activeEnemyCount: 0 }).reason).toBe('spawn-cooldown')

    state.lastSpawnMs = -Infinity
    state.lastEvaluateMs = -Infinity
    expect(evaluateDominanceSwarm(state, { nowMs: 28_000, currentHp: 100, maxHp: 100, activeEnemyCount: 70 }).reason).toBe('active-cap')
  })

  it('creates stage-appropriate weak spawn plans without special or boss types', () => {
    const seq = [0, 0.49, 0.75, 0.99]
    let n = 0
    const plan = createDominanceSwarmSpawnPlan({ spawnCount: 4 }, { stageId: 'stage2' }, () => seq[n++ % seq.length])
    expect(plan).toHaveLength(4)
    expect(plan.every((entry) => ['E01', 'E02'].includes(entry.type))).toBe(true)
    expect(plan.every((entry) => entry.source === 'dominance-swarm')).toBe(true)
  })
})
