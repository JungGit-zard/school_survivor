import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('OnigiiriWeapon pool targeting', () => {
  it('tracks bounce targets by {rb, generation} instead of re-fetching from enemyBodies by id', () => {
    const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('applyEnemyHit(flight.hitTarget.rb, flight.hitTarget.generation')
    expect(source).toContain('stepOnigiriFlight')
    // 표적 생존 확인·다음 표적 찾기는 공용 진행기가 {rb, generation}으로 한다.
    const lib = readFileSync(new URL('../../lib/onigiri.js', import.meta.url), 'utf8')
    expect(lib).toContain('isEnemyHitLive(current.rb, current.generation)')
    expect(lib).not.toContain('enemyBodies.get')
  })
})

// 2026-10-30 Terry: "오니기리가 지금 작은 로자리가 나간다" — 오니기리는 다시 주먹밥을 던진다.
// 미니 주인공 분신 발사체는 별도 무기 꼬마 로자리(MiniRosari.jsx)로 옮겼다.
describe('Onigiri projectile visual (2026-10-30: back to the rice ball)', () => {
  const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')

  it('each projectile renders the rice-ball model, not a player model', () => {
    const projectileSource = source.slice(source.indexOf('function OnigiiriProjectile'), source.indexOf('export function OnigiiriWeapon'))
    expect(projectileSource).toContain('<OnigiiriModel />')
    for (const playerModel of ['PlayerV9Model', 'PlayerRosariModel', 'PlayerMesh', 'loadSavedPlayerAppearance']) {
      expect(source).not.toContain(playerModel)
    }
    expect(source).not.toContain('ONIGIRI_MINI_PLAYER_SCALE')
  })

  it('keeps the tumbling rice-ball flight and the rice-grain burst', () => {
    const projectileSource = source.slice(source.indexOf('function OnigiiriProjectile'), source.indexOf('export function OnigiiriWeapon'))
    expect(projectileSource).toContain('groupRef.current.rotation.y  = spinRef.current')
    expect(source).toContain('<OnigiriBurst key={burst.id} {...burst} onDone={removeBurst} />')
  })

  it('still exports the rice-ball model for the Graphics Studio preview', async () => {
    const { OnigiiriModel } = await import('./Onigiri.jsx')
    expect(OnigiiriModel).toBeTypeOf('function')
  })
})

// 2026-11-02 Terry 확정: 새 투척은 언제나 로자리 몸에서, 상한 없이. 바운스가 남은 주먹밥은 사라지지 않고
// 공용 진행기(stepOnigiriFlight)로 그 자리에서 다음 적을 찾거나 떠서 기다린다(동작 검증은 lib/onigiri.test.js).
describe('Onigiri launch origin and flight wiring (2026-11-02)', () => {
  const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function OnigiiriProjectile'), source.indexOf('export function OnigiiriWeapon'))
  const weaponSource = source.slice(source.indexOf('export function OnigiiriWeapon'))

  it('the projectile follows the shared flight stepper and never ends early to relaunch from the player', () => {
    expect(projectileSource).toContain('stepOnigiriFlight(flight, delta, SPEED)')
    expect(projectileSource).not.toMatch(/onDone\(id, \{/)
    expect(projectileSource).not.toContain('playerPos')
    expect(source).not.toContain('relaunch')
  })

  it('every new throw starts from the current playerPos through the shared frame planner', () => {
    expect(weaponSource).not.toContain('start:')
    expect(weaponSource).not.toContain('createOnigiriLaunch')
    expect(weaponSource.match(/planOnigiriFrame\(/g)).toHaveLength(1)
    expect(weaponSource).toContain('origin: playerPos,')
  })

  // 2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려" — 날거나 떠 있는 주먹밥 수로 투척을 막지 않는다.
  it('has no one-at-a-time gate: alive projectiles never block the cooldown throw', () => {
    expect(weaponSource).not.toContain('if (projRef.current.length > 0) return')
    expect(weaponSource).toContain('projRef.current = [...projRef.current, launch]')
  })
})
