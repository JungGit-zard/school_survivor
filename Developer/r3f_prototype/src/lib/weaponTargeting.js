// 무기 공통 타겟팅 헬퍼.
// enemyBodies (전역 Map) + playerPos (전역 Vector3) 기반.

import { enemyBodies, enemyPool, playerPos } from './refs.js'
import { applyEnemyHit, captureEnemyGeneration, isEnemyHitLive, isPointInOrientedBox2D, isPointInSweptCapsule2D } from './weaponCollision.js'
import { useGameStore } from '../store/useGameStore.js'
import { getStageObjectSightObstacles, isStageObjectSightBlocked } from '../components/StageObjects/stageObjectColliders.js'

export function isPlayerWeaponSightBlocked(
  target,
  stageId = useGameStore.getState().currentStageId,
  obstacles = getStageObjectSightObstacles(stageId),
) {
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return true
  return isStageObjectSightBlocked(playerPos, target, obstacles)
}

function isSightBlocked(target, sightBlocker) {
  return typeof sightBlocker === 'function' ? sightBlocker(target) : isPlayerWeaponSightBlocked(target)
}

// 일반 적은 EntityPool만이 정본이다. Map은 최대 3개의 보스/특수 적 호환용이며
// 풀 프록시가 Map에 중복 등록되어도 여기서는 반드시 한 번만 읽는다.
const MAX_TARGET_SCRATCH = 203
const sharedSightPoint = { x: 0, z: 0 }

function isPoolProxy(rb) {
  return Number.isInteger(rb?.index) && rb.index >= 0 && rb.index < enemyPool.proxies.length
    && enemyPool.proxies[rb.index] === rb
}

function canSeeCoordinates(x, z, sightBlocker) {
  sharedSightPoint.x = x
  sharedSightPoint.z = z
  return !isSightBlocked(sharedSightPoint, sightBlocker)
}

export function createWeaponTargetScratch(capacity = MAX_TARGET_SCRATCH) {
  const safeCapacity = Math.max(1, Math.min(MAX_TARGET_SCRATCH, Math.floor(capacity) || 1))
  return {
    indices: new Int16Array(safeCapacity),
    generations: new Uint16Array(safeCapacity),
    special: new Array(safeCapacity),
    specialIds: new Array(safeCapacity),
    distances: new Float32Array(safeCapacity),
    count: 0,
  }
}

const sharedAreaScratch = createWeaponTargetScratch()
const sharedSingleTargetScratch = createWeaponTargetScratch(1)
// Area damage is synchronous: a hit handler consumes this fixed impact before
// the next target is visited, so no per-enemy source/impact object is needed.
const sharedRadialImpact = {
  source: { x: 0, z: 0 },
  knockback: 0,
  knockbackMs: 0,
  deathStyleOverride: undefined,
  canCrit: undefined,
  damageType: undefined,
  attackTags: undefined,
  critChance: undefined,
  critMultiplier: undefined,
}
const sharedForwardBoxImpact = { source: { x: 0, z: 0 }, knockback: 0, knockbackMs: 0 }
const sharedForwardConeImpact = {
  source: { x: 0, z: 0 },
  knockback: 0,
  knockbackMs: 0,
  critChance: undefined,
  critMultiplier: undefined,
}

// 정렬 삽입도 고정 버퍼에서만 수행한다. 이 함수는 프레임 루프에서 새 배열/객체를 만들지 않는다.
function insertTarget(scratch, limit, index, generation, special, distance, specialId) {
  let at = scratch.count
  while (at > 0 && scratch.distances[at - 1] > distance) at -= 1
  if (at >= limit) return
  const end = Math.min(scratch.count, limit - 1)
  for (let cursor = end; cursor > at; cursor -= 1) {
    scratch.indices[cursor] = scratch.indices[cursor - 1]
    scratch.generations[cursor] = scratch.generations[cursor - 1]
    scratch.special[cursor] = scratch.special[cursor - 1]
    scratch.specialIds[cursor] = scratch.specialIds[cursor - 1]
    scratch.distances[cursor] = scratch.distances[cursor - 1]
  }
  scratch.indices[at] = index
  scratch.generations[at] = generation
  scratch.special[at] = special
  scratch.specialIds[at] = specialId
  scratch.distances[at] = distance
  if (scratch.count < limit) scratch.count += 1
}

export function scanClosestEnemiesInto(scratch, maxRange, count = 1, sightBlocker) {
  if (!scratch?.indices || !Number.isFinite(maxRange)) return 0
  const limit = Math.min(scratch.indices.length, Math.max(0, Math.floor(count)))
  scratch.count = 0
  if (limit === 0) return 0
  const maxRangeSq = maxRange * maxRange
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    const dx = x - playerPos.x
    const dz = z - playerPos.z
    const distance = dx * dx + dz * dz
    if (distance > maxRangeSq || !canSeeCoordinates(x, z, sightBlocker)) continue
    insertTarget(scratch, limit, index, enemyPool.generation[index], null, distance)
  }
  // Map에는 보스/특수 적만 남긴다. 풀 프록시는 위의 typed-array 순회로 끝난다.
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    const t = rb.translation?.()
    if (!t) continue
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    const distance = dx * dx + dz * dz
    if (distance > maxRangeSq || !canSeeCoordinates(t.x, t.z, sightBlocker)) continue
    insertTarget(scratch, limit, -1, generation ?? 0, rb, distance, enemyId)
  }
  return scratch.count
}

export function readWeaponTarget(scratch, targetIndex, out) {
  if (!scratch || targetIndex < 0 || targetIndex >= scratch.count || !out) return false
  const special = scratch.special[targetIndex]
  if (special) {
    out.rb = special
    out.generation = scratch.generations[targetIndex] || null
    return isEnemyHitLive(out.rb, out.generation)
  }
  const index = scratch.indices[targetIndex]
  const generation = scratch.generations[targetIndex]
  if (!enemyPool.active[index] || enemyPool.generation[index] !== generation) return false
  out.rb = enemyPool.proxies[index]
  out.generation = generation
  return true
}

export function resolveWeaponTarget(index, generation, special) {
  if (special) return isEnemyHitLive(special, generation || null) ? special : null
  if (!Number.isInteger(index) || !enemyPool.active[index] || enemyPool.generation[index] !== generation) return null
  return enemyPool.proxies[index]
}

function sweptT(fromX, fromZ, toX, toZ, pointX, pointZ) {
  const dx = toX - fromX
  const dz = toZ - fromZ
  const lengthSq = dx * dx + dz * dz
  if (lengthSq <= 0) return 0
  const t = ((pointX - fromX) * dx + (pointZ - fromZ) * dz) / lengthSq
  return Math.max(0, Math.min(1, t))
}

export function scanSweptCapsuleEnemiesInto(scratch, fromX, fromZ, toX, toZ, radius, count = MAX_TARGET_SCRATCH) {
  if (!scratch?.indices || !Number.isFinite(radius)) return 0
  const limit = Math.min(scratch.indices.length, Math.max(0, Math.floor(count)))
  scratch.count = 0
  if (limit === 0) return 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    if (!isPointInSweptCapsule2D(fromX, fromZ, toX, toZ, radius, x, z)) continue
    insertTarget(scratch, limit, index, enemyPool.generation[index], null, sweptT(fromX, fromZ, toX, toZ, x, z))
  }
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    const t = rb.translation?.()
    if (!t || !isPointInSweptCapsule2D(fromX, fromZ, toX, toZ, radius, t.x, t.z)) continue
    insertTarget(scratch, limit, -1, generation ?? 0, rb, sweptT(fromX, fromZ, toX, toZ, t.x, t.z), enemyId)
  }
  return scratch.count
}

export function scanOrbitEnemiesInto(scratch, orbitX, orbitZ, orbitCount, hitRadius) {
  if (!scratch?.indices || !Number.isFinite(hitRadius)) return 0
  const radiusSq = hitRadius * hitRadius
  const limit = scratch.indices.length
  scratch.count = 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
      const dx = x - orbitX[orbitIndex]
      const dz = z - orbitZ[orbitIndex]
      if (dx * dx + dz * dz > radiusSq) continue
      insertTarget(scratch, limit, index, enemyPool.generation[index], null, 0)
      break
    }
  }
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    const t = rb.translation?.()
    if (!t) continue
    for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
      const dx = t.x - orbitX[orbitIndex]
      const dz = t.z - orbitZ[orbitIndex]
      if (dx * dx + dz * dz > radiusSq) continue
      insertTarget(scratch, limit, -1, generation ?? 0, rb, 0, enemyId)
      break
    }
  }
  return scratch.count
}

export function scanRadiusEnemiesInto(scratch, x, z, radius, count = MAX_TARGET_SCRATCH) {
  if (!scratch?.indices || !Number.isFinite(radius)) return 0
  const limit = Math.min(scratch.indices.length, Math.max(0, Math.floor(count)))
  const radiusSq = radius * radius
  scratch.count = 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const dx = enemyPool.posX[index] - x
    const dz = enemyPool.posZ[index] - z
    const distance = dx * dx + dz * dz
    if (distance <= radiusSq) insertTarget(scratch, limit, index, enemyPool.generation[index], null, distance)
  }
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    const t = rb.translation?.()
    if (!t) continue
    const dx = t.x - x
    const dz = t.z - z
    const distance = dx * dx + dz * dz
    if (distance <= radiusSq) insertTarget(scratch, limit, -1, generation ?? 0, rb, distance, enemyId)
  }
  return scratch.count
}

export function scanAllEnemiesInto(scratch) {
  if (!scratch?.indices) return 0
  const limit = scratch.indices.length
  scratch.count = 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (enemyPool.active[index]) insertTarget(scratch, limit, index, enemyPool.generation[index], null, 0)
  }
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    insertTarget(scratch, limit, -1, generation ?? 0, rb, 0, enemyId)
  }
  return scratch.count
}

export function scanOrientedBoxEnemiesInto(scratch, centerX, centerZ, yaw, halfWidth, halfDepth) {
  if (!scratch?.indices) return 0
  scratch.count = 0
  const limit = scratch.indices.length
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    if (isPointInOrientedBox2D(centerX, centerZ, yaw, halfWidth, halfDepth, enemyPool.posX[index], enemyPool.posZ[index])) {
      insertTarget(scratch, limit, index, enemyPool.generation[index], null, 0)
    }
  }
  for (const [enemyId, rb] of enemyBodies) {
    if (isPoolProxy(rb)) continue
    const generation = captureEnemyGeneration(rb)
    if (!isEnemyHitLive(rb, generation)) { enemyBodies.delete(enemyId); continue }
    const t = rb.translation?.()
    if (t && isPointInOrientedBox2D(centerX, centerZ, yaw, halfWidth, halfDepth, t.x, t.z)) {
      insertTarget(scratch, limit, -1, generation ?? 0, rb, 0, enemyId)
    }
  }
  return scratch.count
}

// 최단 거리 적을 찾는다. maxRange 이내가 아니면 null.
export function findClosestEnemies(maxRange, count = 1, { sightBlocker } = {}) {
  const limit = Math.max(0, Math.floor(count))
  const scratch = createWeaponTargetScratch(limit)
  const targets = []
  scanClosestEnemiesInto(scratch, maxRange, limit, sightBlocker)
  for (let index = 0; index < scratch.count; index += 1) {
    const rb = scratch.special[index] ?? enemyPool.proxies[scratch.indices[index]]
    targets.push({
      rb,
      enemyId: scratch.special[index] ? scratch.specialIds[index] : rb?._enemyId,
      generation: scratch.special[index] ? (scratch.generations[index] || null) : scratch.generations[index],
      distSq: scratch.distances[index],
    })
  }
  return targets
}

export function findClosestEnemy(maxRange, options) {
  const sightBlocker = options?.sightBlocker
  if (scanClosestEnemiesInto(sharedSingleTargetScratch, maxRange, 1, sightBlocker) === 0) return null
  const special = sharedSingleTargetScratch.special[0]
  const generation = special ? (sharedSingleTargetScratch.generations[0] || null) : sharedSingleTargetScratch.generations[0]
  const rb = special ?? resolveWeaponTarget(sharedSingleTargetScratch.indices[0], generation, null)
  if (!rb) return null
  return {
    rb,
    enemyId: special ? sharedSingleTargetScratch.specialIds[0] : rb._enemyId,
    generation,
    distSq: sharedSingleTargetScratch.distances[0],
  }
}

// 폭발/장판 공통: (x,z) 중심 radius 안의 살아있는 적에게 1회씩 데미지+넉백을 입힌다.
// Map의 적 키는 이미 유일하므로 별도 frame Set 없이 7종 AOE
// (Flask/EraserBomb/Missile/CompassBlade/UmbrellaGuard/Bell/Starlink)를 통합한다.
// 반환: 실제 피격당한 적 수.
export function applyRadialDamage({
  x,
  z,
  radius,
  damage,
  knockback,
  knockbackMs,
  deathStyleOverride,
  sightBlocker,
  canCrit,
  damageType,
  attackTags,
  critChance,
  critMultiplier,
}) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(damage)) return 0

  let hits = 0
  const targetCount = scanRadiusEnemiesInto(sharedAreaScratch, x, z, radius)
  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const special = sharedAreaScratch.special[targetIndex]
    const generation = special ? (sharedAreaScratch.generations[targetIndex] || null) : sharedAreaScratch.generations[targetIndex]
    const rb = special ?? resolveWeaponTarget(sharedAreaScratch.indices[targetIndex], generation, null)
    if (!isEnemyHitLive(rb, generation)) continue
    const t = rb.translation()
    if (isSightBlocked(t, sightBlocker)) continue
    const impact = sharedRadialImpact
    impact.source.x = x
    impact.source.z = z
    impact.knockback = knockback
    impact.knockbackMs = knockbackMs
    impact.deathStyleOverride = deathStyleOverride
    impact.canCrit = canCrit
    impact.damageType = damageType
    impact.attackTags = attackTags
    impact.critChance = critChance
    impact.critMultiplier = critMultiplier
    if (applyEnemyHit(rb, generation, damage, impact)) hits += 1
  }
  return hits
}

// 전방 빛/빔 판정 (학생용 랜턴): origin에서 dir(정규화) 방향 length 깊이 ×
// width 폭의 직사각형 안에 점(x,z)이 들어오는지. 순수 함수 — 테스트 시임.
export function isInForwardBox({ originX, originZ, dirX, dirZ }, { x, z }, { length, width }) {
  return isInForwardBoxRaw(originX, originZ, dirX, dirZ, x, z, length, width)
}

function isInForwardBoxRaw(originX, originZ, dirX, dirZ, x, z, length, width) {
  const rx = x - originX
  const rz = z - originZ
  const fwd = rx * dirX + rz * dirZ            // 전방 투영 거리
  if (fwd < 0 || fwd > length) return false
  const lat = Math.abs(rx * dirZ - rz * dirX)  // 측면 거리 (외적 크기)
  return lat <= width / 2
}

// 전방 박스 안 살아있는 적 전원에게 1회씩 데미지 (넉백 없음 — 지속 빔용).
// 반환: 실제 피격당한 적 수.
export function applyForwardBoxDamage({ originX, originZ, dirX, dirZ, length, width, damage, sightBlocker }) {
  if (!Number.isFinite(damage) || !Number.isFinite(length) || length <= 0) return 0
  let hits = 0
  const targetCount = scanAllEnemiesInto(sharedAreaScratch)
  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const special = sharedAreaScratch.special[targetIndex]
    const generation = special ? (sharedAreaScratch.generations[targetIndex] || null) : sharedAreaScratch.generations[targetIndex]
    const rb = special ?? resolveWeaponTarget(sharedAreaScratch.indices[targetIndex], generation, null)
    if (!isEnemyHitLive(rb, generation)) continue
    const t = rb.translation()
    if (!isInForwardBoxRaw(originX, originZ, dirX, dirZ, t.x, t.z, length, width)) continue
    if (isSightBlocked(t, sightBlocker)) continue
    const impact = sharedForwardBoxImpact
    impact.source.x = originX
    impact.source.z = originZ
    if (applyEnemyHit(rb, generation, damage, impact)) hits += 1
  }
  return hits
}

export function isInForwardCone({ originX, originZ, dirX, dirZ }, { x, z }, { length, width, baseWidth = 0 }) {
  return isInForwardConeRaw(originX, originZ, dirX, dirZ, x, z, length, width, baseWidth)
}

function isInForwardConeRaw(originX, originZ, dirX, dirZ, x, z, length, width, baseWidth = 0) {
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

export function applyForwardConeDamage({
  originX,
  originZ,
  dirX,
  dirZ,
  length,
  width,
  baseWidth,
  damage,
  sightBlocker,
  critChance,
  critMultiplier,
}) {
  if (!Number.isFinite(damage) || !Number.isFinite(length) || length <= 0) return 0
  let hits = 0
  const targetCount = scanAllEnemiesInto(sharedAreaScratch)
  for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
    const special = sharedAreaScratch.special[targetIndex]
    const generation = special ? (sharedAreaScratch.generations[targetIndex] || null) : sharedAreaScratch.generations[targetIndex]
    const rb = special ?? resolveWeaponTarget(sharedAreaScratch.indices[targetIndex], generation, null)
    if (!isEnemyHitLive(rb, generation)) continue
    const t = rb.translation()
    if (!isInForwardConeRaw(originX, originZ, dirX, dirZ, t.x, t.z, length, width, baseWidth)) continue
    if (isSightBlocked(t, sightBlocker)) continue
    const impact = sharedForwardConeImpact
    impact.source.x = originX
    impact.source.z = originZ
    impact.critChance = critChance
    impact.critMultiplier = critMultiplier
    if (applyEnemyHit(rb, generation, damage, impact)) hits += 1
  }
  return hits
}

// 스플래시 무기용: maxRange 안에서 radius 클러스터 점수가 가장 높은 적을 고른다.
export function findBestSplashTarget(maxRange, radius, { sightBlocker } = {}) {
  const targetCount = scanClosestEnemiesInto(sharedAreaScratch, maxRange, MAX_TARGET_SCRATCH, sightBlocker)
  let bestIndex = -1
  let bestScore = -1
  const radiusSq = radius * radius
  for (let candidateIndex = 0; candidateIndex < targetCount; candidateIndex += 1) {
    const candidateSpecial = sharedAreaScratch.special[candidateIndex]
    const candidateGeneration = candidateSpecial ? (sharedAreaScratch.generations[candidateIndex] || null) : sharedAreaScratch.generations[candidateIndex]
    const candidateRb = candidateSpecial ?? resolveWeaponTarget(sharedAreaScratch.indices[candidateIndex], candidateGeneration, null)
    if (!isEnemyHitLive(candidateRb, candidateGeneration)) continue
    const candidatePosition = candidateRb.translation()
    let score = 0
    for (let otherIndex = 0; otherIndex < targetCount; otherIndex += 1) {
      const otherSpecial = sharedAreaScratch.special[otherIndex]
      const otherGeneration = otherSpecial ? (sharedAreaScratch.generations[otherIndex] || null) : sharedAreaScratch.generations[otherIndex]
      const otherRb = otherSpecial ?? resolveWeaponTarget(sharedAreaScratch.indices[otherIndex], otherGeneration, null)
      if (!isEnemyHitLive(otherRb, otherGeneration)) continue
      const otherPosition = otherRb.translation()
      const dx = otherPosition.x - candidatePosition.x
      const dz = otherPosition.z - candidatePosition.z
      if (dx * dx + dz * dz <= radiusSq) score += 1
    }
    if (score > bestScore) {
      bestIndex = candidateIndex
      bestScore = score
    }
  }
  if (bestIndex < 0) return null
  const special = sharedAreaScratch.special[bestIndex]
  const generation = special ? (sharedAreaScratch.generations[bestIndex] || null) : sharedAreaScratch.generations[bestIndex]
  const rb = special ?? resolveWeaponTarget(sharedAreaScratch.indices[bestIndex], generation, null)
  if (!rb) return null
  const position = rb.translation()
  return { rb, enemyId: special ? sharedAreaScratch.specialIds[bestIndex] : rb._enemyId, generation, x: position.x, z: position.z, score: bestScore }
}
