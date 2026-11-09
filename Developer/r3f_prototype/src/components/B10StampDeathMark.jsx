// B10 교감 좀비 사망 연출(스펙 Part B §6-6 · §12-3): 도장이 바닥에 떨어져 빨간 "決" 자국을 1.5s 남긴다.
// 비주얼 전용 — 판정·보상과 무관하다. Enemy.jsx가 사망 프레임에 queueB10StampDeathMark를 한 번 부르고,
// Stage5Environment에 마운트된 레이어가 그린다(B10은 Stage 5에서만 나온다).
// 큐는 gameKey 태그를 달아, 재시작 뒤 이전 판의 자국이 그려지지 않는다.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore.js'
import { getB10StampTexture } from './expansion/expansionTelegraphs.js'

export const B10_STAMP_DEATH_MARK = Object.freeze({
  durationMs: 1500,
  holdMs: 600,
  size: 1.5,
  opacity: 0.9,
  capacity: 4,
  y: 0.03,
})

const pending = []

export function queueB10StampDeathMark(x, z, gameKey) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return
  if (pending.length >= B10_STAMP_DEATH_MARK.capacity) pending.shift()
  pending.push({ x, z, gameKey })
}

export function drainB10StampDeathMarks() {
  return pending.splice(0, pending.length)
}

// 경과 ms → 불투명도. holdMs 동안 그대로, 그 뒤 durationMs까지 선형으로 사라진다.
export function getB10StampDeathMarkOpacity(ageMs) {
  const M = B10_STAMP_DEATH_MARK
  if (!(ageMs >= 0) || ageMs >= M.durationMs) return 0
  if (ageMs <= M.holdMs) return M.opacity
  return M.opacity * (1 - (ageMs - M.holdMs) / (M.durationMs - M.holdMs))
}

export default function B10StampDeathMarkLayer() {
  const slots = useRef([])
  const M = B10_STAMP_DEATH_MARK
  const resources = useMemo(() => {
    const texture = getB10StampTexture()
    const geometry = new THREE.PlaneGeometry(M.size, M.size)
    const materials = Array.from({ length: M.capacity }, () => new THREE.MeshBasicMaterial({
      map: texture,
      color: texture ? '#ffffff' : '#d7263d',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }))
    return { geometry, materials }
  }, [M.size, M.capacity])
  useEffect(() => () => {
    resources.geometry.dispose()
    resources.materials.forEach((material) => material.dispose())
  }, [resources])
  const state = useRef({ ages: Array(M.capacity).fill(Infinity), next: 0, gameKey: -1 })

  useFrame((_, delta) => {
    const store = useGameStore.getState()
    const s = state.current
    if (s.gameKey !== store.gameKey) {
      s.gameKey = store.gameKey
      s.ages.fill(Infinity)
    }
    for (const mark of drainB10StampDeathMarks()) {
      if (mark.gameKey !== store.gameKey) continue
      const index = s.next
      s.next = (s.next + 1) % M.capacity
      s.ages[index] = 0
      const mesh = slots.current[index]
      if (mesh) {
        mesh.position.set(mark.x, M.y, mark.z)
        mesh.rotation.z = (index * 0.37) % 0.6 - 0.3
      }
    }
    // 일시정지 중에는 자국이 사라지지 않는다(게임시간 기준).
    const step = store.phase === 'playing' ? delta * 1000 : 0
    for (let index = 0; index < M.capacity; index += 1) {
      const mesh = slots.current[index]
      if (!mesh) continue
      if (s.ages[index] !== Infinity) s.ages[index] += step
      const opacity = getB10StampDeathMarkOpacity(s.ages[index])
      mesh.visible = opacity > 0
      resources.materials[index].opacity = opacity
    }
  })

  return (
    <group name="b10-stamp-death-marks">
      {resources.materials.map((material, index) => (
        <mesh
          key={index}
          ref={(node) => { slots.current[index] = node }}
          geometry={resources.geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={7}
          visible={false}
        />
      ))}
    </group>
  )
}
