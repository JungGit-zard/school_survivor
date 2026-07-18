export const CHIBIKO_LEVEL1_PENCIL = {
  damage: 5,
  cooldown: 1100,
  range: 22,
  speed: 12,
  followDistance: 0.72,
  sideOffset: -0.28,
  projectileCount: 1,
}

export const CHIBIKO_TRAIL_MAX_POINTS = 160
export const CHIBIKO_TRAIL_MIN_STEP = 0.04

const fallbackPoint = Object.freeze({ x: 0, y: 0, z: 0 })

function toTrailPoint(position, timeMs) {
  return {
    x: Number.isFinite(position?.x) ? position.x : 0,
    y: Number.isFinite(position?.y) ? position.y : 0,
    z: Number.isFinite(position?.z) ? position.z : 0,
    timeMs: Number.isFinite(timeMs) ? timeMs : 0,
  }
}

function copyPoint(point = fallbackPoint) {
  return {
    x: point.x ?? 0,
    y: point.y ?? 0,
    z: point.z ?? 0,
  }
}

function interpolatePoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

export function createChibikoTrail() {
  return []
}

export function recordChibikoTrailPoint(trail, position, timeMs, options = {}) {
  if (!Array.isArray(trail)) return trail

  const point = toTrailPoint(position, timeMs)
  const minStep = options.minStep ?? CHIBIKO_TRAIL_MIN_STEP
  const maxPoints = options.maxPoints ?? CHIBIKO_TRAIL_MAX_POINTS
  const last = trail[trail.length - 1]
  if (last) {
    const dx = point.x - last.x
    const dz = point.z - last.z
    if (dx * dx + dz * dz < minStep * minStep) {
      last.y = point.y
      last.timeMs = point.timeMs
      return trail
    }
  }

  trail.push(point)
  while (trail.length > maxPoints) trail.shift()
  return trail
}

function getTrailTargetByTime(trail, targetTimeMs) {
  if (trail.length === 0) return copyPoint()
  if (targetTimeMs <= trail[0].timeMs) return copyPoint(trail[0])

  for (let i = 1; i < trail.length; i += 1) {
    const prev = trail[i - 1]
    const next = trail[i]
    if (targetTimeMs > next.timeMs) continue

    const duration = next.timeMs - prev.timeMs
    const t = duration > 0 ? (targetTimeMs - prev.timeMs) / duration : 1
    return interpolatePoint(prev, next, Math.max(0, Math.min(1, t)))
  }

  return copyPoint(trail[trail.length - 1])
}

function getTrailTargetByDistance(trail, followDistance) {
  if (trail.length === 0) return copyPoint()
  if (!Number.isFinite(followDistance) || followDistance <= 0) return copyPoint(trail[trail.length - 1])

  let remaining = followDistance
  for (let i = trail.length - 1; i > 0; i -= 1) {
    const latest = trail[i]
    const previous = trail[i - 1]
    const dx = latest.x - previous.x
    const dy = latest.y - previous.y
    const dz = latest.z - previous.z
    const segmentLength = Math.hypot(dx, dy, dz)
    if (segmentLength <= 0.0001) continue

    if (remaining <= segmentLength) {
      const t = 1 - remaining / segmentLength
      return interpolatePoint(previous, latest, Math.max(0, Math.min(1, t)))
    }
    remaining -= segmentLength
  }

  return copyPoint(trail[0])
}

export function getChibikoTrailTarget(trail, currentTimeMs, options = {}) {
  if (!Array.isArray(trail) || trail.length === 0) return copyPoint()

  if (Number.isFinite(options.followDistance)) {
    return getTrailTargetByDistance(trail, options.followDistance)
  }

  const followDelayMs = options.followDelayMs ?? 0
  if (Number.isFinite(followDelayMs) && followDelayMs > 0) {
    return getTrailTargetByTime(trail, currentTimeMs - followDelayMs)
  }

  return copyPoint(trail[trail.length - 1])
}

export function createChibikoAttackConfig(weapon = {}) {
  return {
    ...CHIBIKO_LEVEL1_PENCIL,
    damage: weapon.damage ?? CHIBIKO_LEVEL1_PENCIL.damage,
    cooldown: weapon.cooldown ?? CHIBIKO_LEVEL1_PENCIL.cooldown,
    range: weapon.range ?? CHIBIKO_LEVEL1_PENCIL.range,
    speed: weapon.speed ?? CHIBIKO_LEVEL1_PENCIL.speed,
    projectileCount: weapon.projectileCount ?? CHIBIKO_LEVEL1_PENCIL.projectileCount,
  }
}
