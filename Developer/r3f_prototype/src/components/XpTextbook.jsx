import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { toonMat, outlineMat, inflateScale } from '../lib/toon.js'
import { stepMagnetPull } from '../lib/pickup.js'
import { computeTextbookLanding } from '../lib/textbookLanding.js'
import { logPickup } from '../lib/playtestLogger.js'

const FLOOR_Y = 0.13
const TOSS_MS = 460       // 휘리릭 날아가 착지하기까지 시간
const HOP_HEIGHT = 0.85   // 포물선 최고 높이
const easeOut = (t) => 1 - (1 - t) * (1 - t)

export default function XpTextbook({ id, pos, value, onCollect }) {
  const groupRef  = useRef()
  const collected = useRef(false)
  const pRef      = useRef({ x: pos[0], y: FLOOR_Y, z: pos[2] })
  const seed      = pos[0] * 11.3 + pos[2] * 7.7
  const birthSec  = useRef(performance.now() / 1000)
  const tossMsRef = useRef(0)
  const landedRef = useRef(false)

  // 좀비 사망 위치(pos)에서 근처 바닥 랜덤 지점으로 튕겨 떨어진다 (마운트당 1회 결정).
  // 이동 경계 밖·책상 콜라이더 안에 떨어지면 자석 Lv0에서 영구 수집 불가 → 도달 가능 지점만 선택.
  const stageId = useGameStore((s) => s.currentStageId)
  const land = useMemo(() => computeTextbookLanding(pos, stageId), [pos, stageId])

  const gainXp = useGameStore((s) => s.gainXp)

  // 교과서: 표지(파랑) / 책등(짙은 파랑) / 책장(크림) / 제목 띠(아이보리)
  const coverMat = useMemo(() => toonMat(0x2e5fb2, 0.16), [])
  const spineMat = useMemo(() => toonMat(0x1c3f7e, 0.18), [])
  const pageMat  = useMemo(() => toonMat(0xf2eddc, 0.10), [])
  const titleMat = useMemo(() => toonMat(0xfff7e0, 0.18), [])
  const titleAccentMat = useMemo(() => toonMat(0x1a2e58, 0.10), [])
  const outMat   = useMemo(() => outlineMat(0.96), [])

  useFrame(({ clock }, delta) => {
    if (collected.current || !groupRef.current) return
    if (useGameStore.getState().phase !== 'playing') return

    // 1) 던지기: pos에서 근처 랜덤 지점으로 휘리릭 포물선 비행 → 툭 착지
    if (!landedRef.current) {
      tossMsRef.current += delta * 1000
      const t = Math.min(1, tossMsRef.current / TOSS_MS)
      const e = easeOut(t) // 수평은 감속하며 도착
      const x = pos[0] + (land.x - pos[0]) * e
      const z = pos[2] + (land.z - pos[2]) * e
      const hop = Math.sin(t * Math.PI) * HOP_HEIGHT
      pRef.current.x = x
      pRef.current.z = z
      groupRef.current.position.set(x, FLOOR_Y + hop, z)
      // 휘리릭 회전 — 착지로 갈수록 잦아듦
      const spin = (1 - t) * 18 + 2
      groupRef.current.rotation.x += delta * spin
      groupRef.current.rotation.y += delta * spin * 0.7
      groupRef.current.rotation.z += delta * spin * 0.5
      if (t >= 1) {
        landedRef.current = true
        pRef.current.x = land.x
        pRef.current.y = FLOOR_Y
        pRef.current.z = land.z
        // 착지 시 평평하게 눕힘 (이후 둥둥 플로트가 y축 회전만 사용)
        groupRef.current.rotation.set(0, 0, 0)
      }
      return
    }

    // 2) 착지 후: 자석 끌림 + 둥둥 플로트
    const result = stepMagnetPull(pRef, delta)
    if (result === 'collected') {
      collected.current = true
      gainXp(value)
      logPickup('xp', value)
      onCollect(id)
      return
    }

    // 둥둥 떠있는 플로트 (Y 위아래 + Z 앞뒤로 살짝)
    const t = clock.elapsedTime * 1.8 + seed
    const bobY = Math.sin(t) * 0.06
    const bobZ = Math.cos(t * 0.8) * 0.04
    const p = pRef.current
    groupRef.current.position.set(p.x, p.y + bobY, p.z + bobZ)
    groupRef.current.rotation.y = (clock.elapsedTime - birthSec.current) * 0.6
  })

  return (
    <group ref={groupRef} position={[pos[0], FLOOR_Y, pos[2]]} scale={[0.8, 0.8, 0.8]}>
      {/* 외곽선 */}
      <mesh renderOrder={1} material={outMat} scale={inflateScale([1.06, 1.18, 1.08])}>
        <boxGeometry args={[0.36, 0.08, 0.26]} />
      </mesh>
      {/* 책장 (크림, 아래쪽) */}
      <mesh renderOrder={2} material={pageMat} position={[0, -0.012, 0]}>
        <boxGeometry args={[0.345, 0.05, 0.245]} />
      </mesh>
      {/* 표지 (파랑, 위쪽) */}
      <mesh renderOrder={3} material={coverMat} position={[0, 0.022, 0]}>
        <boxGeometry args={[0.36, 0.04, 0.26]} />
      </mesh>
      {/* 책등 (왼쪽 짧은 변) */}
      <mesh renderOrder={4} material={spineMat} position={[-0.165, 0.005, 0]}>
        <boxGeometry args={[0.04, 0.078, 0.26]} />
      </mesh>
      {/* 제목 띠 (표지 윗면 중앙) */}
      <mesh renderOrder={5} material={titleMat} position={[0.018, 0.044, 0]}>
        <boxGeometry args={[0.20, 0.004, 0.07]} />
      </mesh>
      {/* 제목 줄 (제목 띠 안쪽 짙은 가로선) */}
      <mesh renderOrder={6} material={titleAccentMat} position={[0.018, 0.0465, 0]}>
        <boxGeometry args={[0.16, 0.001, 0.012]} />
      </mesh>
    </group>
  )
}
