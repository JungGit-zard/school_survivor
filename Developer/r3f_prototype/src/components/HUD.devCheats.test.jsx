import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('HUD dev cheat buttons', () => {
  it('shows an S button that dispatches the Starlink crash cheat next to the weapon cheat button', () => {
    const source = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')

    expect(source).toContain('dispatchStarlinkCheatCrash')
    expect(source).toContain("aria-label={t('hud.starlinkCheatAria')}")
    expect(source).toContain("title={t('hud.starlinkCheatTitle')}")
  })
})
