import { readFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enemyBodies, enemyPool, playerPos } from '../../lib/refs.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import {
  applyStarlinkCrashImpact,
  createStarlinkCrash,
  createStarlinkStrikeQueue,
  enqueueStarlinkCrashImpact,
  flushStarlinkCrashImpactQueue,
  pickStrikeTargets,
} from './Starlink.jsx'

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
  it('spaces consecutive strikes instead of launching a multi-count burst all at once', () => {
    const weapon = { damage: 28, strikeRadius: 1.2, critChance: 0.07, critMultiplier: 1.5, strikeSpacingMs: 450 }
    const strikes = createStarlinkStrikeQueue([
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ], weapon)

    expect(strikes.map((strike) => strike.delayMs)).toEqual([0, 450, 900])
    expect(strikes).toEqual(strikes.map((strike, index) => expect.objectContaining({
      x: index + 1,
      z: 0,
      damage: 28,
      radius: 1.2,
      critChance: 0.07,
      critMultiplier: 1.5,
    })))
  })

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
  it('uses the same boss-priority landing builder without snapshotting eraser bomb stats into the crash', () => {
    const random = () => { throw new Error('a visible boss must prevent random landing') }
    const crash = createStarlinkCrash({
      playerPosition: { x: 0, z: 0 },
      bodies: new Map([[
        'boss', {
          _enemyType: 'B01',
          _enemyDead: false,
          _enemyHit: () => true,
          translation: () => ({ x: 3, z: -2 }),
        },
      ]]),
      bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
      random,
    })

    expect(crash).toEqual({ x: 3, z: -2, bossId: 'boss' })
  })

  it('applies current eraser stats through the eraser impact contract while bypassing only crash sight blocking', () => {
    const applyImpact = vi.fn(() => 1)
    const crash = { x: 3, z: -2 }

    expect(applyStarlinkCrashImpact(crash, { damage: 31, radius: 1.7 }, applyImpact)).toBe(1)
    expect(applyImpact).toHaveBeenCalledWith(expect.objectContaining({
      x: 3,
      z: -2,
      damage: 31,
      radius: 1.7,
      sightBlocker: expect.any(Function),
    }))
    expect(applyImpact.mock.calls[0][0].sightBlocker()).toBe(false)
  })

  it('uses the latest tracked boss center at impact instead of the initial crash center', () => {
    const applyImpact = vi.fn(() => 1)
    const crash = { x: 3, z: -2 }
    const latestEnd = { x: 7, z: 4 }

    applyStarlinkCrashImpact(crash, { damage: 31, radius: 1.7 }, applyImpact, latestEnd)

    expect(applyImpact).toHaveBeenCalledWith(expect.objectContaining({ x: 7, z: 4, damage: 31, radius: 1.7 }))
  })

  it('uses the eraser bomb damage and radius available at impact, not values from crash creation', () => {
    const applyImpact = vi.fn(() => 1)
    const crash = { x: 3, z: -2, bossId: 'boss' }

    applyStarlinkCrashImpact(crash, { damage: 44, radius: 2.1 }, applyImpact)

    expect(applyImpact).toHaveBeenCalledWith(expect.objectContaining({ damage: 44, radius: 2.1, ignoreSightBlock: true }))
  })

  it('queues a copied landing center instead of applying damage from the landing callback', () => {
    const queue = []
    const crash = { x: 3, z: -2, bossId: 'boss' }
    const landingCenter = { x: 7, z: 4 }

    expect(enqueueStarlinkCrashImpact(queue, crash, landingCenter)).toBe(true)
    landingCenter.x = 99
    landingCenter.z = 88

    expect(queue).toEqual([{ crash, impactCenter: { x: 7, z: 4 } }])
  })

  it('flushes every queued crash once, empties the queue, and reads the latest eraser stats at the physics step', () => {
    const queue = []
    const crashA = { x: 1, z: 2 }
    const crashB = { x: 3, z: 4 }
    enqueueStarlinkCrashImpact(queue, crashA, { x: 10, z: 20 })
    enqueueStarlinkCrashImpact(queue, crashB, { x: 30, z: 40 })
    const applyImpact = vi.fn()
    const latestEraserBomb = { damage: 44, radius: 2.1 }

    flushStarlinkCrashImpactQueue(queue, latestEraserBomb, applyImpact)

    expect(applyImpact).toHaveBeenCalledTimes(2)
    expect(applyImpact).toHaveBeenNthCalledWith(1, crashA, latestEraserBomb, undefined, { x: 10, z: 20 })
    expect(applyImpact).toHaveBeenNthCalledWith(2, crashB, latestEraserBomb, undefined, { x: 30, z: 40 })
    expect(queue).toEqual([])
  })

  it('listens for the HUD cheat event and spawns a crash even when the weapon is inactive', () => {
    const source = readFileSync(new URL('./Starlink.jsx', import.meta.url), 'utf8')

    expect(source).toContain('STARLINK_CHEAT_CRASH_EVENT')
    expect(source).toContain('window.addEventListener(STARLINK_CHEAT_CRASH_EVENT, triggerCrash)')
    expect(source).toContain('createStarlinkCrash')
    expect(source).toContain('appendCrash')
    expect(source).toContain('bossId={c.bossId}')
    expect(source).toContain('useBeforePhysicsStep')
    expect(source).toContain('pendingCrashImpactsRef')
    expect(source).toContain('onImpact={(impactCenter) => queueCrashImpact(c, impactCenter)}')
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
