import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'
import { captureEnemyGeneration, isEnemyHitLive } from './weaponCollision.js'

function isPoolProxy(rb) {
  return Number.isInteger(rb?.index) && rb.index >= 0 && rb.index < enemyPool.proxies.length
    && enemyPool.proxies[rb.index] === rb
}

// 일반 적은 EntityPool이 정본이다. enemyBodies(Map)는 최대 3개의 보스/특수 적 호환용이며
// 기본값은 전역 enemyBodies이지만, 테스트에서는 고정 픽스처 Map을 넘겨 순수하게 검증한다.
export function pickNextOnigiriTarget({ enemyBodies = globalEnemyBodies, from, hitSet = new Set(), range = Number.POSITIVE_INFINITY }) {
  let next = null
  let minDSq = range * range

  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const rb = enemyPool.proxies[index]
    const enemyId = rb._enemyId
    if (hitSet.has(enemyId)) continue
    const dx = enemyPool.posX[index] - from.x
    const dz = enemyPool.posZ[index] - from.z
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) {
      minDSq = dSq
      next = { rb, enemyId, generation: enemyPool.generation[index] }
    }
  }

  enemyBodies.forEach((rb, enemyId) => {
    if (isPoolProxy(rb)) return // 풀 프록시가 Map에 중복 등록되어도 위 루프에서 이미 처리했다.
    if (hitSet.has(enemyId) || !isEnemyHitLive(rb)) return
    const et = rb.translation()
    const dx = et.x - from.x
    const dz = et.z - from.z
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) {
      minDSq = dSq
      next = { rb, enemyId, generation: captureEnemyGeneration(rb) }
    }
  })

  return next
}

function seededNoise(seed) {
  const x = Math.sin(seed * 917.37) * 43758.5453
  return x - Math.floor(x)
}

export function createOnigiriBurstGrains({ id, x, z, count = 14 }) {
  return Array.from({ length: count }, (_, index) => {
    const seed = id * 41.9 + index * 13.17
    const angle = (Math.PI * 2 * index) / count + (seededNoise(seed) - 0.5) * 0.38
    return {
      key: `${id}-${index}`,
      x,
      z,
      angle,
      speed: 0.62 + seededNoise(seed + 1) * 0.52,
      lift: 0.12 + seededNoise(seed + 2) * 0.12,
      size: 0.032 + seededNoise(seed + 3) * 0.02,
      spin: (seededNoise(seed + 4) - 0.5) * 8,
      delayMs: seededNoise(seed + 5) * 24,
    }
  })
}

// 오니기리 발사 사양의 단일 출처(2026-11-01 Terry: "없어지고 다시 생겨나는 오니기리는 반드시
// 주인공의 몸으로부터 발사된다"). 처음 던질 때든, 표적을 잃고 사라졌다가 다시 던질 때든 출발점은
// 언제나 이번 프레임의 주인공 몸 위치(origin = playerPos)다. 공중·이전 위치에서 재출발하지 않는다.
// relaunch는 사라진 발사체가 남긴 바운스 수와 이미 맞힌 적 목록을 그대로 이어받는다(피해 총량 불변).
export function createOnigiriLaunch({ id, origin, target, weapon, relaunch = null }) {
  const hitIds = relaunch ? [...relaunch.hitSet] : []
  hitIds.push(target.enemyId)
  return {
    id,
    start:          [origin.x, origin.y, origin.z],
    initialTarget:  target,
    hitIds,
    maxBounces:     relaunch ? relaunch.bouncesLeft : (weapon.bounces ?? 2),
    damage:         weapon.damage,
    bounceRange:    weapon.bounceRange ?? 4.5,
    critChance:     weapon.critChance,
    critMultiplier: weapon.critMultiplier,
  }
}
