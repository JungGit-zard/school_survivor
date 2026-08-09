export const HANAKO_TRAIL_FOLLOW_DISTANCE = 1.44
export const HANAKO_HEAL_INTERVAL_MS = 20000
export const HANAKO_HEAL_RATIO = 0.05

export function shouldRenderHanakoCompanion(weapons = {}) {
  return weapons.hanako?.active === true && weapons.chibiko?.active === true
}

export function computeHanakoHealAmount(maxHp) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0
  return maxHp * HANAKO_HEAL_RATIO
}
