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

// Terry 2026-10-31: 이누콘은 주인공 최대 체력의 20% 체력을 갖고 주인공 대신 피해를 받는다.
// 체력 0이면 기절하고 35초(게임 시간) 뒤 최대 체력으로 리스폰한다.
export const INUCON_HP_RATIO = 0.2
export const INUCON_RESPAWN_MS = 35000

// store 상태 → 현재 이누콘 체력(순수). 비활성이면 null. 처음 활성화되면 만피로 시작하고,
// 주인공 maxHp가 오르면 현재 체력 비율을 유지한 채 maxHp를 다시 잡는다.
// nowMs를 주면 리스폰 시각이 지난 기절 상태를 만피로 되살린 값을 돌려준다.
export function resolveInucon(state, nowMs) {
  if (state?.weapons?.inucon?.active !== true) return null
  const maxHp = (state.player?.maxHp ?? 0) * INUCON_HP_RATIO
  const cur = state.inucon
  if (!cur || !Number.isFinite(cur.maxHp)) return { hp: maxHp, maxHp, fainted: false, respawnAtMs: null }
  if (cur.fainted && Number.isFinite(nowMs) && nowMs >= cur.respawnAtMs) return { hp: maxHp, maxHp, fainted: false, respawnAtMs: null }
  if (cur.maxHp === maxHp) return cur
  return { ...cur, maxHp, hp: cur.maxHp > 0 ? cur.hp * (maxHp / cur.maxHp) : maxHp }
}

// 기절 중에는 밀어내기·물기·회복을 멈춘다(따라다니기와 유령 비주얼은 유지).
export function shouldRunInuconSupport(fainted) {
  return fainted !== true
}
