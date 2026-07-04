// 모든 레벨업 카드의 기계적 효과를 한 곳에서 관리한다.
// useGameStore.applyUpgrade 와 HUD.pickThree 가 함께 참조하므로
// 카드 추가/수정 시 이 파일만 고치면 양쪽이 동기화된다.

import { isUnlocked as isWeaponUnlocked } from './weaponUnlocks.js'

export const UPGRADE_EFFECTS = {
  pencilDamage:   { weapon: 'pencilThrow',   kind: 'damage', dmg: 3 },
  pencilCount:    { weapon: 'pencilThrow',   kind: 'stat',   stat: 'projectileCount', step: 1,    cap: 4 },
  pencilPierce:   { weapon: 'pencilThrow',   kind: 'stat',   stat: 'pierce',          step: 1,    cap: 3 },
  acquireBag:      { weapon: 'schoolBag',     kind: 'acquire', minLevel: 2 },
  bagDamage:      { weapon: 'schoolBag',     kind: 'damage', dmg: 5 },
  bagRadius:      { weapon: 'schoolBag',     kind: 'stat',   stat: 'range',           step: 0.08, cap: 1.067 },
  acquireBoxCutter:{ weapon: 'boxCutter',      kind: 'acquire', minLevel: 2 },
  boxCutterDamage:{ weapon: 'boxCutter',      kind: 'damage', dmg: 5 },
  boxCutterRange: { weapon: 'boxCutter',      kind: 'stat',   stat: 'range',           step: 0.08, cap: 1.755 },
  acquireTumbler:  { weapon: 'tumbler',       kind: 'acquire', minLevel: 2 },
  tumblerCount:   { weapon: 'tumbler',       kind: 'stat',   stat: 'count',           step: 1,    cap: 3 },
  tumblerDamage:  { weapon: 'tumbler',       kind: 'damage', dmg: 2 },
  acquireFlask:    { weapon: 'scienceFlask',  kind: 'acquire', minLevel: 4 },
  // 리워크(2026-07-04): 착탄 데미지 능력 절반(dmg 8→4). 모든 플라스크 레벨업은
  // bonus로 웅덩이 존 지속시간 +1초 (기획: 1레벨 5초, 레벨업마다 +1초).
  flaskDamage:    { weapon: 'scienceFlask',  kind: 'damage', dmg: 4, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  flaskRadius:    { weapon: 'scienceFlask',  kind: 'stat',   stat: 'radius',          step: 0.18, cap: 2.4, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  acquireBell:     { weapon: 'bell',          kind: 'acquire', minLevel: 4 },
  bellDamage:     { weapon: 'bell',          kind: 'damage', dmg: 4 },
  acquireStun:     { weapon: 'stunGun',       kind: 'acquire', minLevel: 6 },
  stunDamage:     { weapon: 'stunGun',       kind: 'damage', dmg: 5 },
  stunChain:      { weapon: 'stunGun',       kind: 'stat',   stat: 'chainCount',      step: 1,    cap: 4 },
  acquireOnigiri:  { weapon: 'onigiri',       kind: 'acquire', minLevel: 6 },
  onigiiriDamage: { weapon: 'onigiri',       kind: 'damage', dmg: 6.5 },
  onigiiriBounce: { weapon: 'onigiri',       kind: 'stat',   stat: 'bounces',         step: 1,    cap: 7 },
  acquireMissile:  { weapon: 'guidedMissile', kind: 'acquire', minLevel: 4 },
  missileDamage:  { weapon: 'guidedMissile', kind: 'damage', dmg: 6 },
  missileRadius:  { weapon: 'guidedMissile', kind: 'stat',   stat: 'radius',          step: 0.15, cap: 2.2 },
  acquireStarlink: { weapon: 'starlink',      kind: 'acquire', minLevel: 8 },
  starlinkDamage: { weapon: 'starlink',      kind: 'damage', dmg: 10 },
  starlinkCount:  { weapon: 'starlink',      kind: 'stat',   stat: 'strikeCount',     step: 1,    cap: 3 },
  acquireCompassBlade:  { weapon: 'compassBlade',  kind: 'acquire', minLevel: 3 },
  compassBladeDamage:  { weapon: 'compassBlade',  kind: 'damage', dmg: 2 },
  compassBladeCount:   { weapon: 'compassBlade',  kind: 'stat',   stat: 'count',     step: 1,    cap: 3 },
  acquireUmbrellaGuard: { weapon: 'umbrellaGuard', kind: 'acquire', minLevel: 3 },
  umbrellaDamage:      { weapon: 'umbrellaGuard', kind: 'damage', dmg: 6 },
  umbrellaRadius:      { weapon: 'umbrellaGuard', kind: 'stat',   stat: 'radius',    step: 0.15, cap: 1.85 },
  acquireEraserBomb:    { weapon: 'eraserBomb',    kind: 'acquire', minLevel: 4 },
  eraserDamage:        { weapon: 'eraserBomb',    kind: 'damage', dmg: 8 },
  eraserRadius:        { weapon: 'eraserBomb',    kind: 'stat',   stat: 'radius',    step: 0.19, cap: 2.1 },
  acquireChibiko:       { weapon: 'chibiko',       kind: 'acquire', minLevel: 8 },
  acquireSharkMissile:  { weapon: 'sharkMissile',  kind: 'acquire', minLevel: 8 },
  sharkMissileDamage:  { weapon: 'sharkMissile',  kind: 'damage', dmg: 10 },
  sharkMissileRadius:  { weapon: 'sharkMissile',  kind: 'stat',   stat: 'radius',    step: 0.2, cap: 2.6 },
  moveSpeed:      { kind: 'player', stat: 'speed', capMultiplier: 1.8 },
  maxHealth:      { kind: 'player' },
}

// Current game rule: max owned weapons per run is 8.
const MAX_OWNED_WEAPONS = 8
const MAX_WEAPON_LEVEL = 5

const bumpLevel = (wpn) => Math.min(MAX_WEAPON_LEVEL, (wpn.level ?? 1) + 1)

export function applyUpgradeToWeapon(wpn, effect) {
  if (effect.kind === 'acquire') return { ...wpn, active: true, level: 1 }
  // bonus: 주 효과와 별개로 함께 오르는 부가 스탯 (예: 플라스크 존 지속시간 +1s/레벨)
  const withBonus = (w) => effect.bonus
    ? { ...w, [effect.bonus.stat]: (w[effect.bonus.stat] ?? 0) + effect.bonus.step }
    : w
  if (effect.kind === 'damage') return withBonus({ ...wpn, damage: wpn.damage + effect.dmg, level: bumpLevel(wpn) })
  if (effect.kind === 'stat')   return withBonus({ ...wpn, [effect.stat]: Math.min(effect.cap, (wpn[effect.stat] ?? 0) + effect.step), level: bumpLevel(wpn) })
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
  if (effect.kind === 'acquire') {
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
