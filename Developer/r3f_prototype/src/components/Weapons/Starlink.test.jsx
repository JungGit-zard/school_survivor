import { readFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StarlinkWeapon dev crash cheat', () => {
  it('listens for the HUD cheat event and spawns a crash even when the weapon is inactive', () => {
    const source = readFileSync(new URL('./Starlink.jsx', import.meta.url), 'utf8')

    expect(source).toContain('STARLINK_CHEAT_CRASH_EVENT')
    expect(source).toContain('window.addEventListener(STARLINK_CHEAT_CRASH_EVENT, triggerCrash)')
    expect(source).toContain('getScreenCenterCrashLandingPoint')
    expect(source).toContain('screenBounds')
    expect(source).toContain('setCrashes((cs) => [...cs, { id: ++_crashId, x: land.x, z: land.z }])')
    expect(source).toContain('!weapons.starlink?.active && strikes.length === 0 && crashes.length === 0')
  })

  it('renders the escaping Zomlonbisk at half size after the crash', () => {
    const source = readFileSync(new URL('./StarlinkSatellite.jsx', import.meta.url), 'utf8')

    expect(source).toContain('ZOMLON_ESCAPE_SCALE = 0.5')
    expect(source).toContain('SATELLITE_CRASH_PIVOT_Y')
    expect(source).toContain('popScale * ZOMLON_ESCAPE_SCALE')
  })

  it('plays separate falling and explosion sounds during the crash sequence', () => {
    const source = readFileSync(new URL('./StarlinkSatellite.jsx', import.meta.url), 'utf8')

    expect(source).toContain("emitSfx({ id: 'starlinkFall' })")
    expect(source).toContain("emitSfx({ id: 'starlinkExplosion' })")
    expect(statSync(new URL('../../../public/sfx/weapons/starlinkFall.ogg', import.meta.url)).size).toBeGreaterThan(1000)
    expect(statSync(new URL('../../../public/sfx/weapons/starlinkExplosion.ogg', import.meta.url)).size).toBeGreaterThan(1000)
  })
})
