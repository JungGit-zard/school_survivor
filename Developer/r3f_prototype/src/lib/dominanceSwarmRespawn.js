export const DOMINANCE_SWARM_CONFIG = Object.freeze({
  evaluateIntervalMs: 3000,
  killWindowMs: 10000,
  damageWindowMs: 10000,
  emptyFieldWindowMs: 15000,
  cooldownMs: 8000,
  minHpRatio: 0.55,
  maxRecentDamageRatio: 0.25,
  lowPressureEnemyCount: 3,
  dominanceThreshold: 2.2,
  strongDominanceThreshold: 3.2,
  maxActiveEnemies: 70,
  maxSpawnPerBurst: 16,
  minRunTimeMs: 15000,
})

const STAGE_WEAK_SWARM_TYPES = Object.freeze({
  stage1: Object.freeze(['E01', 'E01', 'E01', 'E02']),
  stage2: Object.freeze(['E01', 'E01', 'E02', 'E02']),
  stage3: Object.freeze(['E01', 'E02', 'E05']),
  stage4: Object.freeze(['E01', 'E02', 'E05']),
})

function pruneWindow(events, nowMs, windowMs) {
  while (events.length && nowMs - events[0].t > windowMs) events.shift()
}

function sumWindow(events, nowMs, windowMs) {
  pruneWindow(events, nowMs, windowMs)
  return events.reduce((sum, event) => sum + (event.amount ?? 1), 0)
}

export function createDominanceSwarmState() {
  return {
    kills: [],
    damage: [],
    emptyFields: [],
    lastEvaluateMs: -Infinity,
    lastSpawnMs: -Infinity,
    lastEmptyFieldMs: -Infinity,
  }
}

export function resetDominanceSwarmState(state) {
  if (!state) return createDominanceSwarmState()
  state.kills.length = 0
  state.damage.length = 0
  state.emptyFields.length = 0
  state.lastEvaluateMs = -Infinity
  state.lastSpawnMs = -Infinity
  state.lastEmptyFieldMs = -Infinity
  return state
}

export function recordEnemyKill(state, nowMs) {
  if (!state || !Number.isFinite(nowMs)) return state
  state.kills.push({ t: nowMs })
  pruneWindow(state.kills, nowMs, DOMINANCE_SWARM_CONFIG.killWindowMs)
  return state
}

export function recordPlayerDamage(state, amount, nowMs) {
  if (!state || !(amount > 0) || !Number.isFinite(nowMs)) return state
  state.damage.push({ t: nowMs, amount })
  pruneWindow(state.damage, nowMs, DOMINANCE_SWARM_CONFIG.damageWindowMs)
  return state
}

export function recordEmptyField(state, nowMs) {
  if (!state || !Number.isFinite(nowMs)) return state
  if (nowMs - state.lastEmptyFieldMs < 1000) return state
  state.lastEmptyFieldMs = nowMs
  state.emptyFields.push({ t: nowMs })
  pruneWindow(state.emptyFields, nowMs, DOMINANCE_SWARM_CONFIG.emptyFieldWindowMs)
  return state
}

export function recordDominanceSwarmSpawn(state, nowMs) {
  if (!state || !Number.isFinite(nowMs)) return state
  state.lastSpawnMs = nowMs
  return state
}

export function evaluateDominanceSwarm(state, context = {}, config = DOMINANCE_SWARM_CONFIG) {
  const nowMs = Number.isFinite(context.nowMs) ? context.nowMs : 0
  if (!state) return { shouldSpawn: false, reason: 'missing-state', dominanceScore: 0, spawnCount: 0 }
  if (nowMs < config.minRunTimeMs) return { shouldSpawn: false, reason: 'opening-grace', dominanceScore: 0, spawnCount: 0 }
  if (nowMs - state.lastEvaluateMs < config.evaluateIntervalMs) return { shouldSpawn: false, reason: 'evaluate-cooldown', dominanceScore: 0, spawnCount: 0 }
  state.lastEvaluateMs = nowMs

  const currentHp = Number.isFinite(context.currentHp) ? context.currentHp : 0
  const maxHp = Number.isFinite(context.maxHp) && context.maxHp > 0 ? context.maxHp : 1
  const activeEnemyCount = Math.max(0, Math.floor(context.activeEnemyCount ?? 0) || 0)
  const queuedEnemyCount = Math.max(0, Math.floor(context.queuedEnemyCount ?? 0) || 0)
  const totalEnemyPressure = activeEnemyCount + queuedEnemyCount
  const hpRatio = currentHp / maxHp
  const recentDamage10s = sumWindow(state.damage, nowMs, config.damageWindowMs)
  const killsInLast10Sec = sumWindow(state.kills, nowMs, config.killWindowMs)
  const recentEmptyFieldCount = sumWindow(state.emptyFields, nowMs, config.emptyFieldWindowMs)

  if (context.isBossActive || context.isSpecialPatternActive) return { shouldSpawn: false, reason: 'boss-or-special-pressure', dominanceScore: 0, spawnCount: 0 }
  if (nowMs - state.lastSpawnMs < config.cooldownMs) return { shouldSpawn: false, reason: 'spawn-cooldown', dominanceScore: 0, spawnCount: 0 }
  if (hpRatio < config.minHpRatio) return { shouldSpawn: false, reason: 'low-hp', dominanceScore: 0, spawnCount: 0 }
  if (recentDamage10s > maxHp * config.maxRecentDamageRatio) return { shouldSpawn: false, reason: 'recent-damage', dominanceScore: 0, spawnCount: 0 }
  if (totalEnemyPressure >= config.maxActiveEnemies) return { shouldSpawn: false, reason: 'active-cap', dominanceScore: 0, spawnCount: 0 }

  const killRate10s = killsInLast10Sec / 10
  const emptyFieldRecently = recentEmptyFieldCount >= 2
  const lowPressure = totalEnemyPressure <= config.lowPressureEnemyCount
  const playerSafe = hpRatio >= config.minHpRatio && recentDamage10s <= maxHp * config.maxRecentDamageRatio
  const dominanceScore = killRate10s * 1.0
    + (emptyFieldRecently ? 1.0 : 0)
    + (lowPressure ? 0.7 : 0)
    + (playerSafe ? 0.8 : -1.0)

  if (dominanceScore < config.dominanceThreshold) {
    return { shouldSpawn: false, reason: 'below-threshold', dominanceScore, spawnCount: 0 }
  }

  const rawCount = dominanceScore >= config.strongDominanceThreshold ? 12 : 6
  const room = Math.max(0, config.maxActiveEnemies - totalEnemyPressure)
  const spawnCount = Math.min(config.maxSpawnPerBurst, rawCount, room)
  return {
    shouldSpawn: spawnCount > 0,
    reason: spawnCount > 0 ? 'dominant-player' : 'no-room',
    dominanceScore,
    spawnCount,
    killsInLast10Sec,
    recentDamage10s,
    recentEmptyFieldCount,
  }
}

export function createDominanceSwarmSpawnPlan(result, context = {}, random = Math.random) {
  const count = Math.max(0, Math.min(DOMINANCE_SWARM_CONFIG.maxSpawnPerBurst, Math.floor(result?.spawnCount ?? 0) || 0))
  const stageId = context.stageId ?? 'stage1'
  const pool = STAGE_WEAK_SWARM_TYPES[stageId] ?? STAGE_WEAK_SWARM_TYPES.stage1
  const entries = []
  for (let i = 0; i < count; i += 1) {
    const type = pool[Math.floor(random() * pool.length) % pool.length]
    entries.push({ type, source: 'dominance-swarm' })
  }
  return entries
}
