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

// 2026-11-01 Terry: "오니기리 움직임이 이상해, 없어지고 다시 생겨나는 오니기리는 반드시 주인공의 몸으로 부터 발사된다."
// 표적이 도착 전에 죽으면 예전에는 주먹밥이 공중의 현재 위치(posRef)에서 사거리 제한 없이 다시 조준해 맵을 떠돌았다.
describe('Onigiri re-launch origin (2026-11-01)', () => {
  const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function OnigiiriProjectile'), source.indexOf('export function OnigiiriWeapon'))
  const weaponSource = source.slice(source.indexOf('export function OnigiiriWeapon'))

  it('never re-aims a projectile from its mid-air position when the target is lost', () => {
    expect(projectileSource).not.toContain('from: posRef.current')
    expect(projectileSource).toContain('onDone(id, { bouncesLeft: bouncesRef.current, hitSet: hitSetRef.current })')
  })

  it('every launch, first or re-launch, starts from the current playerPos through the shared launch builder', () => {
    expect(weaponSource).not.toContain('start:')
    expect(weaponSource.match(/createOnigiriLaunch\(\{ id: \+\+_onigiiriId, origin: playerPos,/g)).toHaveLength(2)
    expect(weaponSource).toContain('pickNextOnigiriTarget({ from: playerPos, hitSet: relaunch.hitSet')
  })
})
