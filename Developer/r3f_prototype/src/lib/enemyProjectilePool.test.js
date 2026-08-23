import { describe, expect, it } from 'vitest'
import {
  CHEF_INGREDIENT_KINDS,
  ENEMY_PROJECTILE_KIND_COUNT,
  ENEMY_PROJECTILE_KIND_SPHERE,
  E04_PROJECTILE_LIFETIME_MS,
  E04_PROJECTILE_RADIUS,
  E04_PROJECTILE_VISUAL_EXIT_RADIUS,
  MAX_ENEMY_PROJECTILES,
  chefIngredientKindAt,
  createEnemyProjectilePool,
} from './enemyProjectilePool.js'

describe('EnemyProjectilePool', () => {
  it('고정 capacity, stale generation, Float32 안전 입력을 지킨다', () => {
    const pool = createEnemyProjectilePool()
    const handles = new Array(MAX_ENEMY_PROJECTILES)
    for (let i = 0; i < MAX_ENEMY_PROJECTILES; i += 1) {
      handles[i] = { index: -1, generation: 0 }
      expect(pool.spawnInto(handles[i], i, 0, 0, 1, 0)).toBe(true)
    }
    expect(pool.spawnInto({}, 0, 0, 0, 1, 0)).toBe(false)
    expect(pool.despawn(handles[0].index, handles[0].generation)).toBe(true)
    const reused = {}
    expect(pool.spawnInto(reused, 0, 0, 0, 1, 0)).toBe(true)
    expect(reused.generation).toBeGreaterThan(handles[0].generation)
    expect(pool.despawn(handles[0].index, handles[0].generation)).toBe(false)
    expect(pool.spawnInto({}, 3.5e38, 0, 0, 1, 0)).toBe(false)
  })

  it('한 번 피해 후 제거하고 pause 중에는 step을 호출하지 않으면 age도 멈춘다', () => {
    const pool = createEnemyProjectilePool()
    const handle = {}
    expect(pool.spawnInto(handle, 0.2, 0, 0, -1, 0)).toBe(true)
    let damage = 0
    pool.step(1 / 60, 0, 0, (_index, _generation, hitDamage) => { damage += hitDamage })
    expect(damage).toBe(8)
    expect(pool.activeCount).toBe(0)
    expect(pool.spawnInto(handle, 10, 0, 0, 1, 0)).toBe(true)
    const age = pool.ageMs[handle.index]
    expect(pool.ageMs[handle.index]).toBe(age)
    for (let i = 0; i < 200; i += 1) pool.step(1 / 30, -100, -100)
    expect(pool.activeCount).toBe(0)
    expect(E04_PROJECTILE_LIFETIME_MS).toBe(3200)
  })

  it('기본 구체는 화면에 한 번 보인 뒤에는 수명 대신 완전 화면 이탈에서만 제거한다', () => {
    const pool = createEnemyProjectilePool()
    const sphere = {}
    const bounds = { minX: -100, maxX: 100, minZ: -1, maxZ: 1 }
    expect(pool.spawnInto(sphere, 0, 0, 0, 1, 0)).toBe(true)

    for (let i = 0; i < 100; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.ageMs[sphere.index]).toBeGreaterThan(E04_PROJECTILE_LIFETIME_MS)
    expect(pool.active[sphere.index]).toBe(1)

    bounds.maxX = pool.posX[sphere.index] + pool.velX[sphere.index] / 30 - E04_PROJECTILE_VISUAL_EXIT_RADIUS + 0.001
    pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[sphere.index]).toBe(1)
    for (let i = 0; i < 10; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[sphere.index]).toBe(0)
  })

  it('화면 밖에서 시작한 기본 구체는 화면에 들어온 뒤 이탈할 때 제거하고, 재료는 기존 수명을 유지한다', () => {
    const pool = createEnemyProjectilePool()
    const sphere = {}
    const ingredient = {}
    const bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }
    expect(pool.spawnInto(sphere, 2, 0, 0, -1, 0)).toBe(true)
    expect(pool.spawnInto(ingredient, 0, 0, 0, 1, 0, 14, 1.6, CHEF_INGREDIENT_KINDS[0])).toBe(true)

    pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[sphere.index]).toBe(1)
    for (let i = 0; i < 20; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.seenOnScreen[sphere.index]).toBe(1)
    expect(pool.active[sphere.index]).toBe(1)
    for (let i = 0; i < 40; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[sphere.index]).toBe(0)
    for (let i = 0; i < 100; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[ingredient.index]).toBe(0)
  })

  it('화면에 들어오지 않고 멀어지는 기본 구체는 기존 3,200ms 안전 수명으로 회수한다', () => {
    const pool = createEnemyProjectilePool()
    const sphere = {}
    const bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }
    expect(pool.spawnInto(sphere, 2, 0, 0, 1, 0)).toBe(true)
    for (let i = 0; i < 96; i += 1) pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.seenOnScreen[sphere.index]).toBe(0)
    expect(pool.active[sphere.index]).toBe(1)
    pool.step(1 / 30, -1000, -1000, null, bounds)
    expect(pool.active[sphere.index]).toBe(0)
  })

  it('special boss는 fixed pool에서 별도 속도만 사용하고 generation 계약은 동일하다', () => {
    const pool = createEnemyProjectilePool()
    const handle = {}
    expect(pool.spawnInto(handle, 0, 0, 0, 1, 0, 14, 1.6)).toBe(true)
    expect(pool.damage[handle.index]).toBe(14)
    expect(pool.velX[handle.index]).toBeCloseTo(1.6, 6)
  })

  it('10,800 step 동안 배열 길이를 유지한다', () => {
    const pool = createEnemyProjectilePool()
    const out = {}
    const lengths = [pool.active, pool.generation, pool.posX, pool.velX, pool.ageMs].map((array) => array.length)
    for (let frame = 0; frame < 10_800; frame += 1) {
      if (frame % 30 === 0) pool.spawnInto(out, 10, 0, 10, -1, -1)
      pool.step(1 / 60, -20, -20)
      expect(pool.activeCount).toBeLessThanOrEqual(MAX_ENEMY_PROJECTILES)
    }
    expect([pool.active, pool.generation, pool.posX, pool.velX, pool.ageMs].map((array) => array.length)).toEqual(lengths)
  })

  it('reset 뒤 이전 projectile handle은 같은 슬롯 재사용에도 stale이다', () => {
    const pool = createEnemyProjectilePool()
    const before = {}
    expect(pool.spawnInto(before, 0, 0, 0, 1, 0)).toBe(true)
    pool.step(1 / 30, 100, 100, null, { minX: -1, maxX: 1, minZ: -1, maxZ: 1 })
    expect(pool.seenOnScreen[before.index]).toBe(1)
    pool.reset()
    expect(pool.seenOnScreen[before.index]).toBe(0)
    const after = {}
    expect(pool.spawnInto(after, 0, 0, 0, 1, 0)).toBe(true)
    expect(after.index).toBe(before.index)
    expect(after.generation).toBeGreaterThan(before.generation)
    expect(pool.despawn(before.index, before.generation)).toBe(false)
  })

  it('kind는 비주얼 전용 채널이고 해제 시 기본 구체로 되돌아간다', () => {
    const pool = createEnemyProjectilePool()
    const carrot = {}
    expect(pool.spawnInto(carrot, 0, 0, 0, 1, 0, 14, 1.6, CHEF_INGREDIENT_KINDS[0])).toBe(true)
    expect(pool.kind[carrot.index]).toBe(CHEF_INGREDIENT_KINDS[0])
    // kind는 데미지·속도·수명·판정 반경 어디에도 개입하지 않는다.
    expect(pool.damage[carrot.index]).toBe(14)
    expect(pool.velX[carrot.index]).toBeCloseTo(1.6, 6)
    expect(E04_PROJECTILE_RADIUS).toBe(0.09)

    expect(pool.despawn(carrot.index, carrot.generation)).toBe(true)
    expect(pool.kind[carrot.index]).toBe(ENEMY_PROJECTILE_KIND_SPHERE)

    const knife = {}
    expect(pool.spawnInto(knife, 0, 0, 0, 1, 0, 14, 1.6, CHEF_INGREDIENT_KINDS[3])).toBe(true)
    pool.reset()
    expect(pool.kind[knife.index]).toBe(ENEMY_PROJECTILE_KIND_SPHERE)
  })

  it('E04 경로처럼 kind를 넘기지 않으면 기본 구체를 유지하고, 잘못된 kind도 구체로 접는다', () => {
    const pool = createEnemyProjectilePool()
    const e04 = {}
    expect(pool.spawnInto(e04, 0, 0, 0, 1, 0)).toBe(true)
    expect(pool.kind[e04.index]).toBe(ENEMY_PROJECTILE_KIND_SPHERE)

    const withStats = {}
    expect(pool.spawnInto(withStats, 0, 0, 0, 1, 0, 8, 1.9)).toBe(true)
    expect(pool.kind[withStats.index]).toBe(ENEMY_PROJECTILE_KIND_SPHERE)

    for (const bad of [ENEMY_PROJECTILE_KIND_COUNT, -1, 1.5, Number.NaN, 'carrot', null, undefined]) {
      const handle = {}
      expect(pool.spawnInto(handle, 0, 0, 0, 1, 0, 8, 1.9, bad)).toBe(true)
      expect(pool.kind[handle.index]).toBe(ENEMY_PROJECTILE_KIND_SPHERE)
    }
  })

  it('chefIngredientKindAt은 재료 4종을 결정론적으로 순환시킨다', () => {
    expect(CHEF_INGREDIENT_KINDS).toEqual([1, 2, 3, 4])
    expect(ENEMY_PROJECTILE_KIND_COUNT).toBe(5)
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(chefIngredientKindAt)).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
    expect(chefIngredientKindAt(Number.NaN)).toBe(CHEF_INGREDIENT_KINDS[0])
    expect(CHEF_INGREDIENT_KINDS).not.toContain(ENEMY_PROJECTILE_KIND_SPHERE)
  })
})
