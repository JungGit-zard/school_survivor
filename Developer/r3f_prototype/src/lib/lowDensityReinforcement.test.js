import { describe, it, expect } from 'vitest'
import * as reinforcement from './lowDensityReinforcement.js'

const tick = (state, deltaSec, options = {}) => reinforcement.advanceLowDensityReinforcement(state, {
  phase: 'playing', stageId: 'stage1', gameKey: 1, aliveEnemyCount: 3,
  queuedEnemyCount: 0, deltaSec, ...options,
})

describe('global low-density reinforcement', () => {
  it.each([0, 1, 2, 3])('requests exactly E07 ten + E01 ten at 10 active seconds with %i alive', (aliveEnemyCount) => {
    const state = reinforcement.createLowDensityReinforcementState()
    expect(tick(state, 9.999, { aliveEnemyCount }).shouldSpawn).toBe(false)
    const result = tick(state, 0.001, { aliveEnemyCount })
    expect(result.shouldSpawn).toBe(true)
    expect(result.entries).toEqual([{ type: 'E07', count: 10 }, { type: 'E01', count: 10 }])
  })
  it('does not accumulate intermittent lows or substitute a visible count', () => {
    const state = reinforcement.createLowDensityReinforcementState()
    tick(state, 9)
    tick(state, 1, { aliveEnemyCount: 4, visibleEnemyCount: 0 })
    expect(tick(state, 9.9).shouldSpawn).toBe(false)
    expect(tick(state, 0.1).shouldSpawn).toBe(true)
  })
  it.each(['paused', 'levelup', 'gameover', 'clear'])('excludes %s time', (phase) => {
    const state = reinforcement.createLowDensityReinforcementState()
    tick(state, 6)
    tick(state, 100, { phase })
    expect(tick(state, 3.9).shouldSpawn).toBe(false)
    expect(tick(state, 0.1).shouldSpawn).toBe(true)
  })
  it('ignores pending-removal count because the caller supplies actual alive zombies', () => {
    const state = reinforcement.createLowDensityReinforcementState()
    expect(tick(state, 10, { pendingRemovalEnemyCount: 20 }).shouldSpawn).toBe(true)
  })
  it('holds a single request until acknowledged, then requires a fresh streak', () => {
    const state = reinforcement.createLowDensityReinforcementState()
    expect(tick(state, 10).shouldSpawn).toBe(true)
    expect(tick(state, 100).shouldSpawn).toBe(false)
    reinforcement.finishLowDensityReinforcement(state)
    expect(tick(state, 9.99).shouldSpawn).toBe(false)
    expect(tick(state, 0.01).shouldSpawn).toBe(true)
  })
  it.each([0, 7, 10, 19, NaN, Infinity])('retains readiness without partial delivery with %s slots', (availableSpawnSlots) => {
    const state = reinforcement.createLowDensityReinforcementState()
    expect(tick(state, 10, { availableSpawnSlots }).shouldSpawn).toBe(false)
    expect(state.lowForSec).toBe(10)
    expect(state.pending).toBe(false)
    expect(tick(state, 0.1, { availableSpawnSlots }).shouldSpawn).toBe(false)
    const result = tick(state, 0.01, { availableSpawnSlots: 20, queuedEnemyCount: 5 })
    expect(result.entries).toEqual([{ type: 'E07', count: 10 }, { type: 'E01', count: 10 }])
    expect(result.shouldSpawn).toBe(true)
    expect(tick(state, 10).shouldSpawn).toBe(false)
  })
  it.each([1, 5])('unrelated queue %i does not suppress or reset the streak with capacity', (queuedEnemyCount) => {
    const state = reinforcement.createLowDensityReinforcementState()
    tick(state, 9, { queuedEnemyCount })
    expect(state.lowForSec).toBe(9)
    const result = tick(state, 1, { queuedEnemyCount, availableSpawnSlots: 140 })
    expect(result.shouldSpawn).toBe(true)
    expect(result.entries).toEqual([{ type: 'E07', count: 10 }, { type: 'E01', count: 10 }])
    expect(tick(state, 10, { queuedEnemyCount }).shouldSpawn).toBe(false)
  })
  it.each([{ stageId: 'stage2' }, { gameKey: 2 }])('resets identity changes %j', (options) => {
    const state = reinforcement.createLowDensityReinforcementState()
    tick(state, 9)
    expect(tick(state, 1, options).shouldSpawn).toBe(false)
    expect(tick(state, 9, options).shouldSpawn).toBe(true)
    reinforcement.resetLowDensityReinforcementState(state)
    expect(tick(state, 9, options).shouldSpawn).toBe(false)
  })
  it('handles fixed steps without losing the exact ten-second boundary', () => {
    const state = reinforcement.createLowDensityReinforcementState()
    for (let i = 0; i < 599; i++) expect(tick(state, 1 / 60).shouldSpawn).toBe(false)
    expect(tick(state, 1 / 60).shouldSpawn).toBe(true)
  })
  it.each([NaN, Infinity, -1])('does not advance invalid delta %s', (delta) => {
    const state = reinforcement.createLowDensityReinforcementState()
    expect(tick(state, delta).shouldSpawn).toBe(false)
    expect(tick(state, 9.9).shouldSpawn).toBe(false)
  })
})
