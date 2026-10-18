import { describe, it, expect } from 'vitest'
import { designCandidate, getSoundEntries, makeSource } from './generate-audition-20261016.mjs'

describe('audition generator', () => {
  it('covers every current SOUND_MAP entry without fallback copies', () => {
    const entries = getSoundEntries()
    expect(entries).toHaveLength(90)
    for (const entry of entries) {
      const source = makeSource(entry)
      expect(source.samples.length, entry.id).toBeGreaterThan(100)
      expect(source.generator, entry.id).toMatch(/generate[-_]/)
    }
  })
  it('creates deterministic candidates with distinct rhythm and spectral shape, not scalar copies', () => {
    const entry = getSoundEntries()[0]
    const source = makeSource(entry)
    const variants = ['A', 'B', 'C'].map(v => designCandidate(entry, source, v))
    expect(variants[0]).toEqual(designCandidate(entry, source, 'A'))
    expect(new Set(variants.map(v => v.length)).size).toBe(3)
    for (const v of variants) {
      const peak = v.reduce((a, x) => Math.max(a, Math.abs(x)), 0)
      expect(peak).toBeLessThanOrEqual(0.71)
      expect(peak).toBeGreaterThan(0.05)
      expect(Math.abs(v[0])).toBe(0)
      expect(Math.abs(v.at(-1))).toBeLessThan(0.001)
    }
  })
})
