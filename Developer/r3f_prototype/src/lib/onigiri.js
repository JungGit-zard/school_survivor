function seededNoise(seed) {
  const x = Math.sin(seed * 999.13) * 43758.5453
  return x - Math.floor(x)
}

export function pickNextOnigiriTarget({ enemyBodies, from, hitSet = new Set(), range = Number.POSITIVE_INFINITY }) {
  let next = null
  let minDSq = range * range

  enemyBodies.forEach((rb, enemyId) => {
    if (hitSet.has(enemyId) || !rb?._enemyHit || rb._enemyDead) return
    const et = rb.translation()
    const dx = et.x - from.x
    const dz = et.z - from.z
    const dSq = dx * dx + dz * dz
    if (dSq < minDSq) {
      minDSq = dSq
      next = { rb, enemyId }
    }
  })

  return next
}

export function createRiceBurstGrains({ id, x, z, count = 16, radius = 1 }) {
  return Array.from({ length: count }, (_, index) => {
    const seed = id * 37.7 + index * 11.13
    const angle = (Math.PI * 2 * index) / count + (seededNoise(seed) - 0.5) * 0.5
    return {
      key: `${id}-${index}`,
      x,
      z,
      angle,
      speed: (1.5 + seededNoise(seed + 1) * 2.4) * radius,
      lift: 0.35 + seededNoise(seed + 2) * 0.55,
      size: 0.04 + seededNoise(seed + 3) * 0.035,
      spin: (seededNoise(seed + 4) - 0.5) * 8,
      delay: seededNoise(seed + 5) * 45,
    }
  })
}

export function shouldShowRiceBurst(remainingBounces) {
  return remainingBounces < 0
}
