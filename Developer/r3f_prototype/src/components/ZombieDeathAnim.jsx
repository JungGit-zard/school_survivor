/**
 * ZombieDeathAnim — 좀비 사망 원피스 애니메이션
 *
 * Phase 1 "털썩" (0–300ms): 전체 좀비가 빠르게 주저앉음 (Y축 스케일 압축 + 약간 앞으로 기움)
 * Phase 2 "퍽"  (300–620ms): 옆으로 쓰러짐 (Z축 회전 → 땅에 누음)
 * Phase 3 fade  (620–780ms): 불투명도 0으로 소멸 → onDone 호출
 */
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { toonMat, outlineMat, inflateScale } from '../lib/toon.js'
import { ZOMBIE_COLLAPSE_PARTS } from '../lib/enemyDeathCollapse.js'
import { ZOMBIE_PALETTE } from './ZombieMesh.jsx'

const SLUMP_MS = 300
const FALL_MS  = 620
const FADE_MS  = 780

// 아웃라인 스케일 상수
const OUTLINE_DARK = outlineMat(0.92)

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
function easeInQuad(t)   { return t * t }

export default function ZombieDeathAnim({ id, type, position, visualScale, facingY, onDone }) {
  const outerRef  = useRef()   // 위치+facing 고정
  const pivotRef  = useRef()   // 픽업 피벗 (발 높이 기준 회전)
  const bodyRef   = useRef()   // 털썩 압축용
  const matsRef   = useRef([])
  const startedAt = useRef(performance.now())
  const doneRef   = useRef(false)

  const palette = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01

  // 파트별 material 배열 생성 (투명도 제어 가능)
  const partMats = useMemo(() => {
    return ZOMBIE_COLLAPSE_PARTS.map((part) => {
      const hex = part.color === 'foot' ? 0x1a1a1a
        : part.color === 'eye'  ? palette.eye
        : part.color === 'skin' ? palette.skin
        : palette.body
      const emissive = part.color === 'eye' ? 0.9 : 0.12
      const m = toonMat(hex, emissive)
      m.transparent  = true
      m.opacity      = 1
      m.depthWrite   = false
      return m
    })
  }, [palette])

  // 아웃라인 mat (공유 인스턴스 사용)
  const outMat = useMemo(() => {
    const m = outlineMat(0.88)
    m.transparent = true
    m.opacity     = 0.88
    m.depthWrite  = false
    return m
  }, [])

  matsRef.current = partMats

  useEffect(() => {
    const t = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone?.(id) }
    }, FADE_MS + 60)
    return () => clearTimeout(t)
  }, [id, onDone])

  useEffect(() => () => {
    partMats.forEach((m) => m.dispose())
    outMat.dispose()
  }, [partMats, outMat])

  useFrame(() => {
    if (!outerRef.current || !pivotRef.current || !bodyRef.current) return
    const elapsed = performance.now() - startedAt.current

    if (elapsed < SLUMP_MS) {
      // 털썩: 빠르게 주저앉음 — Y 스케일 압축 + 약간 앞기울기
      const t  = elapsed / SLUMP_MS
      const e  = easeOutCubic(t)
      bodyRef.current.scale.y    = 1 - e * 0.55   // 아래로 납작해짐
      bodyRef.current.rotation.x = e * 0.30         // 살짝 앞으로 기움
      pivotRef.current.rotation.z = 0

    } else if (elapsed < FALL_MS) {
      // 퍽: 옆으로 쓰러짐 — Z축 회전 (발 기준 피벗)
      const t  = (elapsed - SLUMP_MS) / (FALL_MS - SLUMP_MS)
      const e  = easeInQuad(t)
      bodyRef.current.scale.y    = 0.45            // 주저앉은 높이 유지
      bodyRef.current.rotation.x = 0.30
      pivotRef.current.rotation.z = e * (Math.PI / 2)   // 0 → 90° 쓰러짐

    } else {
      // fade: 불투명도 감소
      pivotRef.current.rotation.z = Math.PI / 2
      bodyRef.current.scale.y    = 0.45
      const t = Math.min(1, (elapsed - FALL_MS) / (FADE_MS - FALL_MS))
      const opacity = 1 - t
      matsRef.current.forEach((m) => { m.opacity = Math.max(0, opacity) })
      outMat.opacity = Math.max(0, opacity * 0.88)
      if (t >= 1 && !doneRef.current) {
        doneRef.current = true
        onDone?.(id)
      }
    }
  })

  const s = visualScale

  return (
    // outerRef: 월드 위치 + 사망 시 방향각 고정
    <group ref={outerRef} position={position} rotation={[0, facingY ?? 0, 0]}>
      {/* pivotRef: 쓰러질 때 Z 회전 피벗 (발 위치 기준) */}
      <group ref={pivotRef}>
        {/* bodyRef: 털썩 압축(Y scale) + 앞기울기 */}
        <group ref={bodyRef}>
          {ZOMBIE_COLLAPSE_PARTS.map((part, i) => {
            const size = part.size.map((v) => v * s)
            const pos  = part.offset.map((v) => v * s)
            const rot  = part.rotation ?? [0, 0, 0]
            const os   = inflateScale(part.outlineScale ?? 1.06)
            return (
              <group key={part.key} position={pos} rotation={rot}>
                <mesh renderOrder={1} material={outMat} scale={[os, os, os]}>
                  <boxGeometry args={size} />
                </mesh>
                <mesh renderOrder={2} material={partMats[i]}>
                  <boxGeometry args={size} />
                </mesh>
              </group>
            )
          })}
        </group>
      </group>
    </group>
  )
}
