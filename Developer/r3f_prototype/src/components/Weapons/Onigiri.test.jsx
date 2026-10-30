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
