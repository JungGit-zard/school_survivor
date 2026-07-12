export const STAGE2_E04_INTRO_SEC = 72
export const STAGE2_E04_FIRST_FIRE_DELAY_MS = 900
export const STAGE2_E04_MAX_PROJECTILES = 6
// E04 스탯 minDist(3.5, Enemy.jsx ENEMY_STATS.E04)와 일치시킨다. 이전 3.0은
// E04가 3.5 미만에서 항상 후퇴하므로 사실상 발동하지 않는 죽은 가드였다.
export const STAGE2_E04_MIN_FIRE_DISTANCE = 3.5

export function getStage2E04Cap(elapsedSec) {
  if (elapsedSec < 96) return 1
  return 2
}

// stage-aware 동시 E04 상한. stage2는 기존 거동 불변(getStage2E04Cap 위임).
// stage3는 E04를 조기·다구간 고비중으로 배치하므로(웨이브 34s부터) 상한을 살짝 높이되
// 원거리 과밀을 막는다: 132s 전 2기, 이후 3기.
export function getE04Cap(elapsedSec, stageId = 'stage2') {
  if (stageId === 'stage3') {
    return elapsedSec < 132 ? 2 : 3
  }
  return getStage2E04Cap(elapsedSec)
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
