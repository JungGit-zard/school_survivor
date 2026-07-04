import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('HUD dev cheat buttons', () => {
  it('shows an S button that dispatches the Starlink crash cheat next to the weapon cheat button', () => {
    const source = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')

    expect(source).toContain('dispatchStarlinkCheatCrash')
    expect(source).toContain('aria-label="스타링크 추락 치트"')
    expect(source).toContain('스타링크 즉시 추락')
  })
})
