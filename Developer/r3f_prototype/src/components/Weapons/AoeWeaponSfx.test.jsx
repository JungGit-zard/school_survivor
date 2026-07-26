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
  ])('plays one mechanical impact sound when %s enters its explosion callback', (weapon, soundId, volume) => {
    expect(source(weapon)).toMatch(new RegExp(`const (?:onExplode|explode) = useCallback[\\s\\S]*?emitSfx\\(\\{ id: '${soundId}', volume: ${volume} \\}\\)[\\s\\S]*?applyRadialDamage`))
  })

  it('plays eraserHit before invoking the shared eraser bomb impact helper', () => {
    expect(source('EraserBomb')).toMatch(/const explode = useCallback[\s\S]*?emitSfx\(\{ id: 'eraserHit', volume: 0\.66 \}\)[\s\S]*?applyEraserBombImpact/)
  })

  it('plays starlink hit once only when a strike damages at least one enemy', () => {
    expect(source('Starlink')).toMatch(/const hitCount = applyRadialDamage\([\s\S]*?if \(hitCount > 0\) emitSfx\(\{ id: 'starlinkHit' \}\)/)
  })

  it('plays compass activation/explosion sounds unchanged and a duck quack per contact hit', () => {
    const compass = source('CompassBlade')

    expect(compass).toMatch(/useEffect\(\(\) => \{[\s\S]*?!wasActiveRef\.current[\s\S]*?emitSfx\(\{ id: 'compassFire' \}\)/)
    // 일반 적은 SoA 풀 프록시이므로 직접 `_enemyHit` 두 인자 호출을 금지한다.
    // generation을 함께 검증하는 공통 충돌 경로가 성공한 뒤에만 접촉 SFX가 나야 한다.
    expect(compass).toContain("import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'")
    const hitGate = compass.indexOf('if (!applyEnemyHit(rb, generation, w.damage, impact)) continue')
    const quack = compass.indexOf("emitSfx({ id: 'compassQuack', volume: 0.5 })")
    expect(hitGate).toBeGreaterThan(-1)
    expect(quack).toBeGreaterThan(hitGate)
    expect(compass).toContain("emitSfx({ id: 'compassHit' })")
  })
})
