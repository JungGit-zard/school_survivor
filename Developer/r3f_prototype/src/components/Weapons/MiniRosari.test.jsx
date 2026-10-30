import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 2026-10-30: 오니기리에서 떼어 낸 미니 주인공 분신 발사체(b3fada83 · 3c0bcbe8)를 꼬마 로자리로 옮겼다.
// 아래 검사는 원래 Onigiri.test.jsx가 고정하던 분신 동작을 그대로 이 무기에 건다.
describe('MiniRosariWeapon projectile visual (mini protagonist)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')

  it('renders the real player model chosen by the saved appearance and outfit', () => {
    expect(source).toContain('loadSavedPlayerAppearance()')
    expect(source).toContain('loadPlayerOutfit()')
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
