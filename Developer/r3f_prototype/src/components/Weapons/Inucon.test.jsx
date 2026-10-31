import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  INUCON_COMPANION_SCALE,
  INUCON_PUSH_VFX_DURATION_MS,
  INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER,
  getInuconVisualState,
  selectInuconFainted,
} from './Inucon.jsx'

describe('Inucon companion scale', () => {
  it('renders the runtime companion at twice the previous size', () => {
    expect(INUCON_COMPANION_SCALE).toBe(0.36)
  })

  it('uses the shared scale constant on all axes', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toContain('scale={[INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE, INUCON_COMPANION_SCALE]}')
    expect(source).not.toContain('scale={[0.18, 0.18, 0.18]}')
  })
})

describe('Inucon push VFX', () => {
  it('keeps the push ring radius locked to the actual player-centered push radius', () => {
    expect(INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER).toBe(1)
    expect(INUCON_PUSH_VFX_DURATION_MS).toBeGreaterThanOrEqual(360)
  })

  it('fires the push VFX only after applyRadialDamage reports real hits', () => {
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toMatch(/const hits = applyRadialDamage\([\s\S]*?radius: biteDrag\.radius[\s\S]*?if \(hits > 0\) \{[\s\S]*?triggerInuconPushVfx\(biteDrag\.radius\)/)
    expect(source).not.toMatch(/else[\s\S]*?triggerInuconPushVfx/)
  })
})

describe('Inucon fainted ghost visual', () => {
  it('shows a halo with translucent materials only while fainted, read from store inucon.fainted', () => {
    expect(getInuconVisualState(true)).toEqual({ fainted: true, opacity: 0.45, transparent: true, depthWrite: false, halo: true })
    expect(getInuconVisualState(false)).toEqual({ fainted: false, opacity: 1, transparent: false, depthWrite: true, halo: false })
    expect(selectInuconFainted({})).toBe(false)
    expect(selectInuconFainted({ inucon: { fainted: true } })).toBe(true)
    const source = readFileSync(new URL('./Inucon.jsx', import.meta.url), 'utf8')
    expect(source).toMatch(/\{fainted && \([\s\S]*?name="inucon-halo"[\s\S]*?<torusGeometry/)
  })
})
