import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(name) {
  return readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8')
}

describe('area weapon sound lifecycle', () => {
  it('plays bell hit once only when the pulse damages at least one enemy', () => {
    // hitCount > 0 블록에 recordMissionEvent가 들어오면서 예전 인접 매칭 정규식이 깨졌다.
    // 순서만 강제한다 — 데미지 판정 뒤에, 명중했을 때만 bellHit이 나가야 한다.
    expect(source('Bell')).toMatch(/const hitCount = applyRadialDamage\([\s\S]*?if \(hitCount > 0\) \{[\s\S]*?emitSfx\(\{ id: 'bellHit', volume: 0\.45 \}\)/)
  })

  // 벨은 발사음과 타격음이 같은 프레임에 겹치는 유일한 무기라, 두 볼륨의 합이
  // 풀스케일(1.0)을 넘으면 마스터 리미터가 없는 이 파이프라인에서 곧바로 클리핑된다.
  it('keeps the bell same-frame fire+hit sum at or under full scale', () => {
    const bell = source('Bell')
    const fire = Number(bell.match(/emitSfx\(\{ id: 'bellFire', volume: ([\d.]+) \}\)/)?.[1])
    const hit = Number(bell.match(/emitSfx\(\{ id: 'bellHit', volume: ([\d.]+) \}\)/)?.[1])
    expect(fire).toBeGreaterThan(0)
    expect(hit).toBeGreaterThan(0)
    expect(fire + hit).toBeLessThanOrEqual(1)
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
