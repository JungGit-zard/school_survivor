// 브라우저 없이 실제 인게임 프레임 루프를 반복 구동하는 플레이 소크 하네스다.
// runPooledEnemyRuntimeSoak(Enemies.jsx)는 고정 패턴 풀 churn만 본다. 이 하네스는
// 몬스터(웨이브·AI·접촉) / 무기(타겟팅·피해·처치) / 이동(입력·경계) / 리스폰(드레인·슬롯 재사용)을
// 전부 실제 정본 모듈로 함께 돌리고, 매 프레임 불변식을 검사한다.
//
// 정본 재사용 원칙: 스폰 위치·타입 추첨·웨이브 간격·피해 적용은 게임이 쓰는 함수를 그대로 호출한다.
// 복제한 로직은 프레임 루프 배선(Enemies.jsx usePlayingFrame / Player.jsx useFrame)뿐이다.
import {
  enemyPool,
  enemyProjectilePool,
  projectileZombieShotPool,
  enemySightBlocked,
  enemySimulationRuntime,
  playerPos,
  resetRuntimeRefs,
} from './refs.js'
import { MAX_ENEMIES } from './enemyEntityPool.js'
import { MAX_ENEMY_PROJECTILES } from './enemyProjectilePool.js'
import { spawnProjectileZombieTelegraphDecal, spawnProjectileZombieVolley } from './projectileZombieBehavior.js'
import {
  collidesEnemyObstacle,
  enemyCollisionRadius,
  ENEMY_CONTACT_COOLDOWN_MS,
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_DEATH,
  ENEMY_EVENT_DESPAWN,
  ENEMY_EVENT_ERROR,
  ENEMY_EVENT_RANGED_FIRE,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_STUCK_RECOVERY_MS,
  ignoresObstacles,
} from './enemySimulation.js'
import {
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
  resetPooledEnemySpawnDrainQueue,
} from './pooledEnemySpawnDrain.js'
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { clampPlayerPosition, getPlayerMovementBounds } from './playerMovementBounds.js'
import { getE04IntroSec } from './stage2ProjectileRules.js'
import { applyRadialDamage, applyForwardConeDamage, findClosestEnemy } from './weaponTargeting.js'
import { resolvePlayerHitKnockback } from '../components/Player.jsx'
import { applyEnemyHit } from './weaponCollision.js'
import { applyUpgradeWithChibikoBoost, isUpgradeAvailable, UPGRADE_EFFECTS } from './upgrades.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { getStageObjectSightObstacles, isStageObjectSightBlocked } from '../components/StageObjects/stageObjectColliders.js'
import {
  bossEscortSize,
  createRunZombieCrewEntries,
  formationSpawnPositions,
  getWavePhasesForStage,
  nextWaveTimeForStage,
  pickTypeByWeightExcluding,
  randomSpawnPos,
  stageHpOverride,
  waveSizeForStageAtTime,
  createStage2GuardChaseEntries,
  buildOvertimeMixedReinforcementEntries,
  clampZombieSpawnRequest,
  overtimeHpStatOverride,
  overtimeReinforcementCountForTick,
  repeatingBurstSpawnCountForTick,
  shouldScheduleOvertimeReinforcement,
} from '../components/Enemies.jsx'
import {
  getRuntimeBurstEventsForStage,
  isBossType,
  isRepeatingBurstEvent,
  postExitRepeatWaveIndex,
  postExitWaveCount,
  repeatingBurstSecAtTick,
  repeatingBurstTickAt,
  RUN_ZOMBIE_CREW_FORMATION,
  STAGE2_GUARD_CHASE_FORMATION,
} from './burstEvents.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { buildExpansionBurstBatch } from '../components/Enemies.jsx'
import { STAGE5_CALL_LANE_FORMATION } from './burstEvents.js'
import { createStage5CallLanePulses, getStage5CallLaneVisual, laneIndexForX, STAGE5_CALL_STAGE_ID, stage5CallLanePulseOffset } from './stage5CallLane.js'
import { AUTHORED_ATTACK_BOSSES, b10SummonRingPositions, createB10SummonState, isAuthoredAttackBoss, isB10EnrageTransitionDone, stepB10SummonTriggers } from './stage5ViceBoss.js'
import {
  clearExpansionAttacks,
  createExpansionAttackState,
  expansionAttackSnapshots,
  resetExpansionPoolAttacks,
  stepExpansionAttack,
  stepExpansionHazardSnapshots,
} from './expansionAttackRuntime.js'
import { createBossSummonState, stepBossSummon } from './expansionBossSummons.js'
import { advanceAssemblySpeech, createAssemblySpeechState, emitAssemblySpeechRing } from './stage6AssemblySpeech.js'
import { isRangedPropBlockStage } from './stageRangedBlockers.js'
import { EXPANSION_BOSSES, getExpansionStageHazards, isExpansionBoss, isExpansionStage } from './expansionContent.js'
import { probeFixedSpawnPos, updateScreenBounds } from './stageRuntimeProbe.js'

// 출시 스테이지 1~5만 돈다. 6~10은 미출시 초안이라 소크 대상이 아니다.
export const SOAK_STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']
export const SOAK_FRAME_DELTA = 1 / 60
// 한 런 길이. 탈출구 개방(210초) 뒤 오버타임 증원(240초~, 30초 회차)과 반복 버스트 증가분이
// 최소 몇 회차 돌도록 300초로 둔다.
export const SOAK_RUN_SECONDS = 300
const PLAYER_SPEED = 3
const INPUT_CHANGE_FRAMES = 23
const WEAPON_PERIOD_FRAMES = 7
const BOUNDS_EPSILON = 1e-3
// 포화 런: 풀 상한(200) 부근까지 밀어 넣어 슬롯 재사용·스폰 실패 처리·밀집 분리를 검사한다.
const SATURATION_TARGET = MAX_ENEMIES - 6
const SATURATION_BATCH = 6
// 한 프레임 겹침은 밀집 분리 과정에서 정상이다. 0.5초(30프레임) 이상 장애물 안에 박혀 있으면 버그다.
const MAX_OVERLAP_FRAMES = 30
// 스턱 회복(1.2초)의 4배를 넘겨도 못 빠져나오면 영구 스턱으로 본다.
const MAX_STUCK_MS = ENEMY_STUCK_RECOVERY_MS * 4
// 2026-11-08 Stage 5/6: 소크에는 보스 몸(React/Rapier)이 없다. 대신 '가상 보스'(위치·이동·확장 공격 스냅샷·소환)를
// 돌린다. HP는 등장 후 이 시간에 걸쳐 선형으로 0이 된다고 가정한다(스펙 처치 목표 25~55초의 중간값) —
// B10 소집 트리거(85/50/25%)·격노 전환·B05 격노 소환이 모두 런 안에서 한 번씩 지나가게 하려는 값이다.
const VIRTUAL_BOSS_KILL_SEC = 40

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Enemies.jsx phaseIndexAtTime과 같은 시각→phase 조회다(데이터 선택, 검증 대상 로직 아님).
function phaseAtTime(phases, time) {
  let selected = phases[0]
  for (let index = 0; index < phases.length; index += 1) {
    if (time < phases[index].start) break
    selected = phases[index]
  }
  return selected
}

function spawnEntryIntoPool(entry) {
  const stats = { ...(ENEMY_STATS[entry.type] ?? ENEMY_STATS.E01), ...(entry.statOverride ?? {}) }
  const pos = entry.pos ?? [0, 0, 0]
  return enemyPool.spawnInto({ index: -1, generation: 0 }, {
    type: entry.type,
    x: pos[0],
    y: pos[1],
    z: pos[2],
    hp: stats.hp,
    maxHp: stats.hp,
    visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER,
    runDirX: entry.runCrewDir?.x ?? 1,
    runDirZ: entry.runCrewDir?.z ?? 0,
  })
}

// Enemies.jsx pooledHitBridge의 데미지 경로만 남긴 버전이다. VFX/사운드/보상은 소크 대상이 아니다.
function installHitDispatcher(stats) {
  enemyPool.setGlobalHitDispatcher((index, generation, damage, impact) => {
    if (!enemyPool.isIndexGenerationAlive(index, generation)) return
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    const sourceX = impact?.source?.x ?? playerPos.x
    const sourceZ = impact?.source?.z ?? playerPos.z
    const dx = x - sourceX
    const dz = z - sourceZ
    const length = Math.hypot(dx, dz) || 1
    const knockback = Number.isFinite(impact?.knockback) ? impact.knockback : 1.6
    const knockbackMs = Number.isFinite(impact?.knockbackMs) ? impact.knockbackMs : 120
    if (enemyPool.hp[index] <= damage) stats.kills += 1
    stats.hits += 1
    enemySimulationRuntime.applyHitIndex(enemyPool, index, generation, damage,
      (dx / length) * knockback, (dz / length) * knockback, knockbackMs)
  })
}

// Enemies.jsx SCHEDULE_BURST 핸들러의 스폰 배선만 옮긴 것이다(보스 본체는 풀이 아니라 React 바디이므로 호위만 넣는다).
function enqueueBurst(spawnDrain, evt, context, stats) {
  const push = (entry) => {
    if (!enqueuePooledEnemySpawn(spawnDrain, entry, context.spawnToken)) stats.drainDropped += 1
  }
  // 확장 스테이지(6~): Enemies.jsx 확장 분기 그대로 buildExpansionBurstBatch(조회 줄·트랙·확장 링). 보스 자리는 가상 보스가 쓴다.
  if (isExpansionStage(context.stageId)) {
    const batch = buildExpansionBurstBatch(context.expansionCache, evt, { pooledActive: enemyPool.activeCount, specialActive: context.virtualBoss?.alive ? 1 : 0, pooledQueued: spawnDrain.count })
    for (const entry of batch) {
      if (isExpansionBoss(entry.type)) { startVirtualBoss(context, entry.type, entry.pos, stats); continue }
      push({ type: entry.type, pos: entry.pos, statOverride: entry.statOverride })
    }
    return
  }
  if (isBossType(evt.type)) {
    if (isAuthoredAttackBoss(evt.type)) {
      const pos = randomSpawnPos(evt.type, context.spawnBounds, [], Math.random, context.obstacles)
      if (pos) startVirtualBoss(context, evt.type, pos, stats)
    }
    const escortSize = bossEscortSize(context.stageId, context.phases, evt.sec)
    if (escortSize <= 0) return
    const bossPhase = context.phases.findLast((phase) => evt.sec >= phase.start) ?? context.phases[0]
    const taken = []
    for (let slot = 0; slot < escortSize; slot += 1) {
      const type = pickTypeByWeightExcluding(bossPhase.weights, null)
      if (!type) continue
      const pos = randomSpawnPos(type, context.spawnBounds, taken, Math.random, context.obstacles)
      if (!pos) continue
      taken.push(pos)
      push({ type, pos, statOverride: stageHpOverride(type, context.stageId) })
    }
    return
  }
  if (evt.formation === RUN_ZOMBIE_CREW_FORMATION) {
    const entries = createRunZombieCrewEntries(context.spawnBounds, Math.random, context.obstacles)
    for (const entry of entries) push({ ...entry, statOverride: stageHpOverride(entry.type, context.stageId) })
    stats.crewSpawns += entries.length
    return
  }
  if (evt.formation === STAGE2_GUARD_CHASE_FORMATION) {
    const entries = createStage2GuardChaseEntries(context.spawnBounds, Math.random)
    for (const entry of entries) push({ ...entry, statOverride: stageHpOverride(entry.type, context.stageId) })
    stats.crewSpawns += entries.length
    return
  }
  const count = evt.count ?? 1
  const positions = evt.formation
    ? formationSpawnPositions(evt.formation, count, context.spawnBounds, { x: playerPos.x, z: playerPos.z }, Math.random, context.obstacles, evt.type)
    : null
  const taken = []
  for (let slot = 0; slot < count; slot += 1) {
    const pos = positions ? positions[slot] : randomSpawnPos(evt.type, context.spawnBounds, taken, Math.random, context.obstacles)
    if (!pos) continue
    taken.push(pos)
    push({ type: evt.type, pos, statOverride: stageHpOverride(evt.type, context.stageId) })
  }
}

function startVirtualBoss(context, type, pos, stats) {
  const stat = ENEMY_STATS[type]
  context.virtualBoss = {
    type, x: pos[0], z: pos[2], alive: true, spawnSec: context.sec, speed: stat?.speed ?? 0.5,
    contactDist: (stat?.contactDist ?? 0.4) * ENEMY_SIZE_MULTIPLIER, damage: stat?.damage ?? 20,
    attack: createExpansionAttackState(type, `soak:${type}:${context.spawnToken}`, context.spawnToken),
    summon: EXPANSION_BOSSES[type]?.summon ? createBossSummonState(EXPANSION_BOSSES[type].summon) : null,
    b10Summon: isAuthoredAttackBoss(type) ? createB10SummonState() : null,
    prevRatio: 1, stopMs: 0, contactCooldownMs: 0,
    // 천장(150)이나 좌표 실패로 미뤄 둔 확장 소환 몫(Enemies.jsx queue.summonDeferred*와 같은 규칙).
    summonDeferred: 0,
  }
  stats.virtualBosses += 1
}

// 확장 보스 소환 1회(Enemies.jsx SCHEDULE_EXPANSION_SUMMON과 같은 규칙): 좌표는 소환 전체 크기(트랙 6지점)에서 고른 뒤
// 이번에 낼 수만큼 자르고(천장 150은 build 안의 clamp와 slice가 지킨다), 못 낸 몫은 보스에 미뤄 둔다.
function spawnExpansionSummon(context, spawnDrain, stats, boss, requested) {
  const summon = EXPANSION_BOSSES[boss.type].summon
  const counts = { pooledActive: enemyPool.activeCount, specialActive: 1, pooledQueued: spawnDrain.count }
  const batch = buildExpansionBurstBatch(context.expansionCache, { type: summon.type, count: summon.count, formation: summon.formation }, counts)
    .slice(0, clampZombieSpawnRequest(requested, counts))
  for (const entry of batch) {
    if (enqueuePooledEnemySpawn(spawnDrain, { type: entry.type, pos: entry.pos, statOverride: entry.statOverride }, context.spawnToken)) stats.bossSummonSpawns += 1
    else stats.drainDropped += 1
  }
  const shortfall = requested - batch.length
  if (shortfall > 0) { boss.summonDeferred += shortfall; stats.bossSummonDeferred += shortfall }
}

// 가상 보스 1프레임: Enemy.jsx 확장·authored 보스 분기(stepExpansionAttack·격노 정지·소환·접촉 500ms)와 같은 배선.
function stepVirtualBoss(context, spawnDrain, stats, args) {
  const boss = context.virtualBoss
  if (!boss?.alive) return
  const ratio = Math.max(0, 1 - (context.sec - boss.spawnSec) / VIRTUAL_BOSS_KILL_SEC)
  const a = args
  a.deltaMs = SOAK_FRAME_DELTA * 1000
  a.playing = true
  a.alive = ratio > 0
  a.gameKey = context.spawnToken
  a.x = boss.x
  a.z = boss.z
  a.playerX = playerPos.x
  a.playerZ = playerPos.z
  a.hpRatio = ratio
  if (isAuthoredAttackBoss(boss.type)) { a.stageId = context.stageId; a.halfX = context.halfX; a.halfZ = context.halfZ } else { a.stageId = undefined; a.halfX = undefined; a.halfZ = undefined }
  const before = boss.attack.snapshot
  const attack = stepExpansionAttack(boss.attack, a)
  if (boss.attack.snapshot && boss.attack.snapshot !== before) stats.bossAttacks += 1
  if (attack.damage > 0) { stats.bossPatternHits += 1; applyStoreContactDamage(attack.damage, stats) }
  const summonQueue = []
  if (boss.summon) {
    const summon = stepBossSummon(boss.summon, EXPANSION_BOSSES[boss.type].summon, { deltaMs: a.deltaMs, playing: true, enraged: boss.attack.enraged, enrageDone: !(boss.attack.enrageRemainingMs > 0) })
    if (summon.fire) summonQueue.push('expansion')
  }
  let stop = attack.stop
  if (boss.b10Summon) {
    const count = stepB10SummonTriggers(boss.b10Summon, boss.prevRatio, ratio, isB10EnrageTransitionDone(boss.attack))
    boss.prevRatio = ratio
    for (let i = 0; i < count; i += 1) summonQueue.push('b10')
    if (count > 0) boss.stopMs = AUTHORED_ATTACK_BOSSES[boss.type].summon.stopMs
    if (boss.stopMs > 0) { boss.stopMs -= a.deltaMs; stop = true }
  }
  for (const kind of summonQueue) {
    stats.bossSummons += 1
    const counts = { pooledActive: enemyPool.activeCount, specialActive: 1, pooledQueued: spawnDrain.count }
    if (kind === 'expansion') {
      const summonCount = EXPANSION_BOSSES[boss.type].summon.count
      stats.bossSummonRequested += summonCount
      spawnExpansionSummon(context, spawnDrain, stats, boss, summonCount)
    } else {
      const ring = b10SummonRingPositions(boss.x, boss.z, playerPos.x, playerPos.z)
      const count = clampZombieSpawnRequest(ring.length, counts)
      const taken = []
      for (let index = 0; index < count; index += 1) {
        const pos = probeFixedSpawnPos(ring[index].type, ring[index].x, ring[index].z, context.spawnBounds, context.obstacles, taken)
        if (!pos) continue
        taken.push(pos)
        if (enqueuePooledEnemySpawn(spawnDrain, { type: ring[index].type, pos, statOverride: stageHpOverride(ring[index].type, context.stageId) }, context.spawnToken)) stats.bossSummonSpawns += 1
        else stats.drainDropped += 1
      }
    }
  }
  // 미뤄 둔 소환 몫: 보스가 살아 있고 자리가 1칸이라도 나면 한 소환 크기(6)까지 다시 낸다(Enemies.jsx 프레임 루프 블록).
  if (ratio > 0 && boss.summonDeferred > 0
    && clampZombieSpawnRequest(1, { pooledActive: enemyPool.activeCount, specialActive: 1, pooledQueued: spawnDrain.count }) > 0) {
    const chunk = Math.min(boss.summonDeferred, EXPANSION_BOSSES[boss.type].summon.count)
    boss.summonDeferred -= chunk
    stats.bossSummonRetries += 1
    spawnExpansionSummon(context, spawnDrain, stats, boss, chunk)
  }
  // 보스 처치: 미뤄 둔 몫은 폐기한다(처치 뒤에는 아무것도 나오지 않는다).
  if (ratio <= 0) { stats.bossSummonDropped += boss.summonDeferred; boss.summonDeferred = 0; boss.alive = false; return }
  const dx = playerPos.x - boss.x
  const dz = playerPos.z - boss.z
  const dist = Math.hypot(dx, dz)
  if (!stop && dist > 1e-4) {
    boss.x = Math.max(-context.halfX, Math.min(context.halfX, boss.x + (dx / dist) * boss.speed * SOAK_FRAME_DELTA))
    boss.z = Math.max(-context.halfZ, Math.min(context.halfZ, boss.z + (dz / dist) * boss.speed * SOAK_FRAME_DELTA))
  }
  if (boss.contactCooldownMs > 0) boss.contactCooldownMs -= a.deltaMs
  if (Math.hypot(playerPos.x - boss.x, playerPos.z - boss.z) <= boss.contactDist && boss.contactCooldownMs <= 0) {
    applyStoreContactDamage(boss.damage, stats)
    boss.contactCooldownMs = 500
  }
}

// Stage 5 전교 호출 펄스(Enemies.jsx spawnStage5CallLanePulse): 동시 천장으로 자른 뒤 레인 양끝 고정 좌표.
function spawnCallLanePulse(spawnDrain, pulse, context, stats) {
  const count = clampZombieSpawnRequest(pulse.spawns.length, { pooledActive: enemyPool.activeCount, pooledQueued: spawnDrain.count })
  const taken = []
  stats.callLanePulses += 1
  stats.callLaneRequested += pulse.spawns.length
  for (let index = 0; index < count; index += 1) {
    const pos = probeFixedSpawnPos(pulse.type, pulse.spawns[index].x, pulse.spawns[index].z, context.spawnBounds, context.obstacles, taken)
    if (!pos) continue
    taken.push(pos)
    if (enqueuePooledEnemySpawn(spawnDrain, { type: pulse.type, pos, statOverride: stageHpOverride(pulse.type, context.stageId) }, context.spawnToken)) stats.callLaneAdmitted += 1
    else stats.drainDropped += 1
  }
}

// 레벨업 카드 churn용 무기 상태. 저장소(Firebase/localStorage)를 건드리지 않기 위해
// WEAPON_CATALOG base만 읽고, 해금 게이트를 우회하려고 전 무기를 처음부터 active로 둔다.
function buildSoakWeapons() {
  const weapons = {}
  for (const [key, entry] of Object.entries(WEAPON_CATALOG)) {
    weapons[key] = { ...entry.base, label: entry.label, level: 1, active: true }
  }
  return weapons
}

const UPGRADE_KEYS = Object.keys(UPGRADE_EFFECTS)

// 무기 객체에서 수치가 아닌 게 정상인 필드. 나머지는 전부 유한수여야 한다.
const NON_NUMERIC_WEAPON_FIELDS = new Set(['label', 'active', 'singleTargetProjectiles'])

function churnUpgrade(weapons, level, random, stats) {
  const key = UPGRADE_KEYS[Math.floor(random() * UPGRADE_KEYS.length)]
  const effect = UPGRADE_EFFECTS[key]
  if (effect.kind === 'player' || !effect.weapon) return null
  if (!isUpgradeAvailable(effect, level, weapons)) return null
  weapons[effect.weapon] = applyUpgradeWithChibikoBoost(weapons[effect.weapon], effect)
  stats.upgradesApplied += 1
  const weapon = weapons[effect.weapon]
  if (!Number.isFinite(weapon.damage) || weapon.damage < 0) return `무기 ${effect.weapon} damage 비정상: ${weapon.damage}`
  if (!Number.isInteger(weapon.level) || weapon.level < 1 || weapon.level > 5) return `무기 ${effect.weapon} level 이탈: ${weapon.level}`
  if (effect.kind === 'stat' && weapon[effect.stat] > effect.cap + 1e-9) {
    return `무기 ${effect.weapon} ${effect.stat}가 cap ${effect.cap}를 넘었다: ${weapon[effect.stat]}`
  }
  if (effect.kind === 'crit') {
    if (weapon.critChance > effect.chanceCap + 1e-9) return `무기 ${effect.weapon} critChance cap 초과: ${weapon.critChance}`
  }
  for (const [field, value] of Object.entries(weapon)) {
    if (NON_NUMERIC_WEAPON_FIELDS.has(field)) continue
    // 예전엔 typeof value === 'number'로 먼저 거른 뒤 유한성만 봤다. 그래서 숫자여야 할 스탯이
    // 문자열로 들어와도(실제 사례: umbrellaGuard.knockback = 'strong') 그물을 그냥 빠져나갔다.
    if (!Number.isFinite(value)) return `무기 ${effect.weapon} ${field} 비수치값: ${JSON.stringify(value)}`
  }
  return null
}

// 실제 스토어의 피해·무적 게이트를 그대로 태운다. 단 사망(=런 종료 → Firebase 기록) 경로는
// 소크 대상이 아니므로 HP가 바닥나기 전에 회복시켜 phase가 'playing'을 벗어나지 않게 한다.
const HP_FLOOR = 40

function applyStoreContactDamage(amount, stats) {
  const state = useGameStore.getState()
  if (state.player.hp <= HP_FLOOR) {
    useGameStore.setState({ player: { ...state.player, hp: state.player.maxHp } })
  }
  const hpBefore = useGameStore.getState().player.hp
  useGameStore.getState().damagePlayer(amount)
  const hpAfter = useGameStore.getState().player.hp
  if (hpAfter === hpBefore) stats.invulnerableBlocks += 1
  else stats.playerDamageEvents += 1
}

// Player.jsx useFrame의 무적 해제 타이머(INV_DURATION 520ms)와 같은 배선이다.
function tickInvulnerability(elapsedMs, stats) {
  if (!useGameStore.getState().player.invulnerable) return 0
  if (elapsedMs < 520) return elapsedMs
  useGameStore.getState().endInvulnerable()
  stats.invulnerabilityReleases = (stats.invulnerabilityReleases ?? 0) + 1
  return 0
}

function resolvePlayerVelocity(input, out) {
  out.x = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  out.z = (input.down ? 1 : 0) - (input.up ? 1 : 0)
  const length = Math.hypot(out.x, out.z)
  if (length > 0) {
    out.x = (out.x / length) * PLAYER_SPEED
    out.z = (out.z / length) * PLAYER_SPEED
  }
}

/**
 * 인게임 프레임을 frames번 반복한다. 실패는 첫 발생 지점에서 즉시 반환한다(seed+frame으로 재현).
 * @returns {{ok: boolean, failure: object|null, frames: number, stats: object}}
 */
export function runGameplaySoak({
  frames = 3600,
  seed = 1,
  stages = SOAK_STAGES,
  runSeconds = SOAK_RUN_SECONDS,
  saturateRuns = 'odd',
} = {}) {
  const random = mulberry32(seed)
  const originalRandom = Math.random
  const originalState = useGameStore.getState()
  const originalStageId = originalState.currentStageId
  const originalPhase = originalState.phase
  const originalPlayer = originalState.player
  const runFrames = Math.round(runSeconds / SOAK_FRAME_DELTA)
  const stats = {
    spawns: 0,
    spawnFailures: 0,
    drainDropped: 0,
    kills: 0,
    hits: 0,
    contacts: 0,
    despawns: 0,
    deaths: 0,
    rangedFires: 0,
    errorEvents: 0,
    maxActive: 0,
    maxProjectiles: 0,
    runs: 0,
    bursts: 0,
    crewSpawns: 0,
    saturationRuns: 0,
    maxOverlapFrames: 0,
    maxStuckMs: 0,
    contactCooldownViolations: 0,
    staleHitProbes: 0,
    staleHitViolations: 0,
    upgradesApplied: 0,
    playerKnockbacks: 0,
    playerDamageEvents: 0,
    invulnerableBlocks: 0,
    heapStartMb: 0,
    heapEndMb: 0,
    heapGrowthMb: 0,
    stagesCovered: [],
    // 탈출구 개방 후 성장 경로 — 오버타임 증원과 반복 버스트 증가분.
    overtimeTicks: 0,
    overtimeRequested: 0,
    overtimeAdmitted: 0,
    overtimeMaxRequested: 0,
    repeatBurstTicks: 0,
    repeatPostExitTicks: 0,
    repeatRequested: 0,
    repeatAdmitted: 0,
    repeatMaxRequested: 0,
    capClampedRequests: 0,
    // 2026-11-08 Stage 5/6 기믹(해당 스테이지 런에서만 증가).
    callLaneTicks: 0,
    callLanePulses: 0,
    callLaneRequested: 0,
    callLaneAdmitted: 0,
    virtualBosses: 0,
    bossAttacks: 0,
    bossPatternHits: 0,
    bossSummons: 0,
    bossSummonSpawns: 0,
    // 확장 보스 소환(B05) 미루기: 원래 요청 마릿수, 천장·좌표로 미룬 몫, 재시도 횟수, 처치·런 리셋으로 버린 몫.
    bossSummonRequested: 0,
    bossSummonDeferred: 0,
    bossSummonRetries: 0,
    bossSummonDropped: 0,
    speechAttempts: 0,
    speechCertFailures: 0,
    speechEmitted: 0,
    speechSkipped: 0,
    speechRingDamage: 0,
    maxExpansionSnapshots: 0,
  }
  let weapons = buildSoakWeapons()
  let playerLevel = 1
  let knockbackMsLeft = 0
  let invulnerableMs = 0
  const knockback = { x: 0, z: 0 }
  // 죽은 개체의 (index, generation)을 들고 있다가 이후 프레임에서 다시 때려 본다.
  // 슬롯이 재사용된 뒤 오래된 참조가 새 적을 때리면 안 된다.
  const staleIndex = new Int16Array(16).fill(-1)
  const staleGeneration = new Uint16Array(16)
  let staleWrite = 0
  const firedBursts = new Uint8Array(64)
  const repeatTicks = new Int16Array(64).fill(-1)
  // 슬롯이 재사용되면(generation 변화) 카운터를 리셋해야 다른 개체의 겹침이 누적되지 않는다.
  const overlapFrames = new Uint16Array(MAX_ENEMIES)
  const overlapGeneration = new Uint16Array(MAX_ENEMIES)
  const event = {}
  const velocity = { x: 0, z: 0 }
  const input = { up: false, down: false, left: false, right: false }
  const context = {
    delta: SOAK_FRAME_DELTA,
    playerX: 0,
    playerZ: 0,
    halfX: 1,
    halfZ: 1,
    elapsedSec: 0,
    activeProjectileCount: 0,
    stageId: 'stage1',
    e04IntroSec: 72,
    bossPressure: false,
    obstacles: null,
    obstacleCount: 0,
    sightBlocked: enemySightBlocked,
    sec: 0,
    virtualBoss: null,
    expansionCache: null,
    callLane: { cycle: -1, laneIndex: -1 },
    callPulses: [],
    callVisual: { chiming: false, calling: false, cycle: -1 },
    speechHazards: [],
    speechStates: [],
    previousSec: 0,
  }
  const bossArgs = { deltaMs: 0, playing: true, alive: true, gameKey: 0, x: 0, z: 0, playerX: 0, playerZ: 0, hpRatio: 1 }
  const hazardArgs = { deltaMs: SOAK_FRAME_DELTA * 1000, playing: true, playerX: 0, playerZ: 0, gameKey: 0 }
  const spawnDrain = createPooledEnemySpawnDrainQueue()
  let failure = null
  let executed = 0

  Math.random = random
  try {
    installHitDispatcher(stats)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      stats.heapStartMb = Math.round(process.memoryUsage().heapUsed / 1048576)
    }
    for (let frame = 0; frame < frames && !failure; frame += 1) {
      const runFrame = frame % runFrames
      if (runFrame === 0) {
        const stageId = stages[stats.runs % stages.length]
        stats.runs += 1
        if (!stats.stagesCovered.includes(stageId)) stats.stagesCovered.push(stageId)
        resetRuntimeRefs()
        clearExpansionAttacks()
        resetExpansionPoolAttacks(enemyPool)
        resetPooledEnemySpawnDrainQueue(spawnDrain)
        installHitDispatcher(stats)
        useGameStore.setState({ currentStageId: stageId, phase: 'playing' })
        context.stageId = stageId
        context.e04IntroSec = getE04IntroSec(stageId)
        const bounds = getStageBounds(stageId)
        context.halfX = bounds.halfX
        context.halfZ = bounds.halfZ
        context.obstacles = getStageObjectSightObstacles(stageId)
        context.obstacleCount = context.obstacles.length
        // 게임(Enemies.jsx)과 같은 규칙: Stage 5만 solid 프롭이 E04 사선·원거리 탄을 막는다(wave 4).
        context.rangedSightObstacles = isRangedPropBlockStage(stageId) && context.obstacleCount > 0 ? context.obstacles : null
        enemyProjectilePool.setPropBlockers(context.rangedSightObstacles)
        projectileZombieShotPool.setPropBlockers(context.rangedSightObstacles)
        context.spawnBounds = bounds
        context.phases = getWavePhasesForStage(stageId)
        context.lastEnd = context.phases.at(-1)?.end ?? 0
        context.nextWaveTime = 0
        context.spawnToken = stats.runs
        context.moveBounds = getPlayerMovementBounds(stageId)
        context.burstEvents = getRuntimeBurstEventsForStage(stageId)
        context.expansionCache = { id: stageId, bounds, obstacles: context.obstacles }
        // 런 리셋: 이전 런 보스의 미뤄 둔 소환 몫은 버린다.
        if (context.virtualBoss?.summonDeferred > 0) stats.bossSummonDropped += context.virtualBoss.summonDeferred
        context.virtualBoss = null
        context.callLane.cycle = -1
        context.callLane.laneIndex = -1
        context.callPulses.length = 0
        context.speechHazards = getExpansionStageHazards(stageId)
        context.speechStates = context.speechHazards.map(() => createAssemblySpeechState(stats.runs))
        context.previousSec = 0
        // 홀수 런(1,3,5…)은 풀 포화까지 밀어붙이는 스트레스 런, 짝수 런은 실제 웨이브만 쓴다.
        // 첫 런을 포화로 두는 이유: 기본 프레임 수(12,000 = 1런)만 돌려도 포화·접촉 경로가 커버된다.
        context.saturate = saturateRuns === 'all' || (saturateRuns === 'odd' && stats.runs % 2 === 1)
        if (context.saturate) stats.saturationRuns += 1
        context.portalSec = getStageConfig(stageId).escapePortalSec
        context.overtimeTick = -1
        firedBursts.fill(0)
        repeatTicks.fill(-1)
        input.up = false
        input.down = false
        input.left = false
        input.right = false
        weapons = buildSoakWeapons()
        playerLevel = 1
        knockbackMsLeft = 0
        invulnerableMs = 0
      }
      const sec = runFrame * SOAK_FRAME_DELTA
      context.sec = sec
      // 확장 줄 대형(assembly_row)은 화면 사각형을 읽는다 — 프로브와 같은 식으로 갱신한다(S1~S5는 읽지 않는다).
      if (isExpansionStage(context.stageId)) updateScreenBounds(context.stageId, context.halfX, context.halfZ)

      // 0) S6 조회대 스피커 '훈화 말씀'(Game.jsx 고정 스텝 배선): 스케줄 → 스냅샷 발신(안전 기하·탈출 인증, 재시도) → 진행·피해.
      if (context.speechHazards.length > 0) {
        for (let h = 0; h < context.speechHazards.length; h += 1) {
          const hazard = context.speechHazards[h]
          const state = context.speechStates[h]
          const emittedBefore = state.emitted
          const skippedBefore = state.skipped
          advanceAssemblySpeech(state, hazard, context.previousSec, sec, (entry) => {
            stats.speechAttempts += 1
            // Game.jsx와 같은 공용 발신(2번째 고리 = 동심 물결, wave 4).
            const snapshot = emitAssemblySpeechRing(state, hazard, entry, {
              gameKey: stats.runs, playerX: playerPos.x, playerZ: playerPos.z, stageId: context.stageId, halfX: context.halfX, halfZ: context.halfZ,
            })
            if (!snapshot) stats.speechCertFailures += 1
            return Boolean(snapshot)
          }, null)
          stats.speechEmitted += state.emitted - emittedBefore
          stats.speechSkipped += state.skipped - skippedBefore
        }
        hazardArgs.playerX = playerPos.x
        hazardArgs.playerZ = playerPos.z
        hazardArgs.gameKey = stats.runs
        const hazardStep = stepExpansionHazardSnapshots(hazardArgs)
        if (hazardStep.damage > 0) { stats.speechRingDamage += 1; applyStoreContactDamage(hazardStep.damage, stats) }
      }
      context.previousSec = sec

      // 0b) S5 전교 호출: 차임 진입 프레임에 플레이어 레인을 스냅샷하고, 시각이 된 펄스를 낸다(소크는 캐치업이 없어 스폰 시계 = sec).
      if (context.stageId === STAGE5_CALL_STAGE_ID) {
        const visual = getStage5CallLaneVisual(sec * 1000, context.stageId, 'playing', context.callVisual)
        if (visual.cycle >= 0 && (context.callLane.cycle !== visual.cycle || context.callLane.laneIndex < 0)) {
          context.callLane.cycle = visual.cycle
          context.callLane.laneIndex = laneIndexForX(playerPos.x)
        }
        for (let index = 0; index < context.callPulses.length;) {
          if (context.callPulses[index].atMs > sec * 1000) { index += 1; continue }
          const [pulse] = context.callPulses.splice(index, 1)
          spawnCallLanePulse(spawnDrain, pulse, context, stats)
        }
      }

      // 1) 시야 갱신 — 실제 런타임처럼 12프레임에 걸쳐 분산한다.
      const sightSlot = frame % 12
      for (let index = 0; index <= enemyPool.highestActive; index += 1) {
        if (!enemyPool.active[index]) { enemySightBlocked[index] = 0; continue }
        if (index % 12 !== sightSlot) continue
        enemySightBlocked[index] = isStageObjectSightBlocked(
          enemyPool.proxies[index].translation(), playerPos, context.obstacles) ? 1 : 0
      }

      // 2) 웨이브 스케줄 — 발화 시각/마릿수/타입/좌표 모두 정본 함수.
      while (context.nextWaveTime < context.lastEnd && sec >= context.nextWaveTime) {
        const waveTime = context.nextWaveTime
        context.nextWaveTime = nextWaveTimeForStage(waveTime, context.stageId)
        const phase = phaseAtTime(context.phases, waveTime)
        const size = waveSizeForStageAtTime(phase, context.stageId, waveTime)
        const taken = []
        for (let slot = 0; slot < size; slot += 1) {
          const type = pickTypeByWeightExcluding(phase.weights, null)
          if (!type) continue
          const pos = randomSpawnPos(type, context.spawnBounds, taken, Math.random, context.obstacles)
          if (!pos) continue
          taken.push(pos)
          if (!enqueuePooledEnemySpawn(spawnDrain, {
            type, pos, statOverride: stageHpOverride(type, context.stageId),
          }, context.spawnToken)) stats.drainDropped += 1
        }
      }

      // 2a) 탈출구 개방 후 오버타임 증원 — Enemies.jsx SCHEDULE_OVERTIME 배선 그대로
      //     (30초 회차, 마릿수 +10%/회차, 동시 천장으로 먼저 자른 뒤 좌표 계산, HP 90초 계단).
      const overtime = shouldScheduleOvertimeReinforcement(context.overtimeTick, sec, context.stageId)
      if (overtime.shouldSchedule) {
        context.overtimeTick = overtime.tick
        const requested = overtimeReinforcementCountForTick(overtime.tick)
        const count = clampZombieSpawnRequest(requested, { pooledActive: enemyPool.activeCount, pooledQueued: spawnDrain.count })
        stats.overtimeTicks += 1
        stats.overtimeRequested += requested
        stats.overtimeAdmitted += count
        if (requested > stats.overtimeMaxRequested) stats.overtimeMaxRequested = requested
        if (count < requested) stats.capClampedRequests += 1
        if (count > 0) {
          const entries = buildOvertimeMixedReinforcementEntries(context.stageId, Math.random, count)
          const taken = []
          for (const entry of entries) {
            const pos = randomSpawnPos(entry.type, context.spawnBounds, taken, Math.random, context.obstacles)
            if (!pos) continue
            taken.push(pos)
            const statOverride = overtimeHpStatOverride(entry.type, context.stageId, overtime.tick)
            if (statOverride && !Number.isFinite(statOverride.hp ?? 1)) {
              failure = { reason: `오버타임 HP 비정상: ${statOverride.hp}`, frame, seed, stageId: context.stageId, sec }
              break
            }
            if (!enqueuePooledEnemySpawn(spawnDrain, { type: entry.type, pos, statOverride }, context.spawnToken)) stats.drainDropped += 1
          }
          if (failure) break
        }
      }

      // 2b) 버스트 발화 — 형태 포위(ring/pincer/column) · 런좀비 크루 · 보스 호위.
      for (let burstIndex = 0; burstIndex < context.burstEvents.length; burstIndex += 1) {
        const evt = context.burstEvents[burstIndex]
        // 반복 버스트는 tick마다 발화하고, 개방 후 회차는 +10%씩 늘린 뒤 동시 천장으로 자른다(Enemies.jsx와 같은 정본 함수).
        if (isRepeatingBurstEvent(evt) && evt.formation === STAGE5_CALL_LANE_FORMATION) {
          // 전교 호출 descriptor: 레인 양끝 2초 펄스로 펼친다(Enemies.jsx SCHEDULE_BURST 호출 분기).
          const lastTick = repeatingBurstTickAt(evt, sec)
          if (lastTick === null || lastTick === undefined) continue
          const firstPulse = stage5CallLanePulseOffset(context.burstEvents, burstIndex, STAGE5_CALL_LANE_FORMATION)
          for (let tick = repeatTicks[burstIndex] + 1; tick <= lastTick; tick += 1) {
            const tickSec = repeatingBurstSecAtTick(evt, tick)
            if (tickSec === null) continue
            stats.callLaneTicks += 1
            stats.repeatBurstTicks += 1
            stats.bursts += 1
            const count = postExitWaveCount(evt.count ?? 1, postExitRepeatWaveIndex(evt, tick, context.portalSec))
            if (context.callLane.cycle !== tick || context.callLane.laneIndex < 0) {
              context.callLane.cycle = tick
              context.callLane.laneIndex = laneIndexForX(playerPos.x)
            }
            for (const pulse of createStage5CallLanePulses({ type: evt.type, count }, context.callLane.laneIndex, tickSec, firstPulse)) {
              if (pulse.atMs <= sec * 1000) spawnCallLanePulse(spawnDrain, pulse, context, stats)
              else context.callPulses.push(pulse)
            }
          }
          repeatTicks[burstIndex] = lastTick
          continue
        }
        if (isRepeatingBurstEvent(evt)) {
          const lastTick = repeatingBurstTickAt(evt, sec)
          if (lastTick === null || lastTick === undefined) continue
          for (let tick = repeatTicks[burstIndex] + 1; tick <= lastTick; tick += 1) {
            if (repeatingBurstSecAtTick(evt, tick) === null) continue
            const postExitIndex = postExitRepeatWaveIndex(evt, tick, context.portalSec)
            const requested = postExitWaveCount(evt.count ?? 1, postExitIndex)
            const count = repeatingBurstSpawnCountForTick(evt, tick, context.portalSec,
              { pooledActive: enemyPool.activeCount, pooledQueued: spawnDrain.count })
            stats.repeatBurstTicks += 1
            stats.bursts += 1
            if (postExitIndex >= 0) stats.repeatPostExitTicks += 1
            stats.repeatRequested += requested
            stats.repeatAdmitted += count
            if (requested > stats.repeatMaxRequested) stats.repeatMaxRequested = requested
            if (count < requested) stats.capClampedRequests += 1
            if (count > 0) enqueueBurst(spawnDrain, { ...evt, count }, context, stats)
          }
          repeatTicks[burstIndex] = lastTick
          continue
        }
        if (firedBursts[burstIndex] || sec < evt.sec) continue
        firedBursts[burstIndex] = 1
        stats.bursts += 1
        enqueueBurst(spawnDrain, evt, context, stats)
      }

      // 2c) 포화 압력 — 스트레스 런에서만 풀 상한 근처까지 추가로 밀어 넣는다.
      if (context.saturate && frame % 4 === 0 && enemyPool.activeCount < SATURATION_TARGET) {
        const phase = phaseAtTime(context.phases, sec)
        const taken = []
        for (let slot = 0; slot < SATURATION_BATCH; slot += 1) {
          const type = pickTypeByWeightExcluding(phase.weights, null)
          if (!type) continue
          const pos = randomSpawnPos(type, context.spawnBounds, taken, Math.random, context.obstacles)
          if (!pos) continue
          taken.push(pos)
          if (!enqueuePooledEnemySpawn(spawnDrain, { type, pos, statOverride: stageHpOverride(type, context.stageId) }, context.spawnToken)) stats.drainDropped += 1
        }
      }

      // 3) 리스폰 드레인 — 프레임당 3마리 상한, stale token 폐기까지 정본 경로.
      const drained = drainPooledEnemySpawnQueue(spawnDrain, context.spawnToken, (entry) => {
        if (spawnEntryIntoPool(entry)) return true
        stats.spawnFailures += 1
        return false
      })
      stats.spawns += drained.spawned

      // 3b) 가상 보스(B10 / 확장 보스): 확장 공격 스냅샷·격노·소환·접촉.
      stepVirtualBoss(context, spawnDrain, stats, bossArgs)
      if (expansionAttackSnapshots.size > stats.maxExpansionSnapshots) stats.maxExpansionSnapshots = expansionAttackSnapshots.size

      // 4) 이동 — 입력 변경 → 속도 정규화 → 적분 → 스테이지 경계 클램프.
      if (frame % INPUT_CHANGE_FRAMES === 0) {
        input.up = random() < 0.35
        input.down = random() < 0.35
        input.left = random() < 0.35
        input.right = random() < 0.35
      }
      invulnerableMs = tickInvulnerability(invulnerableMs + SOAK_FRAME_DELTA * 1000, stats)
      if (knockbackMsLeft > 0) {
        // Player.jsx와 같다: 넉백 중에는 입력을 무시하고 넉백 속도만 적용한다.
        velocity.x = knockback.x
        velocity.z = knockback.z
        knockbackMsLeft = Math.max(0, knockbackMsLeft - SOAK_FRAME_DELTA * 1000)
      } else {
        resolvePlayerVelocity(input, velocity)
      }
      const clamped = clampPlayerPosition(context.stageId, {
        x: playerPos.x + velocity.x * SOAK_FRAME_DELTA,
        z: playerPos.z + velocity.z * SOAK_FRAME_DELTA,
      })
      playerPos.set(clamped.x, 0, clamped.z)

      // 5) 적 시뮬레이션 — 실제 프레임 컨텍스트 그대로.
      context.delta = SOAK_FRAME_DELTA
      context.playerX = playerPos.x
      context.playerZ = playerPos.z
      context.elapsedSec = sec
      context.activeProjectileCount = enemyProjectilePool.activeCount
      context.bossPressure = context.stageId !== 'stage4' && sec >= 120 && sec < 150
      context.projectileZombieShotCount = projectileZombieShotPool.hostileCount
      if (!enemySimulationRuntime.step(enemyPool, context)) {
        failure = { reason: 'enemySimulationRuntime.step returned false', frame, seed, stageId: context.stageId, sec }
        break
      }
      while (enemySimulationRuntime.events.drainInto(event)) {
        if (event.type === ENEMY_EVENT_CONTACT) {
          stats.contacts += 1
          applyStoreContactDamage(event.value, stats)
          // 피격 넉백은 실제 정본(Player.jsx resolvePlayerHitKnockback)을 그대로 쓴다.
          const hit = resolvePlayerHitKnockback({ x: playerPos.x - event.x, z: playerPos.z - event.z })
          knockback.x = hit.x
          knockback.z = hit.z
          knockbackMsLeft = 160
          stats.playerKnockbacks += 1
        }
        else if (event.type === ENEMY_EVENT_RANGED_FIRE) {
          stats.rangedFires += 1
          enemyProjectilePool.spawnInto({ index: -1, generation: 0 }, event.x, event.y, event.z, event.value, event.aux)
        } else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH) {
          spawnProjectileZombieTelegraphDecal(projectileZombieShotPool, enemyPool, event.index, event.generation)
        } else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE) {
          stats.rangedFires += 1
          spawnProjectileZombieVolley(projectileZombieShotPool, enemyPool, event.index, event.generation)
        } else if (event.type === ENEMY_EVENT_DEATH) {
          stats.deaths += 1
          staleIndex[staleWrite] = event.index
          staleGeneration[staleWrite] = event.generation
          staleWrite = (staleWrite + 1) % staleIndex.length
        }
        else if (event.type === ENEMY_EVENT_DESPAWN) stats.despawns += 1
        else if (event.type === ENEMY_EVENT_ERROR) stats.errorEvents += 1
      }
      enemyProjectilePool.step(SOAK_FRAME_DELTA, playerPos.x, playerPos.z, null)
      projectileZombieShotPool.step(SOAK_FRAME_DELTA, playerPos.x, playerPos.z, null)

      // 6) 무기 — 단일 타겟 / 폭발 / 전방 원뿔 세 경로를 번갈아 실제 함수로 발사한다.
      if (frame % WEAPON_PERIOD_FRAMES === 0) {
        const mode = frame % (WEAPON_PERIOD_FRAMES * 3)
        if (mode === 0) {
          const target = findClosestEnemy(6.5)
          if (target) applyEnemyHit(target.rb, target.generation, 9, { source: { x: playerPos.x, z: playerPos.z }, knockback: 1.6, knockbackMs: 120 })
        } else if (mode === WEAPON_PERIOD_FRAMES) {
          applyRadialDamage({
            x: playerPos.x + (random() - 0.5) * 4,
            z: playerPos.z + (random() - 0.5) * 4,
            radius: 1.8, damage: 14, knockback: 2.2, knockbackMs: 140, ignoreSightBlock: true,
          })
        } else {
          const angle = random() * Math.PI * 2
          applyForwardConeDamage({
            originX: playerPos.x, originZ: playerPos.z,
            dirX: Math.cos(angle), dirZ: Math.sin(angle),
            length: 5, width: 3, baseWidth: 0.4, damage: 6,
          })
        }
      }

      // 6b) stale 참조 프로브 — 죽은 개체의 오래된 핸들로 때려도 아무 일도 없어야 한다.
      for (let slot = 0; slot < staleIndex.length; slot += 1) {
        const index = staleIndex[slot]
        if (index < 0) continue
        const generation = staleGeneration[slot]
        if (enemyPool.active[index] && enemyPool.generation[index] === generation) continue
        stats.staleHitProbes += 1
        const hpBefore = enemyPool.hp[index]
        const activeBefore = enemyPool.active[index]
        applyEnemyHit(enemyPool.proxies[index], generation, 999, { source: { x: 0, z: 0 } })
        if (enemyPool.hp[index] !== hpBefore || enemyPool.active[index] !== activeBefore) stats.staleHitViolations += 1
      }

      // 6c) 레벨업 카드 churn — 실제 런처럼 무기 업그레이드를 계속 쌓아 cap/유한성을 검사한다.
      if (frame % 45 === 0) {
        playerLevel = Math.min(40, playerLevel + 1)
        const upgradeProblem = churnUpgrade(weapons, playerLevel, random, stats)
        if (upgradeProblem) {
          failure = { reason: upgradeProblem, frame, seed, stageId: context.stageId, sec }
          break
        }
      }

      // 7) 불변식 — 위반은 즉시 실패로 확정한다.
      if (enemyPool.activeCount > stats.maxActive) stats.maxActive = enemyPool.activeCount
      if (enemyProjectilePool.activeCount > stats.maxProjectiles) stats.maxProjectiles = enemyProjectilePool.activeCount
      failure = checkFrameInvariants(frame, seed, sec, context, stats, overlapFrames, overlapGeneration)
      executed = frame + 1
    }
  } finally {
    // 마지막 런이 끝날 때 남은 미룬 소환 몫도 런 종료로 버린 것으로 센다(요청 = 도착 + 버림 + 드레인 탈락).
    if (context.virtualBoss?.summonDeferred > 0) { stats.bossSummonDropped += context.virtualBoss.summonDeferred; context.virtualBoss.summonDeferred = 0 }
    Math.random = originalRandom
    enemyProjectilePool.setPropBlockers(null)
    projectileZombieShotPool.setPropBlockers(null)
    clearExpansionAttacks()
    resetExpansionPoolAttacks(enemyPool)
    enemyPool.setGlobalHitDispatcher(null)
    useGameStore.setState({ currentStageId: originalStageId, phase: originalPhase, player: originalPlayer })
    resetRuntimeRefs()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      stats.heapEndMb = Math.round(process.memoryUsage().heapUsed / 1048576)
      stats.heapGrowthMb = stats.heapEndMb - stats.heapStartMb
    }
  }

  return { ok: !failure, failure, frames: executed, stats }
}

function checkFrameInvariants(frame, seed, sec, context, stats, overlapFrames, overlapGeneration) {
  const where = { frame, seed, stageId: context.stageId, sec }
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) { overlapFrames[index] = 0; continue }
    const generation = enemyPool.generation[index]
    if (overlapGeneration[index] !== generation) {
      overlapGeneration[index] = generation
      overlapFrames[index] = 0
    }
    if (enemyPool.stuckMs[index] > stats.maxStuckMs) stats.maxStuckMs = enemyPool.stuckMs[index]
    if (enemyPool.stuckMs[index] > MAX_STUCK_MS) {
      return {
        reason: `적이 ${Math.round(enemyPool.stuckMs[index])}ms 동안 빠져나오지 못했다(영구 스턱)`,
        ...where, index, type: enemyPool.type[index], x: enemyPool.posX[index], z: enemyPool.posZ[index],
      }
    }
    if (enemyPool.hitCooldown[index] > ENEMY_CONTACT_COOLDOWN_MS + 1) stats.contactCooldownViolations += 1
    // 장애물 통과 타입(RZT/RZG)은 설계상 장애물 위를 지나가므로 겹침 검사에서 뺀다(enemySimulation 정본 플래그).
    const overlapping = context.obstacleCount > 0 && !ignoresObstacles(enemyPool.type[index]) && collidesEnemyObstacle(
      enemyPool.posX[index], enemyPool.posZ[index], enemyCollisionRadius(enemyPool.type[index]),
      context.obstacles, context.obstacleCount)
    overlapFrames[index] = overlapping ? overlapFrames[index] + 1 : 0
    if (overlapFrames[index] > stats.maxOverlapFrames) stats.maxOverlapFrames = overlapFrames[index]
    if (overlapFrames[index] > MAX_OVERLAP_FRAMES) {
      return {
        reason: `적이 ${overlapFrames[index]}프레임 동안 장애물 안에 박혀 있다`,
        ...where, index, type: enemyPool.type[index], x: enemyPool.posX[index], z: enemyPool.posZ[index],
      }
    }
  }
  if (stats.staleHitViolations > 0) {
    return { reason: `stale 핸들이 살아있는 슬롯을 ${stats.staleHitViolations}회 때렸다`, ...where }
  }
  if (stats.contactCooldownViolations > 0) {
    return { reason: `접촉 쿨다운이 ${ENEMY_CONTACT_COOLDOWN_MS}ms를 초과해 설정됐다`, ...where }
  }
  if (!enemyPool.validateInvariants({ halfX: context.halfX, halfZ: context.halfZ, padding: 7 })) {
    return { reason: 'enemyPool.validateInvariants 실패', ...where, activeCount: enemyPool.activeCount }
  }
  if (enemyPool.activeCount > MAX_ENEMIES) return { reason: `activeCount ${enemyPool.activeCount} > ${MAX_ENEMIES}`, ...where }
  if (enemyPool.liveProxyCount !== enemyPool.activeCount) {
    return { reason: `liveProxyCount ${enemyPool.liveProxyCount} !== activeCount ${enemyPool.activeCount}`, ...where }
  }
  if (enemyProjectilePool.activeCount > MAX_ENEMY_PROJECTILES) {
    return { reason: `투사체 ${enemyProjectilePool.activeCount} > ${MAX_ENEMY_PROJECTILES}`, ...where }
  }
  if (enemySimulationRuntime.events.dropped > 0) {
    return { reason: `이벤트 ${enemySimulationRuntime.events.dropped}건 드롭`, ...where }
  }
  if (stats.errorEvents > 0) {
    return { reason: `ENEMY_EVENT_ERROR ${stats.errorEvents}건 — 슬롯이 잘못된 상태로 격리됐다`, ...where }
  }
  if (!Number.isFinite(playerPos.x) || !Number.isFinite(playerPos.z)) {
    return { reason: `플레이어 좌표 비정상 (${playerPos.x}, ${playerPos.z})`, ...where }
  }
  const store = useGameStore.getState()
  if (store.phase !== 'playing') {
    return { reason: `phase가 '${store.phase}'로 이탈했다(소크는 사망/클리어 흐름을 타지 않아야 한다)`, ...where }
  }
  const player = store.player
  if (!Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.hp < 0 || player.hp > player.maxHp) {
    return { reason: `플레이어 HP 비정상: ${player.hp}/${player.maxHp}`, ...where }
  }
  const bounds = context.moveBounds
  if (playerPos.x < bounds.minX - BOUNDS_EPSILON || playerPos.x > bounds.maxX + BOUNDS_EPSILON
    || playerPos.z < bounds.minZ - BOUNDS_EPSILON || playerPos.z > bounds.maxZ + BOUNDS_EPSILON) {
    return { reason: `플레이어가 이동 경계를 벗어났다 (${playerPos.x}, ${playerPos.z})`, ...where }
  }
  return null
}

// 이름 붙은 소크 시나리오. balanceqa 수용 기준이 이름으로 부른다.
// stage5-full-run(2026-11-08 Stage 5 교무실 스펙 Part B §14-3): 교무실 맵(책상 섬 solid·레인)·B10·전교 호출 반복
//   descriptor·12초 E04를 포화 없이 실제 밀도로 0~300초 끝까지 돈다(탈출 후 증원 경로 포함).
//   수용 기준은 시드 36 × 봇 2(SOAK_SCENARIO_SEEDS 환경변수로 늘린다)에서 크래시 0·스턱 0·150 상한 초과 0이다.
// stage6-default(2026-11-08 Stage 6 운동장 스펙 Part C C-14-3): 확장 배치(조회 줄·트랙)·훈화 고리(H06)·가상 B05(고리·교가 제창·
//   운동장 10바퀴 소환)를 자연 밀도로 0~300초 돈다. 수용 기준은 크래시 0·동시 적 ≤150·해저드 인증 실패율 < 5%.
export const SOAK_SCENARIOS = Object.freeze({
  'stage5-full-run': Object.freeze({ stages: Object.freeze(['stage5']), runSeconds: SOAK_RUN_SECONDS, saturateRuns: 'none', runs: 1 }),
  'stage6-default': Object.freeze({ stages: Object.freeze(['stage6']), runSeconds: SOAK_RUN_SECONDS, saturateRuns: 'none', runs: 1 }),
})

export function runSoakScenario(name, { seed = 1, runs } = {}) {
  const scenario = SOAK_SCENARIOS[name]
  if (!scenario) throw new Error(`unknown soak scenario: ${name}`)
  const runCount = Math.max(1, Math.floor(runs ?? scenario.runs))
  return runGameplaySoak({
    frames: Math.round(scenario.runSeconds / SOAK_FRAME_DELTA) * runCount,
    seed,
    stages: [...scenario.stages],
    runSeconds: scenario.runSeconds,
    saturateRuns: scenario.saturateRuns,
  })
}
