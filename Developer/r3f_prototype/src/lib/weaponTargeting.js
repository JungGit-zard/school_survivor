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

// 폭발/장판 공통: (x,z) 중심 radius 안의 살아있는 적에게 1회씩 데미지+넉백을 입힌다.
// 중복 타격은 Set으로 막는다. 7종 AOE 무기(Flask/EraserBomb/Missile/CompassBlade/
// UmbrellaGuard/Bell/Starlink)가 쓰던 동일 루프를 단일 정본으로 통합한 것.
// 반환: 실제 피격당한 적 수.
export function applyRadialDamage({ x, z, radius, damage, knockback, knockbackMs, deathStyleOverride }) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(damage)) return 0

  const radiusSq = radius * radius
  const hit = new Set()
  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead || hit.has(enemyId)) return
    const t = rb.translation()
    const dx = t.x - x
    const dz = t.z - z
    if (dx * dx + dz * dz > radiusSq) return
    hit.add(enemyId)
    const impact = { source: { x, z }, knockback, knockbackMs }
    if (deathStyleOverride) impact.deathStyleOverride = deathStyleOverride
    rb._enemyHit(damage, impact)
  })
  return hit.size
}

// 전방 빛/빔 판정 (학생용 랜턴): origin에서 dir(정규화) 방향 length 깊이 ×
// width 폭의 직사각형 안에 점(x,z)이 들어오는지. 순수 함수 — 테스트 시임.
export function isInForwardBox({ originX, originZ, dirX, dirZ }, { x, z }, { length, width }) {
  const rx = x - originX
  const rz = z - originZ
  const fwd = rx * dirX + rz * dirZ            // 전방 투영 거리
  if (fwd < 0 || fwd > length) return false
  const lat = Math.abs(rx * dirZ - rz * dirX)  // 측면 거리 (외적 크기)
  return lat <= width / 2
}

// 전방 박스 안 살아있는 적 전원에게 1회씩 데미지 (넉백 없음 — 지속 빔용).
// 반환: 실제 피격당한 적 수.
export function applyForwardBoxDamage({ originX, originZ, dirX, dirZ, length, width, damage }) {
  if (!Number.isFinite(damage) || !Number.isFinite(length) || length <= 0) return 0
  let hits = 0
  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    if (!isInForwardBox({ originX, originZ, dirX, dirZ }, { x: t.x, z: t.z }, { length, width })) return
    hits += 1
    rb._enemyHit(damage, { source: { x: originX, z: originZ }, knockback: 0, knockbackMs: 0 })
  })
  return hits
}

export function isInForwardCone({ originX, originZ, dirX, dirZ }, { x, z }, { length, width, baseWidth = 0 }) {
  const len = Math.hypot(dirX, dirZ)
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0 || len <= 0) return false
  const nx = dirX / len
  const nz = dirZ / len
  const rx = x - originX
  const rz = z - originZ
  const fwd = rx * nx + rz * nz
  if (fwd < 0 || fwd > length) return false
  const lat = Math.abs(rx * nz - rz * nx)
  const halfWidth = baseWidth / 2 + ((width - baseWidth) / 2) * (fwd / length)
  return lat <= halfWidth
}

export function applyForwardConeDamage({ originX, originZ, dirX, dirZ, length, width, baseWidth, damage }) {
  if (!Number.isFinite(damage) || !Number.isFinite(length) || length <= 0) return 0
  let hits = 0
  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    if (!isInForwardCone({ originX, originZ, dirX, dirZ }, { x: t.x, z: t.z }, { length, width, baseWidth })) return
    hits += 1
    rb._enemyHit(damage, { source: { x: originX, z: originZ }, knockback: 0, knockbackMs: 0 })
  })
  return hits
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
