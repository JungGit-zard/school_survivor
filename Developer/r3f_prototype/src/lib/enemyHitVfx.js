export const COMMON_ENEMY_HIT_SPARK = {
  type: 'hitSpark',
  color: 0xfff0a6,
  life: 180,
  baseScale: 0.16,
  growScale: 0.22,
}

export const COMMON_ENEMY_HIT_KNOCKBACK = {
  speed: 0.85,
  durationMs: 70,
}

export function createEnemyHitSparkEvent({ x, z, y = 0.46 }) {
  return {
    ...COMMON_ENEMY_HIT_SPARK,
    x,
    y,
    z,
  }
}

export function resolveEnemyHitKnockback(impact = {}, enemy = {}) {
  if (enemy.type === 'E02') {
    return {
      speed: 0,
      durationMs: 0,
      source: impact.source,
    }
  }

  return {
    speed: impact.knockback ?? COMMON_ENEMY_HIT_KNOCKBACK.speed,
    durationMs: impact.knockbackMs ?? COMMON_ENEMY_HIT_KNOCKBACK.durationMs,
    source: impact.source,
  }
}
