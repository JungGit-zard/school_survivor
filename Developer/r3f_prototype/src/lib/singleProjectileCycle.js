// 1개 발사체 무기(오니기리·꼬마 로자리)의 대기 시간과 사이클 정본 — 2026-11-22 Terry(저녁):
//   "미니로자리, 오니기리는 둘다 무조건 한 화면에 1개만 존재 가능하게"
//   "1개 발사된 발사체가 사라지면 직후부터 대기시간이 적용되고 10초로부터 업그레이드 하면 3초까지 짧아질 수 있도록"
// - 화면에 무기마다 1개(lib/onigiri.js PROJECTILE_MAX_ALIVE). 그 1개가 사라진 순간(바운스 소진·3초 대기 뒤
//   스르륵 사라짐·무엇이든)부터 대기 시간을 재고, 다 차면 다음 1개를 던진다. 던질 때부터 재지 않는다.
// - 대기 시간: Lv1 10초 → 카드 1장마다 -1.75초 → Lv5 3초(어느 카드를 어떤 순서로 골라도 같다, upgrades.js).
// - 손놀림 패시브·치비코 같은 전체 쿨다운 감소는 더 줄일 수 있지만 3초 아래로는 절대 내려가지 않는다
//   (effectiveSingleProjectileCooldownMs가 던지는 순간 최종 3초로 묶는다).
// 순수 모듈(import 없음) — 무기 컴포넌트·카드·마틸다 HP 추정기가 같은 수치를 읽는다.

export const SINGLE_PROJECTILE_COOLDOWN_START_MS = 10000
export const SINGLE_PROJECTILE_COOLDOWN_MIN_MS = 3000
// 카드 4장으로 10초 → 3초: (10000 - 3000) / 4.
export const SINGLE_PROJECTILE_COOLDOWN_STEP_MS = 1750

// 레벨업 카드에 붙는 대기 시간 보너스(upgrades.js applyUpgradeToWeapon의 bonus 항목). floor = 3초.
export const SINGLE_PROJECTILE_COOLDOWN_CARD_BONUS = Object.freeze({
  stat: 'cooldown',
  step: -SINGLE_PROJECTILE_COOLDOWN_STEP_MS,
  floor: SINGLE_PROJECTILE_COOLDOWN_MIN_MS,
})

// 던지는 순간 쓰는 최종 대기 시간(ms). 어떤 감소가 겹쳐도 3초 아래로 내려가지 않는다.
export function effectiveSingleProjectileCooldownMs(weapon) {
  const raw = weapon?.cooldown
  // 값이 없으면 Lv1 10초. 감소가 겹쳐 0 이하가 돼도 3초에서 멈춘다.
  if (!Number.isFinite(raw)) return SINGLE_PROJECTILE_COOLDOWN_START_MS
  return Math.max(SINGLE_PROJECTILE_COOLDOWN_MIN_MS, raw)
}

// ── 사이클 추정(밸런스 표·마틸다 HP 전용, 게임플레이 판정에는 쓰지 않는다) ──
// 발사체 이동속도 1.375u/s(두 무기 공통, 11/8). 전형 상황 가정:
//   첫 표적까지 3.0u(4블록) + 바운스마다 다음 적까지 1.5u(2블록), 적 이동·표적 없음 대기는 무시.
//   수명(ms) = (3.0 + 1.5 × (맞히는 수 - 1)) / 1.375 × 1000  → 3타 4.36초 · 4타 5.45초 · 5타 6.55초.
// 사이클 = 수명 + 대기 시간(3초 이상). 단일 대상(마틸다)은 한 사이클에 1번 맞는다(hitSet).
export const SINGLE_PROJECTILE_SPEED = 11 / 8
export const SINGLE_PROJECTILE_TYPICAL_FIRST_LEG = 3.0
export const SINGLE_PROJECTILE_TYPICAL_HOP = 1.5

export function estimateSingleProjectileLifetimeMs(hits) {
  const n = Math.max(1, Math.floor(Number.isFinite(hits) ? hits : 1))
  return ((SINGLE_PROJECTILE_TYPICAL_FIRST_LEG + SINGLE_PROJECTILE_TYPICAL_HOP * (n - 1)) / SINGLE_PROJECTILE_SPEED) * 1000
}

export function estimateSingleProjectileCycleMs(weapon) {
  return estimateSingleProjectileLifetimeMs(weapon?.bounces ?? 1) + effectiveSingleProjectileCooldownMs(weapon)
}
