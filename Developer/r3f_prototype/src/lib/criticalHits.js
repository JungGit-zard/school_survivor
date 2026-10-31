export const DEFAULT_CRIT_CHANCE = 0
export const DEFAULT_CRIT_MULTIPLIER = 1.5

const NON_CRIT_DAMAGE_TYPES = new Set(['explosive'])

function sanitizeDamage(value) {
  const damage = Number(value)
  return Number.isFinite(damage) && damage > 0 ? damage : 0
}

function sanitizeChance(value) {
  const chance = Number(value)
  if (!Number.isFinite(chance)) return DEFAULT_CRIT_CHANCE
  return Math.min(1, Math.max(0, chance))
}

// Terry 2026-10-31: 하나코 치명타 피해 보너스(+10~30%). 치명타 확률은 건드리지 않고,
// 치명타가 뜬 타격의 최종 피해에만 (1 + bonus)를 곱한다. store가 weapons 변화 때 갱신한다.
let criticalDamageBonus = 0
export function setCriticalDamageBonus(bonus) {
  criticalDamageBonus = Number.isFinite(bonus) && bonus > 0 ? bonus : 0
}

function fixedCriticalMultiplier() {
  // Terry rule: every critical hit deals exactly 150% of original damage.
  // Weapon/card-provided critMultiplier values are intentionally ignored at hit resolution.
  return DEFAULT_CRIT_MULTIPLIER * (1 + criticalDamageBonus)
}

export function canDamageCrit({ canCrit = true, damageType, attackTags } = {}) {
  return canDamageCritRaw(canCrit, damageType, attackTags)
}

export function canDamageCritRaw(canCrit = true, damageType, attackTags) {
  if (canCrit === false) return false
  if (NON_CRIT_DAMAGE_TYPES.has(damageType)) return false
  if (Array.isArray(attackTags) && attackTags.includes('explosive')) return false
  return true
}

export function resolveCriticalHit({
  baseDamage,
  canCrit = true,
  damageType,
  attackTags,
  critChance = DEFAULT_CRIT_CHANCE,
  critMultiplier = DEFAULT_CRIT_MULTIPLIER,
  rng = Math.random,
} = {}) {
  const out = { damage: 0, isCritical: false }
  return resolveCriticalHitInto(out, baseDamage, canCrit, damageType, attackTags, critChance, critMultiplier, rng)
}

// Hot path API: caller-owned `out`를 갱신해 결과 객체를 만들지 않는다.
export function resolveCriticalHitInto(out, baseDamage, canCrit = true, damageType, attackTags,
  critChance = DEFAULT_CRIT_CHANCE, critMultiplier = DEFAULT_CRIT_MULTIPLIER, rng = Math.random) {
  if (!out || typeof out !== 'object') return null
  const damage = sanitizeDamage(baseDamage)
  out.damage = 0
  out.isCritical = false
  if (damage <= 0) return out
  if (!canDamageCritRaw(canCrit, damageType, attackTags)) { out.damage = damage; return out }

  const chance = sanitizeChance(critChance)
  if (chance <= 0) { out.damage = damage; return out }

  const roll = typeof rng === 'function' ? Number(rng()) : 1
  if (!Number.isFinite(roll) || roll < 0 || roll >= chance) { out.damage = damage; return out }

  out.damage = damage * fixedCriticalMultiplier()
  out.isCritical = true
  return out
}
