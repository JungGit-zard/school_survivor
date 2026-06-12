export const CHIBIKO_LEVEL1_PENCIL = {
  damage: 5,
  cooldown: 1100,
  range: 22,
  speed: 12,
  followDistance: 0.72,
  sideOffset: -0.28,
}

export function getChibikoFollowTarget(player, facing, options = {}) {
  const followDistance = options.followDistance ?? CHIBIKO_LEVEL1_PENCIL.followDistance
  const sideOffset = options.sideOffset ?? CHIBIKO_LEVEL1_PENCIL.sideOffset
  const fx = Number.isFinite(facing?.x) ? facing.x : 0
  const fz = Number.isFinite(facing?.z) ? facing.z : 1
  const len = Math.hypot(fx, fz) || 1
  const nx = fx / len
  const nz = fz / len
  const sideX = nz
  const sideZ = -nx

  return {
    x: (player?.x ?? 0) - nx * followDistance + sideX * sideOffset,
    y: player?.y ?? 0,
    z: (player?.z ?? 0) - nz * followDistance + sideZ * sideOffset,
  }
}

export function createChibikoAttackConfig(weapon = {}) {
  return {
    ...CHIBIKO_LEVEL1_PENCIL,
    damage: weapon.damage ?? CHIBIKO_LEVEL1_PENCIL.damage,
    cooldown: weapon.cooldown ?? CHIBIKO_LEVEL1_PENCIL.cooldown,
    range: weapon.range ?? CHIBIKO_LEVEL1_PENCIL.range,
    speed: weapon.speed ?? CHIBIKO_LEVEL1_PENCIL.speed,
  }
}
