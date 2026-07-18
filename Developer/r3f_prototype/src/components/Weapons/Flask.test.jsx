import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ScienceFlaskSplash zone payload', () => {
  it('passes chemical zone stats from the projectile into the explosion payload', () => {
    const source = readFileSync(new URL('./Flask.jsx', import.meta.url), 'utf8')

    expect(source).toContain('zoneRadius, zoneDurationMs, zoneTickDamage')
    expect(source).toContain('zoneRadius, zoneDurationMs, zoneTickDamage, critChance, critMultiplier })')
  })

  it('keeps the chemical puddle just above the floor and below character outlines', () => {
    const source = readFileSync(new URL('./Flask.jsx', import.meta.url), 'utf8')

    expect(source).toContain('position={[0, 0.012, 0]} renderOrder={1}')
    expect(source).toContain('position={[0, 0.014, 0]} renderOrder={2}')
  })

  it('plays one landing sound and only plays a puddle tick sound when damage hits', () => {
    const source = readFileSync(new URL('./Flask.jsx', import.meta.url), 'utf8')

    expect(source).toMatch(/const hitCount = applyRadialDamage\(\{ x, z, radius, damage: tickDamage[\s\S]*?if \(hitCount > 0\) emitSfx\(\{ id: 'flaskTick', volume: 0\.18 \}\)/)
    expect(source).toMatch(/const explode = useCallback[\s\S]*?emitSfx\(\{ id: 'flaskHit', volume: 0\.65 \}\)[\s\S]*?applyRadialDamage/)
  })
})
