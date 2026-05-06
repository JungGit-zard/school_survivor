import { useRef, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos } from '../lib/refs.js'
import Enemy, { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import EnemyDeathCollapse from './EnemyDeathCollapse.jsx'
import GoldCoin from './GoldCoin.jsx'

// ?? ?ㅽ룿 ?꾩튂 ?????????????????????????????????????????????????????????????????
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

// E04???붾㈃ 媛?μ옄由??먭굅由ъ뿉???깆옣 (?쒕굹由ъ삤 二쇱쓽?ы빆)
function rangedSpawnPos() {
  const offset = randomPointOnSpawnRing(RANGED_SPAWN_MIN_RADIUS, RANGED_SPAWN_MAX_RADIUS)
  const px   = playerPos.x, pz = playerPos.z
  const y    = BASE_COL_Y * (ENEMY_STATS.E04?.scale ?? 1) * ENEMY_SIZE_MULTIPLIER
  return [px + offset.x, y, pz + offset.z]
}

// ?? ??꾨씪???섏씠利?(?쒕굹由ъ삤 臾몄꽌 吏곸젒 諛섏쁺) ??????????????????????????????????
// weights ?⑹? 1.0. bossPhase: true硫?蹂댁뒪??援ш컙 (?쇰컲 紐ъ뒪?곕쭔 ?좎?)
// 2026-05-06 재밸런싱 — vampire_5minite_monster.md 5단계 + Stage1 replan 11구간.
// 1) 잡몹만 → 2) +러너 → 3) +탱커 → 4) +엘리트(원거리) → 5) +돌진+거대 → 보스
const WAVE_PHASES = [
  // 0:00–0:30 잡몹만 (먹이 구간)
  { start:   0, end:  30, target: 12, weights: { E01: 1.00 } },
  // 0:30–1:00 잡몹+러너 (이동 압박 시작)
  { start:  30, end:  60, target: 18, weights: { E01: 0.90, E03: 0.10 } },
  // 1:00–1:30 +탱커 등장
  { start:  60, end:  90, target: 26, weights: { E01: 0.60, E03: 0.30, E02: 0.10 } },
  // 1:30–2:00 압박 시작
  { start:  90, end: 120, target: 34, weights: { E01: 0.50, E03: 0.30, E02: 0.20 } },
  // 2:00–2:30 +엘리트(원거리) 도입
  { start: 120, end: 150, target: 44, weights: { E01: 0.40, E03: 0.30, E02: 0.20, E04: 0.10 } },
  // 2:30–3:00 빌드 완성 구간
  { start: 150, end: 180, target: 54, weights: { E01: 0.35, E03: 0.25, E02: 0.25, E04: 0.15 } },
  // 3:00–3:30 +돌진 도입
  { start: 180, end: 210, target: 64, weights: { E01: 0.25, E03: 0.30, E02: 0.25, E04: 0.10, E05: 0.10 } },
  // 3:30–4:00 +거대 등장
  { start: 210, end: 240, target: 76, weights: { E01: 0.20, E03: 0.30, E02: 0.25, E04: 0.10, E05: 0.12, E06: 0.03 } },
  // 4:00–4:20 보스 구간 1 (잡몹+탱커)
  { start: 240, end: 260, target: 25, weights: { E01: 0.60, E02: 0.40 }, bossPhase: true },
  // 4:20–4:40 보스 구간 2 (탱커+원거리)
  { start: 260, end: 280, target: 35, weights: { E02: 0.60, E04: 0.40 }, bossPhase: true },
  // 4:40–5:00 보스 구간 3 (탱커+돌진)
  { start: 280, end: 300, target: 45, weights: { E02: 0.50, E05: 0.50 }, bossPhase: true },
]

// ?? 踰꾩뒪???대깽??(?뱀젙 珥덉뿉 ?쇳쉶???ㅽ룿) ?????????????????????????????????????
// 2026-05-06 재정의 — 단계 도입 직전 러시 + 마지막 230s 보스 직전 대규모 러시.
const BURST_EVENTS = [
  { sec:   0, type: 'E01', count:  8 },  // 첫 처치 보장
  { sec:  30, type: 'E01', count:  6 },  // 러너 직전 잡몹 러시
  { sec:  60, type: 'E02', count:  4 },  // 탱커 첫 등장 신호
  { sec:  90, type: 'E03', count:  6 },  // 러너 압박
  { sec: 120, type: 'E01', count:  8 },  // 엘리트 직전 잡몹 러시
  { sec: 120, type: 'E02', count:  4 },
  { sec: 150, type: 'E04', count:  4 },  // 원거리 첫 압박
  { sec: 180, type: 'E05', count:  4 },  // 돌진 첫 등장
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
let _orbId = 0
let _collapseId = 0

export default function Enemies() {
  const [enemies, setEnemies]   = useState([])
  const [xpOrbs, setXpOrbs]     = useState([])
  const [collapses, setCollapses] = useState([])
  const enemiesRef               = useRef([])     // useFrame??鍮좊Ⅸ 誘몃윭
  const firedBurstsRef           = useRef(new Set()) // 諛쒗솕??踰꾩뒪???몃뜳??
  const maintainTimerRef         = useRef(0)      // 蹂댁땐 ?ㅽ룿 媛꾧꺽 ??대㉧

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

    // ?? 踰꾩뒪???대깽??????????????????????????????????????????????????????
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

    // ?? 蹂댁땐 ?ㅽ룿 (紐⑺몴 ?앹〈 ???좎?) ????????????????????????????????????
    maintainTimerRef.current -= delta * 1000
    if (maintainTimerRef.current > 0) return
    maintainTimerRef.current = 600  // 600ms留덈떎 蹂댁땐 泥댄겕

    // ?꾩옱 ?섏씠利?寃곗젙
    const currentPhase = WAVE_PHASES.findLast((p) => sec >= p.start) ?? WAVE_PHASES[0]

    // 蹂댁뒪 ?녿뒗 援ш컙?대㈃ 蹂댁뒪 ?쒖쇅???쇰컲 紐ъ뒪?곕쭔 移댁슫??
    const normalCount = currentPhase.bossPhase
      ? enemiesRef.current.filter((e) => e.type !== 'B01').length
      : enemiesRef.current.length

    const shortage = currentPhase.target - normalCount
    if (shortage <= 0) return

    // ??踰덉뿉 理쒕? 4留덈━??蹂댁땐
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
        <GoldCoin key={o.id} id={o.id} pos={o.pos} xp={o.xp} onCollect={onOrbCollect} />
      ))}
      {collapses.map((c) => (
        <EnemyDeathCollapse key={c.id} {...c} onDone={onCollapseDone} />
      ))}
    </>
  )
}
