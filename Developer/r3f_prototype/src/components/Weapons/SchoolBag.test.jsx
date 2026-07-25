import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('SchoolBagSwing pure sweep', () => {
  it('uses proximity and oriented-box tests without Rapier intersection callbacks', () => {
    const source = readFileSync(new URL('./SchoolBag.jsx', import.meta.url), 'utf8')

    expect(source).toContain('scanRadiusEnemiesInto')
    expect(source).toContain('scanOrientedBoxEnemiesInto')
    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).toContain('applyEnemyHit')
    expect(source).not.toContain('other.rigidBody')
    expect(source).not.toContain('@react-three/rapier')
  })
})
