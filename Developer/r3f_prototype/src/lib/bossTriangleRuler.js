export const TRIANGLE_RULER_DAMAGE_RATIO = 0.3
export const TRIANGLE_RULER_RANGE = 2.4
export const TRIANGLE_RULER_KNOCKBACK_IMPULSE = 6
export const TRIANGLE_RULER_WINDUP_MS = 420
export const TRIANGLE_RULER_SWING_MS = 520
export const TRIANGLE_RULER_SWING_RADIANS = Math.PI * 2

export function canUseTriangleRulerUltimate(type, stageId) {
  return type === 'B01' && stageId === 'stage1'
}

export function getTriangleRulerDamage(currentHp) {
  if (!Number.isFinite(currentHp) || currentHp <= 0) return 0
  return currentHp * TRIANGLE_RULER_DAMAGE_RATIO
}

export function isInTriangleRulerRange(origin, target, range = TRIANGLE_RULER_RANGE) {
  const dx = target.x - origin.x
  const dz = target.z - origin.z
  return dx * dx + dz * dz <= range * range + 1e-8
}

export function getTriangleRulerKnockbackImpulse(origin, target, strength = TRIANGLE_RULER_KNOCKBACK_IMPULSE) {
  const dx = target.x - origin.x
  const dz = target.z - origin.z
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(strength) || strength <= 0) {
    return { x: 0, y: 0, z: 0 }
  }
  const length = Math.hypot(dx, dz)
  if (length <= 1e-8) return { x: strength, y: 0, z: 0 }
  return { x: dx / length * strength, y: 0, z: dz / length * strength }
}
