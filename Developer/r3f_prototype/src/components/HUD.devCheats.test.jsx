import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('HUD dev cheat buttons', () => {
  it('shows an S button that dispatches the Starlink crash cheat next to the weapon cheat button', () => {
    const source = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')

    expect(source).toContain('dispatchStarlinkCheatCrash')
    expect(source).toContain("aria-label={t('hud.starlinkCheatAria')}")
    expect(source).toContain("title={t('hud.starlinkCheatTitle')}")
  })

  it('shows a C button that summons the coin jingle zombie without adding it to spawn schedules', () => {
    const hudSource = readFileSync(new URL('./HUD.jsx', import.meta.url), 'utf8')
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')

    expect(hudSource).toContain('summonCoinJingleZombieCheat')
    expect(hudSource).toContain('동전 짤랑 좀비 소환')
    expect(enemiesSource).toContain('const STANDARD_POOL_TYPE_MAX = 16')
  })

})
