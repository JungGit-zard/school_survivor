import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { getStunBoltVisualPose } from './StunGun.jsx'

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

function directionStillFacesInitialNearestTarget(pose) {
  const visualLongAxis = new THREE.Vector3(0, 1, 0)
    .applyEuler(new THREE.Euler(pose.x, pose.y, pose.z, pose.order))
  return visualLongAxis.dot(new THREE.Vector3(1, 0, 0)) > 0.999999
}

describe('StunGun nearest-target projectile regression', () => {
  const originalPlayer = { x: playerPos.x, z: playerPos.z }

  afterEach(() => {
    enemyBodies.clear()
    playerPos.set(originalPlayer.x, 0, originalPlayer.z)
  })

  it('does not overshoot the closest target and turn its graphic back toward the player on the next normal frame', () => {
    // Minimal live call-site fixture: player (0, 0), nearest target (1, 0),
    // farther target (2, 0), and the largest delta usePlayingFrame permits.
    playerPos.set(0, 0, 0)
    const nearest = {
      _enemyDead: false,
      _enemyHit: vi.fn(() => true),
      translation: () => ({ x: 1, z: 0 }),
    }
    enemyBodies.set('farther-target', {
      _enemyDead: false,
      _enemyHit: vi.fn(() => true),
      translation: () => ({ x: 2, z: 0 }),
    })
    enemyBodies.set('nearest-target', nearest)

    const selected = findClosestEnemy(60)
    expect(selected?.rb).toBe(nearest)

    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')
    const positions = []
    const poses = []
    const projectileGroup = {
      position: { set: (x, _y, z) => positions.push({ x, z }) },
      rotation: { set: (x, y, z, order) => poses.push({ x, y, z, order }) },
    }
    const runProductionFrame = compileProductionProjectileFrame(source, {
      doneRef: { current: false },
      groupRef: { current: projectileGroup },
      posRef: { current: { x: 0, z: 0 } },
      ageRef: { current: 0 },
      targetRb: selected.rb,
      targetGeneration: selected.generation,
      id: 1,
      onExpire: vi.fn(),
      isEnemyHitLive: () => true,
      applyEnemyHit: vi.fn(),
      damage: 1,
      critChance: 0,
      critMultiplier: 1,
      emitSfx: vi.fn(),
      chainDepth: 0,
      onHit: vi.fn(),
      sourceEndpoint: { isPlayer: true },
      hitSet: new Set([selected.rb]),
      chainsLeft: 0,
    })

    runProductionFrame(0.1)
    runProductionFrame(0.1)

    expect(positions).not.toHaveLength(0)
    let previousX = 0
    for (const { x } of positions) {
      expect(x).toBeGreaterThanOrEqual(previousX)
      expect(x).toBeLessThanOrEqual(1)
      previousX = x
    }
    expect(positions.at(-1)?.x).toBeCloseTo(1, 8)
    expect(poses.every(directionStillFacesInitialNearestTarget)).toBe(true)
  })

  it('keeps the existing 2.5-second playing-time expiry even while travel delta is clamped', () => {
    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')
    const onExpire = vi.fn()
    const doneRef = { current: false }
    const targetRb = {
      _enemyDead: false,
      _enemyHit: vi.fn(() => true),
      translation: () => ({ x: 100, z: 0 }),
    }
    const runProductionFrame = compileProductionProjectileFrame(source, {
      doneRef,
      groupRef: {
        current: {
          position: { set: vi.fn() },
          rotation: { set: vi.fn() },
        },
      },
      posRef: { current: { x: 0, z: 0 } },
      ageRef: { current: 0 },
      targetRb,
      targetGeneration: undefined,
      id: 2,
      onExpire,
      isEnemyHitLive: () => true,
      applyEnemyHit: vi.fn(),
      damage: 1,
      critChance: 0,
      critMultiplier: 1,
      emitSfx: vi.fn(),
      chainDepth: 0,
      onHit: vi.fn(),
      sourceEndpoint: { isPlayer: true },
      hitSet: new Set([targetRb]),
      chainsLeft: 0,
    })

    for (let frame = 0; frame < 26; frame += 1) runProductionFrame(0.1)
    for (let frame = 0; frame < 10; frame += 1) runProductionFrame(0.1)

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(onExpire).toHaveBeenCalledWith(2)
    expect(doneRef.current).toBe(true)
  })
})
