// 모든 레벨업 카드의 기계적 효과를 한 곳에서 관리한다.
// useGameStore.applyUpgrade 와 HUD.pickThree 가 함께 참조하므로
// 카드 추가/수정 시 이 파일만 고치면 양쪽이 동기화된다.

import { isUnlocked as isWeaponUnlocked } from './weaponUnlocks.js'

export const UPGRADE_EFFECTS = {
  pencilDamage:   { weapon: 'pencilThrow',   kind: 'damage', dmg: 3 },
  pencilCount:    { weapon: 'pencilThrow',   kind: 'stat',   stat: 'projectileCount', step: 1,    cap: 4 },
  pencilPierce:   { weapon: 'pencilThrow',   kind: 'stat',   stat: 'pierce',          step: 1,    cap: 3 },
  unlockBag:      { weapon: 'schoolBag',     kind: 'unlock', minLevel: 2 },
  bagDamage:      { weapon: 'schoolBag',     kind: 'damage', dmg: 5 },
  bagRadius:      { weapon: 'schoolBag',     kind: 'stat',   stat: 'range',           step: 0.08, cap: 1.067 },
  unlockTumbler:  { weapon: 'tumbler',       kind: 'unlock', minLevel: 2 },
  tumblerCount:   { weapon: 'tumbler',       kind: 'stat',   stat: 'count',           step: 1,    cap: 3 },
  tumblerDamage:  { weapon: 'tumbler',       kind: 'damage', dmg: 2 },
  unlockFlask:    { weapon: 'scienceFlask',  kind: 'unlock', minLevel: 4 },
  flaskDamage:    { weapon: 'scienceFlask',  kind: 'damage', dmg: 8 },
  flaskRadius:    { weapon: 'scienceFlask',  kind: 'stat',   stat: 'radius',          step: 0.18, cap: 2.4 },
  unlockBell:     { weapon: 'bell',          kind: 'unlock', minLevel: 4 },
  bellDamage:     { weapon: 'bell',          kind: 'damage', dmg: 4 },
  unlockStun:     { weapon: 'stunGun',       kind: 'unlock', minLevel: 6 },
  stunDamage:     { weapon: 'stunGun',       kind: 'damage', dmg: 5 },
  stunChain:      { weapon: 'stunGun',       kind: 'stat',   stat: 'chainCount',      step: 1,    cap: 4 },
  unlockOnigiri:  { weapon: 'onigiri',       kind: 'unlock', minLevel: 6 },
  onigiiriDamage: { weapon: 'onigiri',       kind: 'damage', dmg: 5 },
  onigiiriBounce: { weapon: 'onigiri',       kind: 'stat',   stat: 'bounces',         step: 1,    cap: 7 },
  unlockMissile:  { weapon: 'guidedMissile', kind: 'unlock', minLevel: 6 },
  missileDamage:  { weapon: 'guidedMissile', kind: 'damage', dmg: 6 },
  missileRadius:  { weapon: 'guidedMissile', kind: 'stat',   stat: 'radius',          step: 0.15, cap: 2.2 },
  unlockStarlink: { weapon: 'starlink',      kind: 'unlock', minLevel: 8 },
  starlinkDamage: { weapon: 'starlink',      kind: 'damage', dmg: 10 },
  starlinkCount:  { weapon: 'starlink',      kind: 'stat',   stat: 'strikeCount',     step: 1,    cap: 3 },
  unlockCompassBlade:  { weapon: 'compassBlade',  kind: 'unlock', minLevel: 3 },
  compassBladeDamage:  { weapon: 'compassBlade',  kind: 'damage', dmg: 2 },
  compassBladeCount:   { weapon: 'compassBlade',  kind: 'stat',   stat: 'count',     step: 1,    cap: 3 },
  unlockUmbrellaGuard: { weapon: 'umbrellaGuard', kind: 'unlock', minLevel: 3 },
  umbrellaDamage:      { weapon: 'umbrellaGuard', kind: 'damage', dmg: 2 },
  umbrellaRadius:      { weapon: 'umbrellaGuard', kind: 'stat',   stat: 'radius',    step: 0.09, cap: 1.36 },
  unlockEraserBomb:    { weapon: 'eraserBomb',    kind: 'unlock', minLevel: 4 },
  eraserDamage:        { weapon: 'eraserBomb',    kind: 'damage', dmg: 8 },
  eraserRadius:        { weapon: 'eraserBomb',    kind: 'stat',   stat: 'radius',    step: 0.19, cap: 2.1 },
  moveSpeed:      { kind: 'player', stat: 'speed', capMultiplier: 1.8 },
  maxHealth:      { kind: 'player' },
}

// Bang_Rules.md: "Max owned weapons: 4"
const MAX_OWNED_WEAPONS = 4
const MAX_WEAPON_LEVEL = 5

const bumpLevel = (wpn) => Math.min(MAX_WEAPON_LEVEL, (wpn.level ?? 1) + 1)

export function applyUpgradeToWeapon(wpn, effect) {
  if (effect.kind === 'unlock') return { ...wpn, active: true, level: 1 }
  if (effect.kind === 'damage') return { ...wpn, damage: wpn.damage + effect.dmg, level: bumpLevel(wpn) }
  if (effect.kind === 'stat')   return { ...wpn, [effect.stat]: Math.min(effect.cap, (wpn[effect.stat] ?? 0) + effect.step), level: bumpLevel(wpn) }
  return wpn
}

export function isUpgradeAvailable(effect, level, weapons, player = null) {
  if (!effect) return true
  if (effect.kind === 'player') {
    if (effect.stat === 'speed' && player?.baseSpeed) {
      return player.speed < player.baseSpeed * effect.capMultiplier
    }
    return true
  }
  if (effect.minLevel != null && level < effect.minLevel) return false

  const wpn = weapons[effect.weapon]
  if (effect.kind === 'unlock') {
    if (wpn?.active) return false
    // 계정 해금 게이트: starter는 isWeaponUnlocked가 항상 true, 그 외는 weaponUnlocks 디스크 상태.
    if (!isWeaponUnlocked(effect.weapon)) return false
    const ownedCount = Object.values(weapons).filter((w) => w.active).length
    return ownedCount < MAX_OWNED_WEAPONS
  }
  if (!wpn?.active) return false
  if ((wpn.level ?? 0) >= MAX_WEAPON_LEVEL) return false
  if (effect.kind === 'stat') return (wpn[effect.stat] ?? 0) < effect.cap
  return true
}
