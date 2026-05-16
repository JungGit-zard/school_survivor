import { useRef, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos, enemyBodies } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import GoldCoin from './GoldCoin.jsx'
import XpTextbook from './XpTextbook.jsx'

// 황금 코인 시계 드랍: 5분에 약 10개 → 25–35s 무작위 간격
const GOLD_INTERVAL_MIN_MS = 25_000
const GOLD_INTERVAL_MAX_MS = 35_000
const GOLD_VISIBLE_RADIUS = 10  // 플레이어 기준 이 거리 내 적에서 드랍 시도
const TEXTBOOK_DROP_RATE = 0.30  // 일반 적 사망 시 도라야키 드랍 확률

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

const nextGoldInterval = () =>
  GOLD_INTERVAL_MIN_MS + Math.random() * (GOLD_INTERVAL_MAX_MS - GOLD_INTERVAL_MIN_MS)

function pickGoldDropPos() {
  const live = []
  enemyBodies.forEach((rb) => {
    if (!rb || rb._enemyDead) return
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    if (dx * dx + dz * dz <= GOLD_VISIBLE_RADIUS * GOLD_VISIBLE_RADIUS) live.push(t)
  })
  if (live.length > 0) {
    const t = live[Math.floor(Math.random() * live.length)]
    return [t.x, t.y, t.z]
  }
  // 폴백: 플레이어 주변 3.0–6.0 링
  const ang = Math.random() * Math.PI * 2
  const r = 3.0 + Math.random() * 3.0
  return [playerPos.x + Math.sin(ang) * r, 0.13, playerPos.z + Math.cos(ang) * r]
}

// 스폰 위치
const BASE_COL_Y = 0.24
const SPAWN_MIN_RADIUS = 8.5
const SPAWN_MAX_RADIUS = 12.5
const RANGED_SPAWN_MIN_RADIUS = 11.5
const RANGED_SPAWN_MAX_RADIUS = 15.5

function randomPointOnSpawnRing(minRadius, maxRadius) {
  const angle = Math.random() * Math.PI * 2
  const radius = minRadius + Math.random() * (maxRadius - minRadius)
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  }
}

function randomSpawnPos(type) {
  const stats = ENEMY_STATS[type]
  const offset = randomPointOnSpawnRing(SPAWN_MIN_RADIUS, SPAWN_MAX_RADIUS)
  const px    = playerPos.x, pz = playerPos.z
  const y     = BASE_COL_Y * (stats?.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  return [px + offset.x, y, pz + offset.z]
}

// E04는 화면 가장자리 원거리 위치에서 등장한다. 1스테이지에서는 현재 사용하지 않는다.
function rangedSpawnPos() {
  const offset = randomPointOnSpawnRing(RANGED_SPAWN_MIN_RADIUS, RANGED_SPAWN_MAX_RADIUS)
  const px   = playerPos.x, pz = playerPos.z
  const y    = BASE_COL_Y * (ENEMY_STATS.E04?.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  return [px + offset.x, y, pz + offset.z]
}

// 1스테이지는 추격/돌진형만 사용한다 (Bang_Rules 2026-05-09 부록 / stage1_replan §3-2).
// 기존 E04 비중은 추격 압박을 늘리도록 E02/E03/E05로 재분배.
const WAVE_PHASES = [
  // 0:00–0:30 잡몹만 (먹이 구간)
  { start:   0, end:  30, target: 12, weights: { E01: 1.00 } },
  // 0:30–1:00 잡몹+러너 (이동 압박 시작)
  { start:  30, end:  60, target: 18, weights: { E01: 0.90, E03: 0.10 } },
  // 1:00–1:30 +탱커 등장
  { start:  60, end:  90, target: 26, weights: { E01: 0.60, E03: 0.30, E02: 0.10 } },
  // 1:30–2:00 압박 시작
  { start:  90, end: 120, target: 34, weights: { E01: 0.50, E03: 0.30, E02: 0.20 } },
  // 2:00–2:30 추격형 밀도 상승
  { start: 120, end: 150, target: 44, weights: { E01: 0.40, E03: 0.35, E02: 0.25 } },
  // 2:30–3:00 돌진 예고 구간 (E05 첫 등장)
  { start: 150, end: 180, target: 54, weights: { E01: 0.35, E03: 0.30, E02: 0.25, E05: 0.10 } },
  // 3:00–3:30 돌진 본격 도입
  { start: 180, end: 210, target: 64, weights: { E01: 0.25, E03: 0.30, E02: 0.30, E05: 0.15 } },
  // 3:30–4:00 +거대 등장
  { start: 210, end: 240, target: 76, weights: { E01: 0.20, E03: 0.30, E02: 0.30, E05: 0.17, E06: 0.03 } },
  // 4:00–4:20 보스 구간 1 (잡몹+탱커)
  { start: 240, end: 260, target: 25, weights: { E01: 0.60, E02: 0.40 }, bossPhase: true },
  // 4:20–4:40 보스 구간 2 (탱커+돌진)
  { start: 260, end: 280, target: 35, weights: { E02: 0.60, E05: 0.40 }, bossPhase: true },
  // 4:40–5:00 보스 구간 3 (탱커+돌진)
  { start: 280, end: 300, target: 45, weights: { E02: 0.50, E05: 0.50 }, bossPhase: true },
]

const BURST_EVENTS = [
  { sec:   0, type: 'E01', count:  8 },  // 첫 처치 보장
  { sec:  30, type: 'E01', count:  6 },  // 러너 직전 잡몹 러시
  { sec:  60, type: 'E02', count:  4 },  // 탱커 첫 등장 신호
  { sec:  90, type: 'E03', count:  6 },  // 러너 압박
  { sec: 120, type: 'E01', count:  8 },  // 엘리트 직전 잡몹 러시
  { sec: 120, type: 'E02', count:  4 },
  { sec: 150, type: 'E05', count:  4 },  // 돌진 첫 등장 (E04 탄환형 폐기 — 2026-05-09)
  { sec: 180, type: 'E05', count:  4 },  // 돌진 압박 강화
  { sec: 210, type: 'E06', count:  1 },  // 거대 첫 등장
  { sec: 230, type: 'E01', count: 12 },  // 마지막 러시 (보스 직전)
  { sec: 230, type: 'E02', count:  8 },
  { sec: 230, type: 'E05', count:  4 },
  { sec: 240, type: 'B01', count:  1 },  // 보스 등장
  { sec: 270, type: 'E05', count:  5 },
]

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

export default function Enemies() {
  const [enemies, setEnemies]     = useState([])
  const [textbooks, setTextbooks] = useState([])
  const [goldCoins, setGoldCoins] = useState([])
  const [collapses, setCollapses] = useState([])
  const enemiesRef                = useRef([])
  const firedBurstsRef            = useRef(new Set())
  const maintainTimerRef          = useRef(0)
  const goldTimerRef              = useRef(nextGoldInterval())

  const phase      = useGameStore((s) => s.phase)
  const bossSpawned = useGameStore((s) => s.bossSpawned)
  const spawnBoss   = useGameStore((s) => s.spawnBoss)

  const addEnemies = useCallback((newList) => {
    enemiesRef.current.push(...newList)
    setEnemies([...enemiesRef.current])
  }, [])

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
      const next = [...prev, {
        id: ++_collapseId,
        type: dropData.type,
        position: dropData.pos,
        visualScale: dropData.visualScale,
      }]
      return next.length > 12 ? next.slice(next.length - 12) : next
    })

    const bonus = ELITE_BONUS[dropData.type]
    if (bonus) {
      const textbookXp = getEliteBonusTextbookXp(dropData.type, dropData.xp)
      for (let i = 0; i < bonus.textbook; i++) dropTextbook(dropData.pos, textbookXp)
      for (let i = 0; i < bonus.gold; i++)     dropGoldCoin(dropData.pos)
      return
    }

    if (dropData.xp > 0 && Math.random() < TEXTBOOK_DROP_RATE) {
      dropTextbook(dropData.pos, dropData.xp)
    }
  }, [dropTextbook, dropGoldCoin])

  const onCollapseDone = useCallback((id) => {
    setCollapses((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const onTextbookCollect = useCallback((id) => {
    setTextbooks((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const onCoinCollect = useCallback((id) => {
    setGoldCoins((prev) => prev.filter((o) => o.id !== id))
  }, [])

  useFrame((_, delta) => {
    if (phase !== 'playing') return

    const sec = useGameStore.getState().elapsedMs / 1000

    goldTimerRef.current -= delta * 1000
    if (goldTimerRef.current <= 0) {
      dropGoldCoin(pickGoldDropPos())
      goldTimerRef.current = nextGoldInterval()
    }

    if (firedBurstsRef.current.size < BURST_EVENTS.length) {
      BURST_EVENTS.forEach((evt, idx) => {
        if (firedBurstsRef.current.has(idx)) return
        if (sec < evt.sec) return
        firedBurstsRef.current.add(idx)

        if (evt.type === 'B01') {
          if (bossSpawned) return
          spawnBoss()
          addEnemies([{ id: ++_uid, type: 'B01', pos: randomSpawnPos('B01') }])
          return
        }

        const newBatch = []
        for (let i = 0; i < evt.count; i++) {
          const pos = evt.type === 'E04' ? rangedSpawnPos() : randomSpawnPos(evt.type)
          newBatch.push({ id: ++_uid, type: evt.type, pos })
        }
        addEnemies(newBatch)
      })
    }

    maintainTimerRef.current -= delta * 1000
    if (maintainTimerRef.current > 0) return
    maintainTimerRef.current = 600

    const currentPhase = WAVE_PHASES.findLast((p) => sec >= p.start) ?? WAVE_PHASES[0]

    const normalCount = currentPhase.bossPhase
      ? enemiesRef.current.filter((e) => e.type !== 'B01').length
      : enemiesRef.current.length

    const shortage = currentPhase.target - normalCount
    if (shortage <= 0) return

    const toSpawn = Math.min(shortage, 4)
    const newBatch = []
    for (let i = 0; i < toSpawn; i++) {
      const type = pickTypeByWeight(currentPhase.weights)
      const pos  = type === 'E04' ? rangedSpawnPos() : randomSpawnPos(type)
      newBatch.push({ id: ++_uid, type, pos })
    }
    addEnemies(newBatch)
  })

  return (
    <>
      {enemies.map((e) => (
        <Enemy key={e.id} id={e.id} type={e.type} spawnPos={e.pos} onDeath={onDeath} />
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
