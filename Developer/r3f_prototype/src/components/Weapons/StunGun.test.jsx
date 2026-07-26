import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StunGunWeapon pool targeting', () => {
  it('uses pool-aware targeting instead of raw enemyBodies iteration for both fire and chain', () => {
    const source = readFileSync(new URL('./StunGun.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('findClosestEnemy(STUN_GUN_TARGET_RANGE)')
    expect(source).toContain('pickStunGunChainTarget')
    expect(source).toContain('isEnemyHitLive(targetRb, targetGeneration)')
    expect(source).toContain('applyEnemyHit(targetRb, targetGeneration')
    // 볼트/체인은 여러 프레임에 걸쳐 타깃을 추적하므로 {rb, generation}을 보관해야 한다 —
    // enemyId로 재조회(enemyBodies.get)하면 pooled 프록시에는 통하지 않는다.
    expect(source).toContain('targetRb')
    expect(source).toContain('targetGeneration')
  })
})
