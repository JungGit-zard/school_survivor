// 근접 무기 흡혈(2026-10-28 Terry: "커터와 30센티 자는 흡혈 성능이 있어야 한다").
// 새 시스템이 아니라 학생 랜턴의 기존 on-hit 회복 규약을 그대로 쓴다:
//   weaponCatalog base.healPercentOnHit(최대 HP 비율) × store.healPlayer(amount, { silent: true }).
// 차이는 두 가지뿐이다.
//   1) 한 번의 휘두름(스윙)에서 적을 하나 이상 맞혔을 때 1회만 회복한다(타격 수·이중 베기와 무관).
//   2) 회복 이펙트(healFlashToken)는 LIFESTEAL_HEAL_FLASH_INTERVAL_MS마다 최대 1번만 켠다.
//      근접 무기는 1.3~1.6초마다 맞히므로 매 타격 이펙트는 과하다(Terry: 회복 이펙트가 너무 강함).
//      이펙트 비주얼 자체는 threemini 담당이라 여기서는 발생 빈도만 줄인다.
export const LIFESTEAL_HEAL_FLASH_INTERVAL_MS = 4000

export function createLifestealState() {
  return { lastFlashMs: -Infinity }
}

// 회복량(HP)을 반환한다. 풀피·비활성 값이면 0이고 store를 건드리지 않는다.
export function applyWeaponLifesteal(store, weapon, nowMs, state) {
  const percent = weapon?.healPercentOnHit
  if (!Number.isFinite(percent) || percent <= 0) return 0
  const { hp, maxHp } = store.player
  if (!Number.isFinite(maxHp) || maxHp <= 0 || hp >= maxHp) return 0
  const amount = maxHp * percent
  const flash = nowMs - state.lastFlashMs >= LIFESTEAL_HEAL_FLASH_INTERVAL_MS
  if (flash) state.lastFlashMs = nowMs
  store.healPlayer(amount, { silent: true, flash })
  return amount
}
