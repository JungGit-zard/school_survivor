import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(name) {
  return readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8')
}

describe('area weapon sound lifecycle', () => {
  it('plays bell hit once only when the pulse damages at least one enemy', () => {
    expect(source('Bell')).toMatch(/const hitCount = applyRadialDamage\([\s\S]*?if \(hitCount > 0\) emitSfx\(\{ id: 'bellHit', volume: 0\.45 \}\)/)
  })

  it.each([
    ['Missile', 'missileHit', '0.70'],
    ['SharkMissile', 'sharkHit', '0.72'],
    ['UmbrellaGuard', 'umbrellaHit', '0.62'],
    ['EraserBomb', 'eraserHit', '0.66'],
  ])('plays one mechanical impact sound when %s enters its explosion callback', (weapon, soundId, volume) => {
    expect(source(weapon)).toMatch(new RegExp(`const (?:onExplode|explode) = useCallback[\\s\\S]*?emitSfx\\(\\{ id: '${soundId}', volume: ${volume} \\}\\)[\\s\\S]*?applyRadialDamage`))
  })

  it('plays starlink hit once only when a strike damages at least one enemy', () => {
    expect(source('Starlink')).toMatch(/const hitCount = applyRadialDamage\([\s\S]*?if \(hitCount > 0\) emitSfx\(\{ id: 'starlinkHit' \}\)/)
  })

  it('plays compass activation once per active transition and a quiet tick per contact hit', () => {
    const compass = source('CompassBlade')

    expect(compass).toMatch(/useEffect\(\(\) => \{[\s\S]*?!wasActiveRef\.current[\s\S]*?emitSfx\(\{ id: 'compassFire' \}\)/)
    expect(compass).toMatch(/rb\._enemyHit\(w\.damage, \{ critChance: w\.critChance, critMultiplier: w\.critMultiplier \}\)\s*emitSfx\(\{ id: 'compassFire', volume: 0\.18 \}\)/)
    expect(compass).toContain("emitSfx({ id: 'compassHit' })")
  })
})
