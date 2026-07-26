import { afterEach, describe, expect, it } from 'vitest'
import { PENCIL_FIRE_RANGE_WORLD_UNITS } from './gameplayUnits.js'
import { enemyBodies, enemyPool, playerPos } from './refs.js'
import { createWeaponTargetScratch, scanClosestEnemiesInto } from './weaponTargeting.js'

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
  playerPos.set(0, 0, 0)
})

describe('Pencil firing circle boundary', () => {
  it('includes a pooled target at 2.25, excludes epsilon outside, and respects sight blocking', () => {
    const edge = enemyPool.spawn({
      type: 'E01',
      x: PENCIL_FIRE_RANGE_WORLD_UNITS,
      y: 0,
      z: 0,
      hp: 10,
      maxHp: 10,
    })
    enemyPool.spawn({
      type: 'E01',
      x: PENCIL_FIRE_RANGE_WORLD_UNITS + 0.000001,
      y: 0,
      z: 0,
      hp: 10,
      maxHp: 10,
    })
    const scratch = createWeaponTargetScratch(3)

    expect(scanClosestEnemiesInto(scratch, PENCIL_FIRE_RANGE_WORLD_UNITS, 3)).toBe(1)
    expect(scratch.indices[0]).toBe(edge.index)
    expect(scanClosestEnemiesInto(scratch, PENCIL_FIRE_RANGE_WORLD_UNITS, 3, () => true)).toBe(0)
  })
})
