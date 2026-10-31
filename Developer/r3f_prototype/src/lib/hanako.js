// 정본은 weaponCatalog의 hanako.base 하나다. 예전에는 여기에 같은 값을 리터럴로 또 적어둬서
// 카탈로그를 고쳐도 게임은 옛 값으로 힐하는 이중 정본이었다(값이 우연히 같아 안 터졌을 뿐).
import { WEAPON_CATALOG } from './weaponCatalog.js'

const HANAKO_BASE = WEAPON_CATALOG.hanako.base

export const HANAKO_TRAIL_FOLLOW_DISTANCE = HANAKO_BASE.followDistance
export const HANAKO_HEAL_INTERVAL_MS = HANAKO_BASE.healIntervalMs
export const HANAKO_HEAL_RATIO = HANAKO_BASE.healPercent

export function shouldRenderHanakoCompanion(weapons = {}) {
  return weapons.hanako?.active === true && weapons.chibiko?.active === true
}

// Terry 2026-10-31 둘째 지시: 회복과 치명타 비율을 분리한다.
// - 20초 회복 = 지금까지 잃은 HP(maxHp - hp) × 15/16/17/18/19% (Lv1~5, Lv당 +1%).
// - 전 무기 치명타 피해 보너스 = 10/15/20/25/30% (Lv당 +5%, 기존 그대로).
export const HANAKO_HEAL_LEVEL_STEP = 0.01
export const HANAKO_CRIT_BASE = 0.1
export const HANAKO_CRIT_LEVEL_STEP = 0.05

const clampLevel = (level) => Math.min(5, Math.max(1, Math.floor(Number(level)) || 1))

export function getHanakoHealRatio(level = 1) {
  return HANAKO_HEAL_RATIO + HANAKO_HEAL_LEVEL_STEP * (clampLevel(level) - 1)
}

export function getHanakoCritRatio(level = 1) {
  return HANAKO_CRIT_BASE + HANAKO_CRIT_LEVEL_STEP * (clampLevel(level) - 1)
}

export function computeHanakoHealAmount(currentHp, maxHp, level = 1) {
  if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || currentHp >= maxHp) return 0
  return (maxHp - Math.max(0, currentHp)) * getHanakoHealRatio(level)
}

// 하나코가 실제로 따라다닐 때(치비코 동반)만 치명타 피해 보너스가 붙는다.
export function getHanakoCritDamageBonus(weapons = {}) {
  return shouldRenderHanakoCompanion(weapons) ? getHanakoCritRatio(weapons.hanako.level) : 0
}
