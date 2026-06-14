export const SHARK_MISSILE_START_HEIGHT = 0.46

export function canFireSharkMissile({ phase, weapon, nowMs, lastFireMs, activeMissileCount }) {
  if (phase !== 'playing') return false
  if (!weapon?.active) return false
  if ((activeMissileCount ?? 0) > 0) return false

  if (lastFireMs == null || !Number.isFinite(lastFireMs)) return true

  const cooldown = Number(weapon.cooldown ?? 0)
  return nowMs - lastFireMs >= cooldown
}

export function createSharkMissileLaunch({ id, playerPosition, target, weapon }) {
  const radius = weapon.radius ?? 1.8
  const range = weapon.range ?? 28

  return {
    id,
    start: [
      playerPosition.x,
      playerPosition.y + SHARK_MISSILE_START_HEIGHT,
      playerPosition.z,
    ],
    initialTarget: { x: target.x, z: target.z },
    damage: weapon.damage ?? 30,
    radius,
    range,
    speed: weapon.speed ?? 8.5,
    retargetIntervalMs: weapon.retargetIntervalMs ?? 300,
  }
}
