import { ZOMBIE_METER_WORLD_UNITS } from './gameplayUnits.js'

const PORTAL_DIRECTION_ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']

// Game.jsx camera mapping uses world -Z as screen up and world +Z as screen down.
export function getPortalDirectionArrow(deltaX, deltaZ) {
  const octant = Math.round(Math.atan2(deltaX, -deltaZ) / (Math.PI / 4))
  return PORTAL_DIRECTION_ARROWS[(octant + 8) % 8]
}

export function worldUnitsToZombieMeters(distanceWorldUnits) {
  return Math.ceil(Math.max(0, distanceWorldUnits) / ZOMBIE_METER_WORLD_UNITS)
}

export function getPortalObjective(player, target) {
  if (!target?.active) return null

  const deltaX = target.x - player.x
  const deltaZ = target.z - player.z
  return {
    arrow: getPortalDirectionArrow(deltaX, deltaZ),
    distanceZm: worldUnitsToZombieMeters(Math.hypot(deltaX, deltaZ)),
  }
}
