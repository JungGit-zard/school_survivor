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

  it('keeps bonus Doge physically solid instead of using a sensor-only body', () => {
    const source = readFileSync(new URL('./DancingDogeEvent.jsx', import.meta.url), 'utf8')

    expect(source).toContain('보너스 도지도 플레이어/적과 물리적으로 겹치지 않는다')
    expect(source).toContain('<CuboidCollider args={[0.32 * scale, 0.75 * scale, 0.32 * scale]} position={[0, 0.75 * scale, 0]} />')
    expect(source).not.toContain('position={[0, 0.75 * scale, 0]} sensor')
  })
})
