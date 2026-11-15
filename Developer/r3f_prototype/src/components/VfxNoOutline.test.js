import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BINBUN_SHELL_FS, BINBUN_STAR_FS, REEBO_KINDS, VFX_SPRITE_FS } from '../lib/vfxShaders.js'

describe('Terry no-outline rule (2026-11-15)', () => {
  it('ships no ink rim / outline pass in any picked effect shader', () => {
    const shaders = [VFX_SPRITE_FS, BINBUN_STAR_FS, BINBUN_SHELL_FS, ...Object.values(REEBO_KINDS)]
    for (const src of shaders) {
      expect(src).not.toMatch(/outlineW|\bink\b|\brim\b|rimW/)
    }
    const shaderModule = readFileSync(new URL('../lib/vfxShaders.js', import.meta.url), 'utf8')
    expect(shaderModule).not.toMatch(/AdditiveBlending/)
    expect(shaderModule).not.toMatch(/140c18/)
  })

  it('removed the dark rims from the existing Inucon guard and bell notes', () => {
    const inucon = readFileSync(new URL('./Weapons/Inucon.jsx', import.meta.url), 'utf8')
    const guard = inucon.slice(inucon.indexOf('export const INUCON_GUARD_RING_DURATION_MS'), inucon.indexOf('export function InuconWeapon'))
    expect(guard).not.toMatch(/strokeStyle = '#140c18'|rgba\(24,14,8/)
    const bell = readFileSync(new URL('./Weapons/Bell.jsx', import.meta.url), 'utf8')
    expect(bell).not.toContain('0x4a3208')
  })

  it('never uses the Cartoon Combat (gmingassets) files', () => {
    const shaderModule = readFileSync(new URL('../lib/vfxShaders.js', import.meta.url), 'utf8')
    expect(shaderModule).not.toMatch(/ccvfx|gmingassets/i)
  })
})
