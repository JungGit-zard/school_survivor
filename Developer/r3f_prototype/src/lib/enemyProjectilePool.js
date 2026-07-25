// E04 투사체의 고정 슬롯 풀. 렌더/물리 엔진에 의존하지 않는다.
export const MAX_ENEMY_PROJECTILES = 32
export const E04_PROJECTILE_LIFETIME_MS = 3200
export const E04_PROJECTILE_SPEED = 1.9
export const E04_PROJECTILE_DAMAGE = 8
export const E04_PROJECTILE_RADIUS = 0.09
export const PLAYER_CONTACT_HALF_EXTENT = 0.136

function storable(value) {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value))
}

export class EnemyProjectilePool {
  constructor() {
    this.active = new Uint8Array(MAX_ENEMY_PROJECTILES)
    this.generation = new Uint16Array(MAX_ENEMY_PROJECTILES)
    this.posX = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.posY = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.posZ = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.velX = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.velZ = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.ageMs = new Float32Array(MAX_ENEMY_PROJECTILES)
    this.damage = new Float32Array(MAX_ENEMY_PROJECTILES)
    this._freeNext = new Int8Array(MAX_ENEMY_PROJECTILES)
    this._freeHead = 0
    this._activeCount = 0
    for (let index = 0; index < MAX_ENEMY_PROJECTILES; index += 1) {
      this.generation[index] = 1
      this._freeNext[index] = index + 1 < MAX_ENEMY_PROJECTILES ? index + 1 : -1
    }
  }

  get activeCount() { return this._activeCount }

  spawnInto(out, x, y, z, dirX, dirZ, damage = E04_PROJECTILE_DAMAGE, speed = E04_PROJECTILE_SPEED) {
    if (!out || typeof out !== 'object' || this._freeHead < 0 || !storable(x) || !storable(y) || !storable(z)
      || !storable(dirX) || !storable(dirZ) || !storable(damage) || !storable(speed) || damage < 0 || speed <= 0) return false
    const length = Math.hypot(dirX, dirZ)
    if (!Number.isFinite(length) || length <= 1e-8) return false
    const index = this._freeHead
    this._freeHead = this._freeNext[index]
    this._freeNext[index] = -1
    this.active[index] = 1
    this.posX[index] = x
    this.posY[index] = y
    this.posZ[index] = z
    this.velX[index] = (dirX / length) * speed
    this.velZ[index] = (dirZ / length) * speed
    this.ageMs[index] = 0
    this.damage[index] = damage
    out.index = index
    out.generation = this.generation[index]
    this._activeCount += 1
    return true
  }

  isAlive(index, generation) {
    return Number.isInteger(index) && index >= 0 && index < MAX_ENEMY_PROJECTILES
      && Number.isInteger(generation) && generation !== 0 && this.active[index] === 1 && this.generation[index] === generation
  }

  despawn(index, generation) {
    if (!this.isAlive(index, generation)) return false
    this.active[index] = 0
    this.posX[index] = 0
    this.posY[index] = 0
    this.posZ[index] = 0
    this.velX[index] = 0
    this.velZ[index] = 0
    this.ageMs[index] = 0
    this.damage[index] = 0
    this._activeCount -= 1
    if (this.generation[index] === 0xffff) return true
    this.generation[index] += 1
    this._freeNext[index] = this._freeHead
    this._freeHead = index
    return true
  }

  step(delta, playerX, playerZ, onHit) {
    if (!storable(delta) || delta < 0 || !storable(playerX) || !storable(playerZ)) return false
    const dt = Math.min(delta, 1 / 30)
    const hitDistanceSq = (E04_PROJECTILE_RADIUS + PLAYER_CONTACT_HALF_EXTENT) ** 2
    for (let index = 0; index < MAX_ENEMY_PROJECTILES; index += 1) {
      if (!this.active[index]) continue
      const nextX = Math.fround(this.posX[index] + this.velX[index] * dt)
      const nextZ = Math.fround(this.posZ[index] + this.velZ[index] * dt)
      if (!Number.isFinite(nextX) || !Number.isFinite(nextZ)) {
        this.despawn(index, this.generation[index])
        continue
      }
      this.posX[index] = nextX
      this.posZ[index] = nextZ
      this.ageMs[index] += dt * 1000
      const dx = nextX - playerX
      const dz = nextZ - playerZ
      const generation = this.generation[index]
      if (dx * dx + dz * dz <= hitDistanceSq) {
        if (onHit) onHit(index, generation, this.damage[index])
        this.despawn(index, generation)
      } else if (this.ageMs[index] >= E04_PROJECTILE_LIFETIME_MS) {
        this.despawn(index, generation)
      }
    }
    return true
  }

  reset() {
    this._freeHead = -1
    this._activeCount = 0
    for (let index = MAX_ENEMY_PROJECTILES - 1; index >= 0; index -= 1) {
      this.active[index] = 0
      this.posX[index] = 0
      this.posY[index] = 0
      this.posZ[index] = 0
      this.velX[index] = 0
      this.velZ[index] = 0
      this.ageMs[index] = 0
      this.damage[index] = 0
      if (this.generation[index] === 0xffff) {
        this._freeNext[index] = -1
      } else {
        this.generation[index] += 1
        this._freeNext[index] = this._freeHead
        this._freeHead = index
      }
    }
  }
}

export function createEnemyProjectilePool() { return new EnemyProjectilePool() }
