export const STAGE2_E04_INTRO_SEC = 72
// 스테이지4는 원거리 "안전지대 소멸"이 시그니처라 발사 게이트를 18s로 앞당긴다(그 외 72 불변).
export const STAGE4_E04_INTRO_SEC = 18
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
// stage4는 원거리가 시그니처(조기 18s·상시 고비중)라 상한을 좀 더 이르게 3으로 올리되,
// 모바일 공정성상 상한 3을 초과하지 않는다: 60s 전 2기, 이후 3기.
export function getE04Cap(elapsedSec, stageId = 'stage2') {
  if (stageId === 'stage3') {
    return elapsedSec < 132 ? 2 : 3
  }
  if (stageId === 'stage4') {
    return elapsedSec < 60 ? 2 : 3
  }
  return getStage2E04Cap(elapsedSec)
}

// 스테이지별 E04 발사 인트로 게이트(초). stage4만 18s, 그 외 72s(스2/스3 불변).
// 주의: stage3의 stageConfig.e04IntroSec=34는 HUD 힌트용이며 실발사는 72 — 이 헬퍼가 발사 게이트 정본.
export function getE04IntroSec(stageId = 'stage2') {
  return stageId === 'stage4' ? STAGE4_E04_INTRO_SEC : STAGE2_E04_INTRO_SEC
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
  introSec = STAGE2_E04_INTRO_SEC,
} = {}) {
  if (elapsedSec < introSec) return false
  if (ageMs < STAGE2_E04_FIRST_FIRE_DELAY_MS) return false
  if (activeProjectileCount >= STAGE2_E04_MAX_PROJECTILES) return false
  if (distanceToPlayer < STAGE2_E04_MIN_FIRE_DISTANCE) return false
  if (bossPressure) return false
  if (lastFireElapsedMs > 0 && nowMs - lastFireElapsedMs < cooldownMs) return false
  return true
}
