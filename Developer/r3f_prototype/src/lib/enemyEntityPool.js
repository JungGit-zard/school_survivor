// 적 런타임의 정적 슬롯 풀. React/Three/Rapier 및 저장소에 의존하지 않는다.
export const MAX_ENEMIES = 200
export const MAX_ENEMY_GENERATION = 0xffff

export const ENEMY_TYPE_CODES = Object.freeze({
  E01: 1,
  E02: 2,
  E03: 3,
  E04: 4,
  E05: 5,
  E06: 6,
  RZL: 7,
  RZC: 8,
  B01: 9,
  B02: 10,
  B03: 11,
  B04: 12,
})

export const ENEMY_TYPE_NAMES = Object.freeze([
  '', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'B01', 'B02', 'B03', 'B04',
])

const MAX_GENERATION = MAX_ENEMY_GENERATION

function isKnownTypeCode(typeCode) {
  return Number.isInteger(typeCode) && typeCode > 0 && typeCode < ENEMY_TYPE_NAMES.length
}

export function enemyTypeToCode(type) {
  if (typeof type === 'string') return ENEMY_TYPE_CODES[type] ?? 0
  return isKnownTypeCode(type) ? type : 0
}

export function enemyTypeFromCode(typeCode) {
  return isKnownTypeCode(typeCode) ? ENEMY_TYPE_NAMES[typeCode] : null
}

// Map/Set key는 슬롯 index만 쓰면 재사용 세대와 충돌한다.
export function enemyEntityId(index, generation) {
  return generation * MAX_ENEMIES + index
}

function isFiniteValue(value) {
  return Number.isFinite(value)
}

function isStorableFloat(value) {
  return isFiniteValue(value) && Number.isFinite(Math.fround(value))
}

function readFinite(source, key, fallback) {
  const value = source[key]
  return value === undefined ? fallback : (isFiniteValue(value) ? value : null)
}

/**
 * 고정 크기 적 엔티티 풀이다. `spawnInto`와 `getHandleInto`는 프레임 루프용 무할당 API다.
 */
export class EnemyEntityPool {
  constructor() {
    this.active = new Uint8Array(MAX_ENEMIES)
    this.generation = new Uint16Array(MAX_ENEMIES)
    this.type = new Uint8Array(MAX_ENEMIES)
    this.posX = new Float32Array(MAX_ENEMIES)
    this.posY = new Float32Array(MAX_ENEMIES)
    this.posZ = new Float32Array(MAX_ENEMIES)
    this.velX = new Float32Array(MAX_ENEMIES)
    this.velZ = new Float32Array(MAX_ENEMIES)
    this.hp = new Float32Array(MAX_ENEMIES)
    this.maxHp = new Float32Array(MAX_ENEMIES)
    this.yaw = new Float32Array(MAX_ENEMIES)
    this.visualScale = new Float32Array(MAX_ENEMIES)
    this.phase = new Uint8Array(MAX_ENEMIES)
    this.state = new Uint8Array(MAX_ENEMIES)
    this.spawnTimer = new Float32Array(MAX_ENEMIES)
    this.stateTimer = new Float32Array(MAX_ENEMIES)
    this.attackCooldown = new Float32Array(MAX_ENEMIES)
    this.hitCooldown = new Float32Array(MAX_ENEMIES)
    this.lifetime = new Float32Array(MAX_ENEMIES)
    this.knockbackX = new Float32Array(MAX_ENEMIES)
    this.knockbackY = new Float32Array(MAX_ENEMIES)
    this.knockbackZ = new Float32Array(MAX_ENEMIES)
    this.knockbackTimer = new Float32Array(MAX_ENEMIES)
    this.hitFlashTimer = new Float32Array(MAX_ENEMIES)
    this.runDirX = new Float32Array(MAX_ENEMIES)
    this.runDirZ = new Float32Array(MAX_ENEMIES)
    this.lastContactX = new Float32Array(MAX_ENEMIES)
    this.lastContactY = new Float32Array(MAX_ENEMIES)
    this.lastContactZ = new Float32Array(MAX_ENEMIES)
    this.lastContactTime = new Float32Array(MAX_ENEMIES)

    this._freeNext = new Int16Array(MAX_ENEMIES)
    this._retired = new Uint8Array(MAX_ENEMIES)
    this._proxyActive = new Uint8Array(MAX_ENEMIES)
    this._hitHandlers = new Array(MAX_ENEMIES).fill(null)
    this._globalHitDispatcher = null
    this._freeHead = 0
    this._activeCount = 0
    this._highestActive = -1
    this._liveProxyCount = 0
    this.proxies = new Array(MAX_ENEMIES)
    this._translations = new Array(MAX_ENEMIES)

    for (let index = 0; index < MAX_ENEMIES; index += 1) {
      this._freeNext[index] = index + 1 < MAX_ENEMIES ? index + 1 : -1
      this.generation[index] = 1
      this._createStableProxy(index)
    }
  }

  get activeCount() {
    return this._activeCount
  }

  get highestActive() {
    return this._highestActive
  }

  get liveProxyCount() {
    return this._liveProxyCount
  }

  _createStableProxy(index) {
    const pool = this
    const translation = {}
    Object.defineProperties(translation, {
      x: { enumerable: true, get: () => pool.posX[index] },
      y: { enumerable: true, get: () => pool.posY[index] },
      z: { enumerable: true, get: () => pool.posZ[index] },
    })
    this._translations[index] = translation

    // 다음 통합에서는 모든 target caller가 handle generation을 전달해야 한다.
    // 2인자 legacy 호출을 허용하면 재사용 슬롯을 오래된 hit 참조가 때릴 수 있다.
    const hit = (damage, impact, expectedGeneration) => pool._hitProxy(index, damage, impact, expectedGeneration)
    const proxy = {
      index,
      translation: () => translation,
      getHandleInto: (out) => pool.getHandleInto(out, index),
    }
    Object.defineProperties(proxy, {
      generation: { enumerable: true, get: () => pool.generation[index] },
      _enemyId: { enumerable: true, get: () => enemyEntityId(index, pool.generation[index]) },
      _enemyType: { enumerable: true, get: () => enemyTypeFromCode(pool.type[index]) },
      _enemyDead: { enumerable: true, get: () => pool.active[index] === 0 },
      _enemyHit: {
        enumerable: true,
        get: () => (pool.active[index] && (pool._hitHandlers[index] || pool._globalHitDispatcher) ? hit : null),
        set: (handler) => {
          if (pool.active[index] && (typeof handler === 'function' || handler === null)) {
            pool._hitHandlers[index] = handler
          }
        },
      },
    })
    this.proxies[index] = proxy
  }

  _hitProxy(index, damage, impact, expectedGeneration) {
    if (!this.active[index] || !isStorableFloat(damage) || !Number.isInteger(expectedGeneration)
      || expectedGeneration !== this.generation[index]) return false
    const handler = this._hitHandlers[index]
    if (handler) handler(damage, impact)
    else if (this._globalHitDispatcher) this._globalHitDispatcher(index, expectedGeneration, damage, impact)
    else return false
    return true
  }

  spawn(source) {
    const handle = { index: -1, generation: 0 }
    return this.spawnInto(handle, source) ? handle : null
  }

  spawnInto(out, source) {
    if (!out || typeof out !== 'object' || this._freeHead < 0) return false
    if (!source || typeof source !== 'object') return false
    const typeCode = enemyTypeToCode(source.type)
    const x = readFinite(source, 'x', 0)
    const y = readFinite(source, 'y', 0)
    const z = readFinite(source, 'z', 0)
    const velX = readFinite(source, 'velX', 0)
    const velZ = readFinite(source, 'velZ', 0)
    const hp = readFinite(source, 'hp', 1)
    const maxHp = readFinite(source, 'maxHp', 1)
    const yaw = readFinite(source, 'yaw', 0)
    const visualScale = readFinite(source, 'visualScale', 1)
    const phase = readFinite(source, 'phase', 0)
    const state = readFinite(source, 'state', 0)
    const spawnTimer = readFinite(source, 'spawnTimer', 0)
    const stateTimer = readFinite(source, 'stateTimer', 0)
    const attackCooldown = readFinite(source, 'attackCooldown', 0)
    const hitCooldown = readFinite(source, 'hitCooldown', 0)
    const lifetime = readFinite(source, 'lifetime', 0)
    const knockbackX = readFinite(source, 'knockbackX', 0)
    const knockbackY = readFinite(source, 'knockbackY', 0)
    const knockbackZ = readFinite(source, 'knockbackZ', 0)
    const knockbackTimer = readFinite(source, 'knockbackTimer', 0)
    const hitFlashTimer = readFinite(source, 'hitFlashTimer', 0)
    const runDirX = readFinite(source, 'runDirX', 1)
    const runDirZ = readFinite(source, 'runDirZ', 0)
    const lastContactX = readFinite(source, 'lastContactX', 0)
    const lastContactY = readFinite(source, 'lastContactY', 0)
    const lastContactZ = readFinite(source, 'lastContactZ', 0)
    const lastContactTime = readFinite(source, 'lastContactTime', 0)
    if (!typeCode || x === null || y === null || z === null || velX === null || velZ === null || hp === null || maxHp === null
      || yaw === null || visualScale === null || phase === null || state === null || spawnTimer === null || stateTimer === null
      || attackCooldown === null || hitCooldown === null || lifetime === null || knockbackX === null || knockbackY === null
      || knockbackZ === null || knockbackTimer === null || lastContactX === null || lastContactY === null || lastContactZ === null
      || lastContactTime === null || hitFlashTimer === null || runDirX === null || runDirZ === null || !isStorableFloat(x) || !isStorableFloat(y) || !isStorableFloat(z)
      || !isStorableFloat(velX) || !isStorableFloat(velZ) || !isStorableFloat(hp) || !isStorableFloat(maxHp) || !isStorableFloat(yaw)
      || !isStorableFloat(visualScale) || !isStorableFloat(spawnTimer) || !isStorableFloat(stateTimer) || !isStorableFloat(attackCooldown)
      || !isStorableFloat(hitCooldown) || !isStorableFloat(lifetime) || !isStorableFloat(knockbackX) || !isStorableFloat(knockbackY)
      || !isStorableFloat(knockbackZ) || !isStorableFloat(knockbackTimer) || !isStorableFloat(lastContactX) || !isStorableFloat(lastContactY)
      || !isStorableFloat(lastContactZ) || !isStorableFloat(lastContactTime) || !isStorableFloat(hitFlashTimer) || !isStorableFloat(runDirX) || !isStorableFloat(runDirZ)
      || !Number.isInteger(phase) || phase < 0 || phase > 255 || !Number.isInteger(state) || state < 0 || state > 255
      || hp < 0 || maxHp <= 0 || hp > maxHp || visualScale < 0) return false
    const runLength = Math.hypot(runDirX, runDirZ)
    if (!isFiniteValue(runLength)) return false

    const index = this._freeHead
    this._freeHead = this._freeNext[index]
    this._freeNext[index] = -1
    this.active[index] = 1
    this._proxyActive[index] = 1
    this.type[index] = typeCode
    this.posX[index] = x
    this.posY[index] = y
    this.posZ[index] = z
    this.velX[index] = velX
    this.velZ[index] = velZ
    this.hp[index] = hp
    this.maxHp[index] = maxHp
    this.yaw[index] = yaw
    this.visualScale[index] = visualScale
    this.phase[index] = phase
    this.state[index] = state
    this.spawnTimer[index] = spawnTimer
    this.stateTimer[index] = stateTimer
    this.attackCooldown[index] = attackCooldown
    this.hitCooldown[index] = hitCooldown
    this.lifetime[index] = lifetime
    this.knockbackX[index] = knockbackX
    this.knockbackY[index] = knockbackY
    this.knockbackZ[index] = knockbackZ
    this.knockbackTimer[index] = knockbackTimer
    this.hitFlashTimer[index] = hitFlashTimer
    this.runDirX[index] = runLength > 1e-8 ? runDirX / runLength : 1
    this.runDirZ[index] = runLength > 1e-8 ? runDirZ / runLength : 0
    this.lastContactX[index] = lastContactX
    this.lastContactY[index] = lastContactY
    this.lastContactZ[index] = lastContactZ
    this.lastContactTime[index] = lastContactTime
    this._activeCount += 1
    this._liveProxyCount += 1
    if (index > this._highestActive) this._highestActive = index
    out.index = index
    out.generation = this.generation[index]
    return true
  }

  isHandleAlive(handle) {
    return Boolean(handle
      && Number.isInteger(handle.index)
      && handle.index >= 0
      && handle.index < MAX_ENEMIES
      && Number.isInteger(handle.generation)
      && handle.generation !== 0
      && this.active[handle.index]
      && this.generation[handle.index] === handle.generation)
  }

  isIndexGenerationAlive(index, generation) {
    return Number.isInteger(index) && index >= 0 && index < MAX_ENEMIES
      && Number.isInteger(generation) && generation !== 0
      && this.active[index] === 1 && this.generation[index] === generation
  }

  get(handle) {
    return this.isHandleAlive(handle) ? this.proxies[handle.index] : null
  }

  getProxy(handle) {
    return this.get(handle)
  }

  getHandleInto(out, index) {
    if (!out || typeof out !== 'object' || !Number.isInteger(index) || index < 0 || index >= MAX_ENEMIES || !this.active[index]) {
      return false
    }
    out.index = index
    out.generation = this.generation[index]
    return true
  }

  getHandle(index) {
    const handle = { index: -1, generation: 0 }
    return this.getHandleInto(handle, index) ? handle : null
  }

  setHitHandler(handle, handler) {
    if (!this.isHandleAlive(handle) || (typeof handler !== 'function' && handler !== null)) return false
    this._hitHandlers[handle.index] = handler
    return true
  }

  // 표준 pooled 적은 슬롯마다 closure를 만들지 않는다. dispatcher는 index/generation을 받는다.
  setGlobalHitDispatcher(dispatcher) {
    if (typeof dispatcher !== 'function' && dispatcher !== null) return false
    this._globalHitDispatcher = dispatcher
    return true
  }

  hit(handle, damage, impact) {
    if (!this.isHandleAlive(handle) || !isStorableFloat(damage)) return false
    const handler = this._hitHandlers[handle.index]
    if (handler) handler(damage, impact)
    else if (this._globalHitDispatcher) this._globalHitDispatcher(handle.index, handle.generation, damage, impact)
    else return false
    return true
  }

  despawn(handle) {
    if (!this.isHandleAlive(handle)) return false
    return this.despawnIndex(handle.index, handle.generation)
  }

  // 시뮬레이션 루프는 handle 객체를 만들지 않고 이 scalar API를 사용한다.
  despawnIndex(index, generation) {
    if (!this.isIndexGenerationAlive(index, generation)) return false
    this.active[index] = 0
    this._proxyActive[index] = 0
    this._hitHandlers[index] = null
    this._resetSlotNumbers(index)
    this._activeCount -= 1
    this._liveProxyCount -= 1

    if (this.generation[index] === MAX_GENERATION) {
      // 0으로 되돌아가면 오래된 핸들이 다시 유효해진다. 해당 슬롯은 안전하게 은퇴한다.
      this._retired[index] = 1
    } else {
      this.generation[index] += 1
      this._freeNext[index] = this._freeHead
      this._freeHead = index
    }
    if (index === this._highestActive) this._findHighestActive()
    return true
  }

  _resetSlotNumbers(index) {
    this.type[index] = 0
    this.posX[index] = 0
    this.posY[index] = 0
    this.posZ[index] = 0
    this.velX[index] = 0
    this.velZ[index] = 0
    this.hp[index] = 0
    this.maxHp[index] = 0
    this.yaw[index] = 0
    this.visualScale[index] = 0
    this.phase[index] = 0
    this.state[index] = 0
    this.spawnTimer[index] = 0
    this.stateTimer[index] = 0
    this.attackCooldown[index] = 0
    this.hitCooldown[index] = 0
    this.lifetime[index] = 0
    this.knockbackX[index] = 0
    this.knockbackY[index] = 0
    this.knockbackZ[index] = 0
    this.knockbackTimer[index] = 0
    this.hitFlashTimer[index] = 0
    this.runDirX[index] = 0
    this.runDirZ[index] = 0
    this.lastContactX[index] = 0
    this.lastContactY[index] = 0
    this.lastContactZ[index] = 0
    this.lastContactTime[index] = 0
  }

  _findHighestActive() {
    let index = this._highestActive
    while (index >= 0 && !this.active[index]) index -= 1
    this._highestActive = index
  }

  setPosition(handle, x, y, z) {
    if (!this.isHandleAlive(handle) || !isStorableFloat(x) || !isStorableFloat(y) || !isStorableFloat(z)) return false
    const index = handle.index
    this.posX[index] = x
    this.posY[index] = y
    this.posZ[index] = z
    return true
  }

  setVelocity(handle, x, z) {
    if (!this.isHandleAlive(handle) || !isStorableFloat(x) || !isStorableFloat(z)) return false
    this.velX[handle.index] = x
    this.velZ[handle.index] = z
    return true
  }

  integrate(handle, deltaSeconds) {
    if (!this.isHandleAlive(handle) || !isFiniteValue(deltaSeconds) || deltaSeconds < 0) return false
    const index = handle.index
    const nextX = Math.fround(this.posX[index] + this.velX[index] * deltaSeconds)
    const nextZ = Math.fround(this.posZ[index] + this.velZ[index] * deltaSeconds)
    if (!isFiniteValue(nextX) || !isFiniteValue(nextZ)) return false
    this.posX[index] = nextX
    this.posZ[index] = nextZ
    return true
  }

  nextActiveIndex(startIndex = 0) {
    const start = Number.isInteger(startIndex) ? Math.max(0, startIndex) : 0
    for (let index = start; index <= this._highestActive; index += 1) {
      if (this.active[index]) return index
    }
    return -1
  }

  forEachActive(visitor, thisArg) {
    if (typeof visitor !== 'function') return 0
    let visited = 0
    for (let index = 0; index <= this._highestActive; index += 1) {
      if (!this.active[index]) continue
      visitor.call(thisArg, index, this.generation[index], this.proxies[index])
      visited += 1
    }
    return visited
  }

  validateInvariants(bounds) {
    let minX = -Infinity
    let maxX = Infinity
    let minZ = -Infinity
    let maxZ = Infinity
    if (bounds !== undefined) {
      if (!bounds || typeof bounds !== 'object') return false
      if (bounds.minX !== undefined || bounds.maxX !== undefined || bounds.minZ !== undefined || bounds.maxZ !== undefined) {
        minX = bounds.minX
        maxX = bounds.maxX
        minZ = bounds.minZ
        maxZ = bounds.maxZ
        if (!isFiniteValue(minX) || !isFiniteValue(maxX) || !isFiniteValue(minZ) || !isFiniteValue(maxZ)
          || minX > maxX || minZ > maxZ) return false
      } else {
        const halfX = bounds.halfX
        const halfZ = bounds.halfZ
        const padding = bounds.padding === undefined ? 0 : bounds.padding
        if (!isFiniteValue(halfX) || !isFiniteValue(halfZ) || !isFiniteValue(padding)
          || halfX < 0 || halfZ < 0 || padding < 0) return false
        minX = -halfX - padding
        maxX = halfX + padding
        minZ = -halfZ - padding
        maxZ = halfZ + padding
      }
    }
    let activeCount = 0
    let liveProxyCount = 0
    let highest = -1
    for (let index = 0; index < MAX_ENEMIES; index += 1) {
      const isActive = this.active[index] === 1
      if (this.active[index] > 1 || this._proxyActive[index] > 1 || this.generation[index] === 0) return false
      if (isActive) {
        activeCount += 1
        highest = index
        if (this._proxyActive[index] !== 1 || !isKnownTypeCode(this.type[index])) return false
        if (!isFiniteValue(this.posX[index]) || !isFiniteValue(this.posY[index]) || !isFiniteValue(this.posZ[index])
          || !isFiniteValue(this.velX[index]) || !isFiniteValue(this.velZ[index])
          || !isFiniteValue(this.hp[index]) || !isFiniteValue(this.maxHp[index])
          || !isFiniteValue(this.yaw[index]) || !isFiniteValue(this.visualScale[index])
          || !isFiniteValue(this.runDirX[index]) || !isFiniteValue(this.runDirZ[index])
          || !isFiniteValue(this.hitFlashTimer[index])) return false
        if (this.hp[index] < 0 || this.maxHp[index] <= 0 || this.hp[index] > this.maxHp[index] || this.visualScale[index] < 0) return false
        if (this.posX[index] < minX || this.posX[index] > maxX || this.posZ[index] < minZ || this.posZ[index] > maxZ) return false
      }
      if (this._proxyActive[index]) liveProxyCount += 1
    }
    return activeCount === this._activeCount
      && liveProxyCount === this._liveProxyCount
      && liveProxyCount === activeCount
      && highest === this._highestActive
  }

  assertInvariants(bounds) {
    if (!this.validateInvariants(bounds)) throw new Error('EnemyEntityPool 불변식 위반')
    return true
  }

  reset() {
    this._freeHead = -1
    this._activeCount = 0
    this._highestActive = -1
    this._liveProxyCount = 0
    for (let index = MAX_ENEMIES - 1; index >= 0; index -= 1) {
      this.active[index] = 0
      this._proxyActive[index] = 0
      this._hitHandlers[index] = null
      this._resetSlotNumbers(index)
      // reset 뒤에도 예전 핸들은 새 슬롯을 가리키면 안 된다.
      if (this.generation[index] === 0 || this.generation[index] === MAX_GENERATION) {
        this._retired[index] = 1
        this._freeNext[index] = -1
      } else {
        this.generation[index] += 1
        this._retired[index] = 0
        this._freeNext[index] = this._freeHead
        this._freeHead = index
      }
    }
  }
}

export function createEnemyEntityPool() {
  return new EnemyEntityPool()
}
