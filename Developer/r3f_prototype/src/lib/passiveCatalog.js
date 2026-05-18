// MVP 영구 패시브 카탈로그.
// CEO 락 범위: magnet / moveSpeed / maxHp / might / growth × Lv.3.
// armor / cooldown / greed는 enabled:false로만 등록해 둔다. 2차 확장은 enabled 토글 + maxLevel 상향 한 줄로 가능.

// MVP는 Lv.3까지만 다룬다. 2차로 Lv.4-5를 열 때 [160, 260]을 이어 붙이고 maxLevel을 5로 올린다.
export const BASE_PRICES = [20, 45, 90]

export const PASSIVE_CATALOG = {
  magnet: {
    id: 'magnet',
    label: '회수 반경',
    unit: '%',
    perLevel: 8,
    priceMultiplier: 1.0,
    maxLevel: 3,
    enabled: true,
  },
  moveSpeed: {
    id: 'moveSpeed',
    label: '이동속도',
    unit: '%',
    perLevel: 3,
    priceMultiplier: 1.1,
    maxLevel: 3,
    enabled: true,
  },
  maxHp: {
    id: 'maxHp',
    label: '체력',
    unit: '',
    perLevel: 6,
    priceMultiplier: 1.0,
    maxLevel: 3,
    enabled: true,
  },
  might: {
    id: 'might',
    label: '공격력',
    unit: '%',
    perLevel: 4,
    priceMultiplier: 1.25,
    maxLevel: 3,
    enabled: true,
  },
  growth: {
    id: 'growth',
    label: '학습력',
    unit: '%',
    perLevel: 5,
    priceMultiplier: 1.1,
    maxLevel: 3,
    enabled: true,
  },
  armor:    { id: 'armor',    label: '방어력', unit: '',  perLevel: 1, priceMultiplier: 1.0,  maxLevel: 3, enabled: false },
  cooldown: { id: 'cooldown', label: '손놀림', unit: '%', perLevel: 3, priceMultiplier: 1.25, maxLevel: 3, enabled: false },
  greed:    { id: 'greed',    label: '저금통', unit: '%', perLevel: 5, priceMultiplier: 1.1,  maxLevel: 3, enabled: false },
}

const MVP_ORDER = ['magnet', 'moveSpeed', 'maxHp', 'might', 'growth']

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
  const currentEffect = entry.perLevel * currentLevel
  if (currentLevel >= entry.maxLevel) {
    return `${entry.label} +${currentEffect}${entry.unit}`
  }
  const nextEffect = entry.perLevel * (currentLevel + 1)
  if (currentLevel === 0) {
    return `${entry.label} +${nextEffect}${entry.unit}`
  }
  return `${entry.label} +${currentEffect}${entry.unit} → +${nextEffect}${entry.unit}`
}
