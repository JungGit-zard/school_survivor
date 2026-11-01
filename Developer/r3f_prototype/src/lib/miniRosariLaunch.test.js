import { afterEach, describe, expect, it } from 'vitest'
import { createOnigiriLaunch, pickNextOnigiriTarget } from './onigiri.js'
import { enemyPool } from './refs.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'

afterEach(() => {
  enemyPool.reset()
})

// 2026-11-01 Terry: "미니로자리도 같은 문제 있으면 고쳐" — 꼬마 로자리 분신도 사라졌다 다시 나올 때
// 반드시 이번 프레임의 주인공 몸 위치에서 출발한다. 발사 사양은 오니기리와 같은 공유 빌더를 쓴다.
describe('mini rosari launch origin', () => {
  it('re-launches a lost clone from the moved player body with the remaining bounces and unchanged stats', () => {
    const weapon = { ...WEAPON_CATALOG.miniRosari.base, active: true }
    const player = { x: 1, y: 0.32, z: 1 }
    const firstHandle = enemyPool.spawn({ type: 'E01', x: 4, y: 0, z: 1, hp: 10, maxHp: 10 })
    const firstTarget = pickNextOnigiriTarget({ from: player, range: weapon.range ?? 18 })
    const first = createOnigiriLaunch({ id: 1, origin: player, target: firstTarget, weapon })

    expect(first.start).toEqual([1, 0.32, 1])
    expect(first.maxBounces).toBe(weapon.bounces)

    // 첫 표적이 도착 전에 죽고(풀에서 빠짐) 주인공은 (-2, 5)로 이동했다.
    enemyPool.despawn(firstHandle)
    player.x = -2; player.z = 5
    const nextHandle = enemyPool.spawn({ type: 'E01', x: -3, y: 0, z: 6, hp: 10, maxHp: 10 })
    const relaunch = { bouncesLeft: weapon.bounces, hitSet: new Set(first.hitIds) }
    const next = pickNextOnigiriTarget({ from: player, hitSet: relaunch.hitSet, range: weapon.range ?? 18 })
    const relaunched = createOnigiriLaunch({ id: 2, origin: player, target: next, weapon, relaunch })

    expect(relaunched.start).toEqual([-2, 0.32, 5])
    expect(relaunched.initialTarget.rb).toBe(enemyPool.get(nextHandle))
    expect(relaunched.maxBounces).toBe(weapon.bounces)
    expect(relaunched.hitIds).toEqual([...first.hitIds, next.enemyId])
    expect([relaunched.damage, relaunched.bounceRange, relaunched.critChance, relaunched.critMultiplier])
      .toEqual([weapon.damage, weapon.bounceRange ?? 4.5, weapon.critChance, weapon.critMultiplier])
  })
})
