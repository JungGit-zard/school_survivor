// 모든 레벨업 카드의 기계적 효과를 한 곳에서 관리한다.
// useGameStore.applyUpgrade 와 HUD.pickThree 가 함께 참조하므로
// 카드 추가/수정 시 이 파일만 고치면 양쪽이 동기화된다.

import { isUnlocked as isWeaponUnlocked } from './weaponUnlocks.js'
import { DEFAULT_CRIT_MULTIPLIER } from './criticalHits.js'

const CRIT_MULT_STEP = 0.75
const CRIT_MULT_CAP = 4.5

export const CHIBIKO_BASE_ALL_WEAPON_BOOST = 0.1

const CHIBIKO_INCREASE_STATS = [
  'damage', 'range', 'radius', 'width', 'speed', 'orbitSpeed', 'zoneRadius',
  'strikeRadius', 'lightLength', 'lightWidth', 'durationMs', 'zoneDurationMs',
  'swingMs', 'spinDurationMs', 'knockback', 'knockbackMs', 'critChance',
  'critMultiplier',
]
const CHIBIKO_REDUCE_STATS = ['cooldown', 'retargetIntervalMs']

function scaleChibikoStat(value, multiplier, decimals = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  const factor = 10 ** decimals
  return Math.round(value * multiplier * factor) / factor
}

// 치비코의 응원 효과. 횟수·관통·체인처럼 정수 단위인 능력은 소수화하지 않고,
// 연속형 전투 능력만 강화한다. 마커로 같은 무기에 중복 적용되는 것도 막는다.
export function applyChibikoAllWeaponBoost(weapon, boost = CHIBIKO_BASE_ALL_WEAPON_BOOST) {
  if (!weapon || typeof weapon !== 'object' || weapon.chibikoBoostApplied) return weapon
  const safeBoost = Math.max(0, Number.isFinite(boost) ? boost : CHIBIKO_BASE_ALL_WEAPON_BOOST)
  const out = { ...weapon, chibikoBoostApplied: true, chibikoBoostPercent: safeBoost }
  for (const stat of CHIBIKO_INCREASE_STATS) {
    if (typeof out[stat] === 'number') out[stat] = scaleChibikoStat(out[stat], 1 + safeBoost)
  }
  for (const stat of CHIBIKO_REDUCE_STATS) {
    if (typeof out[stat] === 'number') out[stat] = scaleChibikoStat(out[stat], 1 - safeBoost, 0)
  }
  return out
}

export function removeChibikoAllWeaponBoost(weapon) {
  if (!weapon?.chibikoBoostApplied) return weapon
  const boost = weapon.chibikoBoostPercent ?? CHIBIKO_BASE_ALL_WEAPON_BOOST
  const out = { ...weapon }
  delete out.chibikoBoostApplied
  delete out.chibikoBoostPercent
  for (const stat of CHIBIKO_INCREASE_STATS) {
    if (typeof out[stat] === 'number') out[stat] = scaleChibikoStat(out[stat], 1 / (1 + boost))
  }
  for (const stat of CHIBIKO_REDUCE_STATS) {
    if (typeof out[stat] === 'number') out[stat] = scaleChibikoStat(out[stat], 1 / (1 - boost), 0)
  }
  return out
}

export function applyUpgradeWithChibikoBoost(weapon, effect, boost) {
  if (!weapon?.chibikoBoostApplied) return applyUpgradeToWeapon(weapon, effect)
  return applyChibikoAllWeaponBoost(
    applyUpgradeToWeapon(removeChibikoAllWeaponBoost(weapon), effect),
    boost ?? weapon.chibikoBoostPercent,
  )
}

// ── 레벨 곡선 정본(2026-08-15) ────────────────────────────────────────────────
// 예전에는 무기마다 데미지 카드가 정확히 1장뿐이라, 어떤 무기를 만렙까지 키워도 단일 대상
// 위력이 1.31~1.61배밖에 안 올랐다(Lv2 데미지 +30~50% / Lv3 유틸 +0% / Lv4 치명타 +3~8%).
// 그래서 피해를 주는 17종 전부에 데미지 카드를 한 장씩 더 얹고(`<무기>Power`), 두 데미지
// 카드의 합이 base damage의 약 (2.0 / 치명타·지속 성장배수 − 1)배가 되도록 스텝을 맞췄다.
//   목표: Lv1 → 도달 최대 레벨 단일 대상 DPS ≈ 2.0배.
//   base damage는 건드리지 않는다 — Lv1 시점의 무기 간 균형이 통째로 흔들린다.
// 선언 순서도 정본이다. 무기마다 데미지 카드가 맨 앞에 오게 해서 첫 레벨업이 반드시
// 체감되게 했다(예전 텀블러는 첫 카드가 tumblerCount라 Lv1→Lv2가 15.30 → 15.30이었다).
// hanako(힐 전용)만 데미지 카드가 없고, chibiko는 버프 동반자라 폭을 보수적으로 잡았다(≈1.57배).
export const UPGRADE_EFFECTS = {
  pencilDamage:   { weapon: 'pencilThrow',   kind: 'damage', dmg: 1.2 },
  pencilPower:    { weapon: 'pencilThrow',   kind: 'damage', dmg: 1.2 },
  pencilCount:    { weapon: 'pencilThrow',   kind: 'stat',   stat: 'projectileCount', step: 1,    cap: 4 },
  pencilPierce:   { weapon: 'pencilThrow',   kind: 'stat',   stat: 'pierce',          step: 1,    cap: 3 },
  pencilCrit:     { weapon: 'pencilThrow',   kind: 'crit',   chanceStep: 0.02, chanceCap: 0.24, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireBag:      { weapon: 'schoolBag',     kind: 'acquire', minLevel: 2 },
  bagDamage:      { weapon: 'schoolBag',     kind: 'damage', dmg: 5.2 },
  bagPower:       { weapon: 'schoolBag',     kind: 'damage', dmg: 5.2 },
  bagRadius:      { weapon: 'schoolBag',     kind: 'stat',   stat: 'range',           step: 0.08, cap: 1.067 },
  bagCrit:        { weapon: 'schoolBag',     kind: 'crit',   chanceStep: 0.02, chanceCap: 0.23, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireBoxCutter:{ weapon: 'boxCutter',      kind: 'acquire', minLevel: 2 },
  boxCutterDamage:{ weapon: 'boxCutter',      kind: 'damage', dmg: 8.2 },
  boxCutterPower: { weapon: 'boxCutter',      kind: 'damage', dmg: 8.2 },
  boxCutterRange: { weapon: 'boxCutter',      kind: 'stat',   stat: 'range',           step: 0.08, cap: 1.755 },
  boxCutterCrit:  { weapon: 'boxCutter',      kind: 'crit',   chanceStep: 0.02, chanceCap: 0.41, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireTumbler:  { weapon: 'tumbler',       kind: 'acquire', minLevel: 2 },
  // 데미지 카드를 tumblerCount 앞으로 옮겼다. 예전 순서(count 먼저)에서는 첫 레벨업이
  // 단일 대상 기준 완전 무증가였다 — 19종 중 유일하게 "Lv1 → Lv2 +0%"인 무기였다.
  tumblerDamage:  { weapon: 'tumbler',       kind: 'damage', dmg: 2.7 },
  tumblerPower:   { weapon: 'tumbler',       kind: 'damage', dmg: 2.7 },
  tumblerCount:   { weapon: 'tumbler',       kind: 'stat',   stat: 'count',           step: 1,    cap: 3 },
  tumblerCrit:    { weapon: 'tumbler',       kind: 'crit',   chanceStep: 0.02, chanceCap: 0.2, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireFlask:    { weapon: 'scienceFlask',  kind: 'acquire', minLevel: 4 },
  // 리워크(2026-07-04): 착탄 데미지 능력 절반(dmg 8→4). 모든 플라스크 레벨업은
  // bonus로 웅덩이 존 지속시간 +1초 (기획: 1레벨 5초, 레벨업마다 +1초).
  flaskDamage:    { weapon: 'scienceFlask',  kind: 'damage', dmg: 4.6, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  flaskPower:     { weapon: 'scienceFlask',  kind: 'damage', dmg: 4.6, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  flaskRadius:    { weapon: 'scienceFlask',  kind: 'stat',   stat: 'radius',          step: 0.18, cap: 2.4, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  flaskCrit:      { weapon: 'scienceFlask',  kind: 'crit',   chanceStep: 0.02, chanceCap: 0.19, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP, bonus: { stat: 'zoneDurationMs', step: 1000 } },
  acquireBell:     { weapon: 'bell',          kind: 'acquire', minLevel: 4 },
  bellDamage:     { weapon: 'bell',          kind: 'damage', dmg: 4.4 },
  bellPower:      { weapon: 'bell',          kind: 'damage', dmg: 4.4 },
  bellCrit:       { weapon: 'bell',          kind: 'crit',   chanceStep: 0.02, chanceCap: 0.21, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireStun:     { weapon: 'stunGun',       kind: 'acquire', minLevel: 6 },
  stunDamage:     { weapon: 'stunGun',       kind: 'damage', dmg: 7.9 },
  stunPower:      { weapon: 'stunGun',       kind: 'damage', dmg: 7.9 },
  stunChain:      { weapon: 'stunGun',       kind: 'stat',   stat: 'chainCount',      step: 1,    cap: 4 },
  stunCrit:       { weapon: 'stunGun',       kind: 'crit',   chanceStep: 0.02, chanceCap: 0.22, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireOnigiri:  { weapon: 'onigiri',       kind: 'acquire', minLevel: 6 },
  onigiiriDamage: { weapon: 'onigiri',       kind: 'damage', dmg: 22.25 },
  onigiiriPower:  { weapon: 'onigiri',       kind: 'damage', dmg: 22.25 },
  // 기본 6 + 영구강화 최대 2 = 8에서 시작할 수 있으므로 cap은 8 + 인게임 4레벨 = 12.
  // 스탯 cap이 아니라 MAX_WEAPON_LEVEL이 한계가 되게 해서 바운스 카드가 죽지 않도록 한다.
  onigiiriBounce: { weapon: 'onigiri',       kind: 'stat',   stat: 'bounces',         step: 1,    cap: 12 },
  onigiiriCrit:   { weapon: 'onigiri',       kind: 'crit',   chanceStep: 0.02, chanceCap: 0.24, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireMissile:  { weapon: 'guidedMissile', kind: 'acquire', minLevel: 4 },
  missileDamage:  { weapon: 'guidedMissile', kind: 'damage', dmg: 4 },
  missilePower:   { weapon: 'guidedMissile', kind: 'damage', dmg: 4 },
  missileRadius:  { weapon: 'guidedMissile', kind: 'stat',   stat: 'radius',          step: 0.15, cap: 2.2 },
  acquireStarlink: { weapon: 'starlink',      kind: 'acquire', minLevel: 8 },
  starlinkDamage: { weapon: 'starlink',      kind: 'damage', dmg: 12 },
  starlinkPower:  { weapon: 'starlink',      kind: 'damage', dmg: 12 },
  starlinkCount:  { weapon: 'starlink',      kind: 'stat',   stat: 'strikeCount',     step: 1,    cap: 3 },
  starlinkCrit:   { weapon: 'starlink',      kind: 'crit',   chanceStep: 0.02, chanceCap: 0.23, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireCompassBlade:  { weapon: 'compassBlade',  kind: 'acquire', minLevel: 3 },
  compassBladeDamage:  { weapon: 'compassBlade',  kind: 'damage', dmg: 3.1 },
  compassBladePower:   { weapon: 'compassBlade',  kind: 'damage', dmg: 3.1 },
  compassBladeCount:   { weapon: 'compassBlade',  kind: 'stat',   stat: 'count',     step: 1,    cap: 3 },
  compassBladeCrit:    { weapon: 'compassBlade',  kind: 'crit',   chanceStep: 0.02, chanceCap: 0.21, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireUmbrellaGuard: { weapon: 'umbrellaGuard', kind: 'acquire', minLevel: 3 },
  umbrellaDamage:      { weapon: 'umbrellaGuard', kind: 'damage', dmg: 6 },
  umbrellaPower:       { weapon: 'umbrellaGuard', kind: 'damage', dmg: 6 },
  umbrellaRadius:      { weapon: 'umbrellaGuard', kind: 'stat',   stat: 'radius',    step: 0.15, cap: 1.85 },
  acquireEraserBomb:    { weapon: 'eraserBomb',    kind: 'acquire', minLevel: 4 },
  eraserDamage:        { weapon: 'eraserBomb',    kind: 'damage', dmg: 13 },
  eraserPower:         { weapon: 'eraserBomb',    kind: 'damage', dmg: 13 },
  eraserRadius:        { weapon: 'eraserBomb',    kind: 'stat',   stat: 'radius',    step: 0.19, cap: 2.1 },
  acquireLantern:       { weapon: 'studentLantern', kind: 'acquire', minLevel: 5 },
  // 기획: 레벨업마다 지속 +1초 = 타격 +3.33회 (hitIntervalMs 300 = 0.3초당 1타).
  // cap 7000 = 무기 Lv5 상한(3+4초). 2026-08-15: "초당 1타"라 적혀 있던 걸 데이터에 맞춰 정정.
  // 랜턴은 원래 데미지 카드가 아예 없었다(지속 + 치명타뿐). base damage 0.15가 워낙 작아
  // 스텝도 그 비율(+43%)로 맞춘다 — 광역·유틸 무기라 단일 대상 화력이 낮은 건 정상이고,
  // 여기서 억지로 올리면 빛 상자 안 전원에게 들어가는 광역 화력이 통째로 튄다.
  lanternDamage:       { weapon: 'studentLantern', kind: 'damage', dmg: 0.065 },
  lanternDuration:     { weapon: 'studentLantern', kind: 'stat',   stat: 'durationMs', step: 1000, cap: 7000 },
  lanternCrit:         { weapon: 'studentLantern', kind: 'crit',   chanceStep: 0.02, chanceCap: 0.19, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireChibiko:       { weapon: 'chibiko',       kind: 'acquire', minLevel: 8 },
  // 치비코는 스스로 때리기보다 보유 무기 전체를 10% 올려주는 동반자다. 데미지 카드를 주되
  // 성장폭 목표는 2.0배가 아니라 ≈1.57배로 낮게 잡는다(전 무기 버프와 이중 계상되기 때문).
  chibikoDamage:        { weapon: 'chibiko',       kind: 'damage', dmg: 0.6 },
  chibikoCrit:          { weapon: 'chibiko',       kind: 'crit',   chanceStep: 0.02, chanceCap: 0.21, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireHanako:        { weapon: 'hanako',        kind: 'acquire', requiresActiveWeapon: 'chibiko', skipAccountUnlock: true },
  acquireInucon:        { weapon: 'inucon',        kind: 'acquire', minLevel: 8 },
  inuconHeal:           { weapon: 'inucon',        kind: 'stat',   stat: 'healPercent', step: 0.02, cap: 0.18 },
  inuconPushRadius:     { weapon: 'inucon',        kind: 'stat',   stat: 'pushRadius',  step: 0.1,  cap: 1.25 },
  inuconKnockback:      { weapon: 'inucon',        kind: 'stat',   stat: 'knockback',   step: 0.4,  cap: 4.4, bonus: { stat: 'knockbackMs', step: 20 } },
  // 바이키티 커터칼 — 커터칼을 런 중 보유해야만 카드가 뜬다(하나코/치비코와 같은 배선).
  // 계정 해금 게이트(weaponUnlocks)는 쓰지 않으므로 skipAccountUnlock: true.
  acquireBikittyCutter: { weapon: 'bikittyCutter', kind: 'acquire', minLevel: 6, requiresActiveWeapon: 'boxCutter', skipAccountUnlock: true },
  // 바이키티는 사이클 피해에 snapDamage(30)가 상수로 섞여 있어, 같은 2.0배를 만들려면
  // 단수 피해(=damage)를 그만큼 더 올려야 한다. 4 → 7 × 2장.
  bikittyCutterDamage: { weapon: 'bikittyCutter', kind: 'damage', dmg: 7 },
  bikittyCutterPower:  { weapon: 'bikittyCutter', kind: 'damage', dmg: 7 },
  bikittyCutterRange:  { weapon: 'bikittyCutter', kind: 'stat',   stat: 'segmentRangeStep', step: 0.02, cap: 0.28 },
  bikittyCutterCrit:   { weapon: 'bikittyCutter', kind: 'crit',   chanceStep: 0.02, chanceCap: 0.41, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  // 선긋기 — 30cm 자 + 커터칼을 런 중 둘 다 보유해야만 카드가 뜬다. 단수형으로는 표현할 수
  // 없어 requiresActiveWeapons(복수형 배열)를 여기서 처음 쓴다. 계정 해금 게이트는 우회한다.
  acquireLineDraw:   { weapon: 'lineDraw', kind: 'acquire', minLevel: 8, requiresActiveWeapons: ['schoolBag', 'boxCutter'], skipAccountUnlock: true },
  // 선긋기 DPS의 41%는 잔류 절단선(lineCrossDamage 14)이라 직격 피해만 올리면 성장이 막힌다.
  // 데미지 카드가 절단선 피해도 함께 올리도록 bonus를 붙였다(플라스크 존 지속 +1초와 같은 배선).
  lineDrawDamage:    { weapon: 'lineDraw', kind: 'damage', dmg: 6.4, bonus: { stat: 'lineCrossDamage', step: 4.5 } },
  lineDrawPower:     { weapon: 'lineDraw', kind: 'damage', dmg: 6.4, bonus: { stat: 'lineCrossDamage', step: 4.5 } },
  lineDrawDuration:  { weapon: 'lineDraw', kind: 'stat',   stat: 'lineDurationMs', step: 400, cap: 4000 },
  lineDrawCrit:      { weapon: 'lineDraw', kind: 'crit',   chanceStep: 0.02, chanceCap: 0.45, multStep: CRIT_MULT_STEP, multCap: CRIT_MULT_CAP },
  acquireSharkMissile:  { weapon: 'sharkMissile',  kind: 'acquire', minLevel: 8 },
  sharkMissileDamage:  { weapon: 'sharkMissile',  kind: 'damage', dmg: 10.4 },
  sharkMissilePower:   { weapon: 'sharkMissile',  kind: 'damage', dmg: 10.4 },
  sharkMissileRadius:  { weapon: 'sharkMissile',  kind: 'stat',   stat: 'radius',    step: 0.2, cap: 2.6 },
  moveSpeed:      { kind: 'player', stat: 'speed', capMultiplier: 1.8 },
  maxHealth:      { kind: 'player' },
}

// Current game rule: max owned weapons per run is 8.
export const MAX_OWNED_WEAPONS = 8
const MAX_WEAPON_LEVEL = 5
export const LEVELUP_CHOICE_COUNT = 4

function getDefaultChoiceGroupKey(key) {
  const effect = UPGRADE_EFFECTS[key]
  return effect?.weapon ? `weapon:${effect.weapon}` : `nonWeapon:${key}`
}

function uniqueKeys(keys) {
  return [...new Set(Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : [])]
}

// 런 단위 획득 카드 공정 노출기.
// exposedAcquireKeys는 이번 cycle에서 이미 화면에 표시된 획득 카드의 ledger다.
// 선택되어 active가 된 카드는 ledger에 남으므로 다음 화면이 아직 미노출인 획득 카드를 건너뛰지 않는다.
export function selectSequentialLevelupChoices({
  orderedKeys,
  availableKeys,
  pendingGuaranteedKeys = [],
  exposedAcquireKeys = [],
  choiceCount = LEVELUP_CHOICE_COUNT,
  isAcquireKey = (key) => UPGRADE_EFFECTS[key]?.kind === 'acquire',
  getChoiceGroupKey = getDefaultChoiceGroupKey,
} = {}) {
  const ordered = uniqueKeys(orderedKeys)
  const availableSet = new Set(uniqueKeys(availableKeys).filter((key) => ordered.includes(key)))
  const limit = Number.isInteger(choiceCount) && choiceCount > 0 ? choiceCount : LEVELUP_CHOICE_COUNT
  const eligibleAcquireKeys = ordered.filter((key) => availableSet.has(key) && isAcquireKey(key))
  const priorExposed = uniqueKeys(exposedAcquireKeys)
  const unseenAcquireKeys = eligibleAcquireKeys.filter((key) => !priorExposed.includes(key))
  const cycleWrapped = eligibleAcquireKeys.length > 0 && priorExposed.length > 0 && unseenAcquireKeys.length === 0
  const cycleExposed = cycleWrapped ? [] : priorExposed
  const eligibleUnseenAcquireKeys = eligibleAcquireKeys.filter((key) => !cycleExposed.includes(key))
  const pending = uniqueKeys(pendingGuaranteedKeys)
  const pendingSet = new Set(pending)
  const choiceKeys = []
  const displayedGuaranteedKeys = []
  const usedGroups = new Set()

  const tryAdd = (key, guaranteed = false) => {
    if (choiceKeys.length >= limit || !availableSet.has(key) || choiceKeys.includes(key)) return false
    const groupKey = getChoiceGroupKey(key)
    if (usedGroups.has(groupKey)) return false
    usedGroups.add(groupKey)
    choiceKeys.push(key)
    if (guaranteed) displayedGuaranteedKeys.push(key)
    return true
  }

  for (const key of pending) tryAdd(key, true)
  for (const key of eligibleUnseenAcquireKeys) {
    if (pendingSet.has(key)) continue
    tryAdd(key)
  }

  // 획득 후보가 4개 미만일 때만 안정된 선언 순서의 일반 강화로 빈 칸을 채운다.
  for (const key of ordered) {
    if (choiceKeys.length >= limit) break
    if (!availableSet.has(key) || isAcquireKey(key) || pendingSet.has(key)) continue
    tryAdd(key)
  }

  const selectedAcquireKeys = choiceKeys.filter((key) => isAcquireKey(key))
  const nextExposedAcquireKeys = uniqueKeys([...cycleExposed, ...selectedAcquireKeys])
  return { choiceKeys, nextExposedAcquireKeys, displayedGuaranteedKeys, cycleWrapped }
}

const bumpLevel = (wpn) => Math.min(MAX_WEAPON_LEVEL, (wpn.level ?? 1) + 1)

export function applyUpgradeToWeapon(wpn, effect) {
  if (effect.kind === 'acquire') return { ...wpn, active: true, level: 1 }
  // bonus: 주 효과와 별개로 함께 오르는 부가 스탯 (예: 플라스크 존 지속시간 +1s/레벨)
  const withBonus = (w) => effect.bonus
    ? { ...w, [effect.bonus.stat]: (w[effect.bonus.stat] ?? 0) + effect.bonus.step }
    : w
  if (effect.kind === 'damage') return withBonus({ ...wpn, damage: wpn.damage + effect.dmg, level: bumpLevel(wpn) })
  if (effect.kind === 'stat')   return withBonus({ ...wpn, [effect.stat]: Math.min(effect.cap, (wpn[effect.stat] ?? 0) + effect.step), level: bumpLevel(wpn) })
  if (effect.kind === 'crit') return withBonus({
    ...wpn,
    critChance:     Math.min(effect.chanceCap, (wpn.critChance ?? 0) + effect.chanceStep),
    critMultiplier: Math.min(effect.multCap, (wpn.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER) + effect.multStep),
    level: bumpLevel(wpn),
  })
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
    if (effect.requiresActiveWeapon && !weapons[effect.requiresActiveWeapon]?.active) return false
    // 복수형: 나열된 무기를 런 중 "전부" 보유해야 한다. 단수형 requiresActiveWeapon과 독립이며
    // 둘 다 있으면 둘 다 만족해야 한다. 선긋기(자 + 커터칼)가 첫 사용처다.
    if (effect.requiresActiveWeapons
      && !effect.requiresActiveWeapons.every((id) => weapons[id]?.active)) return false
    // 계정 해금 게이트: starter는 isWeaponUnlocked가 항상 true, 그 외는 weaponUnlocks 디스크 상태.
    if (!effect.skipAccountUnlock && !isWeaponUnlocked(effect.weapon)) return false
    const ownedCount = Object.values(weapons).filter((w) => w.active).length
    return ownedCount < MAX_OWNED_WEAPONS
  }
  if (!wpn?.active) return false
  if ((wpn.level ?? 0) >= MAX_WEAPON_LEVEL) return false
  if (effect.kind === 'stat') return (wpn[effect.stat] ?? 0) < effect.cap
  if (effect.kind === 'crit') {
    const chanceRoom = (wpn.critChance ?? 0) < effect.chanceCap
    const multRoom = (wpn.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER) < effect.multCap
    return chanceRoom || multRoom
  }
  return true
}
