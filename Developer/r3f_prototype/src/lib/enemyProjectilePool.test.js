import { describe, expect, it } from 'vitest'
import { createEnemyProjectilePool, E04_PROJECTILE_LIFETIME_MS, MAX_ENEMY_PROJECTILES } from './enemyProjectilePool.js'

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
    pool.reset()
    const after = {}
    expect(pool.spawnInto(after, 0, 0, 0, 1, 0)).toBe(true)
    expect(after.index).toBe(before.index)
    expect(after.generation).toBeGreaterThan(before.generation)
    expect(pool.despawn(before.index, before.generation)).toBe(false)
  })
})
