// 효과 시간/곡선 계산용 공유 헬퍼.
// Weapons.jsx에 인라인으로 있는 동일 함수들은 Phase 4 마이그레이션에서 이쪽으로 정리한다.

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export const smoothStep = (t) => t * t * (3 - 2 * t)

// 0..1 진행도 t에서 시작/끝 페이드를 모두 적용한 alpha를 반환.
// fadeIn: 진입 페이드 비율 (0.0–0.5 권장)
// fadeOut: 퇴장 페이드 비율 (0.0–0.5 권장)
export function fadeAlpha(t, fadeIn = 0.15, fadeOut = 0.35) {
  if (t < fadeIn)         return t / fadeIn
  if (t > 1 - fadeOut)    return (1 - t) / fadeOut
  return 1
}

// 두 각도(라디안) 사이를 -π..+π 범위로 정규화하면서 t로 보간한다.
// Missile 등 회전을 부드럽게 따라가는 추적 무기에서 사용.
export function lerpAngle(a, b, t) {
  let diff = b - a
  while (diff >  Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
