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
  enemySightBlocked,
  enemySimulationRuntime,
  playerPos,
  resetRuntimeRefs,
} from './refs.js'
import { MAX_ENEMIES } from './enemyEntityPool.js'
import { MAX_ENEMY_PROJECTILES } from './enemyProjectilePool.js'
import {
  collidesEnemyObstacle,
  enemyCollisionRadius,
  ENEMY_CONTACT_COOLDOWN_MS,
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_DEATH,
  ENEMY_EVENT_DESPAWN,
  ENEMY_EVENT_ERROR,
  ENEMY_EVENT_RANGED_FIRE,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_STUCK_RECOVERY_MS,
} from './enemySimulation.js'
import {
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
  resetPooledEnemySpawnDrainQueue,
} from './pooledEnemySpawnDrain.js'
import { getStageBounds } from './stageConfig.js'
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
} from '../components/Enemies.jsx'
import { getRuntimeBurstEventsForStage, isBossType, RUN_ZOMBIE_CREW_FORMATION, STAGE2_GUARD_CHASE_FORMATION } from './burstEvents.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { useGameStore } from '../store/useGameStore.js'

export const SOAK_STAGES = ['stage1', 'stage2', 'stage3', 'stage4']
export const SOAK_FRAME_DELTA = 1 / 60
const RUN_SECONDS = 240
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
  if (isBossType(evt.type)) {
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
    if (weapon.critMultiplier > effect.multCap + 1e-9) return `무기 ${effect.weapon} critMultiplier cap 초과: ${weapon.critMultiplier}`
  }
  for (const [field, value] of Object.entries(weapon)) {
    if (typeof value === 'number' && !Number.isFinite(value)) return `무기 ${effect.weapon} ${field} 비유한값`
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
export function runGameplaySoak({ frames = 3600, seed = 1, stages = SOAK_STAGES } = {}) {
  const random = mulberry32(seed)
  const originalRandom = Math.random
  const originalState = useGameStore.getState()
  const originalStageId = originalState.currentStageId
  const originalPhase = originalState.phase
  const originalPlayer = originalState.player
  const runFrames = Math.round(RUN_SECONDS / SOAK_FRAME_DELTA)
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
  }
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
        context.spawnBounds = bounds
        context.phases = getWavePhasesForStage(stageId)
        context.lastEnd = context.phases.at(-1)?.end ?? 0
        context.nextWaveTime = 0
        context.spawnToken = stats.runs
        context.moveBounds = getPlayerMovementBounds(stageId)
        context.burstEvents = getRuntimeBurstEventsForStage(stageId)
        // 홀수 런(1,3,5…)은 풀 포화까지 밀어붙이는 스트레스 런, 짝수 런은 실제 웨이브만 쓴다.
        // 첫 런을 포화로 두는 이유: 기본 프레임 수(12,000 = 1런)만 돌려도 포화·접촉 경로가 커버된다.
        context.saturate = stats.runs % 2 === 1
        if (context.saturate) stats.saturationRuns += 1
        firedBursts.fill(0)
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

      // 2b) 버스트 발화 — 형태 포위(ring/pincer/column) · 런좀비 크루 · 보스 호위.
      for (let burstIndex = 0; burstIndex < context.burstEvents.length; burstIndex += 1) {
        const evt = context.burstEvents[burstIndex]
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
    Math.random = originalRandom
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
    const overlapping = context.obstacleCount > 0 && collidesEnemyObstacle(
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
