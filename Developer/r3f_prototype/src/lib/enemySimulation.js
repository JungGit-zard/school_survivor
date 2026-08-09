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
export const ENEMY_OBSTACLE_EPSILON = 0.002
export const ENEMY_OBSTACLE_RESOLVE_STEPS = 4
export const ENEMY_STUCK_DETOUR_MS = 500
export const ENEMY_STUCK_RECOVERY_MS = 1200
export const ENEMY_STUCK_MOVE_EPSILON_SQ = 1e-6

// JSX ENEMY_STATS와 수치를 맞춘 순수 런타임 lookup. 다음 통합 단계에서 Enemy.jsx가 이 정본을 import한다.
export const ENEMY_RUNTIME_HP = new Float32Array([0, 8, 70, 10, 32, 70, 320, 90, 28, 0, 0, 0, 0, 28, 48])
export const ENEMY_RUNTIME_SPEED = new Float32Array([0, 0.475, 0.385, 1.1, 0.45, 0.5, 0.6, 2.45, 2.18, 0, 0, 0, 0, 1.275, 1.225])
export const ENEMY_RUNTIME_DAMAGE = new Float32Array([0, 8, 14, 6, 8, 16, 20, 14, 7, 0, 0, 0, 0, 6, 9])
export const ENEMY_RUNTIME_SCALE = new Float32Array([0, 1, 1.4, 0.75, 0.9, 1.15, 1.6, 1.08, 0.78, 0, 0, 0, 0, 0.88, 0.92])
export const ENEMY_RUNTIME_XP = new Float32Array([0, 4, 15, 5, 10, 15, 56, 12, 5, 0, 0, 0, 0, 5, 6])
export const ENEMY_RUNTIME_CONTACT_DIST = new Float32Array([0, 0.28, 0.36, 0.22, 0.26, 0.32, 0.42, 0.28, 0.22, 0, 0, 0, 0, 0.22, 0.24])

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
    && isStorableFloat(pool.lastContactTime[index]) && isStorableFloat(pool.stuckMs[index])
    && isStorableFloat(pool.detourMs[index]) && isStorableFloat(pool.lastSafeX[index]) && isStorableFloat(pool.lastSafeZ[index])
}

function isRunCrew(type) {
  return type === 7 || type === 8
}

function isScreenRunner(type) {
  return isRunCrew(type) || type === 13 || type === 14
}

function ignoresObstacles(type) {
  return type === 13 || type === 14
}

function isMelee(type) {
  return type === 1 || type === 2 || type === 3 || type === 5 || type === 6 || type === 7 || type === 8 || type === 13 || type === 14
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
    this.axisSize = ENEMY_GRID_MAX_AXIS
    this.head = new Int16Array(ENEMY_GRID_MAX_AXIS * ENEMY_GRID_MAX_AXIS)
    this.next = new Int16Array(MAX_ENEMIES)
    this.overflowNext = new Int16Array(MAX_ENEMIES)
    this.cellX = new Int16Array(MAX_ENEMIES)
    this.cellZ = new Int16Array(MAX_ENEMIES)
    this.overflow = new Uint8Array(MAX_ENEMIES)
    this.cellsX = 0
    this.cellsZ = 0
    this.halfX = 0
    this.halfZ = 0
    this.overflowHead = -1
    this.activeCount = 0
    this.highestActive = -1
    this.poolSpatialRevision = 0
    this.comparisonCount = 0
    this.targetComparisonCount = 0
    this.targetOrderingComparisonCount = 0
    this.head.fill(-1)
    this.next.fill(-1)
    this.overflowNext.fill(-1)
  }

  rebuild(pool, halfX, halfZ) {
    this.head.fill(-1)
    this.next.fill(-1)
    this.overflowNext.fill(-1)
    this.overflow.fill(0)
    this.comparisonCount = 0
    this.targetComparisonCount = 0
    this.targetOrderingComparisonCount = 0
    this.halfX = halfX
    this.halfZ = halfZ
    this.overflowHead = -1
    this.activeCount = pool.activeCount
    this.highestActive = pool.highestActive
    this.poolSpatialRevision = pool.spatialRevision
    this.cellsX = Math.min(ENEMY_GRID_MAX_AXIS, Math.max(1, Math.ceil((halfX * 2) / this.cellSize)))
    this.cellsZ = Math.min(ENEMY_GRID_MAX_AXIS, Math.max(1, Math.ceil((halfZ * 2) / this.cellSize)))
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      const x = Math.floor((pool.posX[index] + halfX) / this.cellSize)
      const z = Math.floor((pool.posZ[index] + halfZ) / this.cellSize)
      if (x < 0 || z < 0 || x >= this.cellsX || z >= this.cellsZ) {
        this.overflow[index] = 1
        this.overflowNext[index] = this.overflowHead
        this.overflowHead = index
        continue
      }
      this.cellX[index] = x
      this.cellZ[index] = z
      const cell = z * ENEMY_GRID_MAX_AXIS + x
      this.next[index] = this.head[cell]
      this.head[cell] = index
    }
  }

  isCurrentFor(pool) {
    return this.cellsX > 0 && this.cellsZ > 0
      && this.activeCount === pool.activeCount && this.highestActive === pool.highestActive
      && Number.isSafeInteger(pool.spatialRevision) && pool.spatialRevision >= 0
      && this.poolSpatialRevision === pool.spatialRevision
  }

  getCellRangeInto(out, minX, minZ, maxX, maxZ) {
    if (!out || this.cellsX <= 0 || this.cellsZ <= 0) return false
    out.minX = Math.max(0, Math.floor((minX + this.halfX) / this.cellSize))
    out.minZ = Math.max(0, Math.floor((minZ + this.halfZ) / this.cellSize))
    out.maxX = Math.min(this.cellsX - 1, Math.floor((maxX + this.halfX) / this.cellSize))
    out.maxZ = Math.min(this.cellsZ - 1, Math.floor((maxZ + this.halfZ) / this.cellSize))
    return out.minX <= out.maxX && out.minZ <= out.maxZ
  }

  reset() {
    this.head.fill(-1)
    this.next.fill(-1)
    this.overflowNext.fill(-1)
    this.cellX.fill(0)
    this.cellZ.fill(0)
    this.overflow.fill(0)
    this.cellsX = 0
    this.cellsZ = 0
    this.halfX = 0
    this.halfZ = 0
    this.overflowHead = -1
    this.activeCount = 0
    this.highestActive = -1
    this.poolSpatialRevision = 0
    this.comparisonCount = 0
    this.targetComparisonCount = 0
    this.targetOrderingComparisonCount = 0
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

export function enemyCollisionRadius(type) {
  return ENEMY_RUNTIME_SCALE[type] ? 0.28 * ENEMY_RUNTIME_SCALE[type] * ENEMY_SIZE_MULTIPLIER : 0
}

export function collidesEnemyObstacle(x, z, radius, obstacles, obstacleCount) {
  for (let obstacleIndex = 0; obstacleIndex < obstacleCount; obstacleIndex += 1) {
    const obstacle = obstacles[obstacleIndex]
    if (!obstacle || !isFiniteNumber(obstacle.x) || !isFiniteNumber(obstacle.z)
      || !isFiniteNumber(obstacle.halfX) || !isFiniteNumber(obstacle.halfZ)) continue
    if (x >= obstacle.x - obstacle.halfX - radius && x <= obstacle.x + obstacle.halfX + radius
      && z >= obstacle.z - obstacle.halfZ - radius && z <= obstacle.z + obstacle.halfZ + radius) return true
  }
  return false
}

function clampEnemyPosition(x, z, radius, halfX, halfZ, allowOuterBounds, out) {
  if (allowOuterBounds) {
    // RZ는 화면 밖 +6에서 despawn해야 하므로 이동을 경계에 붙여 되돌리지 않는다.
    out.x = x
    out.z = z
    return
  }
  out.x = clamp(x, -halfX + radius, halfX - radius)
  out.z = clamp(z, -halfZ + radius, halfZ - radius)
}

// expanded AABB의 안쪽 점을 최소 침투 축으로 밀어 낸다. obstacle 목록은 스폰과
// 같은 stage cache를 공유하므로 렌더/시뮬레이션 경계가 달라지지 않는다.
export function resolveEnemyObstaclePenetrationInto(out, x, z, radius, obstacles, obstacleCount, halfX, halfZ, allowOuterBounds = false) {
  let resolvedX = x
  let resolvedZ = z
  for (let step = 0; step < ENEMY_OBSTACLE_RESOLVE_STEPS; step += 1) {
    let changed = false
    let foundExit = false
    let bestX = resolvedX
    let bestZ = resolvedZ
    let bestDistanceSq = Infinity
    for (let obstacleIndex = 0; obstacleIndex < obstacleCount; obstacleIndex += 1) {
      const obstacle = obstacles[obstacleIndex]
      if (!obstacle || !isFiniteNumber(obstacle.x) || !isFiniteNumber(obstacle.z)
        || !isFiniteNumber(obstacle.halfX) || !isFiniteNumber(obstacle.halfZ)) continue
      const minX = obstacle.x - obstacle.halfX - radius
      const maxX = obstacle.x + obstacle.halfX + radius
      const minZ = obstacle.z - obstacle.halfZ - radius
      const maxZ = obstacle.z + obstacle.halfZ + radius
      if (resolvedX < minX || resolvedX > maxX || resolvedZ < minZ || resolvedZ > maxZ) continue
      // 경계에 obstacle이 붙어도 clamp-back이 같은 overlap을 만들지 않게 네 exit를
      // bounds 적용 후 다시 전체 obstacle에 검증한다. tie 순서도 고정이다.
      for (let exit = 0; exit < 4; exit += 1) {
        let candidateX = resolvedX
        let candidateZ = resolvedZ
        if (exit === 0) candidateX = minX - ENEMY_OBSTACLE_EPSILON
        else if (exit === 1) candidateX = maxX + ENEMY_OBSTACLE_EPSILON
        else if (exit === 2) candidateZ = minZ - ENEMY_OBSTACLE_EPSILON
        else candidateZ = maxZ + ENEMY_OBSTACLE_EPSILON
        clampEnemyPosition(candidateX, candidateZ, radius, halfX, halfZ, allowOuterBounds, out)
        if (collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) continue
        const dx = out.x - resolvedX
        const dz = out.z - resolvedZ
        const distanceSq = dx * dx + dz * dz
        if (!foundExit || distanceSq < bestDistanceSq) {
          foundExit = true
          bestDistanceSq = distanceSq
          bestX = out.x
          bestZ = out.z
        }
      }
    }
    if (foundExit) {
      resolvedX = bestX
      resolvedZ = bestZ
      changed = true
    }
    if (!changed) break
  }
  out.x = resolvedX
  out.z = resolvedZ
  return !collidesEnemyObstacle(resolvedX, resolvedZ, radius, obstacles, obstacleCount)
}

// 고정 수 후보만 검사하는 결정론적 회복. 프레임 경로에서 배열/객체를 만들지 않는다.
export function findNearestFreeEnemyPositionInto(out, x, z, radius, obstacles, obstacleCount, halfX, halfZ, allowOuterBounds = false, minDisplacement = 0, startGlobal = false) {
  const minDisplacementSq = minDisplacement * minDisplacement
  if (!startGlobal) {
    for (let ring = 0; ring < 5; ring += 1) {
      const distance = ring * (radius * 2 + 0.18)
      const candidates = ring === 0 ? 1 : 8
      for (let candidate = 0; candidate < candidates; candidate += 1) {
        const angle = ring === 0 ? 0 : candidate * Math.PI * 0.25
        clampEnemyPosition(x + Math.cos(angle) * distance, z + Math.sin(angle) * distance, radius, halfX, halfZ, allowOuterBounds, out)
        const dx = out.x - x
        const dz = out.z - z
        if (dx * dx + dz * dz < minDisplacementSq) continue
        if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) return true
      }
    }
  }
  // 작은 prop 묶음과 경계 접촉에서 local ring이 전부 막혀도, arena 전역의 고정
  // 33x33 표본으로 실제 빈 곳을 찾는다. 이 경로는 오류 회복 때만 실행된다.
  const minX = allowOuterBounds ? -halfX - 6 : -halfX + radius
  const maxX = allowOuterBounds ? halfX + 6 : halfX - radius
  const minZ = allowOuterBounds ? -halfZ - 6 : -halfZ + radius
  const maxZ = allowOuterBounds ? halfZ + 6 : halfZ - radius
  for (let row = 0; row < 33; row += 1) {
    const candidateZ = minZ + (maxZ - minZ) * (row / 32)
    for (let column = 0; column < 33; column += 1) {
      const candidateX = minX + (maxX - minX) * (column / 32)
      clampEnemyPosition(candidateX, candidateZ, radius, halfX, halfZ, allowOuterBounds, out)
      const dx = out.x - x
      const dz = out.z - z
      if (dx * dx + dz * dz < minDisplacementSq) continue
      if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) return true
    }
  }
  return false
}

export function moveEnemyWithObstacleSlideInto(out, x, z, velocityX, velocityZ, delta, radius, obstacles, obstacleCount, halfX, halfZ, allowOuterBounds = false, tangentSign = 1) {
  const fullX = x + velocityX * delta
  const fullZ = z + velocityZ * delta
  clampEnemyPosition(fullX, fullZ, radius, halfX, halfZ, allowOuterBounds, out)
  if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) {
    out.blocked = 0
    return true
  }
  const candidateX = out.x
  const candidateZ = out.z
  clampEnemyPosition(candidateX, z, radius, halfX, halfZ, allowOuterBounds, out)
  if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) {
    out.blocked = 1
    return true
  }
  clampEnemyPosition(x, candidateZ, radius, halfX, halfZ, allowOuterBounds, out)
  if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) {
    out.blocked = 1
    return true
  }
  const speed = Math.hypot(velocityX, velocityZ)
  if (speed > 1e-8) {
    const sign = tangentSign >= 0 ? 1 : -1
    const tangentX = -velocityZ / speed * speed * delta * sign
    const tangentZ = velocityX / speed * speed * delta * sign
    clampEnemyPosition(x + tangentX, z + tangentZ, radius, halfX, halfZ, allowOuterBounds, out)
    if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) {
      out.blocked = 1
      return true
    }
    clampEnemyPosition(x - tangentX, z - tangentZ, radius, halfX, halfZ, allowOuterBounds, out)
    if (!collidesEnemyObstacle(out.x, out.z, radius, obstacles, obstacleCount)) {
      out.blocked = 1
      return true
    }
  }
  out.x = x
  out.z = z
  out.blocked = 1
  return false
}

export class EnemySimulationRuntime {
  constructor() {
    this.grid = new EnemySpatialGrid()
    this.events = new EnemyEventQueue()
    this._velocityScratch = { x: 0, z: 0 }
    this._positionScratch = { x: 0, z: 0, blocked: 0 }
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
    let spatialChanged = false
    this.grid.rebuild(pool, halfX + 6, halfZ + 6)

    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      if (pool.type[index] < 1 || pool.type[index] > 8 && pool.type[index] < 13 || pool.type[index] > 14 || !hasFiniteSlot(pool, index)) {
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

      // reveal은 공격/이동만 막는다. legacy/direct invalid spawn도 첫 step부터 obstacle
      // 밖에 있어야 하므로 위치 정리는 phase 판정보다 앞에서 수행한다.
      const radius = enemyCollisionRadius(type)
      const allowOuterBounds = isScreenRunner(type)
      const ignoreObstacles = ignoresObstacles(type)
      let placementSafe = true
      if (ignoreObstacles) {
        clampEnemyPosition(pool.posX[index], pool.posZ[index], radius, halfX, halfZ, allowOuterBounds, this._positionScratch)
      } else if (obstacleCount > 0 && obstacles) {
        placementSafe = resolveEnemyObstaclePenetrationInto(this._positionScratch, pool.posX[index], pool.posZ[index], radius,
          obstacles, obstacleCount, halfX, halfZ, allowOuterBounds)
        if (!placementSafe) {
          placementSafe = findNearestFreeEnemyPositionInto(this._positionScratch, pool.posX[index], pool.posZ[index], radius,
            obstacles, obstacleCount, halfX, halfZ, allowOuterBounds)
        }
        if (!placementSafe) {
          placementSafe = findNearestFreeEnemyPositionInto(this._positionScratch, pool.lastSafeX[index], pool.lastSafeZ[index], radius,
            obstacles, obstacleCount, halfX, halfZ, allowOuterBounds)
        }
      } else {
        clampEnemyPosition(pool.posX[index], pool.posZ[index], radius, halfX, halfZ, allowOuterBounds, this._positionScratch)
      }
      if (!placementSafe) {
        this._despawn(pool, index, ENEMY_EVENT_ERROR, 0, null)
        continue
      }
      if (pool.posX[index] !== this._positionScratch.x || pool.posZ[index] !== this._positionScratch.z) spatialChanged = true
      pool.posX[index] = this._positionScratch.x
      pool.posZ[index] = this._positionScratch.z
      pool.lastSafeX[index] = pool.posX[index]
      pool.lastSafeZ[index] = pool.posZ[index]

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
      let preserveFacing = false

      if (isScreenRunner(type)) {
        velocityX = pool.runDirX[index] * ENEMY_RUNTIME_SPEED[type]
        velocityZ = pool.runDirZ[index] * ENEMY_RUNTIME_SPEED[type]
        moving = true
      } else if (pool.knockbackTimer[index] > 0) {
        pool.knockbackTimer[index] = Math.max(0, pool.knockbackTimer[index] - deltaMs)
        velocityX = pool.knockbackX[index]
        velocityZ = pool.knockbackZ[index]
        moving = true
        preserveFacing = true
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

      if (sightBlocked && sightBlocked[index] && !isScreenRunner(type) && !preserveFacing) {
        const side = ((index + generation) & 1) === 0 ? 1 : -1
        velocityX = -nz * side * ENEMY_RUNTIME_SPEED[type] * 0.55
        velocityZ = nx * side * ENEMY_RUNTIME_SPEED[type] * 0.55
        moving = true
      }

      if (!preserveFacing && pool.detourMs[index] > 0 && moving && (velocityX !== 0 || velocityZ !== 0)) {
        pool.detourMs[index] = Math.max(0, pool.detourMs[index] - deltaMs)
        const length = Math.hypot(velocityX, velocityZ) || 1
        const sign = pool.detourSign[index] || (((index + generation) & 1) === 0 ? 1 : -1)
        const speed = ENEMY_RUNTIME_SPEED[type]
        const originalX = velocityX
        const originalZ = velocityZ
        velocityX = -originalZ / length * speed * sign
        velocityZ = originalX / length * speed * sign
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

      if (!preserveFacing && moving && (velocityX !== 0 || velocityZ !== 0)) pool.yaw[index] = Math.atan2(velocityX, velocityZ)
      pool.velX[index] = velocityX
      pool.velZ[index] = velocityZ
      let nextX = posX
      let nextZ = posZ
      if (!ignoreObstacles && obstacleCount > 0 && obstacles) {
        const tangentSign = pool.detourSign[index] || (((index + generation) & 1) === 0 ? 1 : -1)
        moveEnemyWithObstacleSlideInto(this._positionScratch, posX, posZ, velocityX, velocityZ, delta, radius,
          obstacles, obstacleCount, halfX, halfZ, allowOuterBounds, tangentSign)
        nextX = this._positionScratch.x
        nextZ = this._positionScratch.z
      } else {
        clampEnemyPosition(posX + velocityX * delta, posZ + velocityZ * delta, radius, halfX, halfZ, allowOuterBounds, this._positionScratch)
        nextX = this._positionScratch.x
        nextZ = this._positionScratch.z
      }
      const movedX = nextX - posX
      const movedZ = nextZ - posZ
      const overlapAfterMove = !ignoreObstacles && obstacleCount > 0 && obstacles
        && collidesEnemyObstacle(nextX, nextZ, radius, obstacles, obstacleCount)
      if (moving && (velocityX !== 0 || velocityZ !== 0) && (movedX * movedX + movedZ * movedZ < ENEMY_STUCK_MOVE_EPSILON_SQ || overlapAfterMove)) {
        pool.stuckMs[index] += deltaMs
        if (pool.stuckMs[index] >= ENEMY_STUCK_DETOUR_MS) {
          pool.detourSign[index] = ((index + generation) & 1) === 0 ? 1 : -1
          pool.detourMs[index] = 420
        }
        if (pool.stuckMs[index] >= ENEMY_STUCK_RECOVERY_MS
          && findNearestFreeEnemyPositionInto(this._positionScratch, posX, posZ, radius,
            obstacles, obstacleCount, halfX, halfZ, allowOuterBounds, radius * 2 + 0.18, true)) {
          nextX = this._positionScratch.x
          nextZ = this._positionScratch.z
          pool.stuckMs[index] = 0
          pool.detourMs[index] = 0
        }
      } else if (!overlapAfterMove) {
        pool.stuckMs[index] = 0
        pool.detourMs[index] = 0
        pool.detourSign[index] = 0
        pool.lastSafeX[index] = nextX
        pool.lastSafeZ[index] = nextZ
      }
      if (pool.posX[index] !== nextX || pool.posZ[index] !== nextZ) spatialChanged = true
      pool.posX[index] = nextX
      pool.posZ[index] = nextZ

      if (isScreenRunner(type) && (Math.abs(nextX) > halfX + 6 || Math.abs(nextZ) > halfZ + 6)) {
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
    if (spatialChanged) pool.markSpatialChanged()
    const comparisonCount = this.grid.comparisonCount
    this.grid.rebuild(pool, halfX + 6, halfZ + 6)
    this.grid.comparisonCount = comparisonCount
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
