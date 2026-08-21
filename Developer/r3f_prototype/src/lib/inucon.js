import { WEAPON_CATALOG } from './weaponCatalog.js'

const INUCON_BASE = WEAPON_CATALOG.inucon.base

export const INUCON_TRAIL_FOLLOW_DISTANCE = INUCON_BASE.followDistance
export const INUCON_HEAL_INTERVAL_MS = INUCON_BASE.healIntervalMs
export const INUCON_CONTACT_PULSE_INTERVAL_MS = INUCON_BASE.contactPulseIntervalMs

export function shouldRenderInuconCompanion(weapons = {}) {
  return weapons.inucon?.active === true
}

export function computeInuconHealAmount(maxHp, healPercent = INUCON_BASE.healPercent) {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0
  const safePercent = Number.isFinite(healPercent) && healPercent > 0 ? healPercent : 0
  return maxHp * safePercent
}

export function createInuconBiteDragConfig(weapon = {}) {
  return {
    damage: Number.isFinite(weapon.damage) ? weapon.damage : INUCON_BASE.damage,
    radius: Number.isFinite(weapon.pushRadius) ? weapon.pushRadius : INUCON_BASE.pushRadius,
    knockback: Number.isFinite(weapon.knockback) ? weapon.knockback : INUCON_BASE.knockback,
    knockbackMs: Number.isFinite(weapon.knockbackMs) ? weapon.knockbackMs : INUCON_BASE.knockbackMs,
    pulseIntervalMs: Number.isFinite(weapon.contactPulseIntervalMs) ? weapon.contactPulseIntervalMs : INUCON_BASE.contactPulseIntervalMs,
  }
}

export const createInuconPushConfig = createInuconBiteDragConfig
