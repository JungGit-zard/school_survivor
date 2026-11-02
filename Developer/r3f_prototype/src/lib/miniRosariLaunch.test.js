import { afterEach, describe, expect, it } from 'vitest'
import { createOnigiriLaunch, pickNextOnigiriTarget } from './onigiri.js'
import { enemyPool } from './refs.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'

afterEach(() => {
  enemyPool.reset()
})

// 2026-11-02 Terry: "어떤 상황에서도 무조건 발사점은 로자리" — 꼬마 로자리 분신의 새 투척은 언제나
// 이번 프레임의 주인공 몸 위치에서 출발한다. 발사 사양은 오니기리와 같은 공용 빌더를 쓴다.
// (사라졌다 주인공에게서 다시 나오는 2026-11-01 동작은 Terry 확정 규칙으로 폐기 — 이제 분신은
//  그 자리에서 다시 조준하거나 떠서 기다린다. 동작 검증은 onigiri.test.js의 flight rules.)
describe('mini rosari launch origin', () => {
  it('launches each new clone from the moved player body with the catalog stats', () => {
    const weapon = { ...WEAPON_CATALOG.miniRosari.base, active: true }
    const player = { x: 1, y: 0.32, z: 1 }
    enemyPool.spawn({ type: 'E01', x: 4, y: 0, z: 1, hp: 10, maxHp: 10 })
    const first = createOnigiriLaunch({ id: 1, origin: player, target: pickNextOnigiriTarget({ from: player, range: weapon.range }), weapon })
    expect(first.start).toEqual([1, 0.32, 1])

    player.x = -2; player.z = 5
    enemyPool.spawn({ type: 'E01', x: -3, y: 0, z: 6, hp: 10, maxHp: 10 })
    const second = createOnigiriLaunch({ id: 2, origin: player, target: pickNextOnigiriTarget({ from: player, range: weapon.range }), weapon })
    expect(second.start).toEqual([-2, 0.32, 5])
    expect(second.maxBounces).toBe(weapon.bounces)
    expect([second.damage, second.bounceRange, second.critChance, second.critMultiplier])
      .toEqual([weapon.damage, weapon.bounceRange, weapon.critChance, weapon.critMultiplier])
  })
})
