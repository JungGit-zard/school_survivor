import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('OnigiiriWeapon pool targeting', () => {
  it('tracks bounce targets by {rb, generation} instead of re-fetching from enemyBodies by id', () => {
    const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('isEnemyHitLive(target.rb, target.generation)')
    expect(source).toContain('applyEnemyHit(target.rb, target.generation')
    expect(source).toContain('pickNextOnigiriTarget')
  })
})
