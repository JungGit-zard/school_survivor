import { useRef, useCallback, useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos, screenBounds, enemyBodies, enemyPool, enemySimulationRuntime, enemyProjectilePool, enemySightBlocked, enemyHandleScratch } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'
import DancingDogeEvent from './DancingDogeEvent.jsx'
import TreasureChest from './TreasureChest.jsx'
import { PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'
import { getE04IntroSec } from '../lib/stage2ProjectileRules.js'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { dogeEscapeDirection } from '../lib/dogeEscape.js'
import { getDefaultWavePhases } from '../lib/waveTimelines.js'
import { RUN_ZOMBIE_CREW_FORMATION, STAGE2_GUARD_CHASE_FORMATION, getBurstEventsForStage, getRuntimeBurstEventsForStage, isBossType } from '../lib/burstEvents.js'
import { buildWavePhasesFromEntries } from '../lib/waveControl.js'
import { getAdminWaveControlConfig } from '../lib/adminConfig.js'
import { enemyTypeToCode, enemyTypeFromCode, createEnemyEntityPool, MAX_ENEMIES } from '../lib/enemyEntityPool.js'
import { ENEMY_EVENT_CONTACT, ENEMY_EVENT_RANGED_FIRE, ENEMY_EVENT_DEATH, ENEMY_EVENT_DESPAWN, ENEMY_EVENT_ERROR, collidesEnemyObstacle, createEnemySimulationRuntime } from '../lib/enemySimulation.js'
import { createEnemyProjectilePool, MAX_ENEMY_PROJECTILES } from '../lib/enemyProjectilePool.js'
import { emitVfx } from '../lib/vfxEvents.js'
import { emitDamageNumber, DAMAGE_NUMBER_COLORS } from '../lib/damageNumbers.js'
import { resolveCriticalHitInto } from '../lib/criticalHits.js'
import { emitCriticalHitScreenShake, emitEnemyHitScreenShake } from '../lib/criticalScreenShake.js'
import { createEnemyHitSparkEvent, COMMON_ENEMY_HIT_KNOCKBACK } from '../lib/enemyHitVfx.js'
import { resolveCollapseIntensity } from '../lib/enemyDeathCollapse.js'
import { isPlayerWeaponSightBlocked } from '../lib/weaponTargeting.js'
import { logKill } from '../lib/playtestLogger.js'
import { getStageObjectSightObstacles, isStageObjectEnemyTrackingBlocked } from './StageObjects/stageObjectColliders.js'
import { createEnemyHitEventQueue } from '../lib/enemyHitEventQueue.js'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { advanceMatildaEntryGrace, canSpawnMatildaEntry, cancelMatildaEntryGrace, createMatildaEntryGrace } from '../lib/matildaEntryGrace.js'
import { matildaHpFromWeapons } from '../lib/playerDpsEstimate.js'
import { getPooledEnemyRenderTier, shouldRefreshEnemySight } from './PooledEnemyVisuals.js'
import {
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
  resetPooledEnemySpawnDrainQueue,
} from '../lib/pooledEnemySpawnDrain.js'
import { recordZombieEncounter } from '../lib/zombieEncyclopedia.js'

// 황금 코인 시계 드랍: 4분에 약 10개 → 20–28s 무작위 간격 (5분 기준 ×0.8)
const GOLD_INTERVAL_MIN_MS = 20_000
const GOLD_INTERVAL_MAX_MS = 28_000
const GOLD_VISIBLE_RADIUS = 10  // 플레이어 기준 이 거리 내 적에서 드랍 시도
export const TEXTBOOK_DROP_RATE = 0.30  // 일반 적 사망 시 교과서 드랍 확률

// 보스/엘리트 사망 시 추가 보너스 (기획서 §3-3)
const ELITE_BONUS = {
  E06: { textbook: 1, gold: 1 },
  B01: { textbook: 3, textbookXp: 40, gold: 5 },
  B02: { textbook: 3, textbookXp: 40, gold: 5 },
  B03: { textbook: 3, textbookXp: 40, gold: 5 },
}

export function getEliteBonusTextbookXp(type, fallbackXp) {
  const bonus = ELITE_BONUS[type]
  if (!bonus) return fallbackXp
  return bonus.textbookXp ?? fallbackXp
}

export function shouldDropTextbook(dropData, roll = Math.random()) {
  return (dropData?.xp ?? 0) > 0 && roll < TEXTBOOK_DROP_RATE
}

export function createDeathCollapseEntry(id, dropData) {
  return {
    id,
    type: dropData.type,
    position: dropData.pos,
    visualScale: dropData.visualScale,
    intensity: dropData.intensity,
    styleOverride: dropData.styleOverride,
  }
}

const nextGoldInterval = () =>
  GOLD_INTERVAL_MIN_MS + Math.random() * (GOLD_INTERVAL_MAX_MS - GOLD_INTERVAL_MIN_MS)

function pickGoldDropPos(bounds) {
  const live = []
  const rSq = GOLD_VISIBLE_RADIUS * GOLD_VISIBLE_RADIUS
  for (const rb of enemyBodies.values()) {
    if (!rb || rb._enemyDead) continue
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    if (dx * dx + dz * dz <= rSq) {
      live.push(t)
      if (live.length >= 8) break
    }
  }
  if (live.length > 0) {
    const t = live[Math.floor(Math.random() * live.length)]
    return [t.x, t.y, t.z]
  }
  // 폴백: 플레이어 주변 3.0–6.0 링 (맵 경계 안으로 클램프)
  const ang = Math.random() * Math.PI * 2
  const r = 3.0 + Math.random() * 3.0
  const [x, z] = clampToBounds(playerPos.x + Math.sin(ang) * r, playerPos.z + Math.cos(ang) * r, bounds)
  return [x, 0.13, z]
}

// 스폰 위치
const BASE_COL_Y = 0.24
// 좀비는 카메라 가시 범위(가까운쪽 +z reach ≈ 7.2가 가장 빡빡) 안에서 스폰해
// 플레이어가 화면 안에서 '펑' 리빌 연출을 보게 한다. 근접 스폰 데미지는 기존
// reveal delay(리지드바디 등록 지연)로 완화되므로 추가 무적 로직은 두지 않는다.
const SPAWN_MIN_RADIUS = 4.0
const SPAWN_MAX_RADIUS = 6.5
const RANGED_SPAWN_MIN_RADIUS = 5.5
const RANGED_SPAWN_MAX_RADIUS = 7.5
const SPAWN_CANDIDATE_TRIES = 24
const SPAWN_BATCH_MIN_GAP = 1.2
const SPAWN_LINE_TOLERANCE = 0.45
const SPAWN_FALLBACK_OFFSETS = [
  [1.2, 0],
  [-1.2, 0],
  [0, 1.2],
  [0, -1.2],
  [1.2, 1.2],
  [-1.2, 1.2],
  [1.2, -1.2],
  [-1.2, -1.2],
]
// 스폰은 플레이어 기준 링이라 좁은 맵에서 벽 밖으로 나갈 수 있다 → 맵 경계 안쪽으로 클램프해 적이 벽에 끼지 않게 한다.
const SPAWN_INSET = 1.5

function clampToBounds(x, z, bounds) {
  const limX = bounds.halfX - SPAWN_INSET
  const limZ = bounds.halfZ - SPAWN_INSET
  return [
    Math.min(limX, Math.max(-limX, x)),
    Math.min(limZ, Math.max(-limZ, z)),
  ]
}

function isInsideSpawnBounds(x, z, bounds) {
  const limX = bounds.halfX - SPAWN_INSET
  const limZ = bounds.halfZ - SPAWN_INSET
  return x >= -limX && x <= limX && z >= -limZ && z <= limZ
}

export function enemySpawnRadius(type, scaleOverride) {
  return 0.28 * (Number.isFinite(scaleOverride) ? scaleOverride : (ENEMY_STATS[type]?.scale ?? 1)) * ENEMY_SIZE_MULTIPLIER
}

export function spawnOverlapsObstacle(x, z, type, obstacles = [], scaleOverride) {
  return collidesEnemyObstacle(x, z, enemySpawnRadius(type, scaleOverride), obstacles, obstacles.length)
}

function hasSpawnGap(pos, taken) {
  const minGapSq = SPAWN_BATCH_MIN_GAP * SPAWN_BATCH_MIN_GAP
  return taken.every((other) => {
    const dx = pos[0] - other[0]
    const dz = pos[2] - other[2]
    return dx * dx + dz * dz >= minGapSq
  }) && !formsSpawnLine(pos, taken)
}

function isValidSpawnPosition(pos, type, bounds, taken, obstacles, scaleOverride) {
  return Boolean(pos) && isInsideSpawnBounds(pos[0], pos[2], bounds)
    && !spawnOverlapsObstacle(pos[0], pos[2], type, obstacles, scaleOverride)
    && hasSpawnGap(pos, taken)
}

function formsSpawnLine(pos, taken) {
  // taken 전체(C(n,2)쌍)를 검사하면 직선 밴드가 스폰 링을 전부 덮어 배치 크기와 무관하게 ~15마리에서
  // 산출이 포화했다(실측 stage2 size 36→14.4 / size 45→14.7). 최근 6개만 비교하면 "인접 스폰이 일렬로
  // 서는 것" 방지는 그대로 유지되면서 상한만 사라진다(실측 36→35.8 / 45→44.3). 창 8은 34.2/41.3로
  // 상한이 되살아나기 시작하고, 창 4 미만은 일렬 방지가 사실상 무의미해진다 — 6이 그 사이 최대값이다.
  for (let i = Math.max(0, taken.length - 6); i < taken.length; i++) {
    for (let j = i + 1; j < taken.length; j++) {
      const a = taken[i]
      const b = taken[j]
      const abx = b[0] - a[0]
      const abz = b[2] - a[2]
      const len = Math.hypot(abx, abz)
      if (len < SPAWN_BATCH_MIN_GAP) continue
      const distance = Math.abs(abx * (pos[2] - a[2]) - abz * (pos[0] - a[0])) / len
      if (distance <= SPAWN_LINE_TOLERANCE) return true
    }
  }
  return false
}

function findNearestFreeSpawnPosition(pos, type, bounds, taken, obstacles, scaleOverride) {
  if (isValidSpawnPosition(pos, type, bounds, taken, obstacles, scaleOverride)) return pos
  for (let ring = 1; ring <= 4; ring += 1) {
    for (const [dx, dz] of SPAWN_FALLBACK_OFFSETS) {
      const candidate = [pos[0] + dx * ring, pos[1], pos[2] + dz * ring]
      if (isValidSpawnPosition(candidate, type, bounds, taken, obstacles, scaleOverride)) return candidate
    }
  }
  return null
}

function isFreeFormationCandidate(pos, type, bounds, obstacles, taken) {
  if (!isInsideSpawnBounds(pos[0], pos[2], bounds) || spawnOverlapsObstacle(pos[0], pos[2], type, obstacles)) return false
  for (let index = 0; index < taken.length; index += 1) {
    const dx = pos[0] - taken[index][0]
    const dz = pos[2] - taken[index][2]
    if (dx * dx + dz * dz < 0.01) return false
  }
  return true
}

function findNearestFreeFormationPosition(pos, type, bounds, obstacles, taken) {
  if (isFreeFormationCandidate(pos, type, bounds, obstacles, taken)) return pos
  for (let ring = 1; ring <= 4; ring += 1) {
    for (const [dx, dz] of SPAWN_FALLBACK_OFFSETS) {
      const candidate = [pos[0] + dx * ring, pos[1], pos[2] + dz * ring]
      if (isFreeFormationCandidate(candidate, type, bounds, obstacles, taken)) return candidate
    }
  }
  const limX = bounds.halfX - SPAWN_INSET
  const limZ = bounds.halfZ - SPAWN_INSET
  for (let row = 0; row < 33; row += 1) {
    for (let column = 0; column < 33; column += 1) {
      const candidate = [-limX + limX * 2 * (column / 32), pos[1], -limZ + limZ * 2 * (row / 32)]
      if (isFreeFormationCandidate(candidate, type, bounds, obstacles, taken)) return candidate
    }
  }
  return null
}

function randomPointOnSpawnRing(minRadius, maxRadius, random = Math.random) {
  const angle = random() * Math.PI * 2
  const radius = minRadius + random() * (maxRadius - minRadius)
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  }
}

function spawnPosOnValidRing(type, bounds, minRadius, maxRadius, taken = [], random = Math.random, obstacles = [], scaleOverride) {
  const stats = ENEMY_STATS[type]
  const y     = BASE_COL_Y * (Number.isFinite(scaleOverride) ? scaleOverride : (stats?.scale ?? 1)) * ENEMY_SIZE_MULTIPLIER
  let fallback = null
  for (let i = 0; i < SPAWN_CANDIDATE_TRIES; i++) {
    const offset = randomPointOnSpawnRing(minRadius, maxRadius, random)
    const pos = [playerPos.x + offset.x, y, playerPos.z + offset.z]
    if (!isInsideSpawnBounds(pos[0], pos[2], bounds)) continue
    fallback ??= pos
    if (isValidSpawnPosition(pos, type, bounds, taken, obstacles, scaleOverride)) return pos
  }
  if (fallback) return findNearestFreeSpawnPosition(fallback, type, bounds, taken, obstacles, scaleOverride)
  const offset = randomPointOnSpawnRing(minRadius, maxRadius, random)
  const [x, z] = clampToBounds(playerPos.x + offset.x, playerPos.z + offset.z, bounds)
  return findNearestFreeSpawnPosition([x, y, z], type, bounds, taken, obstacles, scaleOverride)
}

export function randomSpawnPos(type, bounds, taken = [], random = Math.random, obstacles = [], scaleOverride) {
  return spawnPosOnValidRing(type, bounds, SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS, taken, random, obstacles, scaleOverride)
}

// E04는 화면 가장자리 원거리 위치에서 등장한다. 1스테이지에서는 현재 사용하지 않는다.
function rangedSpawnPos(bounds, taken = [], random = Math.random, obstacles = []) {
  return spawnPosOnValidRing('E04', bounds, RANGED_SPAWN_MIN_RADIUS, RANGED_SPAWN_MAX_RADIUS, taken, random, obstacles)
}

export function spawnPosForBurstType(type, bounds, taken = [], random = Math.random, obstacles = []) {
  return type === 'E04'
    ? rangedSpawnPos(bounds, taken, random, obstacles)
    : randomSpawnPos(type, bounds, taken, random, obstacles)
}

export function pickMixedReinforcementTypes(types, count, random = Math.random) {
  const pool = [...new Set((types ?? []).filter((type) => /^E0[1-6]$/.test(type)))]
  if (pool.length === 0 || count <= 0) return []

  const remaining = [...pool]
  const result = []
  while (remaining.length > 0 && result.length < count) {
    const index = Math.floor(random() * remaining.length) % remaining.length
    result.push(remaining.splice(index, 1)[0])
  }
  while (result.length < count) {
    result.push(pool[Math.floor(random() * pool.length) % pool.length])
  }
  return result
}

// 형태(formation) 스폰 — 균일 압력(뱀서라이크 지루함)을 깨는 일회성 대형 배치.
// 좁고 긴 복도(stage2) 기준. 타입은 addEnemies 시점에 정해지므로 y는 대표값(scale=1)으로 통일한다.
//   'swarm'  : 플레이어에서 먼 Z끝에서 X 균등 일렬 → 복도를 쓸고 내려온다.
//   'ring'   : 플레이어 중심 반지름 r 원주 균등 배치 → 포위. 좁은 복도라 반지름을 폭 안으로 줄여
//              벽 클램프/겹침을 피한다(포위 체감 유지).
//   'pincer' : count 절반씩 플레이어 앞뒤 두 줄, 각 줄 X 균등 → 양쪽에서 조여온다(협공 성립).
//   'column' : 먼 Z끝에서 여러 Z-행으로 뭉친 밀집 블록(팔랑크스)이 행군해 내려온다.
//              X는 블록 폭(±limX*0.6) 안에만 채워 swarm의 느슨한 한 줄과 뚜렷이 구분한다.
//   'gauntlet': 양쪽 벽을 따라 Z축 두 줄(x≈±(limX-0.8)). 플레이어~먼 끝 구간에 Z 균등 →
//              플레이어가 가운데를 달려 통과하는 건틀릿. pincer(X방향 두 줄)와 축이 반대다.
// 최종 위치는 항상 isInsideSpawnBounds 보장(밖이면 clampToBounds). random은 결정론 테스트용 주입 가능.
const FORMATION_Y = BASE_COL_Y * ENEMY_SIZE_MULTIPLIER
// 좁은 복도(halfX 7.5→limX 6)에서 벽에 박히지 않는 최대치. 넓은 맵이면 이 상한이 적용된다.
const RING_MAX_RADIUS = 5
// pincer 두 줄을 플레이어 기준 앞뒤로 이 거리에 둔다(끝에 붙어 있으면 place가 경계로 clamp).
const PINCER_Z_OFFSET = 10
// column 밀집 블록: 한 Z-행에 최대 이 인원, 행 간 Z 간격(안쪽으로 계단), X는 폭의 이 비율만 사용.
const COLUMN_ROW_WIDTH = 4
const COLUMN_ROW_GAP = 1.2
const COLUMN_WIDTH_RATIO = 0.6
// gauntlet 두 줄을 벽에서 이만큼 안쪽에 둔다(벽에 완전히 붙으면 place가 경계로 clamp).
const GAUNTLET_WALL_INSET = 0.8

export const RUN_ZOMBIE_CREW_SIZE = 7
export const RUN_ZOMBIE_CREW_DIR = Object.freeze({ x: 1, z: 1 })
export const STAGE2_GUARD_CHASE_SIZE = 7

export function formationSpawnPositions(formation, count, bounds, player, random = Math.random, obstacles = [], type = 'E01') {
  const limX = bounds.halfX - SPAWN_INSET
  const limZ = bounds.halfZ - SPAWN_INSET
  const positions = []

  const place = (x, z) => {
    let px = x
    let pz = z
    if (!isInsideSpawnBounds(px, pz, bounds)) {
      const clamped = clampToBounds(px, pz, bounds)
      px = clamped[0]
      pz = clamped[1]
    }
    const safe = findNearestFreeFormationPosition([px, FORMATION_Y, pz], type, bounds, obstacles, positions)
    if (safe) positions.push(safe)
  }

  // 한 줄에서 X를 균등 분포 (count 1이면 중앙).
  const evenX = (i, n) => (n <= 1 ? 0 : -limX + (2 * limX) * (i / (n - 1)))

  if (formation === 'ring') {
    const r = Math.min(limX, RING_MAX_RADIUS)
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2
      place(player.x + Math.sin(ang) * r, player.z + Math.cos(ang) * r)
    }
    return positions
  }

  if (formation === 'pincer') {
    const topCount = Math.ceil(count / 2)
    const botCount = count - topCount
    const off = Math.min(limZ, PINCER_Z_OFFSET)  // 플레이어 기준 앞뒤. 밖이면 place가 clamp.
    for (let i = 0; i < topCount; i++) place(evenX(i, topCount), player.z + off)
    for (let i = 0; i < botCount; i++) place(evenX(i, botCount), player.z - off)
    return positions
  }

  // 플레이어에서 먼 Z끝 + 안쪽 방향(swarm/column 공통).
  const farZ = Math.abs(player.z - limZ) >= Math.abs(player.z - (-limZ)) ? limZ : -limZ
  const inwardSign = farZ > 0 ? -1 : 1

  if (formation === 'column') {
    // count>COLUMN_ROW_WIDTH면 자동으로 2행 이상 쌓여 블록감이 난다.
    const blockHalfX = limX * COLUMN_WIDTH_RATIO
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / COLUMN_ROW_WIDTH)
      const col = i % COLUMN_ROW_WIDTH
      // 이 행의 실제 인원(마지막 행은 적을 수 있음)으로 블록 폭 안에서 균등 분포.
      const inRow = Math.min(COLUMN_ROW_WIDTH, count - row * COLUMN_ROW_WIDTH)
      const bx = inRow <= 1 ? 0 : -blockHalfX + (2 * blockHalfX) * (col / (inRow - 1))
      const jitter = (random() - 0.5) * 0.4  // 열이 자로 잰 듯 정렬되지 않게 살짝 흔든다.
      place(bx + jitter, farZ + inwardSign * (row * COLUMN_ROW_GAP))
    }
    return positions
  }

  if (formation === 'gauntlet') {
    const wallX = limX - GAUNTLET_WALL_INSET
    const leftCount = Math.ceil(count / 2)
    const rightCount = count - leftCount
    // 플레이어 Z에서 먼 끝까지 한 줄 안에서 균등(플레이어가 지나갈 통로를 따라 늘어선다).
    const zAt = (i, n) => (n <= 1 ? player.z : player.z + (farZ - player.z) * (i / (n - 1)))
    const jitter = () => (random() - 0.5) * 0.3
    for (let i = 0; i < leftCount; i++) place(-wallX + jitter(), zAt(i, leftCount))
    for (let i = 0; i < rightCount; i++) place(wallX + jitter(), zAt(i, rightCount))
    return positions
  }

  // 기본 'swarm' — 먼 Z끝에서 X 균등 일렬, 끝에서 안쪽으로 0~2 스태거(느슨).
  for (let i = 0; i < count; i++) {
    place(evenX(i, count), farZ + inwardSign * (random() * 2))
  }
  return positions
}

export function createRunZombieCrewEntries(bounds, random = Math.random, obstacles = []) {
  const limX = bounds.halfX - SPAWN_INSET
  const limZ = bounds.halfZ - SPAWN_INSET
  const dirLen = Math.hypot(RUN_ZOMBIE_CREW_DIR.x, RUN_ZOMBIE_CREW_DIR.z) || 1
  const nx = RUN_ZOMBIE_CREW_DIR.x / dirLen
  const nz = RUN_ZOMBIE_CREW_DIR.z / dirLen
  const px = -nz
  const pz = nx
  const startX = -limX - 1.8
  const startZ = -limZ - 1.8

  const entries = []
  for (let i = 0; i < RUN_ZOMBIE_CREW_SIZE; i += 1) {
    const isLeader = i === 0
    const row = Math.floor(Math.max(0, i - 1) / 4)
    const col = Math.max(0, i - 1) % 4
    const sideOffset = isLeader ? 0 : (col - 1.5) * 0.72 + (random() - 0.5) * 0.16
    const trail = isLeader ? 0 : 1.15 + row * 1.05 + (col % 2) * 0.38
    const x = startX - nx * trail + px * sideOffset
    const z = startZ - nz * trail + pz * sideOffset
    const type = isLeader ? 'RZL' : 'RZC'
    const radius = enemySpawnRadius(type)
    let safe = null
    for (let ring = 0; ring <= 4 && !safe; ring += 1) {
      const candidates = ring === 0 ? 1 : 8
      for (let candidate = 0; candidate < candidates; candidate += 1) {
        const angle = ring === 0 ? 0 : candidate * Math.PI * 0.25
        const candidateX = x + Math.cos(angle) * ring * (radius * 2 + 0.18)
        const candidateZ = z + Math.sin(angle) * ring * (radius * 2 + 0.18)
        if (candidateX < -bounds.halfX - 6 || candidateX > bounds.halfX + 6 || candidateZ < -bounds.halfZ - 6 || candidateZ > bounds.halfZ + 6) continue
        if (!spawnOverlapsObstacle(candidateX, candidateZ, type, obstacles)) safe = [candidateX, FORMATION_Y, candidateZ]
      }
    }
    for (let row = 0; row < 33 && !safe; row += 1) {
      for (let column = 0; column < 33 && !safe; column += 1) {
        const candidateX = -bounds.halfX - 6 + (bounds.halfX * 2 + 12) * (column / 32)
        const candidateZ = -bounds.halfZ - 6 + (bounds.halfZ * 2 + 12) * (row / 32)
        if (spawnOverlapsObstacle(candidateX, candidateZ, type, obstacles)) continue
        let duplicate = false
        for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          const dx = candidateX - entries[entryIndex].pos[0]
          const dz = candidateZ - entries[entryIndex].pos[2]
          if (dx * dx + dz * dz < 0.01) { duplicate = true; break }
        }
        if (!duplicate) safe = [candidateX, FORMATION_Y, candidateZ]
      }
    }
    if (!safe) continue
    entries.push({
      type,
      pos: safe,
      runCrewDir: RUN_ZOMBIE_CREW_DIR,
      runCrewRole: isLeader ? 'leader' : 'crew',
    })
  }
  return entries
}

// 웨이브 타임라인 기본값 정본은 lib/waveTimelines.js로 이동(2026-07-04) —
// 어드민 '스테이지별 웨이브 컨트롤'이 3D 체인 없이 읽는다. 기존 경로 호환 재수출.
export { WAVE_PHASES, STAGE2_WAVE_PHASES, STAGE2_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'

// 버스트(일회성) 스폰 정본은 lib/burstEvents.js로 이동(2026-07-10) — 순수 데이터.
// 보스 등장 시각 = 보스 버스트(B01/B02) sec 단일 소스, 보스 구간은 여기서 파생.
// 기존 경로 호환 재수출(getBurstEventsForStage는 위 import의 로컬 바인딩을 재수출).
export { BURST_EVENTS, STAGE2_BURST_EVENTS } from '../lib/burstEvents.js'
export { getBurstEventsForStage }

export function getWavePhasesForStage(stageId) {
  // 어드민 '스테이지별 웨이브 컨트롤' 커스텀 타임라인이 있으면 우선 적용.
  const custom = buildWavePhasesFromEntries(getAdminWaveControlConfig()?.[stageId])
  if (custom) return custom
  return getDefaultWavePhases(stageId)
}

// 랜덤 간격 이산 웨이브 스케줄러(2026-07-11) — 좀비는 오직 이 스케줄에서만,
// 발화 시 웨이브 구성을 확정한 뒤 일반 풀 적은 RAF당 3마리씩 drain한다.
// 첫 웨이브는 t=0, 이후 각 웨이브는 직전 발화 + 20~40초 균등분포 랜덤 간격(평균 30초).
export const WAVE_INTERVAL_SEC = 30        // 평균(중심) 간격 — 참고용
export const WAVE_INTERVAL_MIN_SEC = 20
export const WAVE_INTERVAL_MAX_SEC = 40
const WAVE_SIZE_FACTOR = 0.5
// stage1 밀도 하향(2026-07-22): 잡몹 총 HP 균등 +10% 곡선의 앵커를 만들기 위해 1.3→1.15로 낮춘다.
export const STAGE1_SPAWN_MULTIPLIER = 1.15
// Stage 2 spawn-count tuning (2026-08-08): increase delivered zombie count
// without changing HP normalization or the wave timeline/composition.
export const STAGE2_SPAWN_MULTIPLIER = 1.5
export const STAGE2_OPENING_GREEN_WAVE_MULTIPLIER = 0.6

// 웨이브당 마릿수 = 활성 phase target × 0.5 (반올림, 최소 1 보장).
export function waveSizeForPhase(phase) {
  return Math.max(1, Math.round((phase?.target ?? 0) * WAVE_SIZE_FACTOR))
}

// 프론트로드 정본 — "그 시각의 웨이브 1회에만" 곱하는 오프닝 밀도 배수(반복되지 않는다).
// 기대 총량 추정기가 이 표를 그대로 읽어 "프론트로드 1회분"을 더하므로, 배수를 여기서만 고치면
// 정규화도 자동으로 따라온다. (2026-08-07: 스테이지별 if문을 표로 통일 — 추정기와 단일 소스 공유.)
// 스테이지별 첫 웨이브 발화 시각. 미등록 스테이지는 0(즉시).
// stage2는 2026-08-09 사용자 지시로 첫 웨이브를 5초로 미뤘다 — 입장 직후 무방비 스폰을 없앤다.
export const STAGE_FIRST_WAVE_SEC = { stage2: 5 }

export function firstWaveTimeForStage(stageId) {
  return STAGE_FIRST_WAVE_SEC[stageId] ?? 0
}

export const STAGE_FRONTLOAD_WAVES = {
  stage2: { 5: 3, 30: 3 },   // 오프닝(t=5)·30초 웨이브 ×3
  stage3: { 0: 2 },          // 오프닝(t=0) ×2
}

// 웨이브의 "구조적" 크기(밀도배율 적용 전) = target 절반 + 스테이지별 프론트로드/오프닝 규칙만.
// 기대 총량 추정기(stageExpectedBaseJarmobHp)가 이 함수만 사용해 밀도배율과의 순환의존을 피한다.
//   - stage1: ×STAGE1_SPAWN_MULTIPLIER(반올림)
//   - 그 외: STAGE_FRONTLOAD_WAVES에 등록된 시각만 배수 적용
export function rawWaveSizeForStage(phase, stageId, waveTime) {
  const size = waveSizeForPhase(phase)
  if (stageId === 'stage1') return Math.max(1, Math.round(size * STAGE1_SPAWN_MULTIPLIER))
  return size * (STAGE_FRONTLOAD_WAVES[stageId]?.[waveTime] ?? 1)
}

// 실제 웨이브 크기 = 구조적 크기 × 스테이지 밀도배율(잡몹 총 HP 균등 +10% 곡선의 밀도 절반 부담).
// stage1은 밀도배율 없음(앵커) → raw 그대로. stage2~4는 √c 밀도배율이 적용된다.
export function waveSizeForStageAtTime(phase, stageId, waveTime) {
  const raw = rawWaveSizeForStage(phase, stageId, waveTime)
  const densitySize = Math.max(1, Math.round(raw * (STAGE_DENSITY_MULTIPLIER[stageId] ?? 1)))
  if (stageId !== 'stage2') return densitySize
  const stage2Size = Math.max(1, Math.round(densitySize * STAGE2_SPAWN_MULTIPLIER))
  return waveTime === 5 || waveTime === 30
    ? Math.max(1, Math.round(stage2Size * STAGE2_OPENING_GREEN_WAVE_MULTIPLIER))
    : stage2Size
}

// 다음 웨이브까지 간격 = 20~40초 균등분포 랜덤. random 주입으로 테스트 결정성 확보.
export function nextWaveInterval(random = Math.random) {
  return WAVE_INTERVAL_MIN_SEC + random() * (WAVE_INTERVAL_MAX_SEC - WAVE_INTERVAL_MIN_SEC)
}

export function nextWaveTimeForStage(waveTime, stageId, random = Math.random) {
  if (stageId === 'stage2' && waveTime === firstWaveTimeForStage(stageId)) return 30
  return waveTime + nextWaveInterval(random)
}

// 웨이브 발화 시각 목록 = 스테이지별 첫 웨이브 시각에서 시작, 각 웨이브 후 20~40초 랜덤 간격 누적, 마지막 phase.end 미만까지.
// 과거 웨이브 타임라인을 읽는 테스트/미리보기용 순수 함수. 런타임 스폰에는 사용하지 않는다.
export function getWaveSpawnSeconds(phases, random = Math.random, stageId = 'stage1') {
  const lastEnd = phases?.[phases.length - 1]?.end ?? 0
  const secs = []
  let t = firstWaveTimeForStage(stageId)
  while (t < lastEnd) {
    secs.push(t)
    t = nextWaveTimeForStage(t, stageId, random)
  }
  return secs
}

// ── 중간 보강 스폰(2026-07-13 stage1 도입 / 2026-08-07 stage2 확대) ──────────────
// 20~40초 랜덤 웨이브만으로는 웨이브 사이가 비어 부하가 뚝뚝 끊긴다. 웨이브 사이 '정중앙'에
// 본 웨이브의 절반 크기 보조 물량을 1회 더 흘려 빈 구간을 채운다. 첫 보강은 t=0 웨이브와
// 두 번째 웨이브 사이(≈10~20초)라 "스테이지의 처음" 구간도 함께 덮는다.
//
// 2026-08-07 stage2 확대: 총량이 비슷해도 보강이 있는 stage1이 훨씬 촘촘해, 20초 구간 12개 중
// 7개에서 stage2 부하가 stage1보다 낮았다("스2가 스1보다 쉽다"의 체감 주범). 보강을 켜도 총량은
// 늘지 않는다 — base가 커지는 만큼 √c가 내려가 자기정규화되므로 "같은 총량을 더 촘촘히"가 된다.
// 대상 스테이지는 이 상수 하나가 정본이다(스케줄러·기대총량 추정기가 같은 값을 읽는다).
export const MID_WAVE_STAGES = new Set(['stage1', 'stage2'])
const MID_WAVE_SIZE_FACTOR = 0.5  // 본 웨이브 대비 보조 물량 비율

// 중간 보강 스폰 시각 = 이번 웨이브와 다음 웨이브의 정중앙. 대상 외 스테이지는 Infinity(=없음).
export function midWaveTimeForStage(waveTime, nextTime, stageId) {
  if (!MID_WAVE_STAGES.has(stageId)) return Infinity
  return (waveTime + nextTime) / 2
}

// 보강 물량의 "구조적" 크기(밀도배율 적용 전) = 본 웨이브 크기 × 0.5.
// STAGE1_SPAWN_MULTIPLIER는 stage1 전용 밀도 상수라 stage1에만 곱한다 — stage2는
// STAGE_DENSITY_MULTIPLIER를 별도로 받으므로 여기서 곱하면 밀도가 이중 적용된다.
// 기대 총량 추정기는 이 raw 함수만 써서 밀도배율 순환의존을 피한다(rawWaveSizeForStage와 같은 규약).
export function rawMidWaveSize(phase, stageId = 'stage1') {
  const baseSize = Math.max(1, Math.round(waveSizeForPhase(phase) * MID_WAVE_SIZE_FACTOR))
  if (stageId !== 'stage1') return baseSize
  return Math.max(1, Math.round(baseSize * STAGE1_SPAWN_MULTIPLIER))
}

// 실제 보강 물량 = 구조적 크기 × 스테이지 밀도배율(waveSizeForStageAtTime과 동일 규약).
export function midWaveSizeForStage(phase, stageId = 'stage1') {
  const densitySize = Math.max(1, Math.round(rawMidWaveSize(phase, stageId) * (STAGE_DENSITY_MULTIPLIER[stageId] ?? 1)))
  return stageId === 'stage2'
    ? Math.max(1, Math.round(densitySize * STAGE2_SPAWN_MULTIPLIER))
    : densitySize
}

// Stage 2 chase crew deliberately does not use obstacle-safe placement: both
// roles are screen-crossing runners and the simulation lets these two types
// pass through classroom props. Injected random keeps every edge case testable.
export function createStage2GuardChaseEntries(bounds, random = Math.random, visibleBounds = null) {
  const edge = Math.floor(random() * 4) % 4
  const startAlong = (random() * 2 - 1) * 0.72
  const endAlong = (random() * 2 - 1) * 0.72
  const hasVisibleBounds = visibleBounds
    && Number.isFinite(visibleBounds.minX)
    && Number.isFinite(visibleBounds.maxX)
    && Number.isFinite(visibleBounds.minZ)
    && Number.isFinite(visibleBounds.maxZ)
  const spawnBounds = hasVisibleBounds
    ? {
      minX: visibleBounds.minX, maxX: visibleBounds.maxX,
      minZ: visibleBounds.minZ, maxZ: visibleBounds.maxZ,
      halfX: (visibleBounds.maxX - visibleBounds.minX) * 0.5,
      halfZ: (visibleBounds.maxZ - visibleBounds.minZ) * 0.5,
      centerX: (visibleBounds.minX + visibleBounds.maxX) * 0.5,
      centerZ: (visibleBounds.minZ + visibleBounds.maxZ) * 0.5,
      outer: 0,
    }
    : {
      minX: -bounds.halfX, maxX: bounds.halfX,
      minZ: -bounds.halfZ, maxZ: bounds.halfZ,
      halfX: bounds.halfX,
      halfZ: bounds.halfZ,
      centerX: 0,
      centerZ: 0,
      outer: 1.2,
    }
  let startX = 0; let startZ = 0; let endX = 0; let endZ = 0
  if (edge === 0) {
    startX = spawnBounds.minX - spawnBounds.outer; startZ = spawnBounds.centerZ + startAlong * spawnBounds.halfZ
    endX = spawnBounds.maxX + spawnBounds.outer; endZ = spawnBounds.centerZ + endAlong * spawnBounds.halfZ
  } else if (edge === 1) {
    startX = spawnBounds.maxX + spawnBounds.outer; startZ = spawnBounds.centerZ + startAlong * spawnBounds.halfZ
    endX = spawnBounds.minX - spawnBounds.outer; endZ = spawnBounds.centerZ + endAlong * spawnBounds.halfZ
  } else if (edge === 2) {
    startX = spawnBounds.centerX + startAlong * spawnBounds.halfX; startZ = spawnBounds.minZ - spawnBounds.outer
    endX = spawnBounds.centerX + endAlong * spawnBounds.halfX; endZ = spawnBounds.maxZ + spawnBounds.outer
  } else {
    startX = spawnBounds.centerX + startAlong * spawnBounds.halfX; startZ = spawnBounds.maxZ + spawnBounds.outer
    endX = spawnBounds.centerX + endAlong * spawnBounds.halfX; endZ = spawnBounds.minZ - spawnBounds.outer
  }
  const length = Math.hypot(endX - startX, endZ - startZ) || 1
  const runCrewDir = { x: (endX - startX) / length, z: (endZ - startZ) / length }
  const perpendicular = { x: -runCrewDir.z, z: runCrewDir.x }
  const entries = [{
    type: 'RZT', pos: [startX, 0, startZ], runCrewDir, runCrewRole: 'fugitive',
  }]
  for (let index = 0; index < STAGE2_GUARD_CHASE_SIZE - 1; index += 1) {
    const row = Math.floor(index / 2)
    const side = index % 2 === 0 ? -0.46 : 0.46
    const trail = 1.08 + row * 0.96
    entries.push({
      type: 'RZG',
      pos: [startX - runCrewDir.x * trail + perpendicular.x * side, 0, startZ - runCrewDir.z * trail + perpendicular.z * side],
      runCrewDir,
      runCrewRole: 'guard',
    })
  }
  if (hasVisibleBounds) {
    const inset = 0.8
    const offsets = entries.map((entry) => ({ x: entry.pos[0] - startX, z: entry.pos[2] - startZ }))
    const minOffsetX = Math.min(...offsets.map((offset) => offset.x))
    const maxOffsetX = Math.max(...offsets.map((offset) => offset.x))
    const minOffsetZ = Math.min(...offsets.map((offset) => offset.z))
    const maxOffsetZ = Math.max(...offsets.map((offset) => offset.z))
    const minAnchorX = visibleBounds.minX + inset - minOffsetX
    const maxAnchorX = visibleBounds.maxX - inset - maxOffsetX
    const minAnchorZ = visibleBounds.minZ + inset - minOffsetZ
    const maxAnchorZ = visibleBounds.maxZ - inset - maxOffsetZ
    const nextStartX = minAnchorX <= maxAnchorX ? Math.max(minAnchorX, Math.min(maxAnchorX, startX)) : (visibleBounds.minX + visibleBounds.maxX) * 0.5
    const nextStartZ = minAnchorZ <= maxAnchorZ ? Math.max(minAnchorZ, Math.min(maxAnchorZ, startZ)) : (visibleBounds.minZ + visibleBounds.maxZ) * 0.5
    const deltaX = nextStartX - startX
    const deltaZ = nextStartZ - startZ
    for (const entry of entries) {
      entry.pos[0] += deltaX
      entry.pos[2] += deltaZ
    }
  }
  return entries
}

// 중간 보강 스폰 시각 목록 — 웨이브 스케줄과 동일 random으로 파생하는 순수 함수(테스트/미리보기용).
// 대상 스테이지가 아니면 빈 목록(보강 스폰 없음).
export function getMidpointSpawnSeconds(phases, stageId = 'stage1', random = Math.random) {
  if (!MID_WAVE_STAGES.has(stageId)) return []
  const lastEnd = phases?.[phases.length - 1]?.end ?? 0
  const secs = []
  let t = firstWaveTimeForStage(stageId)
  while (t < lastEnd) {
    const next = nextWaveTimeForStage(t, stageId, random)
    const mid = midWaveTimeForStage(t, next, stageId)
    if (mid < lastEnd) secs.push(mid)
    t = next
  }
  return secs
}

// 명시 버스트 전환 이후 런타임 보스 호위 자동 웨이브는 사용하지 않는다.
// 보스 주변 추가 적이 필요하면 BURST_EVENTS 계열에 별도 이벤트로 고정 기록한다.
export function bossEscortSize() {
  return 0
}

// ── 잡몹 총 HP 균등 상승(+10%/스테이지) 블렌드 배율(2026-07-22) ─────────────────
// 목표: 잡몹 E01~E06의 스테이지별 "기대 총 HP"가 직전 스테이지 정확히 ×1.10.
// 스테이지마다 웨이브 target·구성·프론트로드가 달라 개별 HP 배율(±)만으로는 총량이 롤러코스터가 되므로,
// 부담을 HP와 밀도가 각각 √c로 반반 나눠 진다(처치시간·동시압박을 함께 끌어올림).
// stage1을 앵커로 두고(밀도 하향 1.15 반영) 각 스테이지 기대총량을 √c 배율로 앵커×1.10^i에 맞춘다.
const JARMOB_HP_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06'])

// 한 phase에서 1스폰당 잡몹 기대 HP = Σ weights[잡몹]×base.hp. 방어적으로 E01~E06만 합산한다.
function jarmobHpPerSpawn(phase) {
  let sum = 0
  for (const [type, weight] of Object.entries(phase?.weights ?? {})) {
    if (JARMOB_HP_TYPES.has(type)) sum += weight * (ENEMY_STATS[type]?.hp ?? 0)
  }
  return sum
}

// 스테이지 상승 HP 곡선 — 보스·런크루·도지 등 비잡몹 전용(2026-07-22 개정): 이전×1.10(+10%).
// stage1 ×1.0(오버라이드 없음) / stage2 ×1.10 / stage3 ×1.21 / stage4 ×1.331.
// 잡몹 E01~E06은 아래 STAGE_JARMOB_HP_MULTIPLIER(√c)로 별도 적용해 총 HP를 균등 +10%로 맞춘다.
// 마틸다(탈출 추격자)는 별도 동적 statOverride를 쓰므로 여기 대상 아님.
// (블렌드 파생이 런크루 확정 HP를 먼저 빼야 해서 이 표가 블렌드 블록보다 위에 있어야 한다.)
const STAGE_HP_MULTIPLIER = { stage2: 1.10, stage3: 1.21, stage4: 1.331 }

// 프론트로드가 아닌 평시 웨이브를 뽑기 위한 대표 시각(어느 스테이지의 프론트로드 표에도 없는 값).
const NON_FRONTLOAD_WAVE_TIME = 1

// 배율 적용 전 "웨이브계" 잡몹 기대 총 HP = 지속시간 가중 웨이브 + 프론트로드 1회분 + 중간보강.
// rawWaveSizeForStage/rawMidWaveSize만 사용해 밀도배율과의 순환의존을 회피한다.
//
// 2026-08-07 개정: 30초 격자 8표본 모델을 폐기했다. 옛 격자는
//   (a) 72~90·96~120·192~208·224~240처럼 표본에 안 걸리는 구간(총 56초)을 통째로 못 봤고,
//   (b) 1회성 프론트로드(stage2 t=0/30 ×3, stage3 t=0 ×2)를 "그 30초 내내의 대표값"으로 읽어
//       base를 stage2 +8.7% / stage3 +2.6% 부풀렸다.
// 부푼 base는 c = 앵커×factor/base 를 줄여 √c를 과소산출했고, 그래서 stage2 실전달 총량이
// 목표 ×1.21이 아니라 ×1.082에 안착했다(= "스2가 스1보다 쉽다"의 총량 측 원인).
export function stageExpectedBaseJarmobHp(stageId) {
  const phases = getDefaultWavePhases(stageId)
  const activeAt = (t) => phases.findLast((p) => p.start <= t) ?? phases[0]
  const hasMidWave = MID_WAVE_STAGES.has(stageId)
  let total = 0
  for (const phase of phases) {
    const perSpawn = jarmobHpPerSpawn(phase)
    // 중간 보강은 웨이브마다 1회 = 웨이브와 같은 간격이므로 같은 식으로 가중한다.
    let perWave = rawWaveSizeForStage(phase, stageId, NON_FRONTLOAD_WAVE_TIME) * perSpawn
    if (hasMidWave) perWave += rawMidWaveSize(phase, stageId) * perSpawn
    total += (phase.end - phase.start) * (perWave / WAVE_INTERVAL_SEC)
  }
  // 프론트로드는 1회성이라 구간 평균이 아니라 "평시 웨이브 대비 초과분 × 정확히 1회"로 더한다.
  for (const waveTime of Object.keys(STAGE_FRONTLOAD_WAVES[stageId] ?? {})) {
    const phase = activeAt(Number(waveTime))
    const extra = rawWaveSizeForStage(phase, stageId, Number(waveTime))
      - rawWaveSizeForStage(phase, stageId, NON_FRONTLOAD_WAVE_TIME)
    total += extra * jarmobHpPerSpawn(phase)
  }
  return total
}

// 런타임에 실제 발화하는 버스트의 잡몹 HP(배율 적용 전).
// 반드시 getRuntimeBurstEventsForStage를 쓴다 — 정적 getBurstEventsForStage를 쓰면 stage1/stage2의
// 미발화 형태 버스트까지 세서 base가 또 틀어진다(stage1/2는 보스만 발화).
// 버스트 count는 리터럴이라 밀도배율을 받지 않는다 → 실전달에서 √c가 1제곱으로만 곱해진다.
export function stageBurstJarmobBaseHp(stageId) {
  let total = 0
  for (const evt of getRuntimeBurstEventsForStage(stageId)) {
    if (!JARMOB_HP_TYPES.has(evt.type)) continue
    total += (evt.count ?? 1) * (ENEMY_STATS[evt.type]?.hp ?? 0)
  }
  return total
}

// 런좀비 크루(RZL 리더 1 + RZC 나머지)의 확정 HP 합. 크루는 잡몹이 아니라 STAGE_HP_MULTIPLIER를
// 쓰므로 √c 정규화 대상이 아니다 — 목표 총량에서 먼저 빼고 나머지를 웨이브·버스트로 채운다.
// 실제 생성 인원은 evt.count가 아니라 RUN_ZOMBIE_CREW_SIZE다(createRunZombieCrewEntries).
export function stageRunCrewFixedHp(stageId) {
  const mult = STAGE_HP_MULTIPLIER[stageId] ?? 1
  const crewHp = Math.round(ENEMY_STATS.RZL.hp * mult)
    + Math.round(ENEMY_STATS.RZC.hp * mult) * (RUN_ZOMBIE_CREW_SIZE - 1)
  let total = 0
  for (const evt of getRuntimeBurstEventsForStage(stageId)) {
    if (evt.formation === RUN_ZOMBIE_CREW_FORMATION) total += crewHp
  }
  return total
}

export function stage2GuardChaseFixedHp(stageId) {
  if (stageId !== 'stage2') return 0
  const mult = STAGE_HP_MULTIPLIER[stageId] ?? 1
  const crewHp = Math.round(ENEMY_STATS.RZT.hp * mult)
    + Math.round(ENEMY_STATS.RZG.hp * mult) * (STAGE2_GUARD_CHASE_SIZE - 1)
  return getRuntimeBurstEventsForStage(stageId)
    .filter((evt) => evt.formation === STAGE2_GUARD_CHASE_FORMATION)
    .length * crewHp
}

// 스테이지별 잡몹계 실전달 총 HP 목표(앵커=stage1 총량의 배수). 이 표가 총량의 유일한 결정자다.
// 블렌드가 실전달 총량을 앵커×factor에 맞추도록 √c를 역산하므로, 타임라인 target·weights를
// 아무리 흔들어도 총량은 이 표에 고정된다 — 타임라인은 "총량 배분(곡선 모양)"만 바꾼다.
// 2026-08-07: 단조 +10%/스테이지로 복원했다. 이전에는 stage2·stage3이 둘 다 1.21 동률이었고
// 그 근거는 "스3는 버스트가 모델 밖에서 그대로 얹히니 실제론 더 어렵다"였는데, 이제 버스트·런크루가
// 모델 안으로 들어와 실전달 총량에 포함되므로 그 전제 자체가 사라졌다(실측 결과 스3 ×2.50 / 스4 ×1.92
// 로 스4가 스3보다 쉬운 역전까지 나 있었다).
const STAGE_JARMOB_TOTAL_HP_FACTOR = {
  stage1: 1,                  // 앵커
  stage2: Math.pow(1.10, 2),  // 1.21 — 2026-08-06 난이도 +10% 조정 유지
  stage3: Math.pow(1.10, 3),  // 1.331
  stage4: Math.pow(1.10, 4),  // 1.4641
}

// 블렌드 배율(모듈 로드시 1회 파생). 실전달 총량은 m에 대해 2차식이다:
//   waveBase×m² + burstJarmobBase×m + crewFixed = 앵커 × factor
// 웨이브는 HP배율·밀도배율을 둘 다 받아 m², 버스트 잡몹은 count가 리터럴이라 m, 런크루는 별도
// HP 곡선을 쓰는 상수항이다. 근의 공식으로 정확히 풀어 √c를 구한다(양근만 유효).
// stage1은 앵커라 배율 없음(undefined → 미적용). rawWaveSizeForStage만 쓰므로 순환하지 않는다.
const _STAGE_BLEND_IDS = ['stage1', 'stage2', 'stage3', 'stage4']
const _jarmobHpAnchor = stageExpectedBaseJarmobHp('stage1')
export const STAGE_JARMOB_HP_MULTIPLIER = {}
export const STAGE_DENSITY_MULTIPLIER = {}
_STAGE_BLEND_IDS.forEach((stageId) => {
  if (stageId === 'stage1') return  // 앵커: 배율 없음
  // 표에 없는 stageId는 NaN이 조용히 전파되므로 앵커 배수 1로 막는다(구 인덱스 방식은 항상 수치를 냈다).
  const factor = STAGE_JARMOB_TOTAL_HP_FACTOR[stageId] ?? 1
  const a = stageExpectedBaseJarmobHp(stageId)
  const b = stageBurstJarmobBaseHp(stageId)
  const remaining = _jarmobHpAnchor * factor - stageRunCrewFixedHp(stageId)
  // ⚠ remaining ≤ 0 = 런크루 확정 HP만으로 목표 총량을 넘겨 웨이브를 0으로 깎아도 factor를 못 맞추는
  //   상태다. 그때는 배율을 0으로 붕괴시키는 대신 하한 0.5로 막고 factor 표/크루 횟수를 고쳐야 한다.
  const m = remaining > 0 ? (-b + Math.sqrt(b * b + 4 * a * remaining)) / (2 * a) : 0.5
  STAGE_JARMOB_HP_MULTIPLIER[stageId] = m
  STAGE_DENSITY_MULTIPLIER[stageId] = m
})

// 잡몹계 실전달 기대 총 HP(배율 적용 후) = 웨이브 base×m² + 버스트 잡몹×m + 런크루 확정 HP.
// 설계상 앵커×목표배수와 항등이라 factor 회귀만 잡고 타임라인 회귀는 못 잡는다 —
// 타임라인 방어는 stageExpectedBaseJarmobHp(웨이브 base)와 stageJarmobLoadWindows 단언이 맡는다.
export function stageExpectedJarmobHp(stageId) {
  const m = STAGE_JARMOB_HP_MULTIPLIER[stageId] ?? 1
  return stageExpectedBaseJarmobHp(stageId) * m * m
    + stageBurstJarmobBaseHp(stageId) * m
    + stageRunCrewFixedHp(stageId)
}

// 구간별 잡몹계 부하 곡선(HP/s). 총량이 같아도 배분이 다르면 체감 난이도가 뒤집히므로,
// "스2의 어떤 구간도 같은 시각 스1보다 크게 낮지 않다"를 회귀로 지킬 수 있게 하는 분석 함수다.
// 웨이브·중간보강은 phase가 구간과 겹치는 길이만큼 분배하고, 프론트로드/버스트는 발생 시각 구간에 얹는다.
export function stageJarmobLoadWindows(stageId, windowSec = 20, totalSec = 240) {
  const phases = getDefaultWavePhases(stageId)
  const activeAt = (t) => phases.findLast((p) => p.start <= t) ?? phases[0]
  const hasMidWave = MID_WAVE_STAGES.has(stageId)
  const m = STAGE_JARMOB_HP_MULTIPLIER[stageId] ?? 1
  const count = Math.ceil(totalSec / windowSec)
  const buckets = new Array(count).fill(0)
  const bucketAt = (sec) => Math.min(count - 1, Math.max(0, Math.floor(sec / windowSec)))

  for (const phase of phases) {
    const perSpawn = jarmobHpPerSpawn(phase)
    let perWave = rawWaveSizeForStage(phase, stageId, NON_FRONTLOAD_WAVE_TIME) * perSpawn
    if (hasMidWave) perWave += rawMidWaveSize(phase, stageId) * perSpawn
    const hpPerSec = (perWave / WAVE_INTERVAL_SEC) * m * m
    for (let i = 0; i < count; i += 1) {
      const overlap = Math.min((i + 1) * windowSec, phase.end) - Math.max(i * windowSec, phase.start)
      if (overlap > 0) buckets[i] += overlap * hpPerSec
    }
  }
  for (const waveTime of Object.keys(STAGE_FRONTLOAD_WAVES[stageId] ?? {})) {
    const sec = Number(waveTime)
    const phase = activeAt(sec)
    const extra = rawWaveSizeForStage(phase, stageId, sec)
      - rawWaveSizeForStage(phase, stageId, NON_FRONTLOAD_WAVE_TIME)
    buckets[bucketAt(sec)] += extra * jarmobHpPerSpawn(phase) * m * m
  }
  for (const evt of getRuntimeBurstEventsForStage(stageId)) {
    if (evt.formation === RUN_ZOMBIE_CREW_FORMATION) {
      const mult = STAGE_HP_MULTIPLIER[stageId] ?? 1
      buckets[bucketAt(evt.sec)] += Math.round(ENEMY_STATS.RZL.hp * mult)
        + Math.round(ENEMY_STATS.RZC.hp * mult) * (RUN_ZOMBIE_CREW_SIZE - 1)
    } else if (evt.formation === STAGE2_GUARD_CHASE_FORMATION) {
      const mult = STAGE_HP_MULTIPLIER[stageId] ?? 1
      buckets[bucketAt(evt.sec)] += Math.round(ENEMY_STATS.RZT.hp * mult)
        + Math.round(ENEMY_STATS.RZG.hp * mult) * (STAGE2_GUARD_CHASE_SIZE - 1)
    } else if (JARMOB_HP_TYPES.has(evt.type)) {
      buckets[bucketAt(evt.sec)] += (evt.count ?? 1) * (ENEMY_STATS[evt.type]?.hp ?? 0) * m
    }
  }
  return buckets.map((hp) => hp / windowSec)
}

export function stageHpOverride(type, stageId) {
  // 잡몹은 √c 총HP-균등 배율, 그 외(보스·런크루)는 기존 개별 +10% 곡선.
  const table = JARMOB_HP_TYPES.has(type) ? STAGE_JARMOB_HP_MULTIPLIER : STAGE_HP_MULTIPLIER
  const mult = table[stageId]
  if (!mult) return undefined
  const base = ENEMY_STATS[type]
  if (!base) return undefined
  return { hp: Math.round(base.hp * mult) }
}

// ── 이벤트 몬스터 "춤추는 도지" (2026-07-14) ─────────────────────────────────
// 모든 스테이지(1·2·3)의 60초 시점에 스테이지 중앙(0,0)에서 주인공 2배 크기로 1회 등장한다.
// 무해(정지·비추격) 개체로 플레이어 무기로만 처치 — 처치 시 보물상자를 드랍하고, 상자는
// 1.5초 뒤 "퍽" 열리며 주변에 평소보다 많은 황금코인을 산포한다(연출 배선은 DancingDogeEvent/
// TreasureChest, 코인 산포는 아래 dogeTreasureCoinPositions).
export const DOGE_SPAWN_SEC = 60
export const DOGE_SPAWN_POS = [0, 0, 0]   // 스테이지 가운데
// DancingDoge rest-pose raw height(발바닥→귀끝) ≈ 1.5 units(scale 1, DogeMesh 지오메트리 기준).
// 주인공 월드 키의 2배가 되도록 스케일을 이 raw 높이로부터 역산한다(2배 스펙을 구조적으로 보장).
const DOGE_RAW_HEIGHT = 1.5
export const DOGE_SCALE = Number(((2 * PLAYER_MESH_WORLD_HEIGHT) / DOGE_RAW_HEIGHT).toFixed(3))
// 이벤트 보너스 몬스터 HP — 60초 시점 DPS로 "몇 초 안에" 잡히는 수준(E06 320보다 낮게 200 기준).
// 스테이지 상승 곡선(+10%/스테이지)을 잡몹·보스와 동일 철학으로 적용(1.0 / 1.10 / 1.21 / 1.331).
export const DOGE_BASE_HP = 200
// 보물상자 코인 잭팟: 일반 처치(코인 1)·보스(코인 5)보다 확실히 많은 12개를 원형 산포한다.
export const DOGE_COIN_COUNT = 12
const DOGE_COIN_RING_MIN = 0.3
const DOGE_COIN_RING_MAX = 1.4

export function dogeHpForStage(stageId) {
  return Math.round(DOGE_BASE_HP * (STAGE_HP_MULTIPLIER[stageId] ?? 1))
}

// 도지 도주(황금고블린) 파라미터/순수 로직은 lib/dogeEscape.js 참조 —
// DancingDogeEvent(프레임 이동)와 공유하므로 순환 의존을 피해 lib로 분리했다.

// 60초 도달 시 1회만 스폰. alreadySpawned 가드로 중복 스폰을 막는다(모든 스테이지 공통).
export function shouldSpawnDoge(sec, alreadySpawned) {
  return !alreadySpawned && sec >= DOGE_SPAWN_SEC
}

// 상자 오픈 시 중심 주변 링에 코인 count개 산포할 위치. 각기 다른 좌표라야 GoldCoin이
// 좌표 시드로 서로 다른 방향으로 튀어 뭉치지 않는다(뿌리는 연출 성립).
export function dogeTreasureCoinPositions(center, count = DOGE_COIN_COUNT, random = Math.random) {
  const [cx, , cz] = center
  const positions = []
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + random() * 0.6
    const r = DOGE_COIN_RING_MIN + random() * (DOGE_COIN_RING_MAX - DOGE_COIN_RING_MIN)
    positions.push([cx + Math.sin(ang) * r, 0.13, cz + Math.cos(ang) * r])
  }
  return positions
}

export function pickTypeByWeightExcluding(weights, excludedType) {
  const entries = Object.entries(weights).filter(([type, weight]) => type !== excludedType && weight > 0)
  if (entries.length === 0) return null
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const r = Math.random() * total
  let acc = 0
  for (const [type, weight] of entries) {
    acc += weight
    if (r <= acc) return type
  }
  return entries[0][0]
}

let _uid   = 0
let _textbookId = 0
let _coinId = 0
let _collapseId = 0
let _chestId = 0

// 15 = E07(웃는얼굴 좀비). 시뮬레이션은 다른 잡몹과 같은 풀을 쓰고, 몸통만
// ProceduralFaceZombieLayer가 그린다(ZombieInstanceLayer는 그림자/체력바/스폰연기만 담당).
const STANDARD_POOL_TYPE_MAX = 15
const MAX_SPECIAL_ENEMIES = 3
const MAX_RUNTIME_QUEUE = 256
const EMPTY_IMPACT = Object.freeze({})
const SCHEDULE_GOLD = 1
const SCHEDULE_DOGE = 2
const SCHEDULE_BURST = 5
const SCHEDULE_MATILDA = 6

export function isPooledEnemyType(type) {
  const code = enemyTypeToCode(type)
  // Boss meshes (including the current stage2-boss-v2 B02) are rendered by
  // Enemy/ZombieMesh. ZombieInstanceLayer intentionally has no boss body mesh.
  return code >= 1 && code <= STANDARD_POOL_TYPE_MAX && !isBossType(type)
}

export function shouldScheduleBurst(fired, elapsedSec, eventSec) {
  return !fired && elapsedSec >= eventSec
}

function countPooledType(type) {
  const code = enemyTypeToCode(type)
  let count = 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (enemyPool.active[index] && enemyPool.type[index] === code) count += 1
  }
  return count
}

function pushBounded(queue, value, cap = MAX_RUNTIME_QUEUE) {
  if (queue.length < cap) queue.push(value)
}


// 브라우저 없이도 풀 churn의 상한·이벤트 drop·투사체 상한을 검증하는 QA harness다.
export function runPooledEnemyRuntimeSoak(frames = 10_800) {
  const pool = createEnemyEntityPool()
  const runtime = createEnemySimulationRuntime()
  const projectiles = createEnemyProjectilePool()
  const hitQueue = createEnemyHitEventQueue()
  const handle = { index: -1, generation: 0 }
  const event = {}
  const hit = {}
  let spawnFailures = 0
  for (let frame = 0; frame < frames; frame += 1) {
    if (frame % 3 === 0) {
      if (!pool.spawnInto(handle, { type: frame % 24 === 0 ? 'E04' : 'E01', x: -8 + (frame % 16), y: 0, z: 8, hp: 8, maxHp: 8, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: 300 })) spawnFailures += 1
    }
    runtime.step(pool, { delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 12, halfZ: 12, elapsedSec: 100, activeProjectileCount: projectiles.activeCount, stageId: 'stage2', e04IntroSec: 72, bossPressure: false })
    while (runtime.events.drainInto(event)) {
      if (event.type === ENEMY_EVENT_RANGED_FIRE) projectiles.spawnInto(handle, event.x, event.y, event.z, event.value, event.aux)
    }
    // 실제 런타임과 동일한 bounded hit queue 경로를 반복한다. 화면 효과는 여기서 소비만 한다.
    if (frame % 2 === 0) hitQueue.push(pool.posX[Math.max(0, pool.nextActiveIndex())] || 0, 0.42, 0.95, 0, 8, false)
    while (hitQueue.drainInto(hit)) {}
    projectiles.step(1 / 60, -100, -100)
    let index = pool.nextActiveIndex()
    if (index >= 0 && frame % 2 === 0 && pool.getHandleInto(handle, index)) pool.despawn(handle)
    if (!pool.validateInvariants({ halfX: 12, halfZ: 12 })) return { ok: false, spawnFailures, active: pool.activeCount, liveProxy: pool.liveProxyCount, projectiles: projectiles.activeCount, eventDropped: runtime.events.dropped, hitDropped: hitQueue.dropped, enemyBodies: 0, dynamicSpecial: 0 }
  }
  return {
    ok: pool.activeCount <= MAX_ENEMIES && pool.liveProxyCount === pool.activeCount && projectiles.activeCount <= MAX_ENEMY_PROJECTILES && runtime.events.dropped === 0 && hitQueue.dropped === 0,
    spawnFailures, active: pool.activeCount, liveProxy: pool.liveProxyCount, projectiles: projectiles.activeCount,
    eventDropped: runtime.events.dropped, hitDropped: hitQueue.dropped, enemyBodies: 0, dynamicSpecial: 0,
  }
}

export default function Enemies() {
  // React/Rapier 는 보스와 마틸다(최대 3체)만 사용한다. E01~E06/RZ는 아래 pool 정본이다.
  const [specialEnemies, setSpecialEnemies] = useState([])
  const [textbooks, setTextbooks]   = useState([])
  const [goldCoins, setGoldCoins]   = useState([])
  const [collapses, setCollapses]   = useState([])
  const [doges, setDoges]           = useState([])
  const [chests, setChests]         = useState([])
  const enemiesRef                = useRef([])
  const runtimeQueueRef           = useRef({ specialRemovals: [], textbooks: [], gold: [], collapses: [], doges: [], chests: [], flushScheduled: false, raf: 0, scheduleKind: new Uint8Array(64), scheduleA: new Float32Array(64), scheduleB: new Float32Array(64), scheduleRead: 0, scheduleWrite: 0, scheduleCount: 0, processScheduled: null, matildaEntry: null, spawnDrain: createPooledEnemySpawnDrainQueue(), drainPooled: null, deathType: new Uint8Array(MAX_RUNTIME_QUEUE), deathX: new Float32Array(MAX_RUNTIME_QUEUE), deathY: new Float32Array(MAX_RUNTIME_QUEUE), deathZ: new Float32Array(MAX_RUNTIME_QUEUE), deathXp: new Float32Array(MAX_RUNTIME_QUEUE), deathScale: new Float32Array(MAX_RUNTIME_QUEUE), deathDamage: new Float32Array(MAX_RUNTIME_QUEUE), deathMaxHp: new Float32Array(MAX_RUNTIME_QUEUE), deathKnockback: new Float32Array(MAX_RUNTIME_QUEUE), deathStyle: new Uint8Array(MAX_RUNTIME_QUEUE), deathRead: 0, deathWrite: 0, deathCount: 0, hitQueue: createEnemyHitEventQueue(), hitScratch: {} })
  const runtimeEventScratchRef    = useRef({})
  const runtimeContextRef         = useRef({ delta: 0, playerX: 0, playerZ: 0, halfX: 1, halfZ: 1, elapsedSec: 0, activeProjectileCount: 0, stageId: 'stage1', e04IntroSec: 72, bossPressure: false, obstacles: null, obstacleCount: 0, sightBlocked: enemySightBlocked })
  const stageRuntimeCacheRef      = useRef(null)
  const projectileHitRef          = useRef(null)
  const firedBurstsRef            = useRef(new Uint8Array(64))
  const goldTimerRef              = useRef(nextGoldInterval())
  const dogeSpawnedRef           = useRef(false)     // 60초 도지 이벤트 1회 스폰 가드
  const stageSpawnTokenRef       = useRef(0)
  const sightGenerationRef       = useRef(new Uint16Array(MAX_ENEMIES))
  const sightTierRef             = useRef(new Uint8Array(MAX_ENEMIES))
  const sightFrameRef            = useRef(0)
  const matildaEntryRef          = useRef(null)

  const spawnBoss      = useGameStore((s) => s.spawnBoss)
  const matildaSpawned = useGameStore((s) => s.matildaSpawned)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const bossSpawnSec = useGameStore((s) => s.bossSpawnSec)
  const gameKey = useGameStore((s) => s.gameKey)
  const gamePhase = useGameStore((s) => s.phase)
  projectileHitRef.current = (_index, _generation, damage) => {
    useGameStore.getState().damagePlayer(damage)
  }

  // 스테이지 정적 데이터는 stage 전환시에만 해석한다. 프레임 경로는 이 캐시만 읽는다.
  useEffect(() => {
    const queue = runtimeQueueRef.current
    stageSpawnTokenRef.current = (stageSpawnTokenRef.current + 1) >>> 0 || 1
    resetPooledEnemySpawnDrainQueue(queue.spawnDrain)
    // resetGame이 같은 stageId로 다시 시작되는 경우에도 이전 RAF 요청을 폐기한다.
    queue.scheduleRead = 0
    queue.scheduleWrite = 0
    queue.scheduleCount = 0
    queue.matildaEntry = null
    const bounds = getStageBounds(currentStageId)
    stageRuntimeCacheRef.current = {
      id: currentStageId,
      gameKey,
      spawnToken: stageSpawnTokenRef.current,
      bounds,
      burstEvents: getRuntimeBurstEventsForStage(currentStageId),
      obstacles: getStageObjectSightObstacles(currentStageId),
      stageConfig: getStageConfig(currentStageId),
    }
    firedBurstsRef.current.fill(0)
    sightGenerationRef.current.fill(0)
    sightTierRef.current.fill(0)
    enemySightBlocked.fill(0)
    sightFrameRef.current = 0
  }, [currentStageId, gameKey])

  // 프레임 루프는 typed-array와 이 bounded queue만 바꾼다. React state는 다음 RAF에서 한 번만 flush한다.
  const scheduleRuntimeFlush = useCallback(() => {
    const queue = runtimeQueueRef.current
    if (queue.flushScheduled) return
    queue.flushScheduled = true
    queue.raf = requestAnimationFrame(() => {
      queue.flushScheduled = false
      // pause/gameover/clear에서는 예약된 버스트 및 pending drain을 소비하지 않는다.
      // 재개 시 프레임 루프가 남은 큐를 다시 소비한다.
      if (useGameStore.getState().phase !== 'playing') return
      while (queue.scheduleCount > 0) {
        const slot = queue.scheduleRead
        const kind = queue.scheduleKind[slot]
        const a = queue.scheduleA[slot]
        const b = queue.scheduleB[slot]
        queue.scheduleRead = (slot + 1) % queue.scheduleKind.length
        queue.scheduleCount -= 1
        queue.processScheduled?.(kind, a, b)
      }
      // 일반 풀 적만 1 RAF당 최대 3마리로 분산한다. 보스 React special은 즉시 경로를 유지한다.
      queue.drainPooled?.()
      while (queue.hitQueue.drainInto(queue.hitScratch)) {
        const hit = queue.hitScratch
        emitVfx(createEnemyHitSparkEvent({ x: hit.x, y: Math.max(0.34, hit.sparkY), z: hit.z }))
        emitDamageNumber({ x: hit.x, y: Math.max(0.8, hit.numberY), z: hit.z, amount: hit.amount, colorHex: hit.critical ? DAMAGE_NUMBER_COLORS.critical : DAMAGE_NUMBER_COLORS.enemy, isCritical: hit.critical })
      }
      while (queue.deathCount > 0) {
        const slot = queue.deathRead
        const type = enemyTypeFromCode(queue.deathType[slot])
        const pos = [queue.deathX[slot], queue.deathY[slot], queue.deathZ[slot]]
        const dropData = {
          pos, xp: queue.deathXp[slot], type, visualScale: queue.deathScale[slot],
          intensity: resolveCollapseIntensity({ killingDamage: queue.deathDamage[slot], maxHp: queue.deathMaxHp[slot], knockback: queue.deathKnockback[slot] }),
          styleOverride: queue.deathStyle[slot] === 1 ? 'shatter5' : undefined,
        }
        pushBounded(queue.collapses, createDeathCollapseEntry(++_collapseId, dropData), 12)
        const bonus = ELITE_BONUS[type]
        if (bonus) {
          const textbookXp = getEliteBonusTextbookXp(type, dropData.xp)
          for (let rewardIndex = 0; rewardIndex < bonus.textbook; rewardIndex += 1) pushBounded(queue.textbooks, { id: ++_textbookId, pos, value: textbookXp })
          for (let rewardIndex = 0; rewardIndex < bonus.gold; rewardIndex += 1) pushBounded(queue.gold, { id: ++_coinId, pos, value: 1 })
        } else if (shouldDropTextbook(dropData)) pushBounded(queue.textbooks, { id: ++_textbookId, pos, value: dropData.xp })
        queue.deathRead = (slot + 1) % MAX_RUNTIME_QUEUE
        queue.deathCount -= 1
      }
      if (queue.specialRemovals.length) {
        const removed = new Set(queue.specialRemovals.splice(0, queue.specialRemovals.length))
        enemiesRef.current = enemiesRef.current.filter((enemy) => !removed.has(enemy.id))
        setSpecialEnemies([...enemiesRef.current])
      }
      if (queue.textbooks.length) setTextbooks((prev) => [...prev, ...queue.textbooks.splice(0, queue.textbooks.length)])
      if (queue.gold.length) setGoldCoins((prev) => [...prev, ...queue.gold.splice(0, queue.gold.length)])
      if (queue.collapses.length) {
        setCollapses((prev) => [...prev, ...queue.collapses.splice(0, queue.collapses.length)].slice(-12))
      }
      if (queue.doges.length) setDoges((prev) => [...prev, ...queue.doges.splice(0, queue.doges.length)])
      if (queue.chests.length) setChests((prev) => [...prev, ...queue.chests.splice(0, queue.chests.length)])
      if (queue.scheduleCount > 0 || queue.spawnDrain.count > 0) scheduleRuntimeFlush()
    })
  }, [])

  // 정지 중의 RAF는 스폰을 소비하지 않는다. 재개 프레임부터 남은 항목을 다시 3마리씩 처리한다.
  useEffect(() => {
    const queue = runtimeQueueRef.current
    if (gamePhase === 'playing' && (queue.scheduleCount > 0 || queue.spawnDrain.count > 0)) scheduleRuntimeFlush()
  }, [gamePhase, scheduleRuntimeFlush])

  const enqueueScheduled = useCallback((kind, a = 0, b = 0) => {
    const queue = runtimeQueueRef.current
    if (queue.scheduleCount >= queue.scheduleKind.length) return false
    const slot = queue.scheduleWrite
    queue.scheduleKind[slot] = kind
    queue.scheduleA[slot] = a
    queue.scheduleB[slot] = b
    queue.scheduleWrite = (slot + 1) % queue.scheduleKind.length
    queue.scheduleCount += 1
    scheduleRuntimeFlush()
    return true
  }, [scheduleRuntimeFlush])

  const enqueuePooledDeath = useCallback((typeCode, x, y, z, xp, scale, damage, maxHp, knockback, styleOverride) => {
    const queue = runtimeQueueRef.current
    if (queue.deathCount >= MAX_RUNTIME_QUEUE) return false
    const slot = queue.deathWrite
    queue.deathType[slot] = typeCode
    queue.deathX[slot] = x; queue.deathY[slot] = y; queue.deathZ[slot] = z
    queue.deathXp[slot] = xp; queue.deathScale[slot] = scale
    queue.deathDamage[slot] = damage; queue.deathMaxHp[slot] = maxHp; queue.deathKnockback[slot] = knockback
    queue.deathStyle[slot] = styleOverride === 'shatter5' ? 1 : 0
    queue.deathWrite = (slot + 1) % MAX_RUNTIME_QUEUE
    queue.deathCount += 1
    scheduleRuntimeFlush()
    return true
  }, [scheduleRuntimeFlush])

  const enqueuePooledHit = useCallback((x, sparkY, numberY, z, amount, critical) => {
    const queue = runtimeQueueRef.current
    if (!queue.hitQueue.push(x, sparkY, numberY, z, amount, critical)) return false
    scheduleRuntimeFlush()
    return true
  }, [scheduleRuntimeFlush])

  const pooledHitBridgeRef = useRef(null)
  const pooledCriticalScratchRef = useRef({ damage: 0, isCritical: false })
  pooledHitBridgeRef.current = (index, generation, damage, impact) => {
    if (!enemyPool.isIndexGenerationAlive(index, generation)) return
    const safeImpact = impact || EMPTY_IMPACT
    const x = enemyPool.posX[index]; const y = enemyPool.posY[index]; const z = enemyPool.posZ[index]
    if (!safeImpact.ignoreSightBlock && isPlayerWeaponSightBlocked(enemyPool.proxies[index].translation(), useGameStore.getState().currentStageId)) return
    const type = enemyTypeFromCode(enemyPool.type[index])
    const stats = ENEMY_STATS[type] ?? ENEMY_STATS.E01
    const critical = resolveCriticalHitInto(pooledCriticalScratchRef.current, damage, safeImpact.canCrit, safeImpact.damageType, safeImpact.attackTags, safeImpact.critChance, safeImpact.critMultiplier)
    const maxHp = enemyPool.maxHp[index]
    const killed = enemyPool.hp[index] <= critical.damage
    const strongCritical = critical.isCritical && ((killed && isBossType(type)) || (Number.isFinite(maxHp) && maxHp > 0 && critical.damage >= maxHp * 0.25))
    if (critical.isCritical) emitSfx({ id: 'criticalHit', volume: strongCritical ? 0.9 : 0.76 })
    const screenShake = critical.isCritical ? emitCriticalHitScreenShake : emitEnemyHitScreenShake
    screenShake(
      x - playerPos.x,
      z - playerPos.z,
      critical.isCritical ? { strong: strongCritical } : undefined,
    )
    enqueuePooledHit(x, 0.42 * enemyPool.visualScale[index], 0.95 * enemyPool.visualScale[index], z, critical.damage, critical.isCritical)
    if (safeImpact.sfxId) emitSfx({ id: safeImpact.sfxId, volume: 0.6 })
    const knockbackSpeed = Number.isFinite(safeImpact.knockback) ? safeImpact.knockback : COMMON_ENEMY_HIT_KNOCKBACK.speed
    const knockbackMs = Number.isFinite(safeImpact.knockbackMs) ? safeImpact.knockbackMs : COMMON_ENEMY_HIT_KNOCKBACK.durationMs
    const sx = safeImpact.source?.x ?? playerPos.x; const sz = safeImpact.source?.z ?? playerPos.z
    const dx = x - sx; const dz = z - sz; const length = Math.hypot(dx, dz) || 1
    if (killed) {
      useGameStore.getState().recordKill(); logKill(type); emitSfx({ id: type === 'E06' || type === 'E02' ? 'zombieHeavyDeath' : 'zombieDeath' })
      enqueuePooledDeath(enemyPool.type[index], x, y, z, stats.xp, enemyPool.visualScale[index] * 0.333, critical.damage, enemyPool.maxHp[index], safeImpact.knockback ?? 0, safeImpact.deathStyleOverride)
    }
    enemySimulationRuntime.applyHitIndex(enemyPool, index, generation, critical.damage, dx / length * knockbackSpeed, dz / length * knockbackSpeed, knockbackMs)
  }

  useEffect(() => {
    const dispatch = (index, generation, damage, impact) => pooledHitBridgeRef.current?.(index, generation, damage, impact)
    enemyPool.setGlobalHitDispatcher(dispatch)
    return () => enemyPool.setGlobalHitDispatcher(null)
  }, [])

  useEffect(() => () => {
    const queue = runtimeQueueRef.current
    if (queue.raf) cancelAnimationFrame(queue.raf)
    resetPooledEnemySpawnDrainQueue(queue.spawnDrain)
    queue.scheduleRead = 0
    queue.scheduleWrite = 0
    queue.scheduleCount = 0
    queue.matildaEntry = null
  }, [])

  const enqueueTextbook = useCallback((pos, value) => {
    pushBounded(runtimeQueueRef.current.textbooks, { id: ++_textbookId, pos, value })
    scheduleRuntimeFlush()
  }, [scheduleRuntimeFlush])

  const enqueueGoldCoin = useCallback((pos, value = 1) => {
    pushBounded(runtimeQueueRef.current.gold, { id: ++_coinId, pos, value })
    scheduleRuntimeFlush()
  }, [scheduleRuntimeFlush])

  const spawnPooledEnemy = useCallback((entry) => {
    const stats = { ...(ENEMY_STATS[entry.type] ?? ENEMY_STATS.E01), ...(entry.statOverride ?? {}) }
    const pos = entry.pos ?? [0, 0, 0]
    const spawned = enemyPool.spawnInto(enemyHandleScratch, {
      type: entry.type,
      x: pos[0], y: pos[1], z: pos[2], hp: stats.hp, maxHp: stats.hp,
      visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER, runDirX: entry.runCrewDir?.x ?? 1, runDirZ: entry.runCrewDir?.z ?? 0,
    })
    if (spawned) recordZombieEncounter(entry.type)
    return spawned
  }, [])

  // stage/runtime token이 현재 store와 다르면 drain하지 않는다. stage effect가 큐를 비우기 전의
  // 한 RAF 사이에도 이전 스테이지 적이 새 run에 섞이지 않게 하는 2중 보호다.
  runtimeQueueRef.current.drainPooled = () => {
    const cache = stageRuntimeCacheRef.current
    const state = useGameStore.getState()
    if (!cache || cache.id !== state.currentStageId || cache.gameKey !== state.gameKey) return { consumed: 0, spawned: 0, remaining: runtimeQueueRef.current.spawnDrain.count }
    return drainPooledEnemySpawnQueue(runtimeQueueRef.current.spawnDrain, cache.spawnToken, spawnPooledEnemy)
  }

  const addEnemies = useCallback((newList, deferPooled = false, stageToken = stageSpawnTokenRef.current) => {
    let specialAdded = false
    for (let entryIndex = 0; entryIndex < newList.length; entryIndex += 1) {
      const entry = newList[entryIndex]
      if (!isPooledEnemyType(entry.type)) {
        // pooled numeric generation-id와 legacy special body key가 충돌하지 않도록 namespace를 분리한다.
        if (enemiesRef.current.length < MAX_SPECIAL_ENEMIES) {
          enemiesRef.current.push({ ...entry, id: `special-${entry.id}` })
          recordZombieEncounter(entry.type)
          specialAdded = true
        }
        continue
      }

      if (deferPooled) {
        enqueuePooledEnemySpawn(runtimeQueueRef.current.spawnDrain, entry, stageToken)
        continue
      }
      spawnPooledEnemy(entry)
    }
    if (specialAdded) setSpecialEnemies([...enemiesRef.current])
  }, [spawnPooledEnemy])


  // 마틸다 등장 대사를 읽는 동안에는 실체/AI를 만들지 않는다. 같은 run/stage가
  // 유지된 경우에만 5초 뒤(정확히 300초) 한 번 스폰하며 cleanup은 reset/stage/unmount stale 스폰을 막는다.
  useEffect(() => {
    if (!matildaSpawned) return
    const { matildaSec, matildaWarningSec } = getStageConfig(currentStageId)
    const entry = createMatildaEntryGrace({
      stageId: currentStageId,
      gameKey,
      delayMs: (matildaSec - matildaWarningSec) * 1000,
    })
    matildaEntryRef.current = entry
    return () => {
      cancelMatildaEntryGrace(entry)
      if (matildaEntryRef.current === entry) matildaEntryRef.current = null
    }
  }, [matildaSpawned, currentStageId, gameKey])

  const dropTextbook = useCallback((pos, value) => {
    enqueueTextbook(pos, value)
  }, [enqueueTextbook])

  const dropGoldCoin = useCallback((pos, value = 1) => {
    enqueueGoldCoin(pos, value)
  }, [enqueueGoldCoin])

  // ── 춤추는 도지 이벤트 ─────────────────────────────────────────────────────
  const spawnDoge = useCallback(() => {
    const stageId = useGameStore.getState().currentStageId
    const hp = dogeHpForStage(stageId)
    const bounds = getStageBounds(stageId)
    const dir = dogeEscapeDirection(DOGE_SPAWN_POS, bounds)
    pushBounded(runtimeQueueRef.current.doges, { id: ++_uid, pos: [...DOGE_SPAWN_POS], scale: DOGE_SCALE, hp, dir, bounds })
    scheduleRuntimeFlush()
  }, [scheduleRuntimeFlush])

  // scheduler는 RAF에서만 객체/배치를 만든다. usePlayingFrame은 scalar 요청만 기록한다.
  runtimeQueueRef.current.processScheduled = (kind, a, b) => {
    const queue = runtimeQueueRef.current
    const cache = stageRuntimeCacheRef.current
    const store = useGameStore.getState()
    if (!cache || cache.id !== store.currentStageId || cache.gameKey !== store.gameKey) return
    if (kind === SCHEDULE_GOLD) {
      dropGoldCoin(pickGoldDropPos(cache.bounds))
    } else if (kind === SCHEDULE_DOGE) {
      spawnDoge()
    } else if (kind === SCHEDULE_MATILDA) {
      const entry = queue.matildaEntry
      queue.matildaEntry = null
      if (!canSpawnMatildaEntry(entry, store)) return
      const player = store.player
      // 신 지정 사양(2026-08-09). 값을 clamp/보정하지 않는다.
      //  S1 즉사 — 몸에 닿으면 플레이어 능력과 무관하게 즉사. damage 스탯이 아니라
      //            Enemy.jsx가 useGameStore.killPlayer('matilda')를 직접 호출하는 경로라
      //            무적프레임도 관통한다. 그래서 여기에는 damage를 두지 않는다
      //            (두면 실제로는 아무도 읽지 않는 유령 값이 된다).
      //  S2 체력 — 쉬지 않고 30분을 때려야 하는 체력 = 스폰 시점 플레이어 DPS × 1800초.
      //  S3 기준 — 등장 순간에 1회 산출해 고정. 이후 플레이어가 더 강해져도 재계산하지 않는다.
      //
      // 남긴 필드는 전부 마틸다 경로에서 실제로 읽힌다:
      //  - scale: 아래 randomSpawnPos 인자 + 콜라이더/몸통 접촉 반extent(Enemy.jsx).
      //  - charger: Enemy.jsx의 돌진 AI 진입 게이트.
      //  - xp: 사망 처리에서 읽는다(B01도 0이지만 보상 없음을 명시적으로 고정).
      // 삭제한 speed/warnDist/warnDuration/stunDuration/chargeDuration/contactDist는
      // 마틸다 AI 분기가 한 번도 읽지 않는다(2026-08-09 감사에서 grep 재확인).
      const matildaStats = {
        hp:          matildaHpFromWeapons(store.weapons),
        scale:       ENEMY_STATS.B01.scale,
        charger:     true,
        chargeSpeed: player.speed * 2.8,
        xp: 0,
      }
      const spawnPos = randomSpawnPos('B01', cache.bounds, [], Math.random, cache.obstacles, matildaStats.scale)
      if (spawnPos) addEnemies([{ id: ++_uid, type: 'B01', pos: spawnPos, statOverride: matildaStats, isMatilda: true }])
    } else if (kind === SCHEDULE_BURST) {
      const evt = cache.burstEvents[Math.trunc(a)]
      if (!evt) return
      if (isBossType(evt.type)) {
        spawnBoss()
        const bossBatch = []
        const bossPos = randomSpawnPos(evt.type, cache.bounds, [], Math.random, cache.obstacles)
        if (bossPos) bossBatch.push({ id: ++_uid, type: evt.type, pos: bossPos, statOverride: stageHpOverride(evt.type, cache.id) })
        addEnemies(bossBatch, true, cache.spawnToken)
        return
      }
      if (evt.formation === RUN_ZOMBIE_CREW_FORMATION) {
        emitSfx({ id: 'rzlWhistle', volume: 0.5 })
        addEnemies(createRunZombieCrewEntries(cache.bounds, Math.random, cache.obstacles).map((entry) => ({ id: ++_uid, ...entry, statOverride: stageHpOverride(entry.type, cache.id) })), true, cache.spawnToken)
        return
      }
      if (evt.formation === STAGE2_GUARD_CHASE_FORMATION) {
        emitSfx({ id: 'stage2GuardWhistle', volume: 0.62 })
        addEnemies(createStage2GuardChaseEntries(cache.bounds, Math.random, screenBounds).map((entry) => ({ id: ++_uid, ...entry, statOverride: stageHpOverride(entry.type, cache.id) })), true, cache.spawnToken)
        return
      }
      const count = evt.count ?? 1
      const mixedTypes = evt.mixedTypes ? pickMixedReinforcementTypes(evt.mixedTypes, count, Math.random) : null
      const positions = evt.formation ? formationSpawnPositions(evt.formation, count, cache.bounds, { x: playerPos.x, z: playerPos.z }, Math.random, cache.obstacles, evt.type) : null
      const batch = []
      for (let spawnIndex = 0; spawnIndex < count; spawnIndex += 1) {
        const taken = batch.map((enemy) => enemy.pos)
        const type = mixedTypes ? mixedTypes[spawnIndex] : evt.type
        const pos = positions ? positions[spawnIndex] : spawnPosForBurstType(type, cache.bounds, taken, Math.random, cache.obstacles)
        if (!pos) continue
        batch.push({ id: ++_uid, type, pos, statOverride: stageHpOverride(type, cache.id) })
      }
      addEnemies(batch, true, cache.spawnToken)
    }
  }

  // 도지 처치 → 그 자리에 보물상자 드랍.
  const onDogeDeath = useCallback((dogeId, pos) => {
    setDoges((prev) => prev.filter((d) => d.id !== dogeId))
    emitSfx({ id: 'chestDrop', volume: 0.66, rate: 0.94 + Math.random() * 0.1 })
    setChests((prev) => [...prev, { id: ++_chestId, pos }])
  }, [])

  // 도지 도주 성공(경계 이탈) → 보상 없이 제거.
  const onDogeEscape = useCallback((dogeId) => {
    setDoges((prev) => prev.filter((d) => d.id !== dogeId))
  }, [])

  // 상자 오픈(드랍+1.5초) → 상자 제거 + 주변에 코인 잭팟 산포.
  const onChestOpen = useCallback((chestId, pos) => {
    setChests((prev) => prev.filter((c) => c.id !== chestId))
    for (const coinPos of dogeTreasureCoinPositions(pos)) dropGoldCoin(coinPos)
  }, [dropGoldCoin])

  const onDeath = useCallback((id, dropData) => {
    pushBounded(runtimeQueueRef.current.specialRemovals, id)
    if (!dropData?.pos) return

    pushBounded(runtimeQueueRef.current.collapses, createDeathCollapseEntry(++_collapseId, dropData), 12)

    const bonus = ELITE_BONUS[dropData.type]
    if (bonus) {
      const textbookXp = getEliteBonusTextbookXp(dropData.type, dropData.xp)
      for (let i = 0; i < bonus.textbook; i++) dropTextbook(dropData.pos, textbookXp)
      for (let i = 0; i < bonus.gold; i++)     dropGoldCoin(dropData.pos)
      return
    }

    if (shouldDropTextbook(dropData)) {
      dropTextbook(dropData.pos, dropData.xp)
    }
    scheduleRuntimeFlush()
  }, [dropTextbook, dropGoldCoin, scheduleRuntimeFlush])

  const onCollapseDone   = useCallback((id) => {
    setCollapses((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const onTextbookCollect = useCallback((id) => {
    setTextbooks((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const onCoinCollect = useCallback((id) => {
    setGoldCoins((prev) => prev.filter((o) => o.id !== id))
  }, [])

  usePlayingFrame((_, delta) => {
    const matildaEntry = matildaEntryRef.current
    if (advanceMatildaEntryGrace(matildaEntry, delta)) {
      runtimeQueueRef.current.matildaEntry = matildaEntry
      enqueueScheduled(SCHEDULE_MATILDA)
    }

    const sec = getRuntimeElapsedMs(useGameStore.getState().elapsedMs) / 1000
    const stageRuntime = stageRuntimeCacheRef.current
    if (!stageRuntime || stageRuntime.id !== currentStageId) return
    const bounds = stageRuntime.bounds
    // 표준 적은 React/Rapier가 아닌 하나의 풀 step만 수행한다. 시야/장애물 배열은 stage 캐시를 그대로 쓴다.
    const obstacles = stageRuntime.obstacles
    const sightGeneration = sightGenerationRef.current
    const sightTiers = sightTierRef.current
    const sightFrame = sightFrameRef.current = (sightFrameRef.current + 1) % 12
    for (let index = 0; index <= enemyPool.highestActive; index += 1) {
      if (!enemyPool.active[index]) { sightGeneration[index] = 0; sightTiers[index] = 0; enemySightBlocked[index] = 0; continue }
      const tier = getPooledEnemyRenderTier(screenBounds, enemyPool.posX[index], enemyPool.posZ[index], playerPos.x, playerPos.z, sightTiers[index])
      sightTiers[index] = tier
      const generation = enemyPool.generation[index]
      if (!shouldRefreshEnemySight(tier, index, sightFrame, sightGeneration[index], generation)) continue
      const proxy = enemyPool.proxies[index]
      enemySightBlocked[index] = isStageObjectEnemyTrackingBlocked(proxy.translation(), playerPos, obstacles) ? 1 : 0
      sightGeneration[index] = generation
    }
    const stageConfig = stageRuntime.stageConfig
    const context = runtimeContextRef.current
    context.delta = delta
    context.playerX = playerPos.x
    context.playerZ = playerPos.z
    context.halfX = bounds.halfX
    context.halfZ = bounds.halfZ
    context.elapsedSec = sec
    context.activeProjectileCount = enemyProjectilePool.activeCount
    context.stageId = currentStageId
    context.e04IntroSec = getE04IntroSec(currentStageId)
    context.bossPressure = currentStageId !== 'stage4' && sec >= bossSpawnSec && sec < (stageConfig.escapePortalSec ?? 210)
    context.obstacles = obstacles
    context.obstacleCount = obstacles.length
    enemySimulationRuntime.step(enemyPool, context)
    const runtimeEvent = runtimeEventScratchRef.current
    while (enemySimulationRuntime.events.drainInto(runtimeEvent)) {
      if (runtimeEvent.type === ENEMY_EVENT_CONTACT) {
        useGameStore.getState().damagePlayer(runtimeEvent.value)
      } else if (runtimeEvent.type === ENEMY_EVENT_RANGED_FIRE) {
        enemyProjectilePool.spawnInto(enemyHandleScratch, runtimeEvent.x, runtimeEvent.y, runtimeEvent.z, runtimeEvent.value, runtimeEvent.aux)
      } else if (runtimeEvent.type === ENEMY_EVENT_DEATH || runtimeEvent.type === ENEMY_EVENT_DESPAWN || runtimeEvent.type === ENEMY_EVENT_ERROR) {
        // death 보상은 generation-보호 hit handler에서 despawn 전에 확정한다. 탈주/오류는 보상 없음.
      }
    }
    enemyProjectilePool.step(delta, playerPos.x, playerPos.z, projectileHitRef.current)

    goldTimerRef.current -= delta * 1000
    if (goldTimerRef.current <= 0) {
      enqueueScheduled(SCHEDULE_GOLD)
      goldTimerRef.current = nextGoldInterval()
    }

    // 춤추는 도지 이벤트 — 모든 스테이지 60초 시점에 중앙에서 1회 스폰(스폰 펑 연출 경유).
    if (shouldSpawnDoge(sec, dogeSpawnedRef.current)) {
      dogeSpawnedRef.current = true
      enqueueScheduled(SCHEDULE_DOGE)
    }

    // 버스트 스케줄 발화.
    // 모든 일반 좀비와 보스는 명시 BURST_EVENTS/STAGE2/3/4_BURST_EVENTS에서만 발화한다.
    // 20~40초 랜덤 웨이브, 중간 보강, 보스 호위 자동 웨이브는 런타임에서 발화하지 않는다.
    const burstEvents = stageRuntime.burstEvents
    for (let burstIndex = 0; burstIndex < burstEvents.length; burstIndex += 1) {
      const evt = burstEvents[burstIndex]
      if (!shouldScheduleBurst(firedBurstsRef.current[burstIndex], sec, evt.sec)) continue
      firedBurstsRef.current[burstIndex] = 1
      enqueueScheduled(SCHEDULE_BURST, burstIndex, sec)
    }

  })

  return (
    <>
      {specialEnemies.map((e) => (
        <Enemy key={e.id} id={e.id} type={e.type} spawnPos={e.pos} onDeath={onDeath} statOverride={e.statOverride} isMatilda={e.isMatilda} runCrewDir={e.runCrewDir} />
      ))}
      {textbooks.map((d) => (
        <XpTextbook key={d.id} id={d.id} pos={d.pos} value={d.value} onCollect={onTextbookCollect} />
      ))}
      {goldCoins.map((c) => (
        <GoldCoin key={c.id} id={c.id} pos={c.pos} value={c.value} onCollect={onCoinCollect} />
      ))}
      {collapses.map((c) => (
        <EnemyDeathCollapse key={c.id} {...c} onDone={onCollapseDone} />
      ))}
      {doges.map((d) => (
        <DancingDogeEvent key={d.id} id={d.id} position={d.pos} scale={d.scale} hp={d.hp}
          escapeDir={d.dir} bounds={d.bounds} onDeath={onDogeDeath} onEscape={onDogeEscape} />
      ))}
      {chests.map((c) => (
        <TreasureChest key={c.id} id={c.id} position={c.pos} onOpen={onChestOpen} />
      ))}
    </>
  )
}
