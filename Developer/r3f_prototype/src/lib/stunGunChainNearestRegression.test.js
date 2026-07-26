import { readFileSync } from 'node:fs'
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
import { getStunBoltVisualPose } from '../components/Weapons/StunGun.jsx'

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

function extractProjectileFrameBody(source) {
  const projectileStart = source.indexOf('function StunBoltProjectile')
  const callbackStart = source.indexOf('usePlayingFrame((_, delta) => {', projectileStart)
  expect(callbackStart).toBeGreaterThanOrEqual(0)

  const bodyStart = callbackStart + 'usePlayingFrame((_, delta) => {'.length
  let depth = 1
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(bodyStart, index)
  }
  throw new Error('StunBoltProjectile frame callback closing brace was not found')
}

function compileProductionProjectileFrame(source, dependencies) {
  const speed = Number(source.match(/const BOLT_SPEED\s*=\s*(\d+(?:\.\d+)?)/)?.[1])
  expect(speed).toBeGreaterThan(0)
  const body = extractProjectileFrameBody(source)
  const names = [...Object.keys(dependencies), 'BOLT_SPEED', 'getStunBoltVisualPose']
  const values = [...Object.values(dependencies), speed, getStunBoltVisualPose]
  return new Function(...names, `return (delta) => {${body}}`)(...values)
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

  it('keeps the second and third chain on the impact-nearest live generation, not a farther enemy after a pooled slot is reused', () => {
    playerPos.set(0, 0, 0)
    const first = spawnEnemy(1, 0)
    const second = spawnEnemy(2, 0)
    spawnEnemy(2, 1.5)
    const playerNearButImpactFar = spawnEnemy(-0.5, 0)
    const recycledNear = spawnEnemy(4, 0)
    const recycledRb = enemyPool.get(recycledNear)
    const retiredGeneration = recycledRb.generation

    expect(enemyPool.despawn(recycledNear)).toBe(true)
    const recycledCurrent = enemyPool.spawn({ type: 'E01', x: 2.25, y: 0, z: 1 })
    const recycledCurrentRb = enemyPool.get(recycledCurrent)
    enemyPool.setHitHandler(recycledCurrent, vi.fn())
    expect(recycledCurrentRb).toBe(recycledRb)
    expect(recycledCurrentRb.generation).not.toBe(retiredGeneration)

    const firstRb = enemyPool.get(first)
    const secondRb = enemyPool.get(second)
    const hitSet = new Map([[firstRb, firstRb.generation], [recycledRb, retiredGeneration]])

    const secondTarget = pickStunGunChainTarget(1, 0, hitSet, CHAIN_RANGE)
    expect(secondTarget).toMatchObject({ rb: secondRb, generation: secondRb.generation })
    hitSet.set(secondTarget.rb, secondTarget.generation)

    const thirdTarget = pickStunGunChainTarget(2, 0, hitSet, CHAIN_RANGE)
    expect(thirdTarget).toMatchObject({ rb: recycledCurrentRb, generation: recycledCurrentRb.generation })
    expect(thirdTarget.rb).not.toBe(enemyPool.get(playerNearButImpactFar))

    // The production bolt receives this exact live pair for both its moving
    // graphic and applyEnemyHit call; a recycled old generation must not make
    // it skip to a farther target.
    expect(thirdTarget).toEqual({ rb: recycledCurrentRb, generation: recycledCurrentRb.generation })

    const source = readFileSync(new URL('../components/Weapons/StunGun.jsx', import.meta.url), 'utf8')
    const targetPositions = []
    const applyHit = vi.fn(() => true)
    const onHit = vi.fn()
    const runProductionFrame = compileProductionProjectileFrame(source, {
      doneRef: { current: false },
      groupRef: {
        current: {
          position: { set: (x, _y, z) => targetPositions.push({ x, z }) },
          rotation: { set: vi.fn() },
        },
      },
      posRef: { current: { x: 2, z: 0 } },
      ageRef: { current: 0 },
      targetRb: thirdTarget.rb,
      targetGeneration: thirdTarget.generation,
      id: 7,
      onExpire: vi.fn(),
      isEnemyHitLive: (rb, generation) => rb === thirdTarget.rb && generation === thirdTarget.generation,
      applyEnemyHit: applyHit,
      damage: 18,
      critChance: 0.06,
      critMultiplier: 1.5,
      emitSfx: vi.fn(),
      chainDepth: 2,
      onHit,
      sourceEndpoint: { rb: secondRb, generation: secondRb.generation },
      hitSet,
      chainsLeft: 0,
    })

    runProductionFrame(0.1)
    runProductionFrame(0.1)
    runProductionFrame(0.1)

    expect(targetPositions[0]).toMatchObject({ x: expect.any(Number), z: expect.any(Number) })
    expect(targetPositions[0].x).toBeGreaterThan(2)
    expect(targetPositions[0].z).toBeGreaterThan(0)
    expect(applyHit.mock.calls[0].slice(0, 2)).toEqual([thirdTarget.rb, thirdTarget.generation])
    expect(onHit.mock.calls[0].slice(3, 5)).toEqual([thirdTarget.rb, thirdTarget.generation])
  })
})
