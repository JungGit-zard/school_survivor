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

function sanitizeMultiplier(value) {
  const multiplier = Number(value)
  if (!Number.isFinite(multiplier) || multiplier < 1) return DEFAULT_CRIT_MULTIPLIER
  return multiplier
}

export function canDamageCrit({ canCrit = true, damageType, attackTags } = {}) {
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
  const damage = sanitizeDamage(baseDamage)
  if (damage <= 0) return { damage: 0, isCritical: false }
  if (!canDamageCrit({ canCrit, damageType, attackTags })) return { damage, isCritical: false }

  const chance = sanitizeChance(critChance)
  if (chance <= 0) return { damage, isCritical: false }

  const roll = typeof rng === 'function' ? Number(rng()) : 1
  if (!Number.isFinite(roll) || roll < 0 || roll >= chance) return { damage, isCritical: false }

  return {
    damage: damage * sanitizeMultiplier(critMultiplier),
    isCritical: true,
  }
}
