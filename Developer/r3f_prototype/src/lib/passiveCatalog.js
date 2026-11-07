import { passiveLabel } from './i18n.js'

// 영구 패시브 카탈로그 — 효과 수치의 유일한 정본(2026-11-07 메타 패시브 확장).
// store(useGameStore)는 getPassiveEffect로 여기 perLevel만 읽는다. 계수를 store에 리터럴로 다시 적지 마라.
// 단위: unit '%'는 perLevel이 퍼센트 포인트, unit ''는 절대값(체력 +N, 방어력 −N/피격).
// 설계 근거·런당 골드·런 수 추정: Developer/agent_room/meta_passive_expansion_20261107.md
// 인바리언트: BASE_PRICES.length >= max(maxLevel). 가격 = round(BASE_PRICES[lv-1] × priceMultiplier).
export const BASE_PRICES = [5, 7, 9, 11, 14, 17, 20, 24, 28, 33]

export const PASSIVE_CATALOG = {
  magnet:    { id: 'magnet',    label: '회수 반경', unit: '%', perLevel: 2.7, priceMultiplier: 1.0,  maxLevel: 10, enabled: true },
  moveSpeed: { id: 'moveSpeed', label: '이동속도',  unit: '%', perLevel: 2,   priceMultiplier: 1.1,  maxLevel: 10, enabled: true },
  maxHp:     { id: 'maxHp',     label: '체력',      unit: '',  perLevel: 8,   priceMultiplier: 1.0,  maxLevel: 10, enabled: true },
  might:     { id: 'might',     label: '공격력',    unit: '%', perLevel: 4,   priceMultiplier: 1.25, maxLevel: 10, enabled: true },
  growth:    { id: 'growth',    label: '학습력',    unit: '%', perLevel: 4,   priceMultiplier: 1.1,  maxLevel: 10, enabled: true },
  // 방어력: 피격 1회당 −perLevel. 단 한 번에 원 피해의 50%까지만 깎고 1 미만으로는 안 내린다(useGameStore.damagePlayer).
  armor:     { id: 'armor',     label: '방어력',    unit: '',  perLevel: 1,   priceMultiplier: 1.5,  maxLevel: 6,  enabled: true },
  // 손놀림: 모든 무기 쿨타임 × (1 − 효과%).
  cooldown:  { id: 'cooldown',  label: '손놀림',    unit: '%', perLevel: 2,   priceMultiplier: 1.25, maxLevel: 10, enabled: true },
  // 저금통: 런 중 골드 획득 × (1 + 효과%). 소수는 런 안에서 이월한다.
  greed:     { id: 'greed',     label: '저금통',    unit: '%', perLevel: 8,   priceMultiplier: 1.1,  maxLevel: 10, enabled: true },
}

const MVP_ORDER = ['magnet', 'moveSpeed', 'maxHp', 'might', 'growth', 'armor', 'cooldown', 'greed']

// 저장 레벨을 [0, maxLevel] 정수로 정규화한다. 옛 빌드·외부 저장값이 maxLevel을 넘어도 안전하다.
export function clampPassiveLevel(id, level) {
  const entry = PASSIVE_CATALOG[id]
  const n = Math.floor(Number(level) || 0)
  return entry ? Math.min(Math.max(0, n), entry.maxLevel) : 0
}

// 레벨 합산 효과(perLevel × level). '%' 단위는 퍼센트 포인트 그대로 돌려준다(예: might Lv5 → 20).
export function getPassiveEffect(levels, id) {
  const entry = PASSIVE_CATALOG[id]
  if (!entry) return 0
  return Number((entry.perLevel * clampPassiveLevel(id, levels?.[id])).toFixed(4))
}

export function getMvpPassiveIds() {
  return MVP_ORDER.filter((id) => PASSIVE_CATALOG[id]?.enabled)
}

export function getPriceFor(id, nextLevel) {
  const entry = PASSIVE_CATALOG[id]
  if (!entry) return null
  if (nextLevel < 1 || nextLevel > entry.maxLevel) return null
  const base = BASE_PRICES[nextLevel - 1]
  if (base == null) return null
  return Math.round(base * entry.priceMultiplier)
}

export function isValidPassiveId(id) {
  return Object.prototype.hasOwnProperty.call(PASSIVE_CATALOG, id)
}

// "회수 반경 +8% -> +16%" 같은 라벨. nextLevel이 maxLevel 초과면 현재 효과만 표시.
export function formatEffectLabel(id, currentLevel) {
  const entry = PASSIVE_CATALOG[id]
  if (!entry) return ''
  const label = passiveLabel(id, entry.label)
  // 2.7 * 3 같은 부동소수점 노이즈(8.100000000000001)가 카드 UI에 노출되지 않게 한다.
  const displayEffect = (value) => Number(value.toFixed(1))
  const currentEffect = displayEffect(entry.perLevel * currentLevel)
  if (currentLevel >= entry.maxLevel) {
    return `${label} +${currentEffect}${entry.unit}`
  }
  const nextEffect = displayEffect(entry.perLevel * (currentLevel + 1))
  if (currentLevel === 0) {
    return `${label} +${nextEffect}${entry.unit}`
  }
  return `${label} +${currentEffect}${entry.unit} → +${nextEffect}${entry.unit}`
}
