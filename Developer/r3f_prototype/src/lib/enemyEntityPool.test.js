import { describe, expect, it } from 'vitest'
import {
  ENEMY_TYPE_CODES,
  MAX_ENEMY_GENERATION,
  MAX_ENEMIES,
  createEnemyEntityPool,
  enemyEntityId,
  enemyTypeFromCode,
  enemyTypeToCode,
} from './enemyEntityPool.js'

const spawnData = (index = 0, type = 'E01') => ({
  type,
  x: index,
  y: 1,
  z: -index,
  velX: 0.5,
  velZ: -0.25,
  hp: 10,
  maxHp: 10,
  visualScale: 1,
})

describe('EnemyEntityPool', () => {
  it('increments spatial revision for spatial changes and enters a permanent safe fallback when exhausted', () => {
    const pool = createEnemyEntityPool()
    expect(pool.spatialRevision).toBe(0)
    const handle = pool.spawn(spawnData())
    expect(pool.spatialRevision).toBe(1)
    expect(pool.setPosition(handle, 0, 1, 0)).toBe(true)
    expect(pool.spatialRevision).toBe(1)
    expect(pool.setPosition(handle, 2, 1, 0)).toBe(true)
    expect(pool.spatialRevision).toBe(2)
    expect(pool.setPosition(handle, 1.1, 1, 0)).toBe(true)
    expect(pool.spatialRevision).toBe(3)
    expect(pool.setPosition(handle, 1.1, 1, 0)).toBe(true)
    expect(pool.spatialRevision).toBe(3)
    expect(pool.integrate(handle, 1)).toBe(true)
    expect(pool.spatialRevision).toBe(4)
    expect(pool.despawn(handle)).toBe(true)
    expect(pool.spatialRevision).toBe(5)
    pool.reset()
    expect(pool.spatialRevision).toBe(6)
    pool.spatialRevision = Number.MAX_SAFE_INTEGER
    pool.markSpatialChanged()
    expect(pool.spatialRevision).toBe(-1)
    pool.markSpatialChanged()
    expect(pool.spatialRevision).toBe(-1)
  })

  it('E01-E06, RZL/RZC 및 B01-B04 타입을 고정 코드로 변환한다', () => {
    expect(Object.keys(ENEMY_TYPE_CODES)).toEqual(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'B01', 'B02', 'B03', 'B04', 'RZT', 'RZG', 'E07', 'E08'])
    expect(enemyTypeToCode('B04')).toBe(12)
    expect(enemyTypeToCode('RZT')).toBe(13)
    expect(enemyTypeToCode('RZG')).toBe(14)
    expect(enemyTypeToCode('E07')).toBe(15)
    expect(enemyTypeToCode('E08')).toBe(16)
    expect(enemyTypeFromCode(7)).toBe('RZL')
    expect(enemyTypeFromCode(14)).toBe('RZG')
    expect(enemyTypeFromCode(15)).toBe('E07')
    expect(enemyTypeFromCode(16)).toBe('E08')
    expect(enemyTypeToCode('unknown')).toBe(0)
    expect(enemyTypeFromCode(99)).toBeNull()
  })



  it('maps E08 coin jingle zombie to pooled type code 16', () => {
    expect(enemyTypeToCode('E08')).toBe(16)
    expect(enemyTypeFromCode(16)).toBe('E08')
  })

  it('최대 150개만 생성하며 151번째는 활성 슬롯을 덮어쓰지 않고 거절한다', () => {
    expect(MAX_ENEMIES).toBe(150)
    const pool = createEnemyEntityPool()
    const handles = []
    for (let index = 0; index < MAX_ENEMIES; index += 1) handles.push(pool.spawn(spawnData(index)))

    expect(handles.every(Boolean)).toBe(true)
    expect(pool.activeCount).toBe(MAX_ENEMIES)
    expect(pool.highestActive).toBe(MAX_ENEMIES - 1)
    expect(pool.spawn(spawnData(151))).toBeNull()
    expect(pool.posX[0]).toBe(0)
    expect(pool.posX[MAX_ENEMIES - 1]).toBe(MAX_ENEMIES - 1)
    expect(pool.validateInvariants()).toBe(true)
  })

  it('despawn 뒤 재사용 슬롯의 generation을 증가시키고 stale 핸들을 거절한다', () => {
    const pool = createEnemyEntityPool()
    const first = pool.spawn(spawnData(1))
    expect(pool.despawn(first)).toBe(true)
    const second = pool.spawn(spawnData(2, 'B01'))

    expect(second.index).toBe(first.index)
    expect(second.generation).toBe(first.generation + 1)
    expect(pool.get(first)).toBeNull()
    expect(pool.despawn(first)).toBe(false)
    expect(pool.hit(first, 2)).toBe(false)
    expect(pool.setPosition(first, 1, 2, 3)).toBe(false)
    expect(pool.get(second)._enemyType).toBe('B01')
    expect(pool.activeCount).toBe(1)
  })

  it('프록시와 translation 객체를 슬롯마다 한 번만 만들고 현재 좌표를 반영한다', () => {
    const pool = createEnemyEntityPool()
    const inactiveProxy = pool.proxies[0]
    const inactiveTranslation = inactiveProxy.translation()
    const handle = pool.spawn(spawnData(4, 'RZC'))
    const proxy = pool.getProxy(handle)

    expect(proxy).toBe(inactiveProxy)
    expect(proxy.translation()).toBe(inactiveTranslation)
    expect(proxy._enemyId).toBe(enemyEntityId(handle.index, handle.generation))
    expect(proxy.getHandleInto({})).toBe(true)
    expect(pool.setPosition(handle, 11, 2, -7)).toBe(true)
    expect(proxy.translation()).toBe(inactiveTranslation)
    expect(inactiveTranslation).toMatchObject({ x: 11, y: 2, z: -7 })
    expect(pool.despawn(handle)).toBe(true)
    expect(proxy._enemyDead).toBe(true)
    expect(proxy._enemyHit).toBeNull()
  })

  it('활성 프록시는 generation 필수 _enemyHit 래퍼를 제공하고 despawn 시 비활성화한다', () => {
    const pool = createEnemyEntityPool()
    const handle = pool.spawn(spawnData())
    const proxy = pool.get(handle)
    let receivedDamage = 0
    const handler = (damage) => { receivedDamage = damage }

    expect(pool.setHitHandler(handle, handler)).toBe(true)
    const hit = proxy._enemyHit
    expect(hit).toBe(proxy._enemyHit)
    expect(hit(7, { knockback: 1 })).toBe(false)
    expect(hit(7, { knockback: 1 }, handle.generation)).toBe(true)
    expect(receivedDamage).toBe(7)
    expect(pool.despawn(handle)).toBe(true)
    expect(proxy._enemyHit).toBeNull()
    expect(hit(9, null, handle.generation)).toBe(false)
  })

  it('보관된 proxy hit은 같은 슬롯 재사용 뒤 새 handler를 호출하지 않는다', () => {
    const pool = createEnemyEntityPool()
    const first = pool.spawn(spawnData())
    expect(pool.setHitHandler(first, () => {})).toBe(true)
    const oldHit = pool.get(first)._enemyHit
    let newHandlerCalls = 0
    expect(pool.despawn(first)).toBe(true)
    const second = pool.spawn(spawnData())
    expect(second.index).toBe(first.index)
    expect(pool.setHitHandler(second, () => { newHandlerCalls += 1 })).toBe(true)

    expect(oldHit(5, null, first.generation)).toBe(false)
    expect(newHandlerCalls).toBe(0)
    expect(pool.hit(second, 5)).toBe(true)
    expect(newHandlerCalls).toBe(1)
    expect(pool.hit(second, 3.5e38)).toBe(false)
    expect(newHandlerCalls).toBe(1)
  })

  it('안전하지 않은 수치와 알 수 없는 타입의 spawn을 프로덕션에서도 거절한다', () => {
    const pool = createEnemyEntityPool()
    expect(pool.spawn({ ...spawnData(), x: Number.NaN })).toBeNull()
    expect(pool.spawn({ ...spawnData(), z: Infinity })).toBeNull()
    expect(pool.spawn({ ...spawnData(), type: 'DOGE' })).toBeNull()
    expect(pool.spawn({ ...spawnData(), hp: 11 })).toBeNull()
    expect(pool.spawn({ ...spawnData(), x: 3.5e38 })).toBeNull()
    expect(pool.activeCount).toBe(0)
    expect(pool.validateInvariants()).toBe(true)
  })

  it('Float32Array 변환 뒤 Infinity가 되는 위치·속도·적분을 거절하고 좌표를 보존한다', () => {
    const pool = createEnemyEntityPool()
    const handle = pool.spawn(spawnData())
    const x = pool.posX[handle.index]
    const z = pool.posZ[handle.index]
    expect(pool.setPosition(handle, 3.5e38, 0, 0)).toBe(false)
    expect(pool.setVelocity(handle, 3.5e38, 0)).toBe(false)
    expect(pool.setVelocity(handle, 3e38, 0)).toBe(true)
    expect(pool.integrate(handle, 2)).toBe(false)
    expect(pool.posX[handle.index]).toBe(x)
    expect(pool.posZ[handle.index]).toBe(z)
  })

  it('double-despawn과 범위를 벗어난 handle을 거절한다', () => {
    const pool = createEnemyEntityPool()
    const handle = pool.spawn(spawnData())
    expect(pool.despawn(handle)).toBe(true)
    expect(pool.despawn(handle)).toBe(false)
    expect(pool.get({ index: -1, generation: 1 })).toBeNull()
    expect(pool.get({ index: MAX_ENEMIES, generation: 1 })).toBeNull()
    expect(pool.getHandleInto({}, MAX_ENEMIES)).toBe(false)
  })

  it('활성 순회는 배열을 만들지 않고 activeCount와 highestActive를 따른다', () => {
    const pool = createEnemyEntityPool()
    const first = pool.spawn(spawnData(1))
    const second = pool.spawn(spawnData(2))
    let sum = 0
    expect(pool.forEachActive((index) => { sum += index })).toBe(2)
    expect(sum).toBe(first.index + second.index)
    expect(pool.despawn(second)).toBe(true)
    expect(pool.highestActive).toBe(first.index)
    expect(pool.nextActiveIndex()).toBe(first.index)
    expect(pool.nextActiveIndex(first.index + 1)).toBe(-1)
  })

  it('DEV 불변식은 성공 상태와 오염 상태를 구분한다', () => {
    const pool = createEnemyEntityPool()
    const handle = pool.spawn(spawnData())
    expect(pool.assertInvariants()).toBe(true)
    pool.posX[handle.index] = Number.NaN
    expect(pool.validateInvariants()).toBe(false)
    expect(() => pool.assertInvariants()).toThrow('불변식')
  })

  it('DEV 불변식은 선택적 월드 경계 밖 활성 좌표를 거절한다', () => {
    const pool = createEnemyEntityPool()
    pool.spawn({ ...spawnData(), x: 4, z: -3 })

    expect(pool.validateInvariants({ minX: 0, maxX: 5, minZ: -4, maxZ: 0 })).toBe(true)
    expect(pool.validateInvariants({ halfX: 4, halfZ: 3 })).toBe(true)
    expect(pool.validateInvariants({ minX: 0, maxX: 3, minZ: -4, maxZ: 0 })).toBe(false)
    expect(pool.validateInvariants({ halfX: Number.NaN, halfZ: 3 })).toBe(false)
  })

  it('reset은 숫자 상태를 초기화하고 프록시 정체성은 유지한다', () => {
    const pool = createEnemyEntityPool()
    const initialProxy = pool.proxies[17]
    const handle = pool.spawn(spawnData())
    pool.despawn(handle)
    const beforeResetGeneration = Array.from(pool.generation)
    pool.reset()

    expect(pool.activeCount).toBe(0)
    expect(pool.highestActive).toBe(-1)
    expect(pool.liveProxyCount).toBe(0)
    expect(Array.from(pool.generation)).toEqual(beforeResetGeneration.map((generation) => generation + 1))
    expect(pool.proxies[17]).toBe(initialProxy)
    expect(pool.validateInvariants()).toBe(true)
  })

  it('reset 전 handle은 같은 슬롯 재spawn 뒤에도 stale이며 generation을 0으로 되돌리지 않는다', () => {
    const pool = createEnemyEntityPool()
    const beforeReset = pool.spawn(spawnData())
    pool.reset()
    const afterReset = pool.spawn(spawnData())

    expect(afterReset.index).toBe(beforeReset.index)
    expect(afterReset.generation).toBeGreaterThan(beforeReset.generation)
    expect(pool.get(beforeReset)).toBeNull()
    expect(pool.despawn(beforeReset)).toBe(false)
    expect(pool.generation[afterReset.index]).not.toBe(0)
  })

  it('generation 최대값 슬롯은 0으로 wrap하지 않고 despawn/reset에서 은퇴한다', () => {
    const pool = createEnemyEntityPool()
    pool.generation[0] = MAX_ENEMY_GENERATION
    const finalGeneration = pool.spawn(spawnData())

    expect(finalGeneration).toMatchObject({ index: 0, generation: MAX_ENEMY_GENERATION })
    expect(pool.despawn(finalGeneration)).toBe(true)
    expect(pool.generation[0]).toBe(MAX_ENEMY_GENERATION)
    expect(pool.spawn(spawnData()).index).toBe(1)
    pool.reset()
    expect(pool.generation[0]).toBe(MAX_ENEMY_GENERATION)
    expect(pool.spawn(spawnData()).index).toBe(1)
  })

  it('60fps 3분 상당 반복에서도 200개 이하, finite, stale 안전 및 배열 길이를 유지한다', () => {
    const pool = createEnemyEntityPool()
    const out = { index: -1, generation: 0 }
    const stale = { index: -1, generation: 0 }
    const typedArrayLengths = [pool.active, pool.generation, pool.posX, pool.velX, pool.hp, pool.knockbackTimer].map((array) => array.length)

    for (let frame = 0; frame < 10_800; frame += 1) {
      if (frame % 3 === 0) {
        expect(pool.spawnInto(out, spawnData(frame, frame % 120 === 0 ? 'B04' : 'E01'))).toBe(true)
        stale.index = out.index
        stale.generation = out.generation
      }
      const index = pool.nextActiveIndex()
      if (index >= 0) {
        expect(pool.getHandleInto(out, index)).toBe(true)
        expect(pool.integrate(out, 1 / 60)).toBe(true)
        if (frame % 2 === 0) {
          expect(pool.despawn(out)).toBe(true)
          expect(pool.get(stale)).toBeNull()
        }
      }
      expect(pool.activeCount).toBeLessThanOrEqual(MAX_ENEMIES)
      expect(pool.validateInvariants()).toBe(true)
    }

    expect([pool.active, pool.generation, pool.posX, pool.velX, pool.hp, pool.knockbackTimer].map((array) => array.length)).toEqual(typedArrayLengths)
  })

  it('200 active 슬롯을 반복 순회·이동·free-list churn해도 여러 stale handle과 프록시가 안전하다', () => {
    const pool = createEnemyEntityPool()
    const handles = new Array(MAX_ENEMIES)
    const out = { index: -1, generation: 0 }
    for (let round = 0; round < 12; round += 1) {
      for (let index = 0; index < MAX_ENEMIES; index += 1) handles[index] = pool.spawn(spawnData(index))
      expect(pool.activeCount).toBe(MAX_ENEMIES)
      let traversed = 0
      pool.forEachActive((index, generation) => {
        out.index = index
        out.generation = generation
        expect(pool.integrate(out, 1 / 60)).toBe(true)
        traversed += 1
      })
      expect(traversed).toBe(MAX_ENEMIES)
      for (let index = 0; index < MAX_ENEMIES; index += 1) expect(pool.despawn(handles[index])).toBe(true)
      expect(pool.activeCount).toBe(0)
      expect(pool.get(handles[round % MAX_ENEMIES])).toBeNull()
      expect(pool.validateInvariants()).toBe(true)
    }
  })

  it('표준 pooled proxy는 슬롯별 hit closure 없이 하나의 global dispatcher와 generation 계약을 공유한다', () => {
    const pool = createEnemyEntityPool()
    let calls = 0
    pool.setGlobalHitDispatcher((index, generation, damage) => {
      expect(pool.isIndexGenerationAlive(index, generation)).toBe(true)
      calls += damage
    })
    const handles = []
    for (let index = 0; index < MAX_ENEMIES; index += 1) handles.push(pool.spawn(spawnData(index)))
    for (const handle of handles) expect(pool.getProxy(handle)._enemyHit(1, null, handle.generation)).toBe(true)
    expect(calls).toBe(MAX_ENEMIES)
    expect(new Set(pool._hitHandlers).size).toBe(1)
  })
})
