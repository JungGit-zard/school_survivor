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

export function computeHanakoHealAmount(maxHp) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0
  return maxHp * HANAKO_HEAL_RATIO
}
