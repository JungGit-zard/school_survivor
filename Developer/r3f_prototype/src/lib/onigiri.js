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
