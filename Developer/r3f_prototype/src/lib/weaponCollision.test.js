import { describe, expect, it, vi } from 'vitest'
import {
  applyEnemyHit,
  captureEnemyGeneration,
  isEnemyHitLive,
  isPointInOrientedBox2D,
  isPointInSweptCapsule2D,
} from './weaponCollision.js'

describe('weapon pooled-enemy collision contract', () => {
  it('captures generation and rejects a reused pooled slot before calling its new handler', () => {
    const hit = vi.fn(() => true)
    const pooled = { index: 4, generation: 7, _enemyDead: false, _enemyHit: hit, translation: () => ({ x: 0, z: 0 }) }
    const generation = captureEnemyGeneration(pooled)

    pooled.generation = 8
    expect(isEnemyHitLive(pooled, generation)).toBe(false)
    expect(applyEnemyHit(pooled, generation, 5, {})).toBe(false)
    expect(hit).not.toHaveBeenCalled()
  })

  it('passes generation as the third pooled hit argument but preserves legacy two-argument hits', () => {
    const pooledHit = vi.fn(() => true)
    const pooled = { index: 1, generation: 3, _enemyDead: false, _enemyHit: pooledHit, translation: () => ({ x: 0, z: 0 }) }
    const legacyHit = vi.fn(() => true)
    const legacy = { _enemyDead: false, _enemyHit: legacyHit, translation: () => ({ x: 0, z: 0 }) }

    expect(applyEnemyHit(pooled, captureEnemyGeneration(pooled), 4, { critChance: 0.1 })).toBe(true)
    expect(pooledHit).toHaveBeenCalledWith(4, { critChance: 0.1 }, 3)
    expect(applyEnemyHit(legacy, captureEnemyGeneration(legacy), 4, {})).toBe(true)
    expect(legacyHit).toHaveBeenCalledWith(4, {})
  })
})

describe('pure weapon volumes', () => {
  it('hits a point swept between frames and excludes points outside its capsule', () => {
    expect(isPointInSweptCapsule2D(0, 0, 4, 0, 0.3, 2, 0.25)).toBe(true)
    expect(isPointInSweptCapsule2D(0, 0, 4, 0, 0.3, 2, 0.31)).toBe(false)
  })

  it('uses an oriented box for melee swing contact', () => {
    expect(isPointInOrientedBox2D(0, 1, 0, 0.4, 0.3, 0.3, 1.2)).toBe(true)
    expect(isPointInOrientedBox2D(0, 1, 0, 0.4, 0.3, 0.5, 1.2)).toBe(false)
  })
})
