export const STAGE2_E04_INTRO_SEC = 90
export const STAGE2_E04_FIRST_FIRE_DELAY_MS = 900
export const STAGE2_E04_MAX_PROJECTILES = 6
export const STAGE2_E04_MIN_FIRE_DISTANCE = 3.0

export function getStage2E04Cap(elapsedSec) {
  if (elapsedSec < 120) return 2
  if (elapsedSec < 270) return 3
  return 4
}

export function canE04FireProjectile({
  elapsedSec,
  ageMs,
  activeProjectileCount,
  distanceToPlayer,
  lastFireElapsedMs,
  nowMs,
  cooldownMs = 2200,
  bossPressure = false,
} = {}) {
  if (elapsedSec < STAGE2_E04_INTRO_SEC) return false
  if (ageMs < STAGE2_E04_FIRST_FIRE_DELAY_MS) return false
  if (activeProjectileCount >= STAGE2_E04_MAX_PROJECTILES) return false
  if (distanceToPlayer < STAGE2_E04_MIN_FIRE_DISTANCE) return false
  if (bossPressure) return false
  if (lastFireElapsedMs > 0 && nowMs - lastFireElapsedMs < cooldownMs) return false
  return true
}
