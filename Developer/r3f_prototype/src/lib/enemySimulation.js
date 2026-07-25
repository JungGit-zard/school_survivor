import { MAX_ENEMIES } from './enemyEntityPool.js'
import {
  STAGE2_E04_FIRST_FIRE_DELAY_MS,
  STAGE2_E04_INTRO_SEC,
  STAGE2_E04_MAX_PROJECTILES,
  STAGE2_E04_MIN_FIRE_DISTANCE,
  STAGE4_E04_INTRO_SEC,
} from './stage2ProjectileRules.js'

export const ENEMY_SIZE_MULTIPLIER = 4 / 3
export const ENEMY_SPAWN_REVEAL_MS = 300
export const ENEMY_CONTACT_COOLDOWN_MS = 500
// E04 이동·쿨다운 정본. 다음 통합에서 Enemy.jsx도 이 값을 import한다.
export const E04_RUNTIME_SPEED = 0.45
export const E04_FIRE_COOLDOWN_MS = 2200
export const E04_PREFER_DISTANCE = 5.5
export const E04_FIRST_FIRE_DELAY_MS = STAGE2_E04_FIRST_FIRE_DELAY_MS
export const E04_MAX_PROJECTILES = STAGE2_E04_MAX_PROJECTILES
export const E04_MIN_FIRE_DISTANCE = STAGE2_E04_MIN_FIRE_DISTANCE
export const E05_WARN_DISTANCE = 4.5
export const E05_WARN_MS = 700
export const E05_CHARGE_MS = 1200
export const E05_STUN_MS = 1000

export const ENEMY_PHASE_REVEAL = 1
export const ENEMY_PHASE_ACTIVE = 2
export const ENEMY_STATE_CHASE = 1
export const ENEMY_STATE_WARN = 2
export const ENEMY_STATE_CHARGE = 3
export const ENEMY_STATE_STUN = 4

export const ENEMY_EVENT_CONTACT = 1
export const ENEMY_EVENT_RANGED_FIRE = 2
export const ENEMY_EVENT_DESPAWN = 3
export const ENEMY_EVENT_DEATH = 4
export const ENEMY_EVENT_ERROR = 5

export const ENEMY_GRID_CELL_SIZE = 2
export const ENEMY_GRID_MAX_AXIS = 64
export const ENEMY_EVENT_CAPACITY = 512

// JSX ENEMY_STATS와 수치를 맞춘 순수 런타임 lookup. 다음 통합 단계에서 Enemy.jsx가 이 정본을 import한다.
export const ENEMY_RUNTIME_HP = new Float32Array([0, 8, 70, 14, 32, 70, 320, 90, 28])
export const ENEMY_RUNTIME_SPEED = new Float32Array([0, 0.475, 0.385, 1.1, 0.45, 0.5, 0.6, 2.45, 2.18])
export const ENEMY_RUNTIME_DAMAGE = new Float32Array([0, 8, 14, 6, 8, 16, 20, 14, 7])
export const ENEMY_RUNTIME_SCALE = new Float32Array([0, 1, 1.4, 0.75, 0.9, 1.15, 1.6, 1.08, 0.78])
export const ENEMY_RUNTIME_XP = new Float32Array([0, 6, 15, 5, 10, 15, 56, 12, 5])
export const ENEMY_RUNTIME_CONTACT_DIST = new Float32Array([0, 0.28, 0.36, 0.22, 0.26, 0.32, 0.42, 0.28, 0.22])

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function isStorableFloat(value) {
  return isFiniteNumber(value) && Number.isFinite(Math.fround(value))
}

function hasFiniteSlot(pool, index) {
  return isStorableFloat(pool.posX[index]) && isStorableFloat(pool.posY[index]) && isStorableFloat(pool.posZ[index])
    && isStorableFloat(pool.velX[index]) && isStorableFloat(pool.velZ[index]) && isStorableFloat(pool.hp[index])
    && isStorableFloat(pool.maxHp[index]) && isStorableFloat(pool.yaw[index]) && isStorableFloat(pool.visualScale[index])
    && isStorableFloat(pool.spawnTimer[index]) && isStorableFloat(pool.stateTimer[index]) && isStorableFloat(pool.attackCooldown[index])
    && isStorableFloat(pool.hitCooldown[index]) && isStorableFloat(pool.lifetime[index]) && isStorableFloat(pool.knockbackX[index])
    && isStorableFloat(pool.knockbackY[index]) && isStorableFloat(pool.knockbackZ[index]) && isStorableFloat(pool.knockbackTimer[index])
    && isStorableFloat(pool.hitFlashTimer[index]) && isStorableFloat(pool.runDirX[index]) && isStorableFloat(pool.runDirZ[index])
    && isStorableFloat(pool.lastContactX[index]) && isStorableFloat(pool.lastContactY[index]) && isStorableFloat(pool.lastContactZ[index])
    && isStorableFloat(pool.lastContactTime[index])
}

function isRunCrew(type) {
  return type === 7 || type === 8
}

function isMelee(type) {
  return type === 1 || type === 2 || type === 3 || type === 5 || type === 6 || type === 7 || type === 8
}

function contactDistance(type) {
  return ENEMY_RUNTIME_CONTACT_DIST[type] * ENEMY_SIZE_MULTIPLIER
}

function clamp(value, min, max) {
  return value < min ? min : (value > max ? max : value)
}

/** 고정 typed-array 공간 해시. 매 프레임 rebuild해도 배열/객체를 만들지 않는다. */
export class EnemySpatialGrid {
  constructor(cellSize = ENEMY_GRID_CELL_SIZE) {
    this.cellSize = cellSize
    this.head = new Int16Array(ENEMY_GRID_MAX_AXIS * ENEMY_GRID_MAX_AXIS)
    this.next = new Int16Array(MAX_ENEMIES)
    this.cellX = new Int16Array(MAX_ENEMIES)
    this.cellZ = new Int16Array(MAX_ENEMIES)
    this.overflow = new Uint8Array(MAX_ENEMIES)
    this.cellsX = 0
    this.cellsZ = 0
    this.halfX = 0
    this.halfZ = 0
    this.comparisonCount = 0
    this.head.fill(-1)
    this.next.fill(-1)
  }

  rebuild(pool, halfX, halfZ) {
    this.head.fill(-1)
    this.next.fill(-1)
    this.overflow.fill(0)
    this.comparisonCount = 0
    this.halfX = halfX
    this.halfZ = halfZ
    this.cellsX = Math.min(ENEMY_GRID_MAX_AXIS, Math.max(1, Math.ceil((halfX * 2) / this.cellSize)))
    this.cellsZ = Math.min(ENEMY_GRID_MAX_AXIS, Math.max(1, Math.ceil((halfZ * 2) / this.cellSize)))
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      const x = Math.floor((pool.posX[index] + halfX) / this.cellSize)
      const z = Math.floor((pool.posZ[index] + halfZ) / this.cellSize)
      if (x < 0 || z < 0 || x >= this.cellsX || z >= this.cellsZ) {
        this.overflow[index] = 1
        continue
      }
      this.cellX[index] = x
      this.cellZ[index] = z
      const cell = z * ENEMY_GRID_MAX_AXIS + x
      this.next[index] = this.head[cell]
      this.head[cell] = index
    }
  }

  reset() {
    this.head.fill(-1)
    this.next.fill(-1)
    this.cellX.fill(0)
    this.cellZ.fill(0)
    this.overflow.fill(0)
    this.cellsX = 0
    this.cellsZ = 0
    this.halfX = 0
    this.halfZ = 0
    this.comparisonCount = 0
  }
}

/** 이벤트는 drainInto(out)로 읽는다. 꽉 차면 덮어쓰지 않고 dropped만 증가한다. */
export class EnemyEventQueue {
  constructor(capacity = ENEMY_EVENT_CAPACITY) {
    this.capacity = capacity
    this.type = new Uint8Array(capacity)
    this.index = new Int16Array(capacity)
    this.generation = new Uint16Array(capacity)
    this.x = new Float32Array(capacity)
    this.y = new Float32Array(capacity)
    this.z = new Float32Array(capacity)
    this.value = new Float32Array(capacity)
    this.aux = new Float32Array(capacity)
    this.read = 0
    this.write = 0
    this.count = 0
    this.dropped = 0
  }

  push(type, index, generation, x = 0, y = 0, z = 0, value = 0, aux = 0) {
    if (this.count >= this.capacity || !isStorableFloat(x) || !isStorableFloat(y) || !isStorableFloat(z)
      || !isStorableFloat(value) || !isStorableFloat(aux)) {
      this.dropped += 1
      return false
    }
    const slot = this.write
    this.type[slot] = type
    this.index[slot] = index
    this.generation[slot] = generation
    this.x[slot] = x
    this.y[slot] = y
    this.z[slot] = z
    this.value[slot] = value
    this.aux[slot] = aux
    this.write = (slot + 1) % this.capacity
    this.count += 1
    return true
  }

  drainInto(out) {
    if (!out || typeof out !== 'object' || this.count === 0) return false
    const slot = this.read
    out.type = this.type[slot]
    out.index = this.index[slot]
    out.generation = this.generation[slot]
    out.x = this.x[slot]
    out.y = this.y[slot]
    out.z = this.z[slot]
    out.value = this.value[slot]
    out.aux = this.aux[slot]
    this.read = (slot + 1) % this.capacity
    this.count -= 1
    return true
  }

  reset() {
    this.type.fill(0)
    this.index.fill(0)
    this.generation.fill(0)
    this.x.fill(0)
    this.y.fill(0)
    this.z.fill(0)
    this.value.fill(0)
    this.aux.fill(0)
    this.read = 0
    this.write = 0
    this.count = 0
    this.dropped = 0
  }
}

export function resolveRangedEnemyVelocityRaw(out, dirX, dirZ, distance, strafeSign = 1) {
  const length = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / length
  const nz = dirZ / length
  if (distance < E04_MIN_FIRE_DISTANCE) {
    out.x = -nx * E04_RUNTIME_SPEED
    out.z = -nz * E04_RUNTIME_SPEED
  } else if (distance > E04_PREFER_DISTANCE) {
    out.x = nx * E04_RUNTIME_SPEED
    out.z = nz * E04_RUNTIME_SPEED
  } else {
    const side = strafeSign >= 0 ? 1 : -1
    out.x = -nz * E04_RUNTIME_SPEED * 0.75 * side
    out.z = nx * E04_RUNTIME_SPEED * 0.75 * side
  }
  return out
}

function isE04FireAllowed(context, ageMs, cooldownMs, distance, projectileCount) {
  const stageId = context.stageId === undefined ? 'stage2' : context.stageId
  const introSec = context.e04IntroSec === undefined ? (stageId === 'stage4' ? STAGE4_E04_INTRO_SEC : STAGE2_E04_INTRO_SEC) : context.e04IntroSec
  return context.elapsedSec >= introSec
    && ageMs >= E04_FIRST_FIRE_DELAY_MS
    && projectileCount < E04_MAX_PROJECTILES
    && distance >= E04_MIN_FIRE_DISTANCE
    && !context.bossPressure
    && cooldownMs <= 0
}

function collidesObstacle(x, z, radius, obstacles, obstacleCount) {
  for (let obstacleIndex = 0; obstacleIndex < obstacleCount; obstacleIndex += 1) {
    const obstacle = obstacles[obstacleIndex]
    if (!obstacle || !isFiniteNumber(obstacle.x) || !isFiniteNumber(obstacle.z)
      || !isFiniteNumber(obstacle.halfX) || !isFiniteNumber(obstacle.halfZ)) continue
    if (x >= obstacle.x - obstacle.halfX - radius && x <= obstacle.x + obstacle.halfX + radius
      && z >= obstacle.z - obstacle.halfZ - radius && z <= obstacle.z + obstacle.halfZ + radius) return true
  }
  return false
}

export class EnemySimulationRuntime {
  constructor() {
    this.grid = new EnemySpatialGrid()
    this.events = new EnemyEventQueue()
    this._velocityScratch = { x: 0, z: 0 }
  }

  _emit(type, pool, index, x, y, z, value, callback) {
    const generation = pool.generation[index]
    this.events.push(type, index, generation, x, y, z, value)
    if (callback) callback(index, generation, x, y, z, value)
  }

  reset() {
    this.grid.reset()
    this.events.reset()
  }

  _despawn(pool, index, eventType, value = 0, callback) {
    const generation = pool.generation[index]
    const x = isStorableFloat(pool.posX[index]) ? pool.posX[index] : 0
    const y = isStorableFloat(pool.posY[index]) ? pool.posY[index] : 0
    const z = isStorableFloat(pool.posZ[index]) ? pool.posZ[index] : 0
    this.events.push(eventType, index, generation, x, y, z, value)
    if (callback) callback(index, generation, x, y, z, value)
    pool.despawnIndex(index, generation)
  }

  _isolateAll(pool) {
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (pool.active[index]) this._despawn(pool, index, ENEMY_EVENT_ERROR, 0, null)
    }
    return false
  }

  step(pool, context) {
    if (!pool || !context || typeof context !== 'object') return false
    const rawDelta = context.delta
    const playerX = context.playerX
    const playerZ = context.playerZ
    const halfX = context.halfX
    const halfZ = context.halfZ
    const elapsedSec = context.elapsedSec
    const initialProjectileCount = context.activeProjectileCount === undefined ? 0 : context.activeProjectileCount
    if (!isFiniteNumber(rawDelta) || !isFiniteNumber(playerX) || !isFiniteNumber(playerZ)
      || !isFiniteNumber(halfX) || !isFiniteNumber(halfZ) || halfX <= 0 || halfZ <= 0
      || !isFiniteNumber(elapsedSec) || elapsedSec < 0 || !Number.isInteger(initialProjectileCount) || initialProjectileCount < 0) return this._isolateAll(pool)
    const delta = Math.min(rawDelta, 1 / 30)
    if (delta < 0) return this._isolateAll(pool)
    const deltaMs = delta * 1000
    const obstacles = context.obstacles
    const obstacleCount = obstacles && Number.isInteger(context.obstacleCount) ? Math.max(0, context.obstacleCount) : 0
    const sightBlocked = context.sightBlocked
    let stepProjectileCount = initialProjectileCount
    this.grid.rebuild(pool, halfX + 6, halfZ + 6)

    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      if (pool.type[index] < 1 || pool.type[index] > 8 || !hasFiniteSlot(pool, index)) {
        this._despawn(pool, index, ENEMY_EVENT_ERROR, 0, null)
        continue
      }

      const type = pool.type[index]
      const generation = pool.generation[index]
      pool.spawnTimer[index] += deltaMs
      pool.hitFlashTimer[index] = Math.max(0, pool.hitFlashTimer[index] - deltaMs)
      pool.hitCooldown[index] = Math.max(0, pool.hitCooldown[index] - deltaMs)
      pool.attackCooldown[index] = Math.max(0, pool.attackCooldown[index] - deltaMs)
      if (pool.stateTimer[index] > 0) pool.stateTimer[index] = Math.max(0, pool.stateTimer[index] - deltaMs)

      if (pool.spawnTimer[index] < ENEMY_SPAWN_REVEAL_MS) {
        pool.phase[index] = ENEMY_PHASE_REVEAL
        pool.velX[index] = 0
        pool.velZ[index] = 0
        continue
      }
      pool.phase[index] = ENEMY_PHASE_ACTIVE

      const posX = pool.posX[index]
      const posZ = pool.posZ[index]
      const dirX = playerX - posX
      const dirZ = playerZ - posZ
      const distance = Math.hypot(dirX, dirZ)
      const nx = distance > 1e-8 ? dirX / distance : 0
      const nz = distance > 1e-8 ? dirZ / distance : 0
      let velocityX = 0
      let velocityZ = 0
      let moving = false

      if (isRunCrew(type)) {
        velocityX = pool.runDirX[index] * ENEMY_RUNTIME_SPEED[type]
        velocityZ = pool.runDirZ[index] * ENEMY_RUNTIME_SPEED[type]
        moving = true
      } else if (pool.knockbackTimer[index] > 0) {
        pool.knockbackTimer[index] = Math.max(0, pool.knockbackTimer[index] - deltaMs)
        velocityX = pool.knockbackX[index]
        velocityZ = pool.knockbackZ[index]
        moving = true
      } else if (type === 4) {
        resolveRangedEnemyVelocityRaw(this._velocityScratch, dirX, dirZ, distance, (index & 1) === 0 ? 1 : -1)
        velocityX = this._velocityScratch.x
        velocityZ = this._velocityScratch.z
        moving = true
        if (isE04FireAllowed(context, pool.spawnTimer[index], pool.attackCooldown[index], distance, stepProjectileCount)) {
          if (this.events.push(ENEMY_EVENT_RANGED_FIRE, index, generation, posX, pool.posY[index], posZ, nx, nz)) {
            stepProjectileCount += 1
            pool.attackCooldown[index] = E04_FIRE_COOLDOWN_MS
            if (context.onRangedFire) context.onRangedFire(index, generation, posX, pool.posY[index], posZ, nx, nz)
          }
        }
      } else if (type === 5) {
        let state = pool.state[index] || ENEMY_STATE_CHASE
        if (state === ENEMY_STATE_CHASE && distance < E05_WARN_DISTANCE) {
          state = ENEMY_STATE_WARN
          pool.state[index] = state
          pool.stateTimer[index] = E05_WARN_MS
        }
        if (state === ENEMY_STATE_WARN && pool.stateTimer[index] <= 0) {
          state = ENEMY_STATE_CHARGE
          pool.state[index] = state
          pool.stateTimer[index] = E05_CHARGE_MS
          pool.runDirX[index] = nx || 1
          pool.runDirZ[index] = nz
        }
        if (state === ENEMY_STATE_CHARGE && (distance <= contactDistance(type) || pool.stateTimer[index] <= 0)) {
          state = ENEMY_STATE_STUN
          pool.state[index] = state
          pool.stateTimer[index] = E05_STUN_MS
        }
        if (state === ENEMY_STATE_STUN && pool.stateTimer[index] <= 0) {
          state = ENEMY_STATE_CHASE
          pool.state[index] = state
        }
        if (state === ENEMY_STATE_CHASE) {
          velocityX = nx * ENEMY_RUNTIME_SPEED[type]
          velocityZ = nz * ENEMY_RUNTIME_SPEED[type]
          moving = true
        } else if (state === ENEMY_STATE_CHARGE) {
          velocityX = pool.runDirX[index] * 1.7
          velocityZ = pool.runDirZ[index] * 1.7
          moving = true
        }
      } else {
        if (distance < contactDistance(type) && isMelee(type)) {
          velocityX = 0
          velocityZ = 0
        } else {
          velocityX = nx * ENEMY_RUNTIME_SPEED[type]
          velocityZ = nz * ENEMY_RUNTIME_SPEED[type]
          moving = true
        }
      }

      if (sightBlocked && sightBlocked[index] && !isRunCrew(type) && pool.knockbackTimer[index] <= 0) {
        const side = ((index + generation) & 1) === 0 ? 1 : -1
        velocityX = -nz * side * ENEMY_RUNTIME_SPEED[type] * 0.55
        velocityZ = nx * side * ENEMY_RUNTIME_SPEED[type] * 0.55
        moving = true
      }

      // 인접 3x3 셀에서 최대 24명만 조사해 밀집 상태도 O(N²)로 악화되지 않게 한다.
      if (!this.grid.overflow[index]) {
        let neighbors = 0
        for (let cellZ = this.grid.cellZ[index] - 1; cellZ <= this.grid.cellZ[index] + 1 && neighbors < 24; cellZ += 1) {
          if (cellZ < 0 || cellZ >= this.grid.cellsZ) continue
          for (let cellX = this.grid.cellX[index] - 1; cellX <= this.grid.cellX[index] + 1 && neighbors < 24; cellX += 1) {
            if (cellX < 0 || cellX >= this.grid.cellsX) continue
            let other = this.grid.head[cellZ * ENEMY_GRID_MAX_AXIS + cellX]
            while (other >= 0 && neighbors < 24) {
              if (other !== index && pool.active[other]) {
                const dx = posX - pool.posX[other]
                const dz = posZ - pool.posZ[other]
                const distSq = dx * dx + dz * dz
                this.grid.comparisonCount += 1
                neighbors += 1
                if (distSq < 0.64) {
                  if (distSq <= 1e-8) {
                    const side = index < other ? -1 : 1
                    velocityX += side * 0.68
                  } else {
                    const length = Math.sqrt(distSq)
                    const separation = (0.8 - length) * 0.85
                    velocityX += dx / length * separation
                    velocityZ += dz / length * separation
                  }
                }
              }
              other = this.grid.next[other]
            }
          }
        }
      }

      if (moving && (velocityX !== 0 || velocityZ !== 0)) pool.yaw[index] = Math.atan2(velocityX, velocityZ)
      pool.velX[index] = velocityX
      pool.velZ[index] = velocityZ
      let nextX = posX + velocityX * delta
      let nextZ = posZ + velocityZ * delta
      // visualScale은 렌더 전용이다. 충돌 반경은 기존 BASE_COL XZ=0.28과 타입 scale 정본을 쓴다.
      const radius = 0.28 * ENEMY_RUNTIME_SCALE[type] * ENEMY_SIZE_MULTIPLIER
      if (!isRunCrew(type)) {
        nextX = clamp(nextX, -halfX + radius, halfX - radius)
        nextZ = clamp(nextZ, -halfZ + radius, halfZ - radius)
      }
      if (obstacleCount > 0 && obstacles) {
        if (collidesObstacle(nextX, posZ, radius, obstacles, obstacleCount)) nextX = posX
        if (collidesObstacle(nextX, nextZ, radius, obstacles, obstacleCount)) nextZ = posZ
      }
      pool.posX[index] = nextX
      pool.posZ[index] = nextZ

      if (isRunCrew(type) && (Math.abs(nextX) > halfX + 6 || Math.abs(nextZ) > halfZ + 6)) {
        this._despawn(pool, index, ENEMY_EVENT_DESPAWN, 0, context.onDespawn)
        continue
      }
      if (isMelee(type) && distance <= contactDistance(type) && pool.hitCooldown[index] <= 0) {
        pool.hitCooldown[index] = ENEMY_CONTACT_COOLDOWN_MS
        pool.lastContactX[index] = playerX
        pool.lastContactZ[index] = playerZ
        this._emit(ENEMY_EVENT_CONTACT, pool, index, playerX, 0, playerZ, ENEMY_RUNTIME_DAMAGE[type], context.onContact)
      }
    }
    return true
  }

  applyHit(pool, handle, damage, knockbackX = 0, knockbackZ = 0, knockbackMs = 0) {
    if (!pool || !pool.isHandleAlive(handle)) return false
    return this.applyHitIndex(pool, handle.index, handle.generation, damage, knockbackX, knockbackZ, knockbackMs)
  }

  applyHitIndex(pool, index, generation, damage, knockbackX = 0, knockbackZ = 0, knockbackMs = 0) {
    if (!pool || !pool.isIndexGenerationAlive(index, generation) || !isStorableFloat(damage) || damage < 0
      || !isStorableFloat(knockbackX) || !isStorableFloat(knockbackZ) || !isStorableFloat(knockbackMs) || knockbackMs < 0) return false
    pool.hp[index] = Math.max(0, pool.hp[index] - damage)
    pool.hitFlashTimer[index] = 90
    pool.knockbackX[index] = knockbackX
    pool.knockbackZ[index] = knockbackZ
    pool.knockbackTimer[index] = knockbackMs
    if (pool.hp[index] > 0) return true
    this._despawn(pool, index, ENEMY_EVENT_DEATH, damage, null)
    return true
  }
}

export function createEnemySimulationRuntime() {
  return new EnemySimulationRuntime()
}

const defaultEnemySimulationRuntime = new EnemySimulationRuntime()

export function resetDefaultEnemySimulationRuntime() {
  defaultEnemySimulationRuntime.reset()
}

export function stepEnemySimulation(pool, context, runtime) {
  return (runtime || defaultEnemySimulationRuntime).step(pool, context)
}
