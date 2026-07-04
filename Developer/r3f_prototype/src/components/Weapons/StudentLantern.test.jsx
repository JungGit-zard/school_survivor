import { readFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getLanternBeamOrigin } from './StudentLantern.jsx'

describe('StudentLanternWeapon', () => {
  it('uses a widening cone beam and a dedicated lantern sound', () => {
    const source = readFileSync(new URL('./StudentLantern.jsx', import.meta.url), 'utf8')

    expect(source).toContain('applyForwardConeDamage')
    expect(source).toContain("startPlayerArmAction(playerArmActionState, 'lanternAim', now)")
    expect(source).toContain("emitSfx({ id: 'lanternFire' })")
    expect(source).toContain('shapeGeometry')
    expect(source).toContain('shaderMaterial')
    expect(source).toContain('smoothstep')
    expect(source).toContain('uOpacity')
    expect(source).not.toContain("emitSfx({ id: 'stunGunFire' })")
    expect(statSync(new URL('../../../public/sfx/weapons/lanternFire.ogg', import.meta.url)).size).toBeGreaterThan(1000)
  })

  it('starts the beam slightly forward in the firing direction', () => {
    const upward = getLanternBeamOrigin({ x: 0, z: 0 }, { x: 0, z: 1 })
    expect(upward.x).toBeCloseTo(0)
    expect(upward.z).toBeCloseTo(0.28)

    const rightward = getLanternBeamOrigin({ x: 2, z: 3 }, { x: 1, z: 0 })
    expect(rightward.x).toBeCloseTo(2.28)
    expect(rightward.z).toBeCloseTo(3)
  })
})
