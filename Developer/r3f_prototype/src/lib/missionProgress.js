import { MISSION_BY_ID, MISSION_CATALOG, MISSION_CATALOG_VERSION, MISSION_REWARD_APPROVED } from './missionCatalog.js'

const MAX_COUNTER_VALUE = 1_000_000

export function createMissionProgressState(value = {}) {
  return {
    schemaVersion: 1,
    catalogVersion: MISSION_CATALOG_VERSION,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    counters: { ...(value.counters ?? {}) },
    active: { ...(value.active ?? {}) },
    completed: { ...(value.completed ?? {}) },
    claimed: { ...(value.claimed ?? {}) },
    pinnedMissionIds: Array.isArray(value.pinnedMissionIds) ? value.pinnedMissionIds.slice(0, 2) : [],
    claimLedger: { ...(value.claimLedger ?? {}) },
  }
}

export function reduceMissionEvent(progress, event) {
  const next = createMissionProgressState(progress)
  const changes = getCounterChanges(event)
  if (changes.length === 0) return reconcileMissionProgress(next)

  for (const { key, value, mode = 'add' } of changes) {
    const previous = readCounter(next.counters[key])
    next.counters[key] = mode === 'max'
      ? Math.max(previous, value)
      : Math.min(MAX_COUNTER_VALUE, previous + value)
  }
  next.updatedAt = new Date().toISOString()
  return reconcileMissionProgress(next)
}

export function reconcileMissionProgress(progress) {
  const next = createMissionProgressState(progress)
  for (const mission of MISSION_CATALOG) {
    const status = getMissionStatus(next, mission)
    const existing = next.active[mission.id] ?? {}
    const completed = next.completed[mission.id] ?? {}
    const claimed = next.claimed[mission.id] ?? {}
    const entry = {
      counter: status.counter,
      target: status.target,
      completedAt: existing.completedAt ?? completed.completedAt ?? null,
      claimedAt: existing.claimedAt ?? claimed.claimedAt ?? null,
      claimId: existing.claimId ?? claimed.claimId ?? null,
    }
    if (status.complete && !entry.completedAt) entry.completedAt = new Date().toISOString()
    next.active[mission.id] = entry
    if (entry.completedAt) next.completed[mission.id] = { completedAt: entry.completedAt, counter: entry.counter, target: entry.target }
  }
  return next
}

export function getMissionStatus(progress, missionOrId) {
  const mission = typeof missionOrId === 'string' ? MISSION_BY_ID[missionOrId] : missionOrId
  if (!mission) return { state: 'missing', counter: 0, target: 1, complete: false, claimEnabled: false }
  const completion = mission.completion
  const values = completion.type === 'any-counter'
    ? completion.counterKeys.map((key) => readCounter(progress?.counters?.[key]))
    : [readCounter(progress?.counters?.[completion.counterKey])]
  const counter = values.length === 1 ? values[0] : Math.max(...values)
  const target = completion.target
  const entry = progress?.active?.[mission.id]
  const claimed = !!(entry?.claimedAt || progress?.claimed?.[mission.id])
  const complete = counter >= target || !!entry?.completedAt
  return {
    state: claimed ? 'claimed' : complete ? 'completed_unclaimed' : 'active',
    counter: Math.min(counter, target),
    target,
    complete,
    // 이 한 seam이 false인 동안은 proposal 금액으로 claim을 절대 실행하지 않는다.
    claimEnabled: complete && !claimed && MISSION_REWARD_APPROVED,
  }
}

export function getCounterChanges(event = {}) {
  const type = typeof event.type === 'string' ? event.type : ''
  const stageId = readStageId(event.stageId)
  const amount = readPositive(event.value, 1)
  const itemType = readToken(event.itemType)
  const enemyType = readToken(event.enemyType)
  const weaponKey = readToken(event.weaponKey)
  const bossId = readToken(event.bossId)
  const companionId = readToken(event.companionId)

  switch (type) {
    case 'pickup_collected': return itemType ? [{ key: `pickup.${itemType}.count`, value: amount }] : []
    case 'survival_updated': return stageId ? [{ key: `stage.${stageId}.bestSurvivalSec`, value: amount, mode: 'max' }] : []
    case 'enemy_killed': return enemyType ? [
      { key: `enemy.${enemyType}.killCount`, value: amount },
      ...(stageId ? [{ key: `stage.${stageId}.enemy.${enemyType}.killCount`, value: amount }] : []),
      ...(weaponKey ? [{ key: `weapon.${weaponKey}.killCount`, value: amount }] : []),
    ] : []
    case 'weapon_hit': return weaponKey ? [{ key: `weapon.${weaponKey}.hitCount`, value: amount }] : []
    case 'upgrade_selected': return [{ key: 'upgrade.choice.count', value: amount }]
    case 'stage_started': return stageId ? [{ key: `stage.${stageId}.startCount`, value: amount }] : []
    case 'stage_cleared': return stageId ? [{ key: `stage.${stageId}.clearCount`, value: amount }] : []
    case 'special_enemy_survival': return enemyType ? [{ key: `special.${enemyType}.survivedAfterSpawnSec`, value: amount, mode: 'max' }] : []
    case 'boss_spawned': return bossId ? [{ key: `boss.${bossId}.spawnCount`, value: amount }] : []
    case 'boss_killed': return bossId ? [{ key: `boss.${bossId}.killCount`, value: amount }] : []
    case 'interaction_triggered': return [{ key: 'interaction.trigger.count', value: amount }]
    case 'quest_completed': return [{ key: 'quest.any.completeCount', value: amount }]
    case 'companion_heal': return companionId ? [{ key: `companion.${companionId}.healCount`, value: amount }] : []
    case 'weapon_state': return [
      ...(Number(event.weaponLevel) >= 5 ? [{ key: 'weapon.any.levelFiveCount', value: 1, mode: 'max' }] : []),
      ...(Number.isFinite(Number(event.activeWeaponCount)) ? [{ key: 'weapon.active.count', value: Math.max(0, Math.floor(Number(event.activeWeaponCount))), mode: 'max' }] : []),
    ]
    default: return []
  }
}

function readCounter(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.min(MAX_COUNTER_VALUE, Math.floor(number)) : 0
}

function readPositive(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.min(MAX_COUNTER_VALUE, Math.floor(number)) : fallback
}

function readToken(value) {
  const token = typeof value === 'string' ? value.trim() : ''
  return /^[A-Za-z0-9_-]{1,64}$/.test(token) ? token : ''
}

function readStageId(value) {
  return ['stage1', 'stage2', 'stage3', 'stage4'].includes(value) ? value : ''
}
