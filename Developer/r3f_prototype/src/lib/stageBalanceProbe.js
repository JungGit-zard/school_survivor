// 스테이지 초반 밸런스 측정용 헤드리스 자동 플레이 루프.
//
// gameplaySoak.js와 목적이 다르다. 소크는 "무너지지 않는가"를 보므로 플레이어를 죽지 않게
// 붙잡아 두지만, 여기서는 **죽는 시각 자체가 측정값**이다. 따라서 HP 바닥을 두지 않는다.
//
// 정본 재사용: 웨이브 테이블·스폰 좌표·적 시뮬레이션·접촉 판정·XP 회수 반경·무기 수치를
// 전부 실제 모듈에서 읽는다. 복제한 것은 프레임 루프 배선과 "플레이어가 어떻게 움직이는가"뿐이다.
import {
  enemyPool,
  enemySightBlocked,
  enemySimulationRuntime,
  playerPos,
  resetRuntimeRefs,
} from './refs.js'
import {
  ENEMY_EVENT_CONTACT,
  ENEMY_RUNTIME_DAMAGE,
  ENEMY_RUNTIME_XP,
  ENEMY_SIZE_MULTIPLIER,
} from './enemySimulation.js'
import {
  createPooledEnemySpawnDrainQueue,
  drainPooledEnemySpawnQueue,
  enqueuePooledEnemySpawn,
} from './pooledEnemySpawnDrain.js'
import { getStageBounds } from './stageConfig.js'
import { clampPlayerPosition } from './playerMovementBounds.js'
import { getE04IntroSec } from './stage2ProjectileRules.js'
import { COLLECT_RADIUS_SQ } from './pickup.js'
import { XP_TO_NEXT_START, nextXpThreshold } from './xpCurve.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
import {
  getWavePhasesForStage,
  nextWaveTimeForStage,
  pickTypeByWeightExcluding,
  randomSpawnPos,
  stageHpOverride,
  waveSizeForStageAtTime,
} from '../components/Enemies.jsx'
import { ENEMY_STATS } from '../components/Enemy.jsx'

const FRAME_DELTA = 1 / 60
const PLAYER_MAX_HP = 100
const PLAYER_SPEED = 3
const INVULNERABLE_MS = 520
const CONTACT_COOLDOWN_GRACE = 0 // 접촉 쿨다운은 시뮬레이션이 이미 관리한다

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

function phaseAtTime(phases, time) {
  let selected = phases[0]
  for (let index = 0; index < phases.length; index += 1) {
    if (time < phases[index].start) break
    selected = phases[index]
  }
  return selected
}

// 플레이어 조작 정책: 가까운 적들의 반대 방향으로 도망치되(카이팅), 경계에 몰리면
// 벽을 따라 미끄러진다. 실제 플레이어의 기본 생존 행동을 근사한다.
function resolveFleeDirection(out, threatRadius) {
  let sumX = 0
  let sumZ = 0
  let count = 0
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const dx = playerPos.x - enemyPool.posX[index]
    const dz = playerPos.z - enemyPool.posZ[index]
    const distSq = dx * dx + dz * dz
    if (distSq > threatRadius * threatRadius || distSq < 1e-8) continue
    const weight = 1 / distSq // 가까울수록 강하게 밀어낸다
    sumX += dx * weight
    sumZ += dz * weight
    count += 1
  }
  if (count === 0) {
    out.x = 0
    out.z = 0
    return false
  }
  const length = Math.hypot(sumX, sumZ) || 1
  out.x = sumX / length
  out.z = sumZ / length
  return true
}

function nearestEnemyInRange(range) {
  let bestIndex = -1
  let bestDistSq = range * range
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const dx = enemyPool.posX[index] - playerPos.x
    const dz = enemyPool.posZ[index] - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      bestIndex = index
    }
  }
  return bestIndex
}

// 연필: 쿨다운마다 사거리 안 최근접 적을 향해 발사하고 pierce 수만큼 관통한다.
// 투사체 비행을 프레임 단위로 재현하는 대신, 발사 축 위 pierce명에게 즉시 적용한다.
// 초반 밸런스(처치 속도) 측정에는 비행 시간보다 발사 간격·관통 수가 지배적이다.
function firePencil(weapon, stats, onKill) {
  const targetIndex = nearestEnemyInRange(weapon.range)
  if (targetIndex < 0) return
  const dirX = enemyPool.posX[targetIndex] - playerPos.x
  const dirZ = enemyPool.posZ[targetIndex] - playerPos.z
  const length = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / length
  const nz = dirZ / length

  const hits = []
  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const dx = enemyPool.posX[index] - playerPos.x
    const dz = enemyPool.posZ[index] - playerPos.z
    const forward = dx * nx + dz * nz
    if (forward < 0 || forward > weapon.range) continue
    const lateral = Math.abs(dx * nz - dz * nx)
    if (lateral > 0.28 * ENEMY_SIZE_MULTIPLIER) continue
    hits.push({ index, forward })
  }
  hits.sort((a, b) => a.forward - b.forward)
  for (let hit = 0; hit < Math.min(weapon.pierce, hits.length); hit += 1) {
    const index = hits[hit].index
    const generation = enemyPool.generation[index]
    // 실제 게임(pooledHitBridge)과 같은 순서: 데미지 적용 전에 처치 여부와 보상을 확정한다.
    // applyHitIndex가 죽이면 슬롯이 즉시 반납되어 type/좌표를 더는 읽을 수 없다.
    const killed = enemyPool.hp[index] <= weapon.damage
    if (killed) {
      onKill(enemyPool.type[index], enemyPool.posX[index], enemyPool.posZ[index])
    }
    enemySimulationRuntime.applyHitIndex(enemyPool, index, generation, weapon.damage, 0, 0, 0)
    stats.shotsHit += 1
  }
  stats.shotsFired += 1
}

/**
 * 한 판을 사망 또는 시간 초과까지 시뮬레이션한다.
 * @returns {{survivedSec:number, died:boolean, firstLevelUpSec:number|null, level:number, kills:number, xpCollected:number}}
 */
export function runStageBalanceRun({
  stageId = 'stage2',
  seed = 1,
  maxSec = 240,
  // 변경 전/후를 같은 하네스로 비교하기 위한 오버라이드. 미지정이면 현재 정본 수치를 쓴다.
  weaponOverride = null,
  collectRadiusSq = COLLECT_RADIUS_SQ,
  // XP 곡선도 같은 이유의 A/B 오버라이드. 미지정이면 xpCurve.js 정본을 그대로 쓴다 —
  // 여기에 리터럴 곡선을 복제하면 프로브가 옛 곡선으로 돌면서 거짓 합격을 낸다.
  xpCurveOverride = null,
  // 적 XP 보상 A/B 오버라이드. { [typeCode]: value } 형태로 ENEMY_RUNTIME_XP를 덮는다.
  enemyXpOverride = null,
  // XP 페이싱 전용 측정 모드. 기본(false)은 "죽는 시각이 측정값"이라는 이 프로브의 원칙 그대로다.
  // 다만 카이팅 AI는 40~60초에 죽으므로 그 상태로는 240초 레벨 곡선을 잴 수 없다.
  // true면 접촉 피해만 무시해 maxSec까지 완주시키고, XP 획득 페이스 자체를 측정한다.
  // 생존 시간 측정에는 절대 쓰지 말 것.
  ignoreContactDamage = false,
} = {}) {
  // 스테이지 정적 데이터는 시드 RNG를 걸기 **전에** 만든다.
  // getStageObjectSightObstacles는 모듈 레벨 Map으로 메모이즈되므로, 시드 RNG 안에서 처음 호출하면
  // 그 프로세스의 첫 판만 캐시 생성 비용만큼 난수를 더 소비하고 2번째 판부터는 소비하지 않는다.
  // 그러면 같은 시드인데도 판마다 결과가 달라져(실측: 같은 config 4회 반복이 kills 26/24/23/28)
  // A/B 비교가 통째로 무의미해진다. 순서 자체가 결정론의 조건이다.
  const stats = { shotsFired: 0, shotsHit: 0 }
  const spawnDrain = createPooledEnemySpawnDrainQueue()
  const bounds = getStageBounds(stageId)
  const obstacles = getStageObjectSightObstacles(stageId)
  const phases = getWavePhasesForStage(stageId)
  const lastEnd = phases.at(-1)?.end ?? 0
  const weapon = { ...WEAPON_CATALOG.pencilThrow.base, ...(weaponOverride ?? {}) }

  const baseRandom = mulberry32(seed)
  let randomDraws = 0
  const random = () => { randomDraws += 1; return baseRandom() }
  const originalRandom = Math.random
  Math.random = random

  const context = {
    delta: FRAME_DELTA,
    playerX: 0,
    playerZ: 0,
    halfX: bounds.halfX,
    halfZ: bounds.halfZ,
    elapsedSec: 0,
    activeProjectileCount: 0,
    stageId,
    e04IntroSec: getE04IntroSec(stageId),
    bossPressure: false,
    obstacles,
    obstacleCount: obstacles.length,
    sightBlocked: enemySightBlocked,
  }

  resetRuntimeRefs()

  let hp = PLAYER_MAX_HP
  let invulnerableMs = 0
  let level = 1
  let xp = 0
  const curveStart = xpCurveOverride ? xpCurveOverride.start : XP_TO_NEXT_START
  const curveNext = xpCurveOverride ? xpCurveOverride.next : nextXpThreshold
  let xpToNext = curveStart
  let firstLevelUpSec = null
  let kills = 0
  let xpCollected = 0
  let nextWaveTime = 0
  let lastFiredMs = -Infinity
  const orbs = [] // { x, z, type, value }
  // XP를 "언제 어떤 타입에서" 주웠는지의 원본 기록. 곡선/보상값 후보를 비교할 때
  // 이 타임라인 하나에 여러 곡선을 대입하면 시뮬레이션 노이즈 없이 곡선만 비교할 수 있다.
  const xpTimeline = []
  const flee = { x: 0, z: 0 }
  const event = {}
  const spawnToken = 1
  const totalFrames = Math.round(maxSec / FRAME_DELTA)
  let survivedFrames = 0
  let died = false

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const sec = frame * FRAME_DELTA
      const nowMs = sec * 1000

      // 1) 웨이브 — 실제 스케줄러·마릿수·타입·좌표
      while (nextWaveTime < lastEnd && sec >= nextWaveTime) {
        const waveTime = nextWaveTime
        nextWaveTime = nextWaveTimeForStage(waveTime, stageId)
        const phase = phaseAtTime(phases, waveTime)
        const size = waveSizeForStageAtTime(phase, stageId, waveTime)
        const taken = []
        for (let slot = 0; slot < size; slot += 1) {
          const type = pickTypeByWeightExcluding(phase.weights, null)
          if (!type) continue
          const pos = randomSpawnPos(type, bounds, taken, Math.random, obstacles)
          if (!pos) continue
          taken.push(pos)
          enqueuePooledEnemySpawn(spawnDrain, { type, pos, statOverride: stageHpOverride(type, stageId) }, spawnToken)
        }
      }
      drainPooledEnemySpawnQueue(spawnDrain, spawnToken, (entry) => {
        const enemyStats = { ...(ENEMY_STATS[entry.type] ?? ENEMY_STATS.E01), ...(entry.statOverride ?? {}) }
        return enemyPool.spawnInto({ index: -1, generation: 0 }, {
          type: entry.type,
          x: entry.pos[0],
          y: entry.pos[1],
          z: entry.pos[2],
          hp: enemyStats.hp,
          maxHp: enemyStats.hp,
          visualScale: enemyStats.scale * ENEMY_SIZE_MULTIPLIER,
        })
      })

      // 2) 이동 — 카이팅
      if (resolveFleeDirection(flee, 3.5)) {
        const clamped = clampPlayerPosition(stageId, {
          x: playerPos.x + flee.x * PLAYER_SPEED * FRAME_DELTA,
          z: playerPos.z + flee.z * PLAYER_SPEED * FRAME_DELTA,
        })
        playerPos.set(clamped.x, 0, clamped.z)
      }

      // 3) 적 시뮬레이션
      context.playerX = playerPos.x
      context.playerZ = playerPos.z
      context.elapsedSec = sec
      enemySimulationRuntime.step(enemyPool, context)

      while (enemySimulationRuntime.events.drainInto(event)) {
        if (event.type === ENEMY_EVENT_CONTACT) {
          if (invulnerableMs <= CONTACT_COOLDOWN_GRACE) {
            if (!ignoreContactDamage) hp -= event.value
            invulnerableMs = INVULNERABLE_MS
          }
        }
      }
      invulnerableMs = Math.max(0, invulnerableMs - FRAME_DELTA * 1000)

      // 4) 무기 발사
      if (nowMs - lastFiredMs >= weapon.cooldown) {
        lastFiredMs = nowMs
        firePencil(weapon, stats, (type, x, z) => {
          kills += 1
          orbs.push({ x, z, type, value: enemyXpOverride?.[type] ?? ENEMY_RUNTIME_XP[type] })
        })
      }

      // 5) XP 회수 — 실제 COLLECT_RADIUS_SQ
      for (let index = orbs.length - 1; index >= 0; index -= 1) {
        const dx = playerPos.x - orbs[index].x
        const dz = playerPos.z - orbs[index].z
        if (dx * dx + dz * dz >= collectRadiusSq) continue
        xp += orbs[index].value
        xpCollected += 1
        xpTimeline.push({ sec: Math.round(sec * 100) / 100, type: orbs[index].type })
        orbs.splice(index, 1)
        while (xp >= xpToNext) {
          xp -= xpToNext
          level += 1
          xpToNext = curveNext(xpToNext)
          if (firstLevelUpSec === null) firstLevelUpSec = sec
        }
      }

      survivedFrames = frame + 1
      if (hp <= 0) {
        died = true
        break
      }
    }
  } finally {
    Math.random = originalRandom
    resetRuntimeRefs()
  }

  return {
    survivedSec: Math.round((survivedFrames * FRAME_DELTA) * 10) / 10,
    died,
    firstLevelUpSec: firstLevelUpSec === null ? null : Math.round(firstLevelUpSec * 10) / 10,
    level,
    kills,
    xpCollected,
    accuracy: stats.shotsFired ? Math.round((stats.shotsHit / stats.shotsFired) * 100) / 100 : 0,
    // 결정론 회귀 감시용. 같은 시드/같은 config면 이 값이 반드시 같아야 한다.
    randomDraws,
    xpTimeline,
  }
}

export function summarizeRuns(runs) {
  const times = runs.map((r) => r.survivedSec).sort((a, b) => a - b)
  const mid = Math.floor(times.length / 2)
  const median = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2
  const mean = times.reduce((sum, t) => sum + t, 0) / times.length
  const variance = times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / times.length
  const levelUps = runs.map((r) => r.firstLevelUpSec).filter((v) => v !== null)
  return {
    runs: runs.length,
    medianSurvivalSec: Math.round(median * 10) / 10,
    meanSurvivalSec: Math.round(mean * 10) / 10,
    stdDevSec: Math.round(Math.sqrt(variance) * 10) / 10,
    minSec: times[0],
    maxSec: times[times.length - 1],
    deathsUnder30Pct: Math.round((runs.filter((r) => r.died && r.survivedSec < 30).length / runs.length) * 100),
    medianFirstLevelUpSec: levelUps.length
      ? levelUps.sort((a, b) => a - b)[Math.floor(levelUps.length / 2)]
      : null,
    neverLeveledUp: runs.length - levelUps.length,
  }
}
