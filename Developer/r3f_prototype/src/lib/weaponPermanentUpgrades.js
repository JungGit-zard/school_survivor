import { WEAPON_CATALOG, getAllWeaponIds, isValidWeaponId } from './weaponCatalog.js'
import { isUnlocked } from './weaponUnlocks.js'
import { _seedHydratedFirebaseProgressForTests, readFirebasePlayerProgress, updateFirebasePlayerProgress } from './firebaseProgress.js'

export const STORAGE_KEY = 'school_survivor:weaponPermanentUpgrades'
export const MAX_WEAPON_PERMANENT_LEVEL = 10

export const WEAPON_PERMANENT_UPGRADE_PRICES = [300, 500, 800, 1200, 1800, 2600, 3600, 4800, 6200, 8000]

const DAMAGE_LEVELS = ['+2%', '+4%', '+6%', '+8%', '+10%', '+12%', '+14%', '+16%']
const COOLDOWN_LEVELS = ['-1%', '-2%', '-3%', '-4%', '-5%', '-6%', '-7%', '-8%']
const RANGE_LEVELS = ['+2%', '+4%', '+6%', '+8%', '+10%', '+12%', '+14%', '+16%']
const CRIT_CHANCE_LEVELS = ['+2%', '+4%', '+6%', '+8%']

function makePlan(
  id,
  primaryLabel,
  level5,
  level10,
  primaryValues = DAMAGE_LEVELS,
  latePrimaryLabel = primaryLabel,
  latePrimaryValues = primaryValues.slice(4),
) {
  const label = WEAPON_CATALOG[id]?.label ?? id
  const levels = {
    1: { summary: `${primaryLabel} ${primaryValues[0]}` },
    2: { summary: `${primaryLabel} ${primaryValues[1]}` },
    3: { summary: `${primaryLabel} ${primaryValues[2]}` },
    4: { summary: `${primaryLabel} ${primaryValues[3]}` },
    5: { summary: level5 },
    6: { summary: `${latePrimaryLabel} ${latePrimaryValues[0]}` },
    7: { summary: `${latePrimaryLabel} ${latePrimaryValues[1]}` },
    8: { summary: `${latePrimaryLabel} ${latePrimaryValues[2]}` },
    9: { summary: `${latePrimaryLabel} ${latePrimaryValues[3]}` },
    10: { summary: level10 },
  }
  return { id, label, maxLevel: MAX_WEAPON_PERMANENT_LEVEL, levels }
}

export const WEAPON_PERMANENT_UPGRADE_PLANS = {
  pencilThrow: makePlan('pencilThrow', '공격력', '투사체 속도 +10%', '기본 투사체 수 +1', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  schoolBag: makePlan('schoolBag', '공격 범위', '공격력 +8%', '휘두르기 판정 유지시간 +10%', RANGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  boxCutter: makePlan('boxCutter', '쿨타임', '공격력 +8%', '일정 확률로 추가 절단 1회', COOLDOWN_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  tumbler: makePlan('tumbler', '접촉 피해', '회전 속도 +10%', '기본 궤도체 수 +1', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  scienceFlask: makePlan('scienceFlask', '화학 웅덩이 지속시간', '웅덩이 범위 +10%', '웅덩이 지속시간 추가 +10%', ['+3%', '+6%', '+9%', '+12%'], '치명타 확률', CRIT_CHANCE_LEVELS),
  bell: makePlan('bell', '피해', '파동 크기 +10%', '파동 도달거리 +10%', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  stunGun: makePlan('stunGun', '피해', '체인 수 +1', '짧은 경직 확률 +8%', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  onigiri: makePlan('onigiri', '투사체 속도', '바운스 횟수 +1', '바운스 횟수 추가 +1', ['+3%', '+6%', '+9%', '+12%'], '치명타 확률', CRIT_CHANCE_LEVELS),
  chibiko: makePlan('chibiko', '동료 공격 주기', '동료 피해 +10%', '치비코 투척체 +1', COOLDOWN_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  guidedMissile: makePlan('guidedMissile', '폭발 피해', '유도 회전력 +10%', '폭발 범위 +10%'),
  sharkMissile: makePlan('sharkMissile', '귀소 속도', '귀소 전환 시간 -10%', '폭발 범위 +12%', RANGE_LEVELS, '폭발 피해', ['+4%', '+8%', '+12%', '+16%']),
  starlink: makePlan('starlink', '타격 피해', '타격 반경 +10%', '추가 소형 낙하 타격 확률 +10%', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  compassBlade: makePlan('compassBlade', '칼날 피해', '회전 속도 +10%', '스택 폭발 범위 +10%', DAMAGE_LEVELS, '치명타 확률', CRIT_CHANCE_LEVELS),
  umbrellaGuard: makePlan('umbrellaGuard', '넉백', '펄스 범위 +10%', '펄스 쿨타임 -10%', ['+3%', '+6%', '+9%', '+12%', '+15%', '+18%', '+21%', '+24%']),
  eraserBomb: makePlan('eraserBomb', '폭발 범위', '폭발 피해 +10%', '폭발 후 짧은 둔화 장판 생성', RANGE_LEVELS),
  studentLantern: makePlan('studentLantern', '빛 콘 길이', '빛 콘 각도 +8%', '빛에 맞은 적 둔화 확률 +10%', ['+2%', '+4%', '+6%', '+8%'], '치명타 확률', CRIT_CHANCE_LEVELS),
}

function readRaw() {
  return readFirebasePlayerProgress().weaponPermanentUpgrades ?? {}
}

function writeRaw(value) {
  updateFirebasePlayerProgress((progress) => {
    progress.weaponPermanentUpgrades = { ...value }
    return progress
  })
}

export function getAllWeaponPermanentUpgradeLevels() {
  const raw = readRaw()
  const out = {}
  for (const id of getAllWeaponIds()) {
    out[id] = raw[id] ?? 0
  }
  return out
}

export function getWeaponPermanentUpgradeLevel(id) {
  if (!isValidWeaponId(id)) return 0
  return readRaw()[id] ?? 0
}

export function getWeaponPermanentUpgradePrice(nextLevel) {
  if (nextLevel < 1 || nextLevel > MAX_WEAPON_PERMANENT_LEVEL) return null
  return WEAPON_PERMANENT_UPGRADE_PRICES[nextLevel - 1] ?? null
}

export function getWeaponPermanentUpgradePlan(id) {
  return WEAPON_PERMANENT_UPGRADE_PLANS[id] ?? null
}

function persist(id, nextLevel) {
  const raw = readRaw()
  raw[id] = nextLevel
  writeRaw(raw)
}

export function purchaseWeaponPermanentUpgrade(id, currentGold) {
  if (!isValidWeaponId(id)) return { ok: false, reason: 'unknownId' }
  if (!isUnlocked(id)) return { ok: false, reason: 'locked' }
  const currentLevel = getWeaponPermanentUpgradeLevel(id)
  const nextLevel = currentLevel + 1
  if (nextLevel > MAX_WEAPON_PERMANENT_LEVEL) return { ok: false, reason: 'maxLevel' }
  const price = getWeaponPermanentUpgradePrice(nextLevel)
  if (currentGold < price) return { ok: false, reason: 'insufficient', price }
  persist(id, nextLevel)
  return { ok: true, nextLevel, price, nextGold: currentGold - price }
}

export function resetWeaponPermanentUpgradeLevels() {
  writeRaw({})
}

function readPercent(summary) {
  const match = /([+-]?\d+(?:\.\d+)?)%/.exec(summary ?? '')
  return match ? Number(match[1]) / 100 : 0
}

function getBestPercentForSummary(id, level, predicate) {
  const plan = getWeaponPermanentUpgradePlan(id)
  if (!plan || level <= 0) return 0
  let percent = 0
  for (let i = 1; i <= Math.min(level, MAX_WEAPON_PERMANENT_LEVEL); i += 1) {
    const summary = plan.levels[i]?.summary ?? ''
    if (predicate(summary)) percent = Math.max(percent, Math.abs(readPercent(summary)))
  }
  return percent
}

function getDamageMultiplier(id, level) {
  const percent = getBestPercentForSummary(id, level, (summary) => (
    summary.includes('공격력')
    || summary.includes('피해')
    || summary.includes('접촉 피해')
    || summary.includes('폭발 피해')
    || summary.includes('타격 피해')
    || summary.includes('칼날 피해')
    || summary.includes('동료 피해')
    || summary.includes('지속 피해')
  ) && !summary.includes('틱 피해'))
  return 1 + percent
}

function scaleNumber(value, multiplier, decimals = 2) {
  if (typeof value !== 'number') return value
  const factor = 10 ** decimals
  return Math.round(value * multiplier * factor) / factor
}

function scaleExistingProps(out, props, multiplier, decimals = 2) {
  for (const prop of props) {
    if (typeof out[prop] === 'number') out[prop] = scaleNumber(out[prop], multiplier, decimals)
  }
}

function applySafeNumericPermanentEffects(id, level, out) {
  const cooldownPercent = getBestPercentForSummary(id, level, (summary) => (
    summary.includes('쿨타임') || summary.includes('공격 주기') || summary.includes('전환 시간')
  ))
  if (cooldownPercent > 0) {
    scaleExistingProps(out, ['cooldown', 'retargetIntervalMs'], 1 - cooldownPercent, 0)
  }

  const rangePercent = getBestPercentForSummary(id, level, (summary) => (
    summary.includes('공격 범위')
    || summary.includes('폭발 범위')
    || summary.includes('웅덩이 범위')
    || summary.includes('파동 크기')
    || summary.includes('파동 도달거리')
    || summary.includes('타격 반경')
    || summary.includes('스택 폭발 범위')
    || summary.includes('펄스 범위')
    || summary.includes('빛 콘 각도')
    || summary.includes('빛 콘 길이')
  ))
  if (rangePercent > 0) {
    scaleExistingProps(out, ['range', 'radius', 'zoneRadius', 'strikeRadius', 'lightLength', 'lightWidth'], 1 + rangePercent, 3)
  }

  const durationPercent = getBestPercentForSummary(id, level, (summary) => (
    summary.includes('지속시간') || summary.includes('유지시간')
  ))
  if (durationPercent > 0) {
    scaleExistingProps(out, ['durationMs', 'zoneDurationMs', 'swingMs', 'spinDurationMs'], 1 + durationPercent, 0)
  }

  const speedPercent = getBestPercentForSummary(id, level, (summary) => (
    summary.includes('투사체 속도') || summary.includes('회전 속도') || summary.includes('귀소 속도')
  ))
  if (speedPercent > 0) {
    scaleExistingProps(out, ['speed', 'orbitSpeed'], 1 + speedPercent, 2)
  }

  const knockbackPercent = getBestPercentForSummary(id, level, (summary) => summary.includes('넉백'))
  if (knockbackPercent > 0) scaleExistingProps(out, ['knockbackMs'], 1 + knockbackPercent, 0)
}

export function applyWeaponPermanentUpgradesToBaseWeapon(id, weapon) {
  if (!weapon || typeof weapon !== 'object') return weapon
  const level = getWeaponPermanentUpgradeLevel(id)
  if (level <= 0) return weapon
  const out = { ...weapon, permanentUpgradeLevel: level }
  const damageMultiplier = getDamageMultiplier(id, level)
  if (typeof out.damage === 'number') out.damage = Math.round(out.damage * damageMultiplier * 10) / 10

  const critChanceBonus = getBestPercentForSummary(id, level, (summary) => summary.includes('치명타 확률'))
  if (critChanceBonus > 0 && typeof weapon.critChance === 'number') {
    out.critChance = Math.round(Math.min(1, weapon.critChance + critChanceBonus) * 1000) / 1000
  }

  applySafeNumericPermanentEffects(id, level, out)

  if (id === 'pencilThrow' && level >= 10) out.projectileCount = (out.projectileCount ?? 1) + 1
  if (id === 'tumbler' && level >= 10) out.count = (out.count ?? 1) + 1
  if (id === 'stunGun' && level >= 5) out.chainCount = (out.chainCount ?? 0) + 1
  if (id === 'stunGun' && level >= 10) out.permanentStunChance = 0.08
  if (id === 'onigiri' && level >= 5) out.bounces = (out.bounces ?? 0) + 1
  if (id === 'onigiri' && level >= 10) out.bounces = (out.bounces ?? 0) + 1
  if (id === 'chibiko' && level >= 10) out.projectileCount = (out.projectileCount ?? 1) + 1
  if (id === 'guidedMissile' && level >= 5) out.homingStrength = 1.1
  if (id === 'sharkMissile' && level >= 5) out.permanentHomingStartMultiplier = 0.9
  if (id === 'starlink' && level >= 10) out.permanentBonusStrikeChance = 0.1
  if (id === 'compassBlade' && level >= 10) out.permanentExplosionRadiusMultiplier = 1.1
  if (id === 'eraserBomb' && level >= 10) out.permanentSlowDust = true
  if (id === 'studentLantern' && level >= 10) out.permanentSlowChance = 0.1

  // These milestone perks stack additively with an earlier bonus that targets
  // the same runtime field. Recalculate from the unmodified base so rounding
  // or multiplicative stacking cannot inflate the intended design value.
  if (id === 'scienceFlask') {
    const tickDamagePercent = getBestPercentForSummary(id, level, (summary) => summary.includes('틱 피해'))
    if (tickDamagePercent > 0 && typeof weapon.zoneTickDamage === 'number') {
      out.zoneTickDamage = scaleNumber(weapon.zoneTickDamage, 1 + tickDamagePercent, 2)
    }
    if (level >= 10 && typeof weapon.zoneDurationMs === 'number') {
      out.zoneDurationMs = scaleNumber(weapon.zoneDurationMs, 1.22, 0)
    }
  }
  if (id === 'bell' && level >= 10 && typeof weapon.radius === 'number') {
    out.radius = scaleNumber(weapon.radius, 1.2, 3)
  }

  return out
}

export function _resetForTests() {
  _seedHydratedFirebaseProgressForTests()
  resetWeaponPermanentUpgradeLevels()
}
