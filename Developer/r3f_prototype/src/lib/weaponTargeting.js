// 무기 공통 타겟팅 헬퍼.
// enemyBodies (전역 Map) + playerPos (전역 Vector3) 기반.

import { enemyBodies, playerPos } from './refs.js'

// 최단 거리 적을 찾는다. maxRange 이내가 아니면 null.
export function findClosestEnemy(maxRange) {
  let closest = null
  let closestDistSq = maxRange * maxRange
  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq >= closestDistSq) return
    closest = { rb, enemyId }
    closestDistSq = distSq
  })
  return closest
}

// 스플래시 무기용: maxRange 안에서 radius 클러스터 점수가 가장 높은 적을 고른다.
export function findBestSplashTarget(maxRange, radius) {
  let best = null
  const candidates = []
  const maxRangeSq = maxRange * maxRange

  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq > maxRangeSq) return
    candidates.push({ rb, enemyId, x: t.x, z: t.z })
  })

  candidates.forEach((candidate) => {
    let score = 0
    candidates.forEach((other) => {
      const dx = other.x - candidate.x
      const dz = other.z - candidate.z
      if (dx * dx + dz * dz <= radius * radius) score += 1
    })
    if (!best || score > best.score) best = { ...candidate, score }
  })

  return best
}
