import { readFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, enemyPool, playerPos } from '../../lib/refs.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { pickStrikeTargets } from './Starlink.jsx'

afterEach(() => {
  enemyBodies.clear()
  enemyPool.reset()
  playerPos.set(0, 0, 0)
})

function spawnPooledEnemy(x, z, hit = vi.fn()) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 10, maxHp: 10 })
  enemyPool.setHitHandler(handle, hit)
  return { handle, hit }
}

describe('StarlinkWeapon pool targeting', () => {
  it('scans the standard-enemy pool for strike candidates, not just the boss/special enemyBodies Map', () => {
    const source = readFileSync(new URL('./Starlink.jsx', import.meta.url), 'utf8')

    expect(source).toContain('enemyPool.highestActive')
    expect(source).toContain('isPoolProxy')
  })

  it('picks a pooled standard enemy position as a strike candidate (regression: only bosses/Map entries were ever struck)', () => {
    const pooled = spawnPooledEnemy(1, 2)

    const targets = pickStrikeTargets(5, 1)

    expect(targets).toEqual([{ x: 1, z: 2 }])
    // 실제 데미지는 applyRadialDamage(x,z 반경 재스캔)로 위임되며 이미 pool 대응이다.
    expect(applyRadialDamage({ x: targets[0].x, z: targets[0].z, radius: 1.2, damage: 8, knockback: 1.4, knockbackMs: 80 })).toBe(1)
    expect(pooled.hit).toHaveBeenCalledTimes(1)
  })

  it('returns no candidates when nothing is within strikeCenter', () => {
    spawnPooledEnemy(50, 50)
    expect(pickStrikeTargets(5, 1)).toEqual([])
  })
})

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
