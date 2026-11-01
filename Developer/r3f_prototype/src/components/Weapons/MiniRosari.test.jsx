import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 2026-10-30: 오니기리에서 떼어 낸 미니 주인공 분신 발사체(b3fada83 · 3c0bcbe8)를 꼬마 로자리로 옮겼다.
// 아래 검사는 원래 Onigiri.test.jsx가 고정하던 분신 동작을 그대로 이 무기에 건다.
describe('MiniRosariWeapon projectile visual (mini protagonist)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')

  it('renders the real player model chosen by the saved appearance and the run outfit', () => {
    expect(source).toContain('loadSavedPlayerAppearance()')
    expect(source).toContain('outfit: useGameStore.getState().runOutfitId')
    expect(source).toContain('<PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} />')
    expect(source).toContain('<PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />')
    expect(source).toContain('<PlayerMesh movingRef={movingRef} outfit={look.outfit} />')
    expect(source).not.toContain('OnigiiriModel')
  })

  it('keeps one persistent mini player instance per weapon instead of cloning a model per shot', () => {
    expect(source.match(/<MiniRosariModel animateRef=\{miniActiveRef\} \/>/g)).toHaveLength(1)
    expect(source).toContain('visualRef={miniRef}')
    expect(source).toContain('if (projRef.current.length > 0) return')
  })

  it('skips the hidden mini player pose work while no projectile is in flight', () => {
    expect(source).toContain('miniActiveRef.current = true')
    expect(source).toContain('miniActiveRef.current = projRef.current.length > 0')
    for (const file of ['../PlayerV9Model.jsx', '../PlayerRosariModel.jsx']) {
      const model = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(model).toContain('animateRef = null')
      expect(model).toContain('if (animateRef && !animateRef.current) return')
    }
  })

  it('hops toward the target and bounces with the shared pooled-target helper', () => {
    expect(source).toContain('MINI_ROSARI_HOP_HEIGHT')
    expect(source).toContain("rotation.set(0.18, Math.atan2(dx, dz), 0, 'YXZ')")
    expect(source).toContain('isEnemyHitLive(target.rb, target.generation)')
    expect(source).toContain('applyEnemyHit(target.rb, target.generation')
    expect(source).toContain('pickNextOnigiriTarget')
    expect(source).not.toContain('enemyBodies.forEach')
  })

  it('reads its own weapon slot, not onigiri', () => {
    expect(source).toContain('weapons.miniRosari')
    expect(source).not.toContain('weapons.onigiri')
  })

  it('scales the mini player down to a half-size clone', async () => {
    const { MINI_ROSARI_SCALE, MiniRosariWeapon } = await import('./MiniRosari.jsx')
    expect(MINI_ROSARI_SCALE).toBeGreaterThan(0.3)
    expect(MINI_ROSARI_SCALE).toBeLessThan(0.75)
    expect(MiniRosariWeapon).toBeTypeOf('function')
  })

  it('is exported from the weapons barrel and mounted by Game', () => {
    const barrel = readFileSync(new URL('./index.js', import.meta.url), 'utf8')
    const game = readFileSync(new URL('../Game.jsx', import.meta.url), 'utf8')
    expect(barrel).toContain("export { MiniRosariWeapon }")
    expect(game).toContain('<MiniRosariWeapon />')
  })
})

// 2026-11-01 Terry: "미니로자리도 같은 문제 있으면 고쳐" — 표적이 도착 전에 죽으면 예전에는 분신이
// 공중의 현재 위치(posRef)에서 사거리 제한 없이 다시 조준해 맵을 떠돌았다. 이제는 사라지고 주인공 몸에서 다시 나온다.
describe('MiniRosari re-launch origin (2026-11-01)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function MiniRosariProjectile'), source.indexOf('export function MiniRosariWeapon'))
  const weaponSource = source.slice(source.indexOf('export function MiniRosariWeapon'))

  it('never re-aims the clone from its mid-air position when the target is lost', () => {
    expect(projectileSource).not.toContain('from: posRef.current')
    expect(projectileSource).toContain('onDone(id, { bouncesLeft: bouncesRef.current, hitSet: hitSetRef.current })')
  })

  it('every launch, first or re-launch, starts from the current playerPos through the shared onigiri launch builder', () => {
    expect(source).toContain("import { createOnigiriLaunch, pickNextOnigiriTarget } from '../../lib/onigiri.js'")
    expect(weaponSource).not.toContain('start:')
    expect(weaponSource.match(/createOnigiriLaunch\(\{ id: \+\+_miniRosariId, origin: playerPos,/g)).toHaveLength(2)
    expect(weaponSource).toContain('pickNextOnigiriTarget({ from: playerPos, hitSet: relaunch.hitSet')
  })
})

// balanceqa M1 (2026-11-01): 표적을 잃은 프레임과 바운스를 다 쓴 프레임에 분신이 공중에 멈춘 채 1~2프레임 보였다.
describe('MiniRosari clone hides on the frame it ends (balanceqa M1)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function MiniRosariProjectile'), source.indexOf('export function MiniRosariWeapon'))

  it('hides the clone right before both end signals, and keeps the owner-checked unmount safety net', () => {
    expect(projectileSource).toMatch(/hideMiniRosariClone\(groupRef\.current, id\)\s+onDone\(id, \{ bouncesLeft/)
    expect(projectileSource).toContain('doneRef.current = true; hideMiniRosariClone(groupRef.current, id); onDone(id); return')
    expect(projectileSource).not.toMatch(/doneRef\.current = true;?\s+onDone\(id/)
    expect(projectileSource).toMatch(/useEffect\(\(\) => \(\) => \{\s+hideMiniRosariClone\(groupRef\.current, id\)/)
    expect(projectileSource).toMatch(/groupRef\.current\.userData\.miniRosariOwnerId = id\s+groupRef\.current\.visible = true/)
  })

  it('only the projectile that owns the clone can hide it, so a late cleanup never blinks the next clone off', async () => {
    const { hideMiniRosariClone } = await import('./MiniRosari.jsx')
    const group = { visible: true, userData: { miniRosariOwnerId: 2 } }

    hideMiniRosariClone(group, 1) // 늦게 도는 이전 발사체 정리
    expect(group.visible).toBe(true)
    expect(group.userData.miniRosariOwnerId).toBe(2)

    hideMiniRosariClone(group, 2) // 현재 주인이 끝남
    expect(group.visible).toBe(false)
    expect(group.userData.miniRosariOwnerId).toBeNull()

    expect(() => hideMiniRosariClone(null, 2)).not.toThrow()
  })
})
