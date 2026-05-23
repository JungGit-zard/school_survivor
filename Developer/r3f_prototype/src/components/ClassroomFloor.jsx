/**
 * ClassroomFloor — tile_school_interior_floor
 * Stage 1: "버려진 교실" 컨셉 — 바닥 텍스처 only.
 *
 * 색상 기준: 2026-05-20 stage-graphic-redesign-requirements
 *   주색   0xa99a73 / 밝은변형 0xc9cb9f / 어두운변형 0x805947 / 이음새 0x623333
 *
 * Props·atmosphere overlay는 별도 컴포넌트 (StageProps) 가 정본.
 *   src/lib/stagePropsLayout.js (데이터)
 *   src/components/StageProps.jsx (dispatch)
 *   src/components/Props/*, src/components/Atmosphere/* (구현)
 *
 * 본 파일에 인라인 prop 배치를 추가하지 말 것 — 이중 렌더링·중앙 침범 회귀가 됨.
 * 정책: docs/plans/2026-05-22-001-feat-stage1-abandoned-classroom-graphics-plan.md
 */

import { useMemo } from 'react'
import * as THREE from 'three'

const C_BASE  = '#a99a73'
const C_LIGHT = '#c9cb9f'
const C_DARK  = '#805947'
const C_SEAM  = '#623333'
const C_HI    = '#d4c89a'

const FLOOR_SIZE = 96
const TEX_SIZE   = 256
const REPEAT     = 10

function buildWoodTexture() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = C_BASE
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  // 나무결 노이즈
  for (let y = 0; y < TEX_SIZE; y++) {
    const n = Math.sin(y * 0.51 + 1.1) * 0.5 + Math.sin(y * 1.7) * 0.25
    if (n > 0.1) {
      ctx.fillStyle = C_LIGHT
      ctx.globalAlpha = 0.07 + n * 0.05
      ctx.fillRect(0, y, TEX_SIZE, 1)
    } else if (n < -0.2) {
      ctx.fillStyle = C_DARK
      ctx.globalAlpha = 0.05 + Math.abs(n) * 0.05
      ctx.fillRect(0, y, TEX_SIZE, 1)
    }
  }
  ctx.globalAlpha = 1

  // 수평 판자 이음새 (32px)
  const PLANK_H = 32
  const seamY = []
  for (let y = PLANK_H; y < TEX_SIZE; y += PLANK_H) {
    seamY.push(y)
    ctx.fillStyle = C_SEAM;  ctx.globalAlpha = 0.70
    ctx.fillRect(0, y, TEX_SIZE, 2)
    ctx.fillStyle = C_HI;    ctx.globalAlpha = 0.25
    ctx.fillRect(0, y - 1, TEX_SIZE, 1)
    ctx.globalAlpha = 1
  }

  // 수직 이음새 (엇갈린)
  const PLANK_W = 64
  seamY.forEach((sy, rowIdx) => {
    const off = rowIdx % 2 === 0 ? 0 : PLANK_W / 2
    for (let x = off; x < TEX_SIZE; x += PLANK_W) {
      ctx.fillStyle = C_SEAM; ctx.globalAlpha = 0.40
      ctx.fillRect(x, sy - PLANK_H + 2, 1, PLANK_H - 4)
      ctx.globalAlpha = 1
    }
  })
  for (let x = 0; x < TEX_SIZE; x += PLANK_W) {
    ctx.fillStyle = C_SEAM; ctx.globalAlpha = 0.40
    ctx.fillRect(x, 2, 1, PLANK_H - 4)
    ctx.globalAlpha = 1
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(REPEAT, REPEAT)
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor() {
  const woodTex = useMemo(() => buildWoodTexture(), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: woodTex }),
    [woodTex]
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <primitive object={floorMat} />
    </mesh>
  )
}
