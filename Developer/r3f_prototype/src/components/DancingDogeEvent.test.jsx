import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 인게임 도지 비주얼/상호작용 계약을 소스 수준에서 고정한다(렌더 없이 회귀 방지).
// - 요구2: 인게임 스폰 도지는 타이틀 왼쪽 도지와 동일한 twist 춤을 춘다(disco 아님).
// - 요구1: 플레이어 몸통 충돌 시 피해 없이 넉백 — onIntersectionEnter에서 _applyKnockback만 호출.
describe('DancingDogeEvent 소스 계약', () => {
  const source = readFileSync(new URL('./DancingDogeEvent.jsx', import.meta.url), 'utf8')

  it('spawns the in-game doge with the twist dance (matching the title doge)', () => {
    expect(source).toContain('dance="twist"')
    expect(source).not.toContain('dance="disco"')
  })

  it('knocks the player back on body contact with no damage (uses _applyKnockback, never _playerHit)', () => {
    expect(source).toContain('onIntersectionEnter')
    expect(source).toContain('_applyKnockback')
    expect(source).toContain('resolveDogeContactKnockback')
    // 피해 경로(_playerHit/damagePlayer)를 도지 충돌에서 호출하지 않는다.
    expect(source).not.toContain('_playerHit')
    expect(source).not.toContain('damagePlayer')
  })

  it('debounces contact with a knockback cooldown', () => {
    expect(source).toContain('lastKnockbackAt: lastKnockbackAtRef.current')
    expect(source).toContain('lastKnockbackAtRef')
  })

  it('keeps the solid body collider and adds a slightly larger sensor collider', () => {
    expect(source).toContain('args={[0.32 * scale, 0.75 * scale, 0.32 * scale]}')
    expect(source).toContain('args={[0.36 * scale, 0.78 * scale, 0.36 * scale]}')
    expect(source).toContain('sensor')
  })

  it('only applies contact knockback during an active, revealed doge event', () => {
    expect(source).toContain("phase,")
    expect(source).toContain('revealed,')
    expect(source).toContain('alive: !dead.current && !dying')
    expect(source).toContain('playerBody._applyKnockback(knockback.vx, knockback.vz, knockback.durationMs)')
  })
})
