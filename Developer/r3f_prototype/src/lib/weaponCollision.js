// Pool-backed enemies reuse a stable proxy object.  A weapon must therefore
// keep the generation that it observed, not just the proxy reference.
export function captureEnemyGeneration(rb) {
  return Number.isInteger(rb?.index) && Number.isInteger(rb.generation) ? rb.generation : null
}

export function isEnemyHitLive(rb, generation = captureEnemyGeneration(rb)) {
  if (!rb?._enemyHit || rb._enemyDead) return false
  return generation === null || rb.generation === generation
}

// Pooled proxies reject two-argument hits. Legacy special enemies keep their
// existing two-argument contract.
export function applyEnemyHit(rb, generation, damage, impact) {
  if (!isEnemyHitLive(rb, generation)) return false
  return generation === null
    ? rb._enemyHit(damage, impact) !== false
    : rb._enemyHit(damage, impact, generation) !== false
}

export function isPointInSweptCapsule2D(fromX, fromZ, toX, toZ, radius, pointX, pointZ) {
  if (!Number.isFinite(radius) || radius < 0) return false
  const dx = toX - fromX
  const dz = toZ - fromZ
  const lengthSq = dx * dx + dz * dz
  let t = 0
  if (lengthSq > 0) {
    t = ((pointX - fromX) * dx + (pointZ - fromZ) * dz) / lengthSq
    t = Math.max(0, Math.min(1, t))
  }
  const nearX = fromX + dx * t
  const nearZ = fromZ + dz * t
  const hitX = pointX - nearX
  const hitZ = pointZ - nearZ
  return hitX * hitX + hitZ * hitZ <= radius * radius
}

export function isPointInOrientedBox2D(centerX, centerZ, yaw, halfWidth, halfDepth, pointX, pointZ) {
  const dx = pointX - centerX
  const dz = pointZ - centerZ
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  const localX = dx * cos - dz * sin
  const localZ = dx * sin + dz * cos
  return Math.abs(localX) <= halfWidth && Math.abs(localZ) <= halfDepth
}
