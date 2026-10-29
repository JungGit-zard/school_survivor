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

describe('Onigiri projectile visual (2026-10-28: the projectile is a mini protagonist)', () => {
  const source = readFileSync(new URL('./Onigiri.jsx', import.meta.url), 'utf8')

  it('renders the real player model chosen by the saved appearance and outfit, not the rice ball', () => {
    expect(source).toContain('loadSavedPlayerAppearance()')
    expect(source).toContain('loadPlayerOutfit()')
    expect(source).toContain('<PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} />')
    expect(source).toContain('<PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />')
    expect(source).toContain('<PlayerMesh movingRef={movingRef} outfit={look.outfit} />')
    const projectileSource = source.slice(source.indexOf('function OnigiiriProjectile'), source.indexOf('export function OnigiiriWeapon'))
    expect(projectileSource).not.toContain('<OnigiiriModel />')
  })

  it('keeps one persistent mini player instance per weapon instead of cloning a model per shot', () => {
    expect(source.match(/<OnigiriMiniPlayer animateRef=\{miniActiveRef\} \/>/g)).toHaveLength(1)
    expect(source).toContain('visualRef={miniPlayerRef}')
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

  it('scales the mini player down and keeps the Studio preview rice-ball model exported', async () => {
    const { ONIGIRI_MINI_PLAYER_SCALE, OnigiiriModel } = await import('./Onigiri.jsx')
    expect(ONIGIRI_MINI_PLAYER_SCALE).toBeGreaterThan(0.3)
    expect(ONIGIRI_MINI_PLAYER_SCALE).toBeLessThan(0.75)
    expect(OnigiiriModel).toBeTypeOf('function')
  })
})
