import { useRef, useCallback, useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos, enemyBodies } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'
import { getE04Cap } from '../lib/stage2ProjectileRules.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { getDefaultWavePhases } from '../lib/waveTimelines.js'
import { getBurstEventsForStage, getRuntimeBurstEventsForStage } from '../lib/burstEvents.js'
import { buildWavePhasesFromEntries } from '../lib/waveControl.js'
import { getAdminWaveControlConfig } from '../lib/adminConfig.js'

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

function hasSpawnGap(pos, taken) {
  const minGapSq = SPAWN_BATCH_MIN_GAP * SPAWN_BATCH_MIN_GAP
  return taken.every((other) => {
    const dx = pos[0] - other[0]
    const dz = pos[2] - other[2]
    return dx * dx + dz * dz >= minGapSq
  }) && !formsSpawnLine(pos, taken)
}

function formsSpawnLine(pos, taken) {
  for (let i = 0; i < taken.length; i++) {
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

function breakSpawnLineFallback(pos, bounds, taken) {
  if (hasSpawnGap(pos, taken)) return pos
  for (const [dx, dz] of SPAWN_FALLBACK_OFFSETS) {
    const candidate = [pos[0] + dx, pos[1], pos[2] + dz]
    if (isInsideSpawnBounds(candidate[0], candidate[2], bounds) && hasSpawnGap(candidate, taken)) {
      return candidate
    }
  }
  return pos
}

function randomPointOnSpawnRing(minRadius, maxRadius, random = Math.random) {
  const angle = random() * Math.PI * 2
  const radius = minRadius + random() * (maxRadius - minRadius)
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  }
}

function spawnPosOnValidRing(type, bounds, minRadius, maxRadius, taken = [], random = Math.random) {
  const stats = ENEMY_STATS[type]
  const y     = BASE_COL_Y * (stats?.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  let fallback = null
  for (let i = 0; i < SPAWN_CANDIDATE_TRIES; i++) {
    const offset = randomPointOnSpawnRing(minRadius, maxRadius, random)
    const pos = [playerPos.x + offset.x, y, playerPos.z + offset.z]
    if (!isInsideSpawnBounds(pos[0], pos[2], bounds)) continue
    fallback ??= pos
    if (hasSpawnGap(pos, taken)) return pos
  }
  if (fallback) return breakSpawnLineFallback(fallback, bounds, taken)
  const offset = randomPointOnSpawnRing(minRadius, maxRadius, random)
  const [x, z] = clampToBounds(playerPos.x + offset.x, playerPos.z + offset.z, bounds)
  return breakSpawnLineFallback([x, y, z], bounds, taken)
}

export function randomSpawnPos(type, bounds, taken = [], random = Math.random) {
  return spawnPosOnValidRing(type, bounds, SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS, taken, random)
}

// E04는 화면 가장자리 원거리 위치에서 등장한다. 1스테이지에서는 현재 사용하지 않는다.
function rangedSpawnPos(bounds, taken = [], random = Math.random) {
  return spawnPosOnValidRing('E04', bounds, RANGED_SPAWN_MIN_RADIUS, RANGED_SPAWN_MAX_RADIUS, taken, random)
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

export function formationSpawnPositions(formation, count, bounds, player, random = Math.random) {
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
    positions.push([px, FORMATION_Y, pz])
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
// 웨이브마다 해당 시각 활성 phase의 좀비를 한 번에 스폰한다(intra-wave stagger 없음).
// 첫 웨이브는 t=0, 이후 각 웨이브는 직전 발화 + 20~40초 균등분포 랜덤 간격(평균 30초).
export const WAVE_INTERVAL_SEC = 30        // 평균(중심) 간격 — 참고용
export const WAVE_INTERVAL_MIN_SEC = 20
export const WAVE_INTERVAL_MAX_SEC = 40
const WAVE_SIZE_FACTOR = 0.5

// 웨이브당 마릿수 = 활성 phase target × 0.5 (반올림, 최소 1 보장).
export function waveSizeForPhase(phase) {
  return Math.max(1, Math.round((phase?.target ?? 0) * WAVE_SIZE_FACTOR))
}

export function waveSizeForStageAtTime(phase, stageId, waveTime) {
  const size = waveSizeForPhase(phase)
  return stageId === 'stage2' && (waveTime === 0 || waveTime === 30) ? size * 3 : size
}

// 다음 웨이브까지 간격 = 20~40초 균등분포 랜덤. random 주입으로 테스트 결정성 확보.
export function nextWaveInterval(random = Math.random) {
  return WAVE_INTERVAL_MIN_SEC + random() * (WAVE_INTERVAL_MAX_SEC - WAVE_INTERVAL_MIN_SEC)
}

export function nextWaveTimeForStage(waveTime, stageId, random = Math.random) {
  if (stageId === 'stage2' && waveTime === 0) return 30
  return waveTime + nextWaveInterval(random)
}

// 웨이브 발화 시각 목록 = 0에서 시작, 각 웨이브 후 20~40초 랜덤 간격 누적, 마지막 phase.end 미만까지.
// 프레임 스케줄러(nextWaveTimeRef)와 동일한 논리의 순수 함수 — 테스트/미리보기용.
export function getWaveSpawnSeconds(phases, random = Math.random, stageId = 'stage1') {
  const lastEnd = phases?.[phases.length - 1]?.end ?? 0
  const secs = []
  let t = 0
  while (t < lastEnd) {
    secs.push(t)
    t = nextWaveTimeForStage(t, stageId, random)
  }
  return secs
}

// stage2 총체력 완화(2026-07-11): stage2에서 스폰되는 모든 전투 적(잡몹 E01~E06 + 보스 B02) HP ×0.8(반올림).
// stage1은 변화 없음. 마틸다(탈출 추격자)는 별도 동적 statOverride를 쓰므로 여기 대상 아님.
export function stage2HpOverride(type, stageId) {
  if (stageId !== 'stage2') return undefined
  const base = ENEMY_STATS[type]
  if (!base) return undefined
  return { hp: Math.round(base.hp * 0.8) }
}

function pickTypeByWeight(weights) {
  const r = Math.random()
  let acc = 0
  for (const [type, w] of Object.entries(weights)) {
    acc += w
    if (r <= acc) return type
  }
  return Object.keys(weights)[0]
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

export default function Enemies() {
  const [enemies, setEnemies]       = useState([])
  const [textbooks, setTextbooks]   = useState([])
  const [goldCoins, setGoldCoins]   = useState([])
  const [collapses, setCollapses]   = useState([])
  const enemiesRef                = useRef([])
  const firedBurstsRef            = useRef(new Set())
  const nextWaveTimeRef          = useRef(0)
  const goldTimerRef              = useRef(nextGoldInterval())

  const spawnBoss      = useGameStore((s) => s.spawnBoss)
  const matildaSpawned = useGameStore((s) => s.matildaSpawned)
  const currentStageId = useGameStore((s) => s.currentStageId)

  const addEnemies = useCallback((newList) => {
    enemiesRef.current.push(...newList)
    setEnemies([...enemiesRef.current])
  }, [])

  // 마틸다 스폰 — matildaSpawned가 true로 바뀌는 순간 1회만 실행
  useEffect(() => {
    if (!matildaSpawned) return
    const bounds = getStageBounds(currentStageId)
    const player = useGameStore.getState().player
    // 플레이어 능력치 기준 동적 스탯: 이동속도 ×1.4, 나머지 ×3
    const matildaStats = {
      hp:          player.maxHp * 3,
      speed:       player.speed * 1.4,
      damage:      player.maxHp * 3,   // 3배 공격력 = 플레이어 최대 체력 3배로 즉사 수준
      scale:       3.0,
      contactDist: 0.36,
      charger:     true,
      chargeSpeed: player.speed * 2.8,
      warnDist:    6.0,
      warnDuration:    400,
      stunDuration:    800,
      chargeDuration: 1500,
      xp: 0,
    }
    // 플레이어 근처 랜덤 스폰
    const spawnPos = randomSpawnPos('B01', bounds)
    addEnemies([{ id: ++_uid, type: 'B01', pos: spawnPos, statOverride: matildaStats, isMatilda: true }])
  }, [matildaSpawned, currentStageId, addEnemies])

  const dropTextbook = useCallback((pos, value) => {
    setTextbooks((prev) => [...prev, { id: ++_textbookId, pos, value }])
  }, [])

  const dropGoldCoin = useCallback((pos, value = 1) => {
    setGoldCoins((prev) => [...prev, { id: ++_coinId, pos, value }])
  }, [])

  const onDeath = useCallback((id, dropData) => {
    enemiesRef.current = enemiesRef.current.filter((e) => e.id !== id)
    setEnemies([...enemiesRef.current])
    if (!dropData?.pos) return

    setCollapses((prev) => {
      const next = [...prev, createDeathCollapseEntry(++_collapseId, dropData)]
      return next.length > 12 ? next.slice(next.length - 12) : next
    })

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
  }, [dropTextbook, dropGoldCoin])

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
    const sec = useGameStore.getState().elapsedMs / 1000
    const bounds = getStageBounds(currentStageId)

    goldTimerRef.current -= delta * 1000
    if (goldTimerRef.current <= 0) {
      dropGoldCoin(pickGoldDropPos(bounds))
      goldTimerRef.current = nextGoldInterval()
    }

    // 버스트 스케줄 발화.
    // - stage1/stage2: 보스 등장만(getRuntimeBurstEventsForStage가 보스만 반환) — 거동 불변.
    // - stage3: 더블 보스(스태거) + 형태(formation) 포위 + 조기 등장 그룹을 모두 발화한다.
    // 좀비 물량 본류는 20~40초 랜덤 간격 웨이브 스케줄러가 전담한다.
    const burstEvents = getRuntimeBurstEventsForStage(currentStageId)
    burstEvents.forEach((evt, idx) => {
      if (firedBurstsRef.current.has(idx)) return
      if (sec < evt.sec) return
      firedBurstsRef.current.add(idx)

      // 보스 버스트(B01/B02) — 각 이벤트가 1회씩 스폰. 더블 보스는 두 이벤트가 스태거로 각각 발화한다.
      // (bossSpawned 가드 제거: 두 번째 보스가 막히지 않도록. 1회성은 firedBurstsRef가 보장.)
      if (evt.type === 'B01' || evt.type === 'B02' || evt.type === 'B03') {
        spawnBoss()
        addEnemies([{ id: ++_uid, type: evt.type, pos: randomSpawnPos(evt.type, bounds), statOverride: stage2HpOverride(evt.type, currentStageId) }])
        return
      }

      // 비-보스 버스트(형태/그룹) — stage3에서만 런타임에 포함된다.
      // formation이면 대형 배치, 아니면 스폰 링에 count만큼(E04는 원거리 링).
      const count = evt.count ?? 1
      const positions = evt.formation
        ? formationSpawnPositions(evt.formation, count, bounds, { x: playerPos.x, z: playerPos.z })
        : null
      const batch = []
      for (let i = 0; i < count; i++) {
        const taken = batch.map((e) => e.pos)
        const pos = positions
          ? positions[i]
          : (evt.type === 'E04' ? rangedSpawnPos(bounds, taken) : randomSpawnPos(evt.type, bounds, taken))
        batch.push({ id: ++_uid, type: evt.type, pos, statOverride: stage2HpOverride(evt.type, currentStageId) })
      }
      addEnemies(batch)
    })

    // 랜덤 간격 이산 웨이브 — 좀비는 오직 여기서만, 웨이브마다 한 번에 스폰된다.
    // 첫 웨이브 t=0, 이후 직전 발화 + 20~40초 랜덤 간격(마지막 phase.end 미만). 각 웨이브 = 활성 phase target × 0.5 마리.
    // 활성 phase는 발화 시각(waveTime) 기준 findLast로 결정한다.
    // 축소된 스폰 링(4.0~6.5) 안 화면 내 위치에 360° 흩어져 '펑' 리빌로 등장(Enemy가 처리).
    const wavePhases = getWavePhasesForStage(currentStageId)
    const lastEnd = wavePhases[wavePhases.length - 1]?.end ?? 0
    while (
      nextWaveTimeRef.current < lastEnd &&
      sec >= nextWaveTimeRef.current
    ) {
      const waveTime = nextWaveTimeRef.current
      nextWaveTimeRef.current = nextWaveTimeForStage(waveTime, currentStageId)
      const phase = wavePhases.findLast((p) => waveTime >= p.start) ?? wavePhases[0]
      const waveSize = waveSizeForStageAtTime(phase, currentStageId, waveTime)
      const newBatch = []
      for (let i = 0; i < waveSize; i++) {
        let type = pickTypeByWeight(phase.weights)
        if ((currentStageId === 'stage2' || currentStageId === 'stage3') && type === 'E04') {
          const currentE04Count =
            enemiesRef.current.filter((e) => e.type === 'E04').length +
            newBatch.filter((e) => e.type === 'E04').length
          if (currentE04Count >= getE04Cap(sec, currentStageId)) {
            type = pickTypeByWeightExcluding(phase.weights, 'E04')
            if (!type) continue
          }
        }
        const taken = newBatch.map((e) => e.pos)
        const pos = type === 'E04' ? rangedSpawnPos(bounds, taken) : randomSpawnPos(type, bounds, taken)
        newBatch.push({ id: ++_uid, type, pos, statOverride: stage2HpOverride(type, currentStageId) })
      }
      addEnemies(newBatch)
    }
  })

  return (
    <>
      {enemies.map((e) => (
        <Enemy key={e.id} id={e.id} type={e.type} spawnPos={e.pos} onDeath={onDeath} statOverride={e.statOverride} isMatilda={e.isMatilda} />
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
    </>
  )
}
