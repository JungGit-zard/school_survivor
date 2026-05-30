import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../lib/toon.js'

const MAX_ITEMS = 5
// 2026-05-10: 1분에 1개 (요청).
const SPAWN_INTERVAL_MS = 60000
const SPAWN_INTERVAL_JITTER_MS = 0
const COLLECT_RADIUS = 0.65
const DESPAWN_MS = 28000

let _lunchId = 0

function randomLunchPos() {
  const angle = Math.random() * Math.PI * 2
  const radius = 2.8 + Math.random() * 5.8
  return [
    playerPos.x + Math.sin(angle) * radius,
    0.38,
    playerPos.z + Math.cos(angle) * radius,
  ]
}

function LunchModel({ kind }) {
  const trayMat = useMemo(() => toonMat(0xa0a8b8, 0.10), [])
  const riceMat = useMemo(() => toonMat(0xffe289, 0.12), [])
  const sideMat = useMemo(() => toonMat(kind === 'milk' ? 0xfafdff : 0xff7415, 0.18), [kind])
  const glassMat = useMemo(() => toonMat(0x6dcfee, 0.14), [])
  const capMat = useMemo(() => toonMat(0x1d6dc4, 0.20), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  if (kind === 'milk') {
    return (
      <group scale={[0.42, 0.42, 0.42]}>
        {/* 본체 외곽선 + 본체 */}
        <mesh material={outMat} position={[0, -0.04, 0]} scale={inflateScale([1.12, 1.06, 1.12])}>
          <cylinderGeometry args={[0.17, 0.2, 0.46, 12]} />
        </mesh>
        <mesh material={glassMat} position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.17, 0.2, 0.46, 12]} />
        </mesh>
        <mesh material={sideMat} position={[0, -0.11, 0]} scale={[0.92, 0.58, 0.92]}>
          <cylinderGeometry args={[0.17, 0.19, 0.38, 12]} />
        </mesh>
        {/* 목 외곽선 + 본체 */}
        <mesh material={outMat} position={[0, 0.28, 0]} scale={inflateScale([1.12, 1.1, 1.12])}>
          <cylinderGeometry args={[0.075, 0.09, 0.2, 10]} />
        </mesh>
        <mesh material={glassMat} position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.075, 0.09, 0.2, 10]} />
        </mesh>
        {/* 뚜껑 외곽선 + 본체 */}
        <mesh material={outMat} position={[0, 0.42, 0]} scale={inflateScale([1.18, 1.18, 1.18])}>
          <cylinderGeometry args={[0.095, 0.095, 0.08, 10]} />
        </mesh>
        <mesh material={capMat} position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.08, 10]} />
        </mesh>
        {/* 라벨 외곽선 + 본체 */}
        <mesh material={outMat} position={[0, 0.02, 0.18]} scale={inflateScale([1.16, 1.16, 1.16])}>
          <boxGeometry args={[0.2, 0.11, 0.045]} />
        </mesh>
        <mesh material={riceMat} position={[0, 0.02, 0.18]}>
          <boxGeometry args={[0.2, 0.11, 0.045]} />
        </mesh>
      </group>
    )
  }

  return (
    <group scale={[0.45, 0.45, 0.45]}>
      {/* 트레이 외곽선 + 본체 */}
      <mesh material={outMat} scale={inflateScale([1.08, 1.08, 1.08])}>
        <boxGeometry args={[0.76, 0.12, 0.5]} />
      </mesh>
      <mesh material={trayMat}>
        <boxGeometry args={[0.76, 0.12, 0.5]} />
      </mesh>
      {/* 쌀밥 외곽선 + 본체 */}
      <mesh material={outMat} position={[-0.18, 0.1, 0]} scale={inflateScale([1.16, 1.16, 1.16])}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      <mesh material={riceMat} position={[-0.18, 0.1, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      {/* 반찬 외곽선 + 본체 */}
      <mesh material={outMat} position={[0.18, 0.1, 0]} scale={inflateScale([1.16, 1.16, 1.16])}>
        <sphereGeometry args={[0.13, 10, 8]} />
      </mesh>
      <mesh material={sideMat} position={[0.18, 0.1, 0]}>
        <sphereGeometry args={[0.13, 10, 8]} />
      </mesh>
    </group>
  )
}

function LunchItem({ item, onCollect }) {
  const groupRef = useRef(null)
  const healPlayer = useGameStore((s) => s.healPlayer)

  useFrame(({ clock }) => {
    if (!groupRef.current || useGameStore.getState().phase !== 'playing') return
    const ageMs = clock.elapsedTime * 1000 - item.spawnMs
    groupRef.current.position.y = item.pos[1] + Math.sin(clock.elapsedTime * 3.2 + item.id) * 0.08
    groupRef.current.rotation.y += 0.025

    const dx = playerPos.x - item.pos[0]
    const dz = playerPos.z - item.pos[2]
    if (Math.hypot(dx, dz) <= COLLECT_RADIUS) {
      healPlayer(item.heal)
      onCollect(item.id)
      return
    }
    if (ageMs > DESPAWN_MS) onCollect(item.id)
  })

  return (
    <group ref={groupRef} position={item.pos}>
      <LunchModel kind={item.kind} />
    </group>
  )
}

export default function LunchItems() {
  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  const nextSpawnRef = useRef(1600)

  const removeItem = (id) => {
    itemsRef.current = itemsRef.current.filter((item) => item.id !== id)
    setItems([...itemsRef.current])
  }

  useFrame(({ clock }) => {
    if (useGameStore.getState().phase !== 'playing') return
    const now = clock.elapsedTime * 1000
    if (now < nextSpawnRef.current || itemsRef.current.length >= MAX_ITEMS) return

    const kind = Math.random() < 0.45 ? 'milk' : 'meal'
    const next = {
      id: ++_lunchId,
      kind,
      heal: kind === 'milk' ? 8 : 14,
      pos: randomLunchPos(),
      spawnMs: now,
    }
    itemsRef.current = [...itemsRef.current, next]
    setItems([...itemsRef.current])
    nextSpawnRef.current = now + SPAWN_INTERVAL_MS + Math.random() * SPAWN_INTERVAL_JITTER_MS
  })

  return (
    <>
      {items.map((item) => (
        <LunchItem key={item.id} item={item} onCollect={removeItem} />
      ))}
    </>
  )
}
