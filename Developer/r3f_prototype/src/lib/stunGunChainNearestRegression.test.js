import { afterEach, describe, expect, it, vi } from 'vitest'

// This regression only exercises chain-radius ordering.  Sight obstacles and
// Firebase-backed Studio state are intentionally outside this weapon seam.
vi.mock('../components/StageObjects/stageObjectColliders.js', () => ({
  getStageObjectSightObstacles: () => [],
  isStageObjectSightBlocked: () => false,
}))

import { enemyPool, enemySimulationRuntime, playerPos, resetRuntimeRefs } from './refs.js'
import { pickStunGunChainTarget } from './stunGun.js'
import { findClosestEnemy } from './weaponTargeting.js'

const CHAIN_RANGE = 4.5

function spawnEnemy(x, z) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 10, maxHp: 10 })
  enemyPool.setHitHandler(handle, vi.fn())
  return handle
}

function coordinates(rb) {
  const point = rb.translation()
  return { x: Number(point.x.toFixed(3)), z: Number(point.z.toFixed(3)) }
}

function distance(fromX, fromZ, rb) {
  const point = rb.translation()
  return Number(Math.hypot(point.x - fromX, point.z - fromZ).toFixed(3))
}

afterEach(() => {
  resetRuntimeRefs()
})

describe('StunGun chain nearest-target regression', () => {
  it('invalidates a position-stale grid so the primary bolt selects the current player-nearest enemy', () => {
    playerPos.set(0, 0, 0)
    const currentNearestHandle = spawnEnemy(7, 0)
    const fartherHandle = spawnEnemy(2, 0)
    const currentNearest = enemyPool.get(currentNearestHandle)

    enemySimulationRuntime.grid.rebuild(enemyPool, 10, 10)
    expect(enemyPool.setPosition(currentNearestHandle, 1, 0, 0)).toBe(true)
    expect(enemySimulationRuntime.grid.isCurrentFor(enemyPool)).toBe(false)

    const selected = findClosestEnemy(60, { sightBlocker: () => false })

    expect(selected?.rb).toBe(currentNearest)
    expect(distance(0, 0, selected.rb)).toBe(1)
    expect(distance(0, 0, enemyPool.get(fartherHandle))).toBe(2)
  })

  it('uses the impact point, not the player point, when the grid is unavailable', () => {
    playerPos.set(0, 0, 0)
    const primary = enemyPool.get(spawnEnemy(1, 0))
    const impactNear = enemyPool.get(spawnEnemy(1, 1.5))
    const playerNearImpactFar = enemyPool.get(spawnEnemy(-1.1, 0))

    const selected = pickStunGunChainTarget(1, 0, new Set([primary]), CHAIN_RANGE)

    expect(enemySimulationRuntime.grid.isCurrentFor(enemyPool)).toBe(false)
    expect(selected?.rb).toBe(impactNear)
    expect(distance(1, 0, selected.rb)).toBe(1.5)
    expect(distance(1, 0, playerNearImpactFar)).toBe(2.1)
  })

  it('invalidates a position-stale grid so the chain still selects the impact-nearest unhit enemy', () => {
    playerPos.set(0, 0, 0)
    const primaryHandle = spawnEnemy(1, 0)
    const impactNearHandle = spawnEnemy(7, 0)
    const playerNearImpactFarHandle = spawnEnemy(-1.1, 0)
    const primary = enemyPool.get(primaryHandle)
    const impactNear = enemyPool.get(impactNearHandle)
    const playerNearImpactFar = enemyPool.get(playerNearImpactFarHandle)

    // A grid snapshot precedes this external position update, so its previous
    // cell membership must be invalidated before this chain target search.
    enemySimulationRuntime.grid.rebuild(enemyPool, 10, 10)
    expect(enemySimulationRuntime.grid.isCurrentFor(enemyPool)).toBe(true)
    expect(enemyPool.setPosition(impactNearHandle, 1, 0, 1.5)).toBe(true)
    expect(enemySimulationRuntime.grid.isCurrentFor(enemyPool)).toBe(false)

    const selected = pickStunGunChainTarget(1, 0, new Set([primary]), CHAIN_RANGE)
    const observed = {
      selected: selected ? coordinates(selected.rb) : null,
      selectedImpactDistance: selected ? distance(1, 0, selected.rb) : null,
      selectedPlayerDistance: selected ? distance(0, 0, selected.rb) : null,
      impactNearDistance: distance(1, 0, impactNear),
      impactFarDistance: distance(1, 0, playerNearImpactFar),
      impactNearPlayerDistance: distance(0, 0, impactNear),
      impactFarPlayerDistance: distance(0, 0, playerNearImpactFar),
      gridCurrent: enemySimulationRuntime.grid.isCurrentFor(enemyPool),
    }

    // User-visible contract: the first hit at (1, 0) must chain to (1, 1.5),
    // not the player-nearer but impact-far enemy at (-1.1, 0).
    expect(observed).toEqual({
      selected: { x: 1, z: 1.5 },
      selectedImpactDistance: 1.5,
      selectedPlayerDistance: 1.803,
      impactNearDistance: 1.5,
      impactFarDistance: 2.1,
      impactNearPlayerDistance: 1.803,
      impactFarPlayerDistance: 1.1,
      gridCurrent: false,
    })
  })
})
