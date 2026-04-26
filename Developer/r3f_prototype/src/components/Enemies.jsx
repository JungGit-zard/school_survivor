import { useRef, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import XpOrb from './XpOrb.jsx'

// ── 스폰 위치 ─────────────────────────────────────────────────────────────────
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

// E04는 화면 가장자리 원거리에서 등장 (시나리오 주의사항)
function rangedSpawnPos() {
  const offset = randomPointOnSpawnRing(RANGED_SPAWN_MIN_RADIUS, RANGED_SPAWN_MAX_RADIUS)
  const px   = playerPos.x, pz = playerPos.z
  const y    = BASE_COL_Y * (ENEMY_STATS.E04?.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  return [px + offset.x, y, pz + offset.z]
}

// ── 타임라인 페이즈 (시나리오 문서 직접 반영) ──────────────────────────────────
// weights 합은 1.0. bossPhase: true면 보스전 구간 (일반 몬스터만 유지)
const WAVE_PHASES = [
  { start:   0, end:  30, target: 12, weights: { E01: 1.00 } },
  { start:  30, end:  60, target: 20, weights: { E01: 0.85, E02: 0.15 } },
  { start:  60, end:  90, target: 30, weights: { E01: 0.65, E02: 0.25, E03: 0.10 } },
  { start:  90, end: 120, target: 38, weights: { E01: 0.45, E02: 0.25, E03: 0.30 } },
  { start: 120, end: 150, target: 48, weights: { E01: 0.35, E02: 0.20, E03: 0.25, E04: 0.20 } },
  { start: 150, end: 180, target: 58, weights: { E01: 0.30, E02: 0.25, E03: 0.25, E04: 0.20 } },
  { start: 180, end: 210, target: 68, weights: { E01: 0.20, E02: 0.25, E03: 0.20, E04: 0.20, E05: 0.15 } },
  { start: 210, end: 240, target: 78, weights: { E01: 0.15, E02: 0.25, E03: 0.20, E04: 0.20, E05: 0.15, E06: 0.05 } },
  { start: 240, end: 260, target: 25, weights: { E01: 0.60, E02: 0.40 }, bossPhase: true },
  { start: 260, end: 280, target: 35, weights: { E02: 0.60, E04: 0.40 }, bossPhase: true },
  { start: 280, end: 300, target: 45, weights: { E02: 0.50, E05: 0.50 }, bossPhase: true },
]

// ── 버스트 이벤트 (특정 초에 일회성 스폰) ─────────────────────────────────────
const BURST_EVENTS = [
  { sec:   0, type: 'E01', count:  8 },
  { sec:  15, type: 'E01', count:  8 },
  { sec:  45, type: 'E02', count:  5 },
  { sec:  60, type: 'E01', count: 10 },
  { sec:  60, type: 'E02', count:  6 },
  { sec:  80, type: 'E03', count:  4 },
  { sec: 100, type: 'E01', count: 12 },
  { sec: 100, type: 'E02', count:  8 },
  { sec: 120, type: 'E04', count:  6 },
  { sec: 140, type: 'E04', count:  6 },
  { sec: 165, type: 'E05', count:  5 },
  { sec: 180, type: 'E05', count:  8 },
  { sec: 200, type: 'E06', count:  1 },
  { sec: 220, type: 'E01', count: 15 },
  { sec: 220, type: 'E02', count: 12 },
  { sec: 220, type: 'E05', count:  6 },
  { sec: 300, type: 'B01', count:  1 },
  { sec: 280, type: 'E05', count:  5 },
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
let _orbId = 0
let _collapseId = 0

export default function Enemies() {
  const [enemies, setEnemies]   = useState([])
  const [xpOrbs, setXpOrbs]     = useState([])
  const [collapses, setCollapses] = useState([])
  const enemiesRef               = useRef([])     // useFrame용 빠른 미러
  const firedBurstsRef           = useRef(new Set()) // 발화된 버스트 인덱스
  const maintainTimerRef         = useRef(0)      // 보충 스폰 간격 타이머

  const phase      = useGameStore((s) => s.phase)
  const bossSpawned = useGameStore((s) => s.bossSpawned)
  const spawnBoss   = useGameStore((s) => s.spawnBoss)

  const addEnemies = useCallback((newList) => {
    enemiesRef.current.push(...newList)
    setEnemies([...enemiesRef.current])
  }, [])

  const onDeath = useCallback((id, dropData) => {
    enemiesRef.current = enemiesRef.current.filter((e) => e.id !== id)
    setEnemies([...enemiesRef.current])
    if (dropData?.pos) {
      setCollapses((prev) => {
        const next = [...prev, {
          id: ++_collapseId,
          type: dropData.type,
          position: dropData.pos,
          visualScale: dropData.visualScale,
        }]
        return next.length > 12 ? next.slice(next.length - 12) : next
      })
    }
    if (dropData?.xp > 0 && dropData?.pos) {
      setXpOrbs((prev) => [...prev, { id: ++_orbId, pos: dropData.pos, xp: dropData.xp }])
    }
  }, [])

  const onCollapseDone = useCallback((id) => {
    setCollapses((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const onOrbCollect = useCallback((id) => {
    setXpOrbs((prev) => prev.filter((o) => o.id !== id))
  }, [])

  useFrame((_, delta) => {
    if (phase !== 'playing') return

    const sec = useGameStore.getState().elapsedMs / 1000

    // ── 버스트 이벤트 ────────────────────────────────────────────────────
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

    // ── 보충 스폰 (목표 생존 수 유지) ────────────────────────────────────
    maintainTimerRef.current -= delta * 1000
    if (maintainTimerRef.current > 0) return
    maintainTimerRef.current = 600  // 600ms마다 보충 체크

    // 현재 페이즈 결정
    const currentPhase = WAVE_PHASES.findLast((p) => sec >= p.start) ?? WAVE_PHASES[0]

    // 보스 없는 구간이면 보스 제외한 일반 몬스터만 카운트
    const normalCount = currentPhase.bossPhase
      ? enemiesRef.current.filter((e) => e.type !== 'B01').length
      : enemiesRef.current.length

    const shortage = currentPhase.target - normalCount
    if (shortage <= 0) return

    // 한 번에 최대 4마리씩 보충
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
      {xpOrbs.map((o) => (
        <XpOrb key={o.id} id={o.id} pos={o.pos} xp={o.xp} onCollect={onOrbCollect} />
      ))}
      {collapses.map((c) => (
        <EnemyDeathCollapse key={c.id} {...c} onDone={onCollapseDone} />
      ))}
    </>
  )
}
