import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('additional gameplay SFX coverage', () => {
  it('plays distinct textbook landing and collect cues instead of silently changing XP', () => {
    const source = readFileSync(new URL('./XpTextbook.jsx', import.meta.url), 'utf8')

    expect(source).toContain("emitSfx({ id: 'textbookLand'")
    expect(source).toContain("emitSfx({ id: 'textbookCollect'")
    expect(source).toContain('gainXp(value)')
  })

  it('uses Doge-specific escape and death cues instead of reusing zombie death audio', () => {
    const source = readFileSync(new URL('./DancingDogeEvent.jsx', import.meta.url), 'utf8')

    expect(source).toContain("emitSfx({ id: 'dogeEscape'")
    expect(source).toContain("emitSfx({ id: 'dogeDeath'")
    expect(source).not.toContain("emitSfx({ id: 'zombieHeavyDeath' })")
  })
})
