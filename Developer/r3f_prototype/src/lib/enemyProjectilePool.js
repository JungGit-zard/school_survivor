// E04 투사체의 고정 슬롯 풀. 렌더/물리 엔진에 의존하지 않는다.
export const MAX_ENEMY_PROJECTILES = 32
export const E04_PROJECTILE_LIFETIME_MS = 3200
export const E04_PROJECTILE_SPEED = 1.9
export const E04_PROJECTILE_DAMAGE = 8
export const E04_PROJECTILE_RADIUS = 0.09
export const PLAYER_CONTACT_HALF_EXTENT = 0.136

// 투사체 kind는 순수 비주얼 채널이다. 데미지·속도·수명·판정 반경은 kind와 무관하다.
// 0 = E04 기본 청록 구체(정본, 변경 금지). 1..4 = B04 주방장 보스가 던지는 주방 재료.
export const ENEMY_PROJECTILE_KIND_SPHERE = 0
export const ENEMY_PROJECTILE_KIND_CARROT = 1
export const ENEMY_PROJECTILE_KIND_ONION = 2
export const ENEMY_PROJECTILE_KIND_POTATO = 3
export const ENEMY_PROJECTILE_KIND_KNIFE = 4
export const CHEF_INGREDIENT_KINDS = Object.freeze([
  ENEMY_PROJECTILE_KIND_CARROT,
  ENEMY_PROJECTILE_KIND_ONION,
  ENEMY_PROJECTILE_KIND_POTATO,
  ENEMY_PROJECTILE_KIND_KNIFE,
])
export const ENEMY_PROJECTILE_KIND_COUNT = CHEF_INGREDIENT_KINDS.length + 1

// B04 발사 카운터를 재료 4종으로 순환시킨다. 프레임 난수 없이 결정론적이다.
export function chefIngredientKindAt(counter) {
  if (!Number.isFinite(counter)) return CHEF_INGREDIENT_KINDS[0]
  const slot = Math.trunc(counter) % CHEF_INGREDIENT_KINDS.length
  return CHEF_INGREDIENT_KINDS[slot < 0 ? slot + CHEF_INGREDIENT_KINDS.length : slot]
}

function storable(value) {
  return Number.isFinite(value) && Number.isFinite(Math.fround(value))
}

// 잘못된 kind로 렌더가 깨지지 않게 기본 구체로 접는다. 스폰 자체는 막지 않는다(비주얼 전용 채널).
function storableKind(value) {
  return Number.isInteger(value) && value >= 0 && value < ENEMY_PROJECTILE_KIND_COUNT
    ? value
    : ENEMY_PROJECTILE_KIND_SPHERE
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
    this.kind = new Uint8Array(MAX_ENEMY_PROJECTILES)
    this._freeNext = new Int8Array(MAX_ENEMY_PROJECTILES)
    this._freeHead = 0
    this._activeCount = 0
    for (let index = 0; index < MAX_ENEMY_PROJECTILES; index += 1) {
      this.generation[index] = 1
      this._freeNext[index] = index + 1 < MAX_ENEMY_PROJECTILES ? index + 1 : -1
    }
  }

  get activeCount() { return this._activeCount }

  spawnInto(out, x, y, z, dirX, dirZ, damage = E04_PROJECTILE_DAMAGE, speed = E04_PROJECTILE_SPEED, kind = ENEMY_PROJECTILE_KIND_SPHERE) {
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
    this.kind[index] = storableKind(kind)
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
    this.kind[index] = ENEMY_PROJECTILE_KIND_SPHERE
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
      this.kind[index] = ENEMY_PROJECTILE_KIND_SPHERE
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
