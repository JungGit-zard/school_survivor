export const GUIDED_MISSILE_CONTROL_TIME_SEC = 0.95

export function getGuidedMissileControlTime(homingStrength = 1) {
  const safeStrength = Number.isFinite(homingStrength) && homingStrength > 0 ? homingStrength : 1
  return GUIDED_MISSILE_CONTROL_TIME_SEC / safeStrength
}
