export const STAGE2_E04_INTRO_SEC = 72
export const STAGE2_E04_FIRST_FIRE_DELAY_MS = 900
export const STAGE2_E04_MAX_PROJECTILES = 6
// E04 스탯 minDist(3.5, Enemy.jsx ENEMY_STATS.E04)와 일치시킨다. 이전 3.0은
// E04가 3.5 미만에서 항상 후퇴하므로 사실상 발동하지 않는 죽은 가드였다.
export const STAGE2_E04_MIN_FIRE_DISTANCE = 3.5

export function getStage2E04Cap(elapsedSec) {
  if (elapsedSec < 96) return 2
  if (elapsedSec < 216) return 3
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
