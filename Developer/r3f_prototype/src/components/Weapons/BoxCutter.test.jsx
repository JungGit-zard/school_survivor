import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, enemyPool, playerPos } from '../../lib/refs.js'
import { pickBoxCutterTargets } from '../../lib/boxCutter.js'
import { applyEnemyHit } from '../../lib/weaponCollision.js'

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
  playerPos.set(0, 0, 0)
})

describe('BoxCutterWeapon pool targeting', () => {
  it('uses pool-aware picking and applyEnemyHit instead of raw enemyBodies iteration', () => {
    const source = readFileSync(new URL('./BoxCutter.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('applyEnemyHit')
    expect(source).toContain('pickBoxCutterTargets')
  })

  it('actually damages a pooled standard enemy through pickBoxCutterTargets + applyEnemyHit', () => {
    const hit = vi.fn(() => true)
    const handle = enemyPool.spawn({ type: 'E01', x: 0.04, y: 0, z: 0.62, hp: 10, maxHp: 10 })
    enemyPool.setHitHandler(handle, hit)

    const targets = pickBoxCutterTargets({
      origin: { x: 0, z: 0 },
      facing: { x: 0, z: 1 },
      range: 0.85,
      width: 0.22,
    })

    expect(targets).toHaveLength(1)
    const [{ rb, generation }] = targets
    expect(applyEnemyHit(rb, generation, 7, { source: { x: 0, z: 0 }, knockback: 1.8, knockbackMs: 80 })).toBe(true)
    expect(hit).toHaveBeenCalledWith(7, { source: { x: 0, z: 0 }, knockback: 1.8, knockbackMs: 80 })
  })
})
