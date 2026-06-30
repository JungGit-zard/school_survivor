import { useRef, useCallback, useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos, enemyBodies } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'
import { getStage2E04Cap } from '../lib/stage2ProjectileRules.js'
import { getStageBounds } from '../lib/stageConfig.js'

// 황금 코인 시계 드랍: 4분에 약 10개 → 20–28s 무작위 간격 (5분 기준 ×0.8)
const GOLD_INTERVAL_MIN_MS = 20_000
const GOLD_INTERVAL_MAX_MS = 28_000
const GOLD_VISIBLE_RADIUS = 10  // 플레이어 기준 이 거리 내 적에서 드랍 시도
export const TEXTBOOK_DROP_RATE = 0.30  // 일반 적 사망 시 교과서 드랍 확률

// 보스/엘리트 사망 시 추가 보너스 (기획서 §3-3)
const ELITE_BONUS = {
  E06: { textbook: 1, gold: 1 },
  B01: { textbook: 3, textbookXp: 40, gold: 5 },
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
const SPAWN_MIN_RADIUS = 8.5
const SPAWN_MAX_RADIUS = 12.5
const RANGED_SPAWN_MIN_RADIUS = 11.5
const RANGED_SPAWN_MAX_RADIUS = 15.5
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

// 1스테이지는 추격/돌진형만 사용한다 (Bang_Rules 2026-05-09 부록 / stage1_replan §3-2).
// 기존 E04 비중은 추격 압박을 늘리도록 E02/E03/E05로 재분배.
// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
export const WAVE_PHASES = [
  // 0:00–0:40 단일 좀비 구간. E01 밀도만 기존 대비 2배로 올린다.
  { start:   0, end:  40, target: 24, weights: { E01: 1.00 } },
  // 0:40–1:00 잡몹+러너 (이동 압박 시작) — 8초→20초로 확장해 전환 체감 부여
  { start:  40, end:  60, target: 22, weights: { E01: 0.90, E03: 0.10 } },
  // 1:00–1:12 +탱커 등장
  { start:  60, end:  72, target: 26, weights: { E01: 0.60, E03: 0.30, E02: 0.10 } },
  // 1:12–1:30 압박 시작
  { start:  72, end:  90, target: 34, weights: { E01: 0.50, E03: 0.30, E02: 0.20 } },
  // 1:30 이후 좀비 수 2/3 완화
  { start:  90, end:  96, target: 23, weights: { E01: 0.50, E03: 0.30, E02: 0.20 } },
  // 1:36–2:00 추격형 밀도 상승
  { start:  96, end: 120, target: 29, weights: { E01: 0.40, E03: 0.35, E02: 0.25 } },
  // 2:00–2:24 돌진 예고 구간 (E05 첫 등장)
  { start: 120, end: 144, target: 36, weights: { E01: 0.35, E03: 0.30, E02: 0.25, E05: 0.10 } },
  // 2:24–2:48 돌진 본격 도입
  { start: 144, end: 168, target: 43, weights: { E01: 0.25, E03: 0.30, E02: 0.30, E05: 0.15 } },
  // 2:48–3:12 +거대 등장 — E06 2%→5%로 출현 확대
  { start: 168, end: 192, target: 51, weights: { E01: 0.20, E03: 0.30, E02: 0.28, E05: 0.17, E06: 0.05 } },
  // 3:12–3:28 보스 구간 1 (잡몹+탱커)
  { start: 192, end: 208, target: 17, weights: { E01: 0.60, E02: 0.40 }, bossPhase: true },
  // 3:28–3:44 보스 구간 2 (탱커+돌진)
  { start: 208, end: 224, target: 23, weights: { E02: 0.60, E05: 0.40 }, bossPhase: true },
  // 3:44–4:00 보스 구간 3 — E01 15% 추가해 도망길 숨통 확보
  { start: 224, end: 240, target: 30, weights: { E01: 0.15, E02: 0.45, E05: 0.40 }, bossPhase: true },
]

// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
export const STAGE2_WAVE_PHASES = [
  { start:   0, end:  24, target: 18, weights: { E01: 1.00 } },
  { start:  24, end:  48, target: 22, weights: { E01: 0.72, E03: 0.28 } },
  { start:  48, end:  72, target: 28, weights: { E01: 0.48, E02: 0.22, E03: 0.30 } },
  { start:  72, end:  90, target: 30, weights: { E01: 0.55, E03: 0.30, E04: 0.15 } },
  { start:  90, end:  96, target: 20, weights: { E01: 0.55, E03: 0.30, E04: 0.15 } },
  { start:  96, end: 120, target: 19, weights: { E01: 0.20, E02: 0.50, E04: 0.30 } },
  { start: 120, end: 144, target: 25, weights: { E01: 0.45, E03: 0.35, E05: 0.15, E04: 0.05 } },
  { start: 144, end: 168, target: 28, weights: { E03: 0.44, E04: 0.28, E05: 0.28 } },
  { start: 168, end: 192, target: 29, weights: { E02: 0.50, E04: 0.32, E06: 0.18 } },
  { start: 192, end: 208, target: 16, weights: { E01: 0.40, E02: 0.40, E04: 0.20 }, bossPhase: true },
  { start: 208, end: 224, target: 21, weights: { E02: 0.45, E05: 0.35, E04: 0.20 }, bossPhase: true },
  { start: 224, end: 240, target: 25, weights: { E02: 0.20, E03: 0.28, E04: 0.24, E05: 0.28 }, bossPhase: true },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
const BURST_EVENTS = [
  { sec:   0, type: 'E01', count: 16 },  // 40초 전 단일 좀비 구간 밀도 2배
  { sec:  24, type: 'E01', count: 12 },  // 40초 전 단일 좀비 구간 밀도 2배
  { sec:  48, type: 'E02', count:  4 },  // 탱커 첫 등장 신호
  { sec:  72, type: 'E03', count:  6 },  // 러너 압박
  { sec:  96, type: 'E01', count:  5 },  // 엘리트 직전 잡몹 러시
  { sec:  96, type: 'E02', count:  3 },
  { sec: 120, type: 'E05', count:  3 },  // 돌진 첫 등장 (E04 탄환형 폐기 — 2026-05-09)
  { sec: 144, type: 'E05', count:  3 },  // 돌진 압박 강화
  { sec: 168, type: 'E06', count:  1 },  // 거대 첫 등장
  { sec: 184, type: 'E01', count:  5 },  // 마지막 러시 (보스 직전) — 과부하 완화
  { sec: 184, type: 'E02', count:  3 },
  { sec: 184, type: 'E05', count:  2 },
  { sec: 192, type: 'B01', count:  1 },  // 보스 등장
  { sec: 216, type: 'E05', count:  3 },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
export const STAGE2_BURST_EVENTS = [
  { sec:   0, type: 'E01', count: 10 },
  { sec:  24, type: 'E03', count:  4 },
  { sec:  48, type: 'E02', count:  3 },
  { sec:  72, type: 'E04', count:  1 },
  { sec:  96, type: 'E04', count:  1 },
  { sec: 120, type: 'E05', count:  2 },
  { sec: 144, type: 'E04', count:  1 },
  { sec: 144, type: 'E05', count:  2 },
  { sec: 168, type: 'E06', count:  1 },
  { sec: 184, type: 'E04', count:  1 },
  { sec: 192, type: 'B01', count:  1 },
  { sec: 216, type: 'E05', count:  3 },
  { sec: 216, type: 'E04', count:  1 },
]

export function getWavePhasesForStage(stageId) {
  return stageId === 'stage2' ? STAGE2_WAVE_PHASES : WAVE_PHASES
}

export function getBurstEventsForStage(stageId) {
  return stageId === 'stage2' ? STAGE2_BURST_EVENTS : BURST_EVENTS
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

let _uid   = 0
let _textbookId = 0
let _coinId = 0
let _collapseId = 0

// 게임 시작 직후 플레이어가 방향을 잡을 시간 — 이 기간엔 유지 스폰을 차단.
// 버스트 이벤트는 evt.sec 기준으로 독립 관리하므로 영향 없음.
const SPAWN_GRACE_SEC = 5

export default function Enemies() {
  const [enemies, setEnemies]       = useState([])
  const [textbooks, setTextbooks]   = useState([])
  const [goldCoins, setGoldCoins]   = useState([])
  const [collapses, setCollapses]   = useState([])
  const enemiesRef                = useRef([])
  const firedBurstsRef            = useRef(new Set())
  const maintainTimerRef          = useRef(0)
  const goldTimerRef              = useRef(nextGoldInterval())

  const bossSpawned    = useGameStore((s) => s.bossSpawned)
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
    emitSfx({ id: 'matildaSpawn' })
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

    const burstEvents = getBurstEventsForStage(currentStageId)
    if (firedBurstsRef.current.size < burstEvents.length) {
      burstEvents.forEach((evt, idx) => {
        if (firedBurstsRef.current.has(idx)) return
        if (sec < evt.sec) return
        firedBurstsRef.current.add(idx)

        if (evt.type === 'B01') {
          if (bossSpawned) return
          spawnBoss()
          emitSfx({ id: 'bossSpawn' })
          addEnemies([{ id: ++_uid, type: 'B01', pos: randomSpawnPos('B01', bounds) }])
          return
        }

        const currentE04Count = enemiesRef.current.filter((e) => e.type === 'E04').length
        const e04Room = currentStageId === 'stage2' && evt.type === 'E04'
          ? Math.max(0, getStage2E04Cap(sec) - currentE04Count)
          : evt.count
        const spawnCount = evt.type === 'E04' ? Math.min(evt.count, e04Room) : evt.count
        const newBatch = []
        for (let i = 0; i < spawnCount; i++) {
          const taken = newBatch.map((e) => e.pos)
          const pos = evt.type === 'E04' ? rangedSpawnPos(bounds, taken) : randomSpawnPos(evt.type, bounds, taken)
          newBatch.push({ id: ++_uid, type: evt.type, pos })
        }
        addEnemies(newBatch)
      })
    }

    maintainTimerRef.current -= delta * 1000
    if (maintainTimerRef.current > 0) return
    maintainTimerRef.current = 600

    if (sec < SPAWN_GRACE_SEC) return

    const wavePhases = getWavePhasesForStage(currentStageId)
    const currentPhase = wavePhases.findLast((p) => sec >= p.start) ?? wavePhases[0]

    const normalCount = currentPhase.bossPhase
      ? enemiesRef.current.filter((e) => e.type !== 'B01').length
      : enemiesRef.current.length

    const shortage = currentPhase.target - normalCount
    if (shortage <= 0) return

    const toSpawn = Math.min(shortage, 4)
    const newBatch = []
    for (let i = 0; i < toSpawn; i++) {
      let type = pickTypeByWeight(currentPhase.weights)
      if (currentStageId === 'stage2' && type === 'E04') {
        const currentE04Count = enemiesRef.current.filter((e) => e.type === 'E04').length + newBatch.filter((e) => e.type === 'E04').length
        if (currentE04Count >= getStage2E04Cap(sec)) type = 'E03'
      }
      const taken = newBatch.map((e) => e.pos)
      const pos  = type === 'E04' ? rangedSpawnPos(bounds, taken) : randomSpawnPos(type, bounds, taken)
      newBatch.push({ id: ++_uid, type, pos })
    }
    addEnemies(newBatch)
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
