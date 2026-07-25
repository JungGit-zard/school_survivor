export const DEFAULT_CRIT_CHANCE = 0
export const DEFAULT_CRIT_MULTIPLIER = 1.5
export const MAX_CRIT_MULTIPLIER = 5

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

function sanitizeMultiplier(value) {
  const multiplier = Number(value)
  if (!Number.isFinite(multiplier) || multiplier < 1) return DEFAULT_CRIT_MULTIPLIER
  return Math.min(MAX_CRIT_MULTIPLIER, multiplier)
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

  out.damage = damage * sanitizeMultiplier(critMultiplier)
  out.isCritical = true
  return out
}
