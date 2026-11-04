// 런타임 정합 헤드리스 밸런스 프로브 (§10.1 T-P1 ~ T-P7, zombie15_time_escalation_balance_20261031.md v1.4).
//
// stageBalanceProbe.js(웨이브 기반, XP 페이싱 측정용)와 목적이 다르다. 실제 런타임 Enemies.jsx는
// 20~40초 랜덤 웨이브를 발화하지 않는다(Enemies.jsx usePlayingFrame 주석: "모든 일반 좀비와 보스는
// 명시 BURST_EVENTS ... 에서만 발화한다"). 그래서 이 프로브는 런타임 스폰 경로를 그대로 따른다.
//
// 재사용(재구현 금지) — 프레임 배선과 봇 조작만 여기서 만든다:
//   스폰: getRuntimeSpawnEventsForStage(버스트·반복 증원·코인 몬스터·보스), 포메이션/크루 엔트리,
//         오버타임 보강, 저밀도 보강, 지배 스웜, 스폰 캐치업, 3마리/RAF 드레인 큐, MAX_ENEMIES 클램프.
//   적: enemySimulationRuntime(풀 적 전체 AI·접촉·E04 발사·Track B 행동), 시야 차단 갱신 주기.
//   투사체: enemyProjectilePool(E04·B04 탄, 궤적·명중·수명·화면 이탈 회수), canE04FireProjectile(B04 게이트).
//   지대: Stage 4 압력솥(getPressureCauldronExplosionTimes, 반경 3.2u, 최대 HP 20%, 무적 관통),
//         B04 수프 원(b04SoupBlast.js 예고 1,200ms → 폭발 250ms, 16 피해).
//   변위: 플레이어 피격 넉백(resolvePlayerHitKnockback, 4u/s × 160ms, Player.jsx 상수).
//   무적: Player.jsx INV_DURATION 520ms. 압력솥·마틸다만 무적을 관통한다(런타임과 같다).
//   마틸다: Enemy.jsx 순수 함수(조준 → 돌진 가속 → 가장자리 웃음 900ms, 회전 박스·스윕 접촉 즉사).
//   포탈: pickPortalPosition, 트리거 반경 0.6u, 흡입 1s 뒤 클리어(EscapePortal.jsx).
//
// 한계(문서에 명시된 것 + 이 구현에서 드러난 것):
//   - 보스는 HP·이동·돌진(경고 → 돌진 → 경직) 접촉과 B04 포격·수프 원만 모델링한다.
//     B01 수학 휘두르기, B02 복도 차단선, B03 셔틀런은 없다(§10.1 T-P1, A17 실기로 보완).
//   - 플레이어·보스·마틸다는 Rapier가 없어 소품 충돌을 근사한다(보스·마틸다는 풀 적과 같은 장애물
//     슬라이드, 플레이어는 맵 경계 클램프만).
//   - 무기는 연필 1종 + REF_BUILD_V1 성장(치명타 없음). 레벨업 카드 일시정지 없음.
//   - 도지(60s 춤 이벤트)·골드·상자·RZT 도시락은 없다. 지배 스웜의 "특수 패턴 중" 판정은 마틸다만 본다.
//   - 교과서는 런타임 드랍 확률(shouldDropTextbook)로 떨어지고, 봇은 일부러 줍으러 가지 않는다(지나가면 줍는다).

import {
  clearPortalTarget,
  enemyPool,
  enemyProjectilePool,
  enemySightBlocked,
  enemySimulationRuntime,
  playerPos,
  projectileZombieShotPool,
  publishPortalTarget,
  resetRuntimeRefs,
  screenBounds,
} from './refs.js'
import {
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE,
  ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH,
  ENEMY_EVENT_RANGED_FIRE,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_STATE_CHARGE,
  moveEnemyWithObstacleSlideInto,
} from './enemySimulation.js'
import { enemyTypeFromCode, MAX_ENEMIES } from './enemyEntityPool.js'
import { chefIngredientKindAt, ENEMY_PROJECTILE_KIND_SPHERE } from './enemyProjectilePool.js'
import { spawnProjectileZombieTelegraphDecal, spawnProjectileZombieVolley } from './projectileZombieBehavior.js'
import {
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
} from './pooledEnemySpawnDrain.js'
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { clampPlayerPosition, getPlayerMovementBounds } from './playerMovementBounds.js'
import { canE04FireProjectile, getE04IntroSec } from './stage2ProjectileRules.js'
import { COLLECT_RADIUS_SQ } from './pickup.js'
import { XP_TO_NEXT_START, nextXpThreshold } from './xpCurve.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import {
  getRuntimeSpawnEventsForStage,
  getBossSpawnSec,
  isBossType,
  isRepeatingBurstEvent,
  postExitRepeatWaveIndex,
  postExitWaveCount,
  repeatingBurstSecAtTick,
  repeatingBurstTickAt,
  RUN_ZOMBIE_CREW_FORMATION,
  STAGE2_GUARD_CHASE_FORMATION,
} from './burstEvents.js'
import { advanceSpawnCatchUp, createSpawnCatchUpState, LOW_DENSITY_ENEMY_THRESHOLD, publishSpawnCatchUpOffsetSec } from './spawnCatchUp.js'
import {
  advanceLowDensityReinforcement,
  createLowDensityReinforcementState,
  finishLowDensityReinforcement,
} from './lowDensityReinforcement.js'
import {
  createDominanceSwarmSpawnPlan,
  createDominanceSwarmState,
  evaluateDominanceSwarm,
  recordDominanceSwarmSpawn,
  recordEmptyField,
  recordEnemyKill,
  recordPlayerDamage,
} from './dominanceSwarmRespawn.js'
import {
  getPressureCauldronExplosionTimes,
  getPressureCauldronHazardVisual,
  isInsidePressureCauldronBlastRadius,
  PRESSURE_CAULDRON_DAMAGE_RADIUS,
  PRESSURE_CAULDRON_DAMAGE_RATIO,
} from './stage4PressureCauldronHazard.js'
import {
  advanceB04SoupBlast,
  consumeB04SoupBlastHit,
  createB04SoupBlastState,
  getB04SoupBlastCircles,
  getB04SoupBlastTrigger,
  startB04SoupBlast,
} from './b04SoupBlast.js'
import { pickPortalPosition } from './portalPlacement.js'
import { clampGameplayCameraFocus, getGameplayGroundReach, keepPlayerInsideCameraX } from './gameCameraFraming.js'
import { PLAYER_MESH_WORLD_HALF_WIDTH, PLAYER_MESH_WORLD_HEIGHT } from './characterVisualScale.js'
import { getMatildaDashSpeed } from './matildaDashSpeed.js'
import { advanceMatildaEntryGrace, createMatildaEntryGrace } from './matildaEntryGrace.js'
import { matildaHpFromWeapons } from './playerDpsEstimate.js'
import { isNovelTelegraphState } from './novelZombieBehavior.js'
import { getStageObjectSightObstacles, isStageObjectEnemyTrackingBlocked } from '../components/StageObjects/stageObjectColliders.js'
import { getPooledEnemyRenderTier, shouldRefreshEnemySight } from '../components/PooledEnemyVisuals.js'
import {
  buildLowDensityReinforcementBatch,
  buildOvertimeMixedReinforcementEntries,
  clampZombieSpawnRequest,
  createRunZombieCrewEntries,
  createStage2GuardChaseEntries,
  ELITE_BONUS,
  formationSpawnPositions,
  getEliteBonusTextbookXp,
  isInsideScreenBounds,
  isPooledEnemyType,
  nextPendingSpawnSec,
  overtimeHpStatOverride,
  overtimeReinforcementCountForTick,
  pickMixedReinforcementTypes,
  randomSpawnPos,
  repeatingBurstSpawnCountForTick,
  sameTypeZombieHpForStage,
  shouldDropTextbook,
  shouldScheduleBurst,
  shouldScheduleOvertimeReinforcement,
  spawnPosForBurstType,
  stageHpOverride,
} from '../components/Enemies.jsx'
import {
  advanceMatildaContactKillCountdown,
  clampMatildaDashSpeedToBounds,
  createMatildaContactKillCountdown,
  ENEMY_STATS,
  getChargeHitDistance,
  getEnemyColliderHalfExtents,
  getMatildaBodyHalfExtents,
  isMatildaBodyContact,
  isMatildaChargingOutward,
  isMatildaSweptBodyContact,
  MATILDA_LAUGH_DURATION_MS,
  resolveRangedEnemyVelocity,
  shouldReverseMatildaChargeOnObstacleValues,
  isMatildaChargeBlockedValues,
} from '../components/Enemy.jsx'
import { INV_DURATION, PLAYER_HIT_KNOCKBACK_MS, resolvePlayerHitKnockback } from '../components/Player.jsx'
import { firePencil, mulberry32 } from './stageBalanceProbe.js'
import { createBot, decideBotMove, PORTAL_MODE_REFUSE } from './balanceProbeBots.js'
import { REF_BUILD_V1, refBuildPencilStats } from './refBuildV1.js'

export const PROBE_FRAME_DELTA = 1 / 60
export const PROBE_PLAYER_MAX_HP = 100
export const PROBE_PLAYER_SPEED = 3
// 포트레이트 휴대폰 기준 화면비(390×844). 화면 사각형은 스폰 캐치업·E04 탄 회수·경비추격 배치가 읽는다.
export const PROBE_SCREEN_ASPECT = 390 / 844
const CAMERA_FOV = 30 // GameCanvas.jsx camera.fov
const PORTAL_TRIGGER_RADIUS = 0.6 // EscapePortal.jsx
const PORTAL_SUCTION_MS = 1000 // portalSuctionClock.js PORTAL_SUCTION_DURATION(1s)
// 탈출 이후 maxSec: 210 + E1 상한 180 + 30 = 420s(§10.1 T-P7).
export const PROBE_MAX_SEC = 420
export const DAMAGE_BIN_SEC = 10
export const SPAWN_HP_BIN_SEC = 30

// 피해 출처 키. 신규 종·Sltera는 감독 단계에서 'novel:E46' / 'sltera' 키로 더한다.
export const SOURCE_CONTACT = 'contact'      // 풀 적 접촉 (contact:E01 형태로 세분)
export const SOURCE_E04_SHOT = 'shot:E04'
// 투사체 좀비 15종(E46~E60) 탄. 봇은 감속(물웅덩이·물감)을 따르지 않는다 — 피해만 센다.
export const SOURCE_PROJECTILE_ZOMBIE_SHOT = 'shot:projectileZombie'
export const SOURCE_BOSS_SHOT = 'shot:B04'
export const SOURCE_BOSS = 'boss'            // boss:B01 형태(돌진·수프)
export const SOURCE_MATILDA = 'matilda'
export const SOURCE_CAULDRON = 'zone:cauldron'

// T-P2: 런타임 정의 그대로(Enemies.jsx usePlayingFrame `context.bossPressure`). 150·210 상수를 쓰지 않는다.
export function probeBossPressure(stageId, sec, bossSpawnSec = getBossSpawnSec(stageId), escapePortalSec = getStageConfig(stageId).escapePortalSec ?? 210) {
  return stageId !== 'stage4' && sec >= bossSpawnSec && sec < escapePortalSec
}

function fnv1aUpdate(hash, text) {
  let h = hash
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function updateScreenBounds(stageId, halfX, halfZ) {
  const base = getGameplayGroundReach(CAMERA_FOV, PROBE_SCREEN_ASPECT)
  const fitZoom = base.reachSideNear > halfX ? base.reachSideNear / halfX : 1
  const reachSide = base.reachSideFar / fitZoom
  const reachUp = base.reachUp / fitZoom
  const reachDown = base.reachDown / fitZoom
  const fz = clampGameplayCameraFocus(playerPos.z, reachUp, reachDown, halfZ)
  const mapFocusX = clampGameplayCameraFocus(playerPos.x, reachSide, reachSide, halfX)
  const fx = keepPlayerInsideCameraX({
    focusX: mapFocusX,
    focusZ: fz,
    playerX: playerPos.x,
    playerY: PLAYER_MESH_WORLD_HEIGHT,
    playerZ: playerPos.z,
    playerHalfWidth: PLAYER_MESH_WORLD_HALF_WIDTH,
    fov: CAMERA_FOV,
    aspect: PROBE_SCREEN_ASPECT,
    zoom: fitZoom,
  })
  screenBounds.minX = fx - reachSide
  screenBounds.maxX = fx + reachSide
  screenBounds.minZ = fz - reachUp
  screenBounds.maxZ = fz + reachDown
}

/**
 * 한 판을 시뮬레이션한다.
 *
 * @param {object} options
 * @param {string} options.stageId
 * @param {number} options.seed
 * @param {object} options.bot  balanceProbeBots 사양({kind, radius, direction, portalMode, reactionMs})
 * @param {number} [options.maxSec]  기본 420
 * @param {boolean} [options.immortal]  T-P5 불사 기록 모드: HP를 깎지 않고 합산만, 520ms 무적은 유지
 * @param {object} [options.build]  REF_BUILD_V1 형식. null이면 성장 없는 base 연필
 * @param {number} [options.startDamageMultiplierOverride]  보정 탐색용(고정 상수 대신)
 * @param {number} [options.spawnHashUntilSec]  A1용 스폰 로그 해시를 이 시각 전까지만 누적(기본 무한)
 */
export function runStageRuntimeProbe({
  stageId = 'stage1',
  seed = 1,
  bot: botSpec = { kind: 'KITE', radius: 4, direction: 1 },
  maxSec = PROBE_MAX_SEC,
  immortal = false,
  build = REF_BUILD_V1,
  startDamageMultiplierOverride = null,
  spawnHashUntilSec = Infinity,
  // 진단용 프레임 콜백(테스트·트레이스 전용). 결과에 영향을 주지 않는다.
  onFrame = null,
} = {}) {
  // 정적 데이터는 시드 RNG를 걸기 전에 만든다(stageBalanceProbe.js 결정론 주석과 같은 이유).
  const bounds = getStageBounds(stageId)
  const obstacles = getStageObjectSightObstacles(stageId)
  const stageConfig = getStageConfig(stageId)
  const spawnEvents = getRuntimeSpawnEventsForStage(stageId)
  const bossSpawnSec = getBossSpawnSec(stageId)
  const escapePortalSec = stageConfig.escapePortalSec ?? 210
  const matildaWarningSec = stageConfig.matildaWarningSec ?? 205
  const matildaSec = stageConfig.matildaSec ?? 210
  const e04IntroSec = getE04IntroSec(stageId)
  const cache = { id: stageId, bounds, obstacles }
  const pencilBase = WEAPON_CATALOG.pencilThrow.base
  const effectiveBuild = build && startDamageMultiplierOverride !== null
    ? { ...build, startDamageMultiplier: { ...build.startDamageMultiplier, [stageId]: startDamageMultiplierOverride } }
    : build
  const weaponForLevel = (level) => (effectiveBuild
    ? refBuildPencilStats(pencilBase, level, stageId, effectiveBuild)
    : { ...pencilBase })
  // 포탈 배치는 Math.random을 소비하고 THREE 행렬을 만든다 — 장애물 박스 계산은 결정론이라 그대로 둔다.

  const baseRandom = mulberry32(seed)
  let randomDraws = 0
  const random = () => { randomDraws += 1; return baseRandom() }
  const originalRandom = Math.random
  Math.random = random

  resetRuntimeRefs()
  // 결정론: 풀 reset()은 슬롯 세대를 +1만 한다. 같은 프로세스에서 판을 거듭하면 세대가 판마다 달라지고,
  // Track B 회피 방향(novelZombieBehavior: (index + generation) & 1)과 E08 배회 위상이 세대를 읽으므로
  // 같은 시드인데도 결과가 갈라진다(실측: 첫 판만 0.35s부터 갈라짐). 세대를 처음 판과 같은 값으로 맞춘다.
  enemyPool.generation.fill(1)
  enemyPool.reset()
  updateScreenBounds(stageId, bounds.halfX, bounds.halfZ)

  const bot = createBot(botSpec)
  const spawnDrain = createPooledEnemySpawnDrainQueue()
  const spawnToken = 1
  const catchUp = createSpawnCatchUpState()
  const lowDensity = createLowDensityReinforcementState()
  let lowDensityDeferred = false
  const dominance = createDominanceSwarmState()
  const fired = new Uint8Array(spawnEvents.length)
  const scheduledRepeat = new Int32Array(spawnEvents.length).fill(-1)
  const consumedRepeat = new Int32Array(spawnEvents.length).fill(-1)
  let overtimeTick = -1

  const context = {
    delta: PROBE_FRAME_DELTA,
    playerX: 0,
    playerZ: 0,
    halfX: bounds.halfX,
    halfZ: bounds.halfZ,
    elapsedSec: 0,
    spawnSec: 0,
    activeProjectileCount: 0,
    stageId,
    e04IntroSec,
    bossPressure: false,
    obstacles,
    obstacleCount: obstacles.length,
    sightBlocked: enemySightBlocked,
  }
  const sightGeneration = new Uint16Array(MAX_ENEMIES)
  const sightTiers = new Uint8Array(MAX_ENEMIES)
  let sightFrame = 0

  // ── 플레이어 상태 ──
  let hp = PROBE_PLAYER_MAX_HP
  let invulnerableMs = 0
  let knockbackMs = 0
  const knockbackVel = { x: 0, z: 0 }
  const facing = { x: 0, z: 1 }
  let level = 1
  let xp = 0
  let xpToNext = XP_TO_NEXT_START
  let weapon = weaponForLevel(level)
  let lastFiredMs = -Infinity
  let kills = 0
  let xpCollected = 0
  const orbs = []
  const levelAt = {}
  const levelCheckpoints = [180, 210, 240, 270, 300]

  // ── 기록 ──
  const totalBins = Math.ceil(maxSec / DAMAGE_BIN_SEC)
  const damageByBin = new Array(totalBins).fill(0)
  const damageBySource = {}
  let damageTotal = 0
  let hitsApplied = 0
  let minHitGapMs = Infinity
  let lastHitMs = -Infinity
  let matildaLethalContacts = 0
  let lastDamageSource = null
  let spawnHash = 0x811c9dc5
  let spawnCount = 0
  const spawnCountBySource = {}
  // C5: 실시간 30s 구간별·출처별 스폰 HP 합(§1.1 분석표를 대신할 실측 유입표). 출처: burst, burst-repeat, overtime,
  // lowDensity, dominance, boss, matilda.
  const spawnHpBins = Math.ceil(maxSec / SPAWN_HP_BIN_SEC)
  const spawnHpByBin = Array.from({ length: spawnHpBins }, () => ({}))
  // C1 짝 테스트용: 오버타임·반복 증원이 요청한 마릿수(150 상한으로 잘리기 전).
  const spawnRequests = []
  let alive210 = null
  let matildaSpawnHp = null
  let spawnClockAt210 = null
  let maxActiveProjectiles = 0
  let maxActiveEnemies = 0
  let droppedSpawns = 0

  let died = false
  let deathSec = null
  let deathCause = null
  let cleared = false
  let clearSec = null
  let portalActive = false
  const portal = { active: false, x: 0, z: 0 }
  let suctionMs = null
  let matildaWarned = false
  let matildaEntry = null
  const specials = [] // 보스·마틸다
  let sec = 0

  function recordDamage(amount, source) {
    damageTotal += amount
    damageBySource[source] = (damageBySource[source] ?? 0) + amount
    const bin = Math.min(totalBins - 1, Math.floor(sec / DAMAGE_BIN_SEC))
    damageByBin[bin] += amount
  }

  // useGameStore.damagePlayer와 같은 규칙: 무적 중이면 무시(무적 관통 예외만 통과), 맞으면 무적 시작 + 넉백.
  function damagePlayer(amount, source, ignoreInvulnerability = false) {
    if (died || cleared || !(amount > 0)) return false
    if (invulnerableMs > 0 && !ignoreInvulnerability) return false
    const nowMs = sec * 1000
    if (!ignoreInvulnerability) {
      if (lastHitMs > -Infinity) minHitGapMs = Math.min(minHitGapMs, nowMs - lastHitMs)
      lastHitMs = nowMs
    }
    hitsApplied += 1
    recordDamage(amount, source)
    lastDamageSource = source
    recordPlayerDamage(dominance, amount, nowMs)
    if (!immortal) {
      hp = Math.max(0, hp - amount)
      if (hp <= 0) {
        died = true
        deathSec = sec
        deathCause = source
        return true
      }
    }
    invulnerableMs = INV_DURATION
    // Player.jsx: hitFlashToken 변경 시 facing 반대 방향으로 넉백(외부 주입이 아니면 항상 facing 기준).
    const kb = resolvePlayerHitKnockback(facing)
    knockbackVel.x = kb.x
    knockbackVel.z = kb.z
    knockbackMs = PLAYER_HIT_KNOCKBACK_MS
    return true
  }

  function killPlayerByMatilda() {
    if (died || cleared) return
    matildaLethalContacts += 1
    lastDamageSource = SOURCE_MATILDA
    if (immortal) return
    died = true
    deathSec = sec
    deathCause = SOURCE_MATILDA
  }

  function logSpawn(type, x, z, source, hp = 0) {
    spawnCount += 1
    const hpBin = Math.min(spawnHpBins - 1, Math.floor(sec / SPAWN_HP_BIN_SEC))
    const bySource = spawnHpByBin[hpBin]
    bySource[source] = (bySource[source] ?? 0) + hp
    spawnCountBySource[source] = (spawnCountBySource[source] ?? 0) + 1
    if (sec < spawnHashUntilSec) {
      spawnHash = fnv1aUpdate(spawnHash, `${Math.round(sec * 60)}|${type}|${x.toFixed(3)}|${z.toFixed(3)};`)
    }
  }

  function totalZombieCounts() {
    let specialActive = 0
    for (const special of specials) if (special.alive) specialActive += 1
    return { pooledActive: enemyPool.activeCount, specialActive, pooledQueued: spawnDrain.count }
  }

  function spawnPooledNow(entry, source) {
    const stats = { ...(ENEMY_STATS[entry.type] ?? ENEMY_STATS.E01), ...(entry.statOverride ?? {}) }
    const handle = { index: -1, generation: 0 }
    const ok = enemyPool.spawnInto(handle, {
      type: entry.type,
      x: entry.pos[0],
      y: entry.pos[1],
      z: entry.pos[2],
      hp: stats.hp,
      maxHp: stats.hp,
      visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER,
      runDirX: entry.runCrewDir?.x ?? 1,
      runDirZ: entry.runCrewDir?.z ?? 0,
    })
    if (ok) logSpawn(entry.type, entry.pos[0], entry.pos[2], source, stats.hp)
    else droppedSpawns += 1
    return ok
  }

  function spawnSpecial(entry, source) {
    const stats = { ...(ENEMY_STATS[entry.type] ?? ENEMY_STATS.B01), ...(entry.statOverride ?? {}) }
    const half = getEnemyColliderHalfExtents(stats)
    const special = {
      type: entry.type,
      isMatilda: !!entry.isMatilda,
      x: entry.pos[0],
      z: entry.pos[2],
      hp: stats.hp,
      maxHp: stats.hp,
      stats,
      alive: true,
      halfWidth: Math.max(half[0], half[2]),
      radius: Math.max(half[0], half[2]),
      state: entry.isMatilda ? 'matildaLaugh' : 'chase',
      stateMs: 0,
      laughMs: entry.isMatilda ? MATILDA_LAUGH_DURATION_MS : 0,
      chargeDirX: 0,
      chargeDirZ: 1,
      yaw: 0,
      dashCount: 0,
      stallMs: 0,
      prevX: entry.pos[0],
      prevZ: entry.pos[2],
      ageMs: 0,
      lastFireMs: 0,
      projectileCounter: 0,
      chefPhase2: false,
      soup: stats.chefBoss ? createB04SoupBlastState() : null,
      killCountdown: entry.isMatilda ? createMatildaContactKillCountdown() : null,
      matildaHalf: entry.isMatilda ? getMatildaBodyHalfExtents(stats) : null,
      telegraphSerial: 0,
      applyHit(damage) {
        if (!this.alive) return
        this.hp -= damage
        if (this.hp > 0) return
        this.alive = false
        kills += 1
        recordEnemyKill(dominance, sec * 1000)
        const bonus = ELITE_BONUS[this.type]
        if (bonus && !this.isMatilda) {
          const value = getEliteBonusTextbookXp(this.type, this.stats.xp)
          for (let i = 0; i < bonus.textbook; i += 1) orbs.push({ x: this.x, z: this.z, value })
        }
      },
    }
    specials.push(special)
    logSpawn(entry.type, special.x, special.z, source, stats.hp)
    return special
  }

  // Enemies.addEnemies: special(보스)은 동시 3기, 풀 적은 drain 큐(deferred) 또는 즉시.
  function addEnemies(batch, deferPooled, source) {
    for (const entry of batch) {
      if (clampZombieSpawnRequest(1, totalZombieCounts()) <= 0) { droppedSpawns += 1; break }
      if (!isPooledEnemyType(entry.type)) {
        if (specials.filter((s) => s.alive).length < 3) spawnSpecial(entry, source)
        continue
      }
      if (deferPooled) {
        entry.source = source
        enqueuePooledEnemySpawn(spawnDrain, entry, spawnToken)
        continue
      }
      spawnPooledNow(entry, source)
    }
  }

  // Enemies.processScheduled(SCHEDULE_BURST)와 같은 분기. 런타임은 다음 RAF에서 처리하지만 프로브는 같은 프레임에 처리한다.
  function processBurst(eventIndex, tickOrSec) {
    const evt = spawnEvents[eventIndex]
    if (!evt) return
    if (isRepeatingBurstEvent(evt)) {
      const firstTick = consumedRepeat[eventIndex] + 1
      const lastTick = Math.trunc(tickOrSec)
      if (lastTick < firstTick) return
      for (let tick = firstTick; tick <= lastTick; tick += 1) {
        if (repeatingBurstSecAtTick(evt, tick) === null) continue
        const batch = []
        // 749d779: 탈출구 개방 후 회차마다 기본 마릿수의 10%씩 선형 증가(Enemies.jsx 반복 버스트 분기와 같은 식).
        // 65b5057: 런타임은 좌표를 뽑기 전에 동시 천장(150)의 남은 칸으로 자른다(repeatingBurstSpawnCountForTick).
        const requested = postExitWaveCount(evt.count ?? 1, postExitRepeatWaveIndex(evt, tick, escapePortalSec))
        const count = repeatingBurstSpawnCountForTick(evt, tick, escapePortalSec, totalZombieCounts())
        spawnRequests.push({ kind: 'repeat', eventIndex, tick, requested, spawned: count, sec })
        for (let i = 0; i < count; i += 1) {
          const taken = batch.map((enemy) => enemy.pos)
          const pos = spawnPosForBurstType(evt.type, bounds, taken, Math.random, obstacles)
          if (!pos) continue
          batch.push({ type: evt.type, pos, statOverride: stageHpOverride(evt.type, stageId) })
        }
        addEnemies(batch, true, 'burst-repeat')
      }
      consumedRepeat[eventIndex] = lastTick
      return
    }
    if (isBossType(evt.type)) {
      const pos = randomSpawnPos(evt.type, bounds, [], Math.random, obstacles)
      if (pos) addEnemies([{ type: evt.type, pos, statOverride: stageHpOverride(evt.type, stageId) }], true, 'boss')
      return
    }
    if (evt.formation === RUN_ZOMBIE_CREW_FORMATION) {
      const batch = createRunZombieCrewEntries(bounds, Math.random, obstacles, { x: playerPos.x, z: playerPos.z })
        .map((entry) => ({ ...entry, statOverride: stageHpOverride(entry.type, stageId) }))
      addEnemies(batch, true, 'burst')
      return
    }
    if (evt.formation === STAGE2_GUARD_CHASE_FORMATION) {
      const batch = createStage2GuardChaseEntries(bounds, Math.random, screenBounds)
        .map((entry) => ({ ...entry, statOverride: stageHpOverride(entry.type, stageId) }))
      addEnemies(batch, true, 'burst')
      return
    }
    const count = evt.count ?? 1
    const mixedTypes = evt.mixedTypes ? pickMixedReinforcementTypes(evt.mixedTypes, count, Math.random) : null
    const positions = evt.formation
      ? formationSpawnPositions(evt.formation, count, bounds, { x: playerPos.x, z: playerPos.z }, Math.random, obstacles, evt.type)
      : null
    const batch = []
    for (let i = 0; i < count; i += 1) {
      const taken = batch.map((enemy) => enemy.pos)
      const type = mixedTypes ? mixedTypes[i] : evt.type
      const pos = positions ? positions[i] : spawnPosForBurstType(type, bounds, taken, Math.random, obstacles)
      if (!pos) continue
      batch.push({ type, pos, statOverride: stageHpOverride(type, stageId) })
    }
    addEnemies(batch, true, 'burst')
  }

  function processOvertime() {
    // 749d779: 인자가 (tick, baseCount)로 바뀌었다. 스테이지 이름을 넘기면 기본 마릿수가 0이 된다.
    const requested = overtimeReinforcementCountForTick(overtimeTick)
    spawnRequests.push({ kind: 'overtime', tick: overtimeTick, requested, sec })
    const count = clampZombieSpawnRequest(requested, totalZombieCounts())
    if (count <= 0) return
    const entries = buildOvertimeMixedReinforcementEntries(stageId, Math.random, count)
    const batch = []
    for (const entry of entries) {
      const taken = batch.map((enemy) => enemy.pos)
      const pos = spawnPosForBurstType(entry.type, bounds, taken, Math.random, obstacles)
      if (!pos) continue
      batch.push({ type: entry.type, pos, statOverride: overtimeHpStatOverride(entry.type, stageId, overtimeTick) })
    }
    addEnemies(batch, true, 'overtime')
  }

  function processDominance(requested) {
    const count = clampZombieSpawnRequest(requested, totalZombieCounts())
    if (count <= 0) return
    const entries = createDominanceSwarmSpawnPlan({ spawnCount: count }, { stageId }, Math.random)
    const batch = []
    for (const entry of entries) {
      const taken = batch.map((enemy) => enemy.pos)
      const pos = spawnPosForBurstType(entry.type, bounds, taken, Math.random, obstacles)
      if (!pos) continue
      batch.push({ type: entry.type, pos, statOverride: stageHpOverride(entry.type, stageId) })
    }
    addEnemies(batch, true, 'dominance')
  }

  function processLowDensity() {
    const count = clampZombieSpawnRequest(20, totalZombieCounts())
    const batch = buildLowDensityReinforcementBatch(cache, count)
    if (count < 20 || batch.length !== 20) {
      lowDensityDeferred = true
      return
    }
    addEnemies(batch, false, 'lowDensity')
    lowDensityDeferred = false
    finishLowDensityReinforcement(lowDensity)
  }

  function spawnMatilda() {
    const stats = {
      hp: sameTypeZombieHpForStage(Math.max(1, matildaHpFromWeapons({ pencilThrow: { ...weapon, active: true } })), stageId),
      scale: ENEMY_STATS.B01.scale,
      charger: true,
      chargeSpeed: PROBE_PLAYER_SPEED * 1.4,
      xp: 0,
    }
    const pos = randomSpawnPos('B01', bounds, [], Math.random, obstacles, stats.scale)
    if (pos) {
      const special = spawnSpecial({ type: 'B01', pos, statOverride: stats, isMatilda: true }, 'matilda')
      matildaSpawnHp = special.maxHp
    }
  }

  const moveScratch = { x: 0, z: 0, blocked: 0 }
  function moveSpecial(special, vx, vz) {
    moveEnemyWithObstacleSlideInto(moveScratch, special.x, special.z, vx, vz, PROBE_FRAME_DELTA, special.radius, obstacles, obstacles.length, bounds.halfX, bounds.halfZ)
    special.x = moveScratch.x
    special.z = moveScratch.z
  }

  function stepMatilda(special, dirX, dirZ, dist) {
    const deltaMs = PROBE_FRAME_DELTA * 1000
    const args = {
      enemyX: special.x, enemyZ: special.z, yaw: special.yaw,
      playerX: playerPos.x, playerZ: playerPos.z,
      halfX: special.matildaHalf.halfX, halfZ: special.matildaHalf.halfZ,
      fromX: special.prevX, fromZ: special.prevZ,
    }
    const contact = special.state === 'charge' ? isMatildaSweptBodyContact(args) : isMatildaBodyContact(args)
    if (advanceMatildaContactKillCountdown(special.killCountdown, contact, deltaMs)) killPlayerByMatilda()
    if (immortal && special.killCountdown.fired && !contact) {
      // 불사 모드: 즉사 후에도 계속 기록하려면 카운트다운을 다시 무장한다(다음 접촉을 새로 센다).
      special.killCountdown = createMatildaContactKillCountdown()
    }
    if (special.state === 'matildaAim') {
      if (dist > 0.0001) { special.chargeDirX = dirX / dist; special.chargeDirZ = dirZ / dist }
      else {
        const len = Math.hypot(special.x, special.z) || 1
        special.chargeDirX = -special.x / len
        special.chargeDirZ = -special.z / len
      }
      special.prevX = special.x
      special.prevZ = special.z
      special.stallMs = 0
      special.dashCount += 1
      special.telegraphSerial += 1
      special.state = 'charge'
      special.yaw = Math.atan2(special.chargeDirX, special.chargeDirZ)
    } else if (special.state === 'charge') {
      const cd = { x: special.chargeDirX, z: special.chargeDirZ }
      const movedAlong = (special.x - special.prevX) * cd.x + (special.z - special.prevZ) * cd.z
      const dashSpeed = clampMatildaDashSpeedToBounds({ x: special.x, z: special.z }, cd, getMatildaDashSpeed(special.stats.chargeSpeed, special.dashCount), PROBE_FRAME_DELTA, bounds)
      const expectedMove = dashSpeed * PROBE_FRAME_DELTA
      const hitDistance = getChargeHitDistance(special.stats, true)
      special.stallMs = isMatildaChargeBlockedValues(movedAlong, expectedMove, dist, hitDistance) ? special.stallMs + deltaMs : 0
      if (shouldReverseMatildaChargeOnObstacleValues(movedAlong, expectedMove, dist, hitDistance, special.stallMs)) {
        special.chargeDirX *= -1
        special.chargeDirZ *= -1
        special.stallMs = 0
      }
      special.prevX = special.x
      special.prevZ = special.z
      moveSpecial(special, special.chargeDirX * dashSpeed, special.chargeDirZ * dashSpeed)
      special.yaw = Math.atan2(special.chargeDirX, special.chargeDirZ)
      if (isMatildaChargingOutward({ x: special.x, z: special.z }, { x: special.chargeDirX, z: special.chargeDirZ }, bounds)) {
        special.state = 'matildaLaugh'
        special.laughMs = MATILDA_LAUGH_DURATION_MS
        special.stallMs = 0
      }
    } else {
      // 웃음: 정지한 채 플레이어 쪽으로 천천히 돈다(Enemy.jsx _applyRotation 0.22).
      if (dist > 0.0001) {
        let diff = Math.atan2(dirX, dirZ) - special.yaw
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        special.yaw += diff * 0.22
      }
      special.laughMs -= deltaMs
      if (special.laughMs <= 0) special.state = 'matildaAim'
    }
  }

  // 보스: HP·이동·돌진 접촉(§10.1 T-P1 한계). B04는 포격·수프 원·격노 돌진까지 넣는다.
  function stepBoss(special, dirX, dirZ, dist) {
    const deltaMs = PROBE_FRAME_DELTA * 1000
    const stats = special.stats
    special.ageMs += deltaMs
    if (stats.chefBoss && !special.chefPhase2) {
      const soup = special.soup
      if (soup.phase !== 'idle' && soup.phase !== 'done') {
        let next = advanceB04SoupBlast(soup, deltaMs)
        const hit = consumeB04SoupBlastHit(next, playerPos)
        next = hit.state
        if (hit.damage > 0) damagePlayer(hit.damage, `${SOURCE_BOSS}:B04:soup`)
        special.soup = next
        return
      }
      if (soup.phase === 'done') {
        special.chefPhase2 = true
        special.state = 'chase'
      } else if (getB04SoupBlastTrigger({ hpRatio: special.hp / special.maxHp, state: soup })) {
        const circles = getB04SoupBlastCircles({ player: playerPos, halfX: bounds.halfX, halfZ: bounds.halfZ, obstacles })
        special.soup = startB04SoupBlast(soup, circles)
        special.telegraphSerial += 1
        return
      } else {
        // Phase 1 포격: E04와 같은 풀·같은 발사 게이트(stage4는 bossPressure 예외).
        const phase1 = stats.chefPhase1
        const velocity = resolveRangedEnemyVelocity({ dirX, dirZ, dist, minDist: phase1.minDist, preferDist: phase1.preferDist, speed: stats.speed, strafeSign: 1 })
        moveSpecial(special, velocity.x, velocity.z)
        const canFire = canE04FireProjectile({
          elapsedSec: sec + catchUp.offsetSec,
          ageMs: special.ageMs,
          activeProjectileCount: enemyProjectilePool.activeCount,
          distanceToPlayer: dist,
          lastFireElapsedMs: special.lastFireMs,
          nowMs: special.ageMs,
          cooldownMs: phase1.rangedCooldown,
          introSec: e04IntroSec,
          bossPressure: stageId === 'stage4' ? false : context.bossPressure,
        })
        if (canFire && dist > 1e-4) {
          special.lastFireMs = special.ageMs
          enemyProjectilePool.spawnInto({ index: -1, generation: 0 }, special.x, 0.5, special.z, dirX / dist, dirZ / dist,
            phase1.rangedDmg, phase1.rangedSpeed, chefIngredientKindAt(special.projectileCounter++))
        }
        return
      }
    }
    const active = stats.chefBoss ? { ...stats, ...stats.chefPhase2 } : stats
    special.stateMs += deltaMs
    if (special.state === 'chase') {
      if (dist > 1e-4) moveSpecial(special, (dirX / dist) * stats.speed, (dirZ / dist) * stats.speed)
      if (dist < active.warnDist) {
        special.state = 'warn'
        special.stateMs = 0
        special.chargeDirX = dist > 1e-4 ? dirX / dist : 0
        special.chargeDirZ = dist > 1e-4 ? dirZ / dist : 1
        special.telegraphSerial += 1
      }
    } else if (special.state === 'warn') {
      if (special.stateMs >= active.warnDuration) {
        special.state = 'charge'
        special.stateMs = 0
      }
    } else if (special.state === 'charge') {
      moveSpecial(special, special.chargeDirX * active.chargeSpeed, special.chargeDirZ * active.chargeSpeed)
      const ndx = playerPos.x - special.x
      const ndz = playerPos.z - special.z
      const hitPlayer = Math.hypot(ndx, ndz) < getChargeHitDistance(stats, false)
      if (hitPlayer || special.stateMs > (active.chargeDuration ?? 1200)) {
        if (hitPlayer) damagePlayer(stats.damage, `${SOURCE_BOSS}:${special.type}`)
        special.state = 'stun'
        special.stateMs = 0
      }
    } else if (special.state === 'stun') {
      if (special.stateMs >= (active.stunDuration ?? 1000)) special.state = 'chase'
    }
  }

  // KITE_DODGE가 읽는 예고 목록. 기존 로스터의 "바닥/몸짓 예고"만 넣는다(E04 탄은 예고가 아니다).
  const poolTelegraphSerial = new Uint32Array(MAX_ENEMIES)
  const poolPrevState = new Uint8Array(MAX_ENEMIES)
  function collectTelegraphs() {
    const list = []
    for (let index = 0; index <= enemyPool.highestActive; index += 1) {
      if (!enemyPool.active[index]) { poolPrevState[index] = 0; continue }
      const state = enemyPool.state[index]
      const type = enemyPool.type[index]
      // E05: 돌진 방향은 돌진 시작 순간(경고 끝) 플레이어 쪽으로 정해진다. 경고 중 옆걸음은 의미가 없으므로
      // (돌진 시작 때 다시 조준한다) 돌진 중 고정된 선만 예고로 본다. 경고는 KITE도 E05보다 빨라 피한다.
      const isE05 = type === 5 && state === ENEMY_STATE_CHARGE
      const isNovel = isNovelTelegraphState(state)
      if ((isE05 || isNovel) && poolPrevState[index] !== state) poolTelegraphSerial[index] += 1
      poolPrevState[index] = state
      if (!isE05 && !isNovel) continue
      const id = `p${index}:${enemyPool.generation[index]}:${poolTelegraphSerial[index]}`
      const ex = enemyPool.posX[index]
      const ez = enemyPool.posZ[index]
      if (isE05) {
        let dx = enemyPool.runDirX[index]
        let dz = enemyPool.runDirZ[index]
        const len = Math.hypot(dx, dz) || 1
        dx /= len
        dz /= len
        list.push({ id, kind: 'line', x: ex, z: ez, dirX: dx, dirZ: dz, length: 1.7 * 1.2 + 0.5, halfWidth: 0.45 })
      } else {
        list.push({ id, kind: 'circle', x: ex, z: ez, radius: 1.4 })
      }
    }
    for (let i = 0; i < specials.length; i += 1) {
      const special = specials[i]
      if (!special.alive) continue
      const id = `s${i}:${special.telegraphSerial}`
      if (special.isMatilda) {
        // 돌진선은 조준 순간 플레이어 방향으로 고정된다. 웃음(정지) 중에는 다음 돌진선이 정해지지 않았으므로
        // 예고로 넣지 않는다(넣으면 선이 플레이어를 따라와 봇이 웃음 내내 옆걸음만 한다).
        if (special.state === 'charge') {
          list.push({ id, kind: 'line', x: special.x, z: special.z, dirX: special.chargeDirX, dirZ: special.chargeDirZ, length: 60, halfWidth: special.matildaHalf.halfX + 0.2 })
        }
        continue
      }
      if (special.soup && (special.soup.phase === 'telegraph' || special.soup.phase === 'explode')) {
        special.soup.circles.forEach((circle, c) => list.push({ id: `${id}:soup${c}`, kind: 'circle', x: circle.x, z: circle.z, radius: circle.radius }))
      }
      if (special.state === 'warn' || special.state === 'charge') {
        const active = special.stats.chefBoss ? { ...special.stats, ...special.stats.chefPhase2 } : special.stats
        list.push({ id, kind: 'line', x: special.x, z: special.z, dirX: special.chargeDirX, dirZ: special.chargeDirZ, length: (active.chargeSpeed ?? 1.4) * ((active.chargeDuration ?? 2200) / 1000), halfWidth: special.radius + 0.2 })
      }
    }
    return list
  }

  // C3: 고정 환경 위험(S4 압력솥)은 적의 예고가 아니다. 사람도 두 번째 주기쯤 배우므로 모든 봇이 피한다.
  // 끓는 동안(폭발 3s 전) + 폭발 250ms 동안 반경 3.2u 원을 위험 지대로 준다. 반응 지연은 두지 않는다.
  const noHazards = []
  function collectHazards() {
    if (stageId !== 'stage4') return noHazards
    const visual = getPressureCauldronHazardVisual(sec * 1000, stageId, 'playing')
    if (!visual.boiling && !visual.bursting) return noHazards
    return [{ id: `cauldron:${Math.floor((sec * 1000) / 15000)}`, kind: 'circle', x: 0, z: 0, radius: PRESSURE_CAULDRON_DAMAGE_RADIUS }]
  }

  const projectileHit = (index) => {
    const kind = enemyProjectilePool.kind[index]
    const damage = enemyProjectilePool.damage[index]
    damagePlayer(damage, kind === ENEMY_PROJECTILE_KIND_SPHERE ? SOURCE_E04_SHOT : SOURCE_BOSS_SHOT)
  }

  const projectileZombieHit = (_index, _generation, damage) => damagePlayer(damage, SOURCE_PROJECTILE_ZOMBIE_SHOT)

  const event = {}
  const move = { x: 0, z: 0 }
  const world = { nowMs: 0, player: playerPos, pool: enemyPool, specials, telegraphs: null, portal, suction: false, lastMode: null, moveBounds: getPlayerMovementBounds(stageId) }
  const totalFrames = Math.round(maxSec / PROBE_FRAME_DELTA)
  let survivedFrames = 0
  let previousElapsedMs = 0

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      sec = (frame + 1) * PROBE_FRAME_DELTA
      const elapsedMs = sec * 1000

      // ── Game.jsx 고정 스텝: 압력솥, 포탈 개방, 마틸다 경고 ──
      if (stageId === 'stage4') {
        for (const _t of getPressureCauldronExplosionTimes(previousElapsedMs, elapsedMs, stageId, 'playing')) {
          if (isInsidePressureCauldronBlastRadius(playerPos.x, playerPos.z)) {
            damagePlayer(PROBE_PLAYER_MAX_HP * PRESSURE_CAULDRON_DAMAGE_RATIO, SOURCE_CAULDRON, true)
          }
        }
      }
      previousElapsedMs = elapsedMs
      if (!portalActive && sec >= escapePortalSec) {
        portalActive = true
        const pos = pickPortalPosition(stageId, playerPos)
        portal.active = true
        portal.x = pos[0]
        portal.z = pos[2]
        publishPortalTarget(pos[0], pos[2])
      }
      if (!matildaWarned && sec >= matildaWarningSec) {
        matildaWarned = true
        matildaEntry = createMatildaEntryGrace({ stageId, gameKey: 1, delayMs: (matildaSec - matildaWarningSec) * 1000 })
      }
      if (died) break

      // ── Enemies usePlayingFrame ──
      if (advanceMatildaEntryGrace(matildaEntry, PROBE_FRAME_DELTA)) spawnMatilda()

      const counts = totalZombieCounts()
      const lowState = advanceLowDensityReinforcement(lowDensity, {
        deltaSec: PROBE_FRAME_DELTA,
        stageId,
        gameKey: 1,
        aliveEnemyCount: counts.pooledActive + counts.specialActive,
        queuedEnemyCount: counts.pooledQueued,
        availableSpawnSlots: clampZombieSpawnRequest(20, counts) === 20 ? 20 : 0,
      })
      const retryLowDensity = lowDensity.pending && lowDensityDeferred && clampZombieSpawnRequest(20, counts) === 20
      if (lowState.shouldSpawn || retryLowDensity) processLowDensity()

      updateScreenBounds(stageId, bounds.halfX, bounds.halfZ)
      let visible = 0
      for (let index = 0; index <= enemyPool.highestActive; index += 1) {
        if (enemyPool.active[index] === 1 && isInsideScreenBounds(screenBounds, enemyPool.posX[index], enemyPool.posZ[index])) visible += 1
      }
      for (const special of specials) if (special.alive && isInsideScreenBounds(screenBounds, special.x, special.z)) visible += 1
      if (visible === 0) recordEmptyField(dominance, elapsedMs)
      const pendingSpawnSec = sec + catchUp.offsetSec
      advanceSpawnCatchUp(catchUp, {
        deltaSec: PROBE_FRAME_DELTA,
        liveEnemyCount: visible,
        queuedEnemyCount: spawnDrain.count,
        spawnSec: pendingSpawnSec,
        nextPendingSpawnSec: visible <= LOW_DENSITY_ENEMY_THRESHOLD
          ? nextPendingSpawnSec(spawnEvents, fired, scheduledRepeat, pendingSpawnSec, stageId, overtimeTick)
          : null,
      })
      publishSpawnCatchUpOffsetSec(catchUp.offsetSec)
      const spawnSec = sec + catchUp.offsetSec
      if (spawnClockAt210 === null && sec >= escapePortalSec) {
        spawnClockAt210 = spawnSec
        alive210 = !died
      }

      sightFrame = (sightFrame + 1) % 12
      for (let index = 0; index <= enemyPool.highestActive; index += 1) {
        if (!enemyPool.active[index]) { sightGeneration[index] = 0; sightTiers[index] = 0; enemySightBlocked[index] = 0; continue }
        const tier = getPooledEnemyRenderTier(screenBounds, enemyPool.posX[index], enemyPool.posZ[index], playerPos.x, playerPos.z, sightTiers[index])
        sightTiers[index] = tier
        const generation = enemyPool.generation[index]
        if (!shouldRefreshEnemySight(tier, index, sightFrame, sightGeneration[index], generation)) continue
        enemySightBlocked[index] = isStageObjectEnemyTrackingBlocked(enemyPool.proxies[index].translation(), playerPos, obstacles) ? 1 : 0
        sightGeneration[index] = generation
      }

      context.playerX = playerPos.x
      context.playerZ = playerPos.z
      context.elapsedSec = sec
      context.spawnSec = spawnSec
      context.activeProjectileCount = enemyProjectilePool.activeCount
      context.bossPressure = probeBossPressure(stageId, sec, bossSpawnSec, escapePortalSec)
      context.screenBounds = screenBounds
      context.projectileZombieShotCount = projectileZombieShotPool.hostileCount

      const dominanceResult = evaluateDominanceSwarm(dominance, {
        nowMs: elapsedMs,
        currentHp: hp,
        maxHp: PROBE_PLAYER_MAX_HP,
        activeEnemyCount: counts.pooledActive + counts.specialActive,
        queuedEnemyCount: spawnDrain.count,
        stageId,
        isBossActive: context.bossPressure,
        isSpecialPatternActive: matildaWarned,
      })
      if (dominanceResult.shouldSpawn) {
        processDominance(dominanceResult.spawnCount)
        recordDominanceSwarmSpawn(dominance, elapsedMs)
      }

      enemySimulationRuntime.step(enemyPool, context)
      while (enemySimulationRuntime.events.drainInto(event)) {
        if (event.type === ENEMY_EVENT_CONTACT) {
          const typeName = enemyTypeFromCode(enemyPool.type[event.index]) ?? 'unknown'
          damagePlayer(event.value, `${SOURCE_CONTACT}:${typeName}`)
        } else if (event.type === ENEMY_EVENT_RANGED_FIRE) {
          enemyProjectilePool.spawnInto({ index: -1, generation: 0 }, event.x, event.y, event.z, event.value, event.aux)
        } else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_TELEGRAPH) {
          spawnProjectileZombieTelegraphDecal(projectileZombieShotPool, enemyPool, event.index, event.generation)
        } else if (event.type === ENEMY_EVENT_PROJECTILE_ZOMBIE_FIRE) {
          spawnProjectileZombieVolley(projectileZombieShotPool, enemyPool, event.index, event.generation)
        }
      }
      enemyProjectilePool.step(PROBE_FRAME_DELTA, playerPos.x, playerPos.z, projectileHit, screenBounds)
      projectileZombieShotPool.step(PROBE_FRAME_DELTA, playerPos.x, playerPos.z, projectileZombieHit, screenBounds, null, bounds)
      maxActiveProjectiles = Math.max(maxActiveProjectiles, enemyProjectilePool.activeCount)

      const overtime = shouldScheduleOvertimeReinforcement(overtimeTick, spawnSec, stageId)
      if (overtime.shouldSchedule) {
        overtimeTick = overtime.tick
        processOvertime()
      }
      for (let index = 0; index < spawnEvents.length; index += 1) {
        const evt = spawnEvents[index]
        const eventSpawnSec = isBossType(evt.type) ? sec : spawnSec
        if (isRepeatingBurstEvent(evt)) {
          const tick = repeatingBurstTickAt(evt, eventSpawnSec)
          if (tick === null || tick <= scheduledRepeat[index]) continue
          scheduledRepeat[index] = tick
          processBurst(index, tick)
          continue
        }
        if (!shouldScheduleBurst(fired[index], eventSpawnSec, evt.sec)) continue
        fired[index] = 1
        processBurst(index, sec)
      }
      drainPooledEnemySpawnQueue(spawnDrain, spawnToken, (entry) => spawnPooledNow(entry, entry.source ?? 'burst'))
      maxActiveEnemies = Math.max(maxActiveEnemies, enemyPool.activeCount)

      // ── 보스·마틸다 ──
      for (const special of specials) {
        if (!special.alive) continue
        const dirX = playerPos.x - special.x
        const dirZ = playerPos.z - special.z
        const dist = Math.hypot(dirX, dirZ)
        if (special.isMatilda) stepMatilda(special, dirX, dirZ, dist)
        else stepBoss(special, dirX, dirZ, dist)
        if (died) break
      }
      if (died) break

      // ── 플레이어 이동(봇) + 넉백 ──
      world.nowMs = elapsedMs
      world.suction = suctionMs !== null
      world.telegraphs = bot.wantsTelegraphs ? collectTelegraphs() : null
      world.hazards = collectHazards()
      if (knockbackMs > 0) {
        move.x = knockbackVel.x
        move.z = knockbackVel.z
        knockbackMs = Math.max(0, knockbackMs - PROBE_FRAME_DELTA * 1000)
      } else {
        world.lastMode = decideBotMove(bot, world, move)
        move.x *= PROBE_PLAYER_SPEED
        move.z *= PROBE_PLAYER_SPEED
        if (move.x !== 0 || move.z !== 0) {
          const len = Math.hypot(move.x, move.z)
          facing.x = move.x / len
          facing.z = move.z / len
        }
      }
      if (move.x !== 0 || move.z !== 0) {
        const clamped = clampPlayerPosition(stageId, { x: playerPos.x + move.x * PROBE_FRAME_DELTA, z: playerPos.z + move.z * PROBE_FRAME_DELTA })
        playerPos.set(clamped.x, 0, clamped.z)
      }
      invulnerableMs = Math.max(0, invulnerableMs - PROBE_FRAME_DELTA * 1000)

      // ── 연필 ──
      if (elapsedMs - lastFiredMs >= weapon.cooldown) {
        if (firePencil(weapon, { shotsFired: 0, shotsHit: 0 }, (typeCode, x, z) => {
          kills += 1
          recordEnemyKill(dominance, elapsedMs)
          const type = enemyTypeFromCode(typeCode)
          const xpValue = ENEMY_STATS[type]?.xp ?? 0
          const bonus = ELITE_BONUS[type]
          if (bonus) {
            const value = getEliteBonusTextbookXp(type, xpValue)
            for (let i = 0; i < bonus.textbook; i += 1) orbs.push({ x, z, value })
          } else if (shouldDropTextbook({ xp: xpValue, type }, Math.random(), sec)) {
            orbs.push({ x, z, value: xpValue })
          }
        }, specials)) lastFiredMs = elapsedMs
      }

      // ── XP 회수 + REF_BUILD 성장 ──
      for (let index = orbs.length - 1; index >= 0; index -= 1) {
        const dx = playerPos.x - orbs[index].x
        const dz = playerPos.z - orbs[index].z
        if (dx * dx + dz * dz >= COLLECT_RADIUS_SQ) continue
        xp += orbs[index].value
        xpCollected += 1
        orbs.splice(index, 1)
        while (xp >= xpToNext) {
          xp -= xpToNext
          level += 1
          xpToNext = nextXpThreshold(xpToNext)
          weapon = weaponForLevel(level)
        }
      }
      for (const checkpoint of levelCheckpoints) {
        if (levelAt[checkpoint] === undefined && sec >= checkpoint) levelAt[checkpoint] = level
      }

      // ── 포탈(T-P7): 트리거 반경 안에 들어가면 1s 흡입 뒤 클리어 ──
      if (portalActive && suctionMs === null && bot.portalMode !== PORTAL_MODE_REFUSE) {
        if (Math.hypot(playerPos.x - portal.x, playerPos.z - portal.z) < PORTAL_TRIGGER_RADIUS) suctionMs = 0
      }
      if (suctionMs !== null) {
        suctionMs += PROBE_FRAME_DELTA * 1000
        if (suctionMs >= PORTAL_SUCTION_MS && !died) {
          cleared = true
          clearSec = sec
        }
      }

      survivedFrames = frame + 1
      if (onFrame) onFrame({ frame, sec, hp, level, mode: world.lastMode, invulnerableMs, portal, telegraphs: world.telegraphs, specials })
      if (died || cleared) break
    }
  } finally {
    Math.random = originalRandom
    publishSpawnCatchUpOffsetSec(0)
    clearPortalTarget()
    resetRuntimeRefs()
  }

  const round1 = (value) => (value === null ? null : Math.round(value * 100) / 100)
  return {
    stageId,
    seed,
    cleared,
    clearSec: round1(clearSec),
    died,
    deathSec: round1(deathSec),
    deathCause,
    survivedSec: round1(survivedFrames * PROBE_FRAME_DELTA),
    finalHp: hp,
    damageTotal: Math.round(damageTotal * 1000) / 1000,
    damageBySource,
    damageByBin,
    hitsApplied,
    minHitGapMs: Number.isFinite(minHitGapMs) ? Math.round(minHitGapMs) : null,
    matildaLethalContacts,
    lastDamageSource,
    level,
    levelAt,
    kills,
    xpCollected,
    spawnCount,
    spawnCountBySource,
    spawnHpByBin,
    spawnRequests,
    alive210: alive210 ?? false,
    matildaSpawnHp,
    spawnClockAt210: spawnClockAt210 === null ? null : round1(spawnClockAt210),
    spawnHash: spawnHash.toString(16).padStart(8, '0'),
    maxActiveProjectiles,
    maxActiveEnemies,
    droppedSpawns,
    portal: portalActive ? { x: round1(portal.x), z: round1(portal.z) } : null,
    randomDraws,
  }
}

// 결과의 [fromSec, toSec) 구간 받은 피해(10초 bin 단위).
export function damageInWindow(result, fromSec, toSec) {
  let sum = 0
  for (let bin = 0; bin < result.damageByBin.length; bin += 1) {
    const start = bin * DAMAGE_BIN_SEC
    if (start >= fromSec && start < toSec) sum += result.damageByBin[bin]
  }
  return sum
}
