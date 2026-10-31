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

// Terry 2026-10-31: 하나코 Lv1~5 = 10/15/20/25/30%. 같은 비율이 20초 회복(현재 남은 HP 기준)과
// 전 무기 치명타 피해 보너스에 함께 쓰인다.
export const HANAKO_LEVEL_STEP = 0.05

export function getHanakoRatio(level = 1) {
  const lv = Math.min(5, Math.max(1, Math.floor(Number(level)) || 1))
  return HANAKO_HEAL_RATIO + HANAKO_LEVEL_STEP * (lv - 1)
}

// 기준은 최대 HP가 아니라 "현재 남은 HP"다(Terry 2026-10-31).
export function computeHanakoHealAmount(currentHp, level = 1) {
  if (!Number.isFinite(currentHp) || currentHp <= 0) return 0
  return currentHp * getHanakoRatio(level)
}

// 하나코가 실제로 따라다닐 때(치비코 동반)만 치명타 피해 보너스가 붙는다.
export function getHanakoCritDamageBonus(weapons = {}) {
  return shouldRenderHanakoCompanion(weapons) ? getHanakoRatio(weapons.hanako.level) : 0
}
