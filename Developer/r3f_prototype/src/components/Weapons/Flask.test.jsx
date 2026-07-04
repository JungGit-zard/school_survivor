import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ScienceFlaskSplash zone payload', () => {
  it('passes chemical zone stats from the projectile into the explosion payload', () => {
    const source = readFileSync(new URL('./Flask.jsx', import.meta.url), 'utf8')

    expect(source).toContain('zoneRadius, zoneDurationMs, zoneTickDamage')
    expect(source).toContain('zoneRadius, zoneDurationMs, zoneTickDamage })')
  })

  it('keeps the chemical puddle just above the floor and below character outlines', () => {
    const source = readFileSync(new URL('./Flask.jsx', import.meta.url), 'utf8')

    expect(source).toContain('position={[0, 0.012, 0]} renderOrder={1}')
    expect(source).toContain('position={[0, 0.014, 0]} renderOrder={2}')
  })
})
