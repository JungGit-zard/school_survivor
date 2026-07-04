import { readFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StudentLanternWeapon', () => {
  it('uses a widening cone beam and a dedicated lantern sound', () => {
    const source = readFileSync(new URL('./StudentLantern.jsx', import.meta.url), 'utf8')

    expect(source).toContain('applyForwardConeDamage')
    expect(source).toContain("startPlayerArmAction(playerArmActionState, 'lanternAim', now)")
    expect(source).toContain("emitSfx({ id: 'lanternFire' })")
    expect(source).toContain('shapeGeometry')
    expect(source).not.toContain("emitSfx({ id: 'stunGunFire' })")
    expect(statSync(new URL('../../../public/sfx/weapons/lanternFire.ogg', import.meta.url)).size).toBeGreaterThan(1000)
  })
})
