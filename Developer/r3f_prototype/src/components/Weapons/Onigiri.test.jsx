import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('OnigiiriWeapon pool targeting', () => {
  it('tracks bounce targets by {rb, generation} instead of re-fetching from enemyBodies by id', () => {
    const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).not.toContain('enemyBodies.get')
    expect(source).toContain('applyEnemyHit(flight.hitTarget.rb, flight.hitTarget.generation')
    expect(source).toContain('stepProjectileSwarm')
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

  // 2026-11-13: 주먹밥은 Studio 튜닝된 OnigiiriModel 템플릿 1벌을 InstancedMesh로 그린다(발사체마다 모델을
  // 만들지 않음). 모양은 여전히 주먹밥 모델 그 자체이고, 발사체는 자기 자세를 인스턴스 슬롯에 쓴다.
  it('every projectile is drawn from the one rice-ball model template, not a player model', () => {
    const weaponSource = source.slice(source.indexOf('export function OnigiiriWeapon'))
    expect(weaponSource.match(/<OnigiiriModel \/>/g)).toHaveLength(1)
    expect(weaponSource).toContain('layers.body.syncTemplate(templateRef.current)')
    expect(weaponSource).not.toContain('<mesh')
    expect(weaponSource).toContain('writeOnigiriPose(layers.body, entry)')
    for (const playerModel of ['PlayerV9Model', 'PlayerRosariModel', 'PlayerMesh', 'loadSavedPlayerAppearance']) {
      expect(source).not.toContain(playerModel)
    }
    expect(source).not.toContain('ONIGIRI_MINI_PLAYER_SCALE')
  })

  it('keeps the tumbling rice-ball flight and the rice-grain burst', () => {
    // 예전 group과 같은 자세: 회전 (sin(spin·0.8)·0.35, spin, cos(spin·0.6)·0.25), 통통 높이.
    expect(source).toContain('_rot.set(Math.sin(spin * 0.8) * 0.35, spin, Math.cos(spin * 0.6) * 0.25)')
    expect(source).toContain('entry.spin += delta * 15')
    // 끝난 주먹밥(바운스 소진·대기 시간·상한)은 그 자리에서 쌀알 터짐.
    expect(source).toContain('addBurst(entry.flight.x, entry.flight.z, nowRef.current)')
    expect(source).toContain('createOnigiriBurstGrains({ id, x, z, count: ONIGIRI_BURST_GRAINS })')
    expect(source).toContain('now - bursts[i].startMs < ONIGIRI_BURST_LIFE_MS')
  })

  // 리뷰 F2: 일시정지 중 한 Studio Apply도 바로 보이도록 템플릿 동기화는 게임 루프(usePlayingFrame) 밖에서 돈다.
  it('syncs the Studio template outside the playing gate, before the game loop', () => {
    const weaponSource = source.slice(source.indexOf('export function OnigiiriWeapon'))
    const syncAt = weaponSource.indexOf('layers.body.syncTemplate(templateRef.current)')
    const ungatedFrameAt = weaponSource.indexOf('useFrame(() => {')
    const playingAt = weaponSource.indexOf('usePlayingFrame(')
    expect(ungatedFrameAt).toBeGreaterThan(-1)
    expect(syncAt).toBeGreaterThan(ungatedFrameAt)
    expect(syncAt).toBeLessThan(playingAt)
    expect(weaponSource.match(/syncTemplate\(/g)).toHaveLength(1)
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
  const projectileSource = source.slice(source.indexOf('function hitOnigiriTarget'), source.indexOf('export function OnigiiriWeapon'))
  const weaponSource = source.slice(source.indexOf('export function OnigiiriWeapon'))

  it('the projectile follows the shared flight stepper and never ends early to relaunch from the player', () => {
    expect(source).toContain('createProjectileSwarm({ speed: SPEED')
    expect(weaponSource).toContain('stepProjectileSwarm(swarm, delta, { onHit: hitOnigiriTarget, onRetire: retireRef.current })')
    // 코드에서 playerPos는 새 투척의 출발점으로만 쓴다(주석 제외).
    expect(weaponSource.split('\n').filter((line) => !line.trim().startsWith('//') && line.includes('playerPos'))).toEqual(['        origin: playerPos,'])
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
    expect(weaponSource).not.toContain('swarm.entries.length >=')
    expect(weaponSource).toContain('const entry = addSwarmProjectile(swarm, launch, { slot: layers.body.claim(), spin: 0 })')
  })
})
