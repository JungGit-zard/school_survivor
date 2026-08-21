import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'
import { captureEnemyGeneration } from './weaponCollision.js'

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
    if (hitSet.has(enemyId) || !rb?._enemyHit || rb._enemyDead) return
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
