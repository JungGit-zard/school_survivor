import { WEAPON_CATALOG } from './weaponCatalog.js'

export const COMPASS_BLADE_STACKS_TO_EXPLODE = 5
export const COMPASS_BLADE_RESPAWN_MS = 5000
export const COMPASS_BLADE_EXPLOSION_DAMAGE = WEAPON_CATALOG.scienceFlask.base.damage * 2
// One tile is the player's current full visual footprint plus its 8 neighboring directions.
export const COMPASS_BLADE_ONE_TILE_RADIUS = 0.5

export function getCompassBladeOrbitPose({
  elapsedSec,
  index,
  count,
  radius,
  orbitSpeed,
  player,
}) {
  const safeCount = Math.max(1, count ?? 1)
  const safeRadius = radius ?? 1.15
  const safeSpeed = orbitSpeed ?? 3.4
  const angle = elapsedSec * safeSpeed + (Math.PI * 2 * index) / safeCount

  return {
    angle,
    position: {
      x: player.x + Math.sin(angle) * safeRadius,
      y: player.y + 0.16,
      z: player.z + Math.cos(angle) * safeRadius,
    },
    rotation: {
      x: 0,
      y: angle + Math.PI / 2,
      z: 0,
    },
  }
}

export function resolveCompassBladeHitStack({ currentStack = 0 }) {
  const nextStack = currentStack + 1
  const explosionRadius = COMPASS_BLADE_ONE_TILE_RADIUS

  if (nextStack < COMPASS_BLADE_STACKS_TO_EXPLODE) {
    return {
      stack: nextStack,
      exploded: false,
      explosionDamage: 0,
      explosionRadius,
    }
  }

  return {
    stack: 0,
    exploded: true,
    explosionDamage: COMPASS_BLADE_EXPLOSION_DAMAGE,
    explosionRadius,
  }
}

export function getCompassBladeRespawnUntilMs({ exploded, nowMs = 0 }) {
  return exploded ? nowMs + COMPASS_BLADE_RESPAWN_MS : 0
}

export function shouldRenderCompassBladeHitBodies({ active }) {
  return !!active
}
