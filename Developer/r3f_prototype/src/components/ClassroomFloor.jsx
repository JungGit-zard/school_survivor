/**
 * ClassroomFloor — tile_school_interior_floor
 *
 * 밝은 나무 마루 교실 바닥. 절차적 캔버스 텍스처(256×256)로 생성.
 * - 80~90% 기본 밝은 나무색 (#D4A96A)
 * - 수평 판자 이음새 (어두운 갈색 라인, ~32px 간격)
 * - 수직 이음새 (엇갈린 패턴)
 * - 미세한 나무결 노이즈 + 이음새 하이라이트
 * - 충돌 판정 없음 — 시각 전용
 *
 * 장식 Props (충돌 없음, 시각 전용):
 *   - PropFallenDesk: 쓰러진 책상
 *   - PropWarningTape: 감염 경고 테이프
 *   - PropSafetyCone: 안전 콘
 */

import { useMemo } from 'react'
import * as THREE from 'three'

// ── 상수 ──────────────────────────────────────────────────────────────────────
const FLOOR_SIZE = 96          // 유닛 (넉넉히 96×96)
const TEX_SIZE   = 256         // 텍스처 해상도
const REPEAT     = 12          // UV 반복 횟수

// 나무 마루 색상
const WOOD_BASE_HEX    = '#D4A96A'
const WOOD_DARK_HEX    = '#B5853E'
const SEAM_HEX         = '#8B6030'
const HIGHLIGHT_HEX    = '#E8C48A'
const GRAIN_HEX        = '#C9975A'

// ── 절차적 텍스처 생성 ────────────────────────────────────────────────────────
function buildWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width  = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')

  // 1) 기본 나무 베이지/황갈색 배경
  ctx.fillStyle = WOOD_BASE_HEX
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  // 2) 나무결 노이즈 — 매우 미세한 수평 스트라이프
  for (let y = 0; y < TEX_SIZE; y++) {
    const n = Math.sin(y * 0.47 + 0.3) * 0.5 + Math.sin(y * 1.3) * 0.25
    if (n > 0.1) {
      ctx.fillStyle = GRAIN_HEX
      ctx.globalAlpha = 0.08 + n * 0.06
      ctx.fillRect(0, y, TEX_SIZE, 1)
    } else if (n < -0.25) {
      ctx.fillStyle = WOOD_DARK_HEX
      ctx.globalAlpha = 0.04 + Math.abs(n) * 0.04
      ctx.fillRect(0, y, TEX_SIZE, 1)
    }
  }
  ctx.globalAlpha = 1

  // 3) 수평 판자 이음새 (~32px 간격)
  const PLANK_H = 32
  const seamY = []
  for (let y = PLANK_H; y < TEX_SIZE; y += PLANK_H) {
    seamY.push(y)
    // 이음새 어두운 라인
    ctx.fillStyle = SEAM_HEX
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, y, TEX_SIZE, 2)
    ctx.globalAlpha = 1

    // 이음새 바로 위 하이라이트 (1px)
    ctx.fillStyle = HIGHLIGHT_HEX
    ctx.globalAlpha = 0.28
    ctx.fillRect(0, y - 1, TEX_SIZE, 1)
    ctx.globalAlpha = 1
  }

  // 4) 수직 이음새 — 판자 줄마다 엇갈린 위치
  const PLANK_W = 64
  seamY.forEach((sy, rowIdx) => {
    const offset = (rowIdx % 2 === 0) ? 0 : PLANK_W / 2
    for (let x = offset; x < TEX_SIZE; x += PLANK_W) {
      ctx.fillStyle = SEAM_HEX
      ctx.globalAlpha = 0.45
      ctx.fillRect(x, sy - PLANK_H + 2, 1, PLANK_H - 4)
      ctx.globalAlpha = 1
    }
  })
  // 첫 번째 행도 수직 이음새
  const offset0 = 0
  for (let x = offset0; x < TEX_SIZE; x += PLANK_W) {
    ctx.fillStyle = SEAM_HEX
    ctx.globalAlpha = 0.45
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

// ── ClassroomFloor 컴포넌트 ───────────────────────────────────────────────────
export default function ClassroomFloor() {
  const woodTex = useMemo(() => buildWoodTexture(), [])

  const floorMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map: woodTex,
        color: 0xffffff,  // 텍스처 색상 그대로 사용
      }),
    [woodTex]
  )

  return (
    <group>
      {/* ── 바닥 평면 (시각 전용, 충돌 없음) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <primitive object={floorMat} />
      </mesh>

      {/* ── 장식 Props ── */}
      <PropFallenDesk position={[8, 0, -6]} rotation={[0, 0.4, 0]} />
      <PropFallenDesk position={[-12, 0, 10]} rotation={[0, -0.7, 0]} />
      <PropWarningTape position={[0, 0, -14]} rotation={[0, 0.2, 0]} />
      <PropWarningTape position={[14, 0, 5]} rotation={[0, 1.1, 0]} />
      <PropSafetyCone position={[-7, 0, -9]} />
      <PropSafetyCone position={[5, 0, 12]} />
      <PropSafetyCone position={[-16, 0, 2]} />
    </group>
  )
}

// ── prop_fallen_desk: 쓰러진 책상 ────────────────────────────────────────────
function PropFallenDesk({ position, rotation }) {
  const deskMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0x5C3D1A }),
    []
  )
  const legMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0x3E2710 }),
    []
  )

  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      {/* 책상 상판 — 옆으로 넘어진 상태 */}
      <mesh
        material={deskMat}
        position={[0, 0.1, 0]}
        rotation={[0, 0, Math.PI * 0.07]}
        castShadow
      >
        <boxGeometry args={[1.6, 0.08, 0.7]} />
      </mesh>
      {/* 다리 4개 — 상판 옆쪽으로 튀어나온 느낌 */}
      {[
        [-0.65, 0.22,  0.27],
        [ 0.65, 0.22,  0.27],
        [-0.65, 0.22, -0.27],
        [ 0.65, 0.22, -0.27],
      ].map(([lx, ly, lz], i) => (
        <mesh
          key={i}
          material={legMat}
          position={[lx, ly, lz]}
          rotation={[0, 0, -0.3]}
          castShadow
        >
          <boxGeometry args={[0.06, 0.55, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}

// ── prop_warning_tape: 감염 경고 테이프 ──────────────────────────────────────
function buildTapeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width  = 128
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  // 노란/검정 경고 패턴
  const stripeW = 16
  for (let x = 0; x < 128; x += stripeW * 2) {
    ctx.fillStyle = '#FFD600'
    ctx.fillRect(x, 0, stripeW, 32)
    ctx.fillStyle = '#1A1A1A'
    ctx.fillRect(x + stripeW, 0, stripeW, 32)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PropWarningTape({ position, rotation }) {
  const tapeTex = useMemo(() => buildTapeTexture(), [])
  const tapeMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map: tapeTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    [tapeTex]
  )

  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      <mesh
        material={tapeMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <planeGeometry args={[3.2, 0.22]} />
      </mesh>
    </group>
  )
}

// ── prop_safety_cone: 안전 콘 ─────────────────────────────────────────────────
function PropSafetyCone({ position }) {
  const coneMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xFF6600 }),
    []
  )
  const bandMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xFFFFFF }),
    []
  )
  const baseMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xCC4400 }),
    []
  )

  return (
    <group position={position} renderOrder={1}>
      {/* 베이스 */}
      <mesh material={baseMat} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.18, 0.20, 0.05, 8]} />
      </mesh>
      {/* 콘 본체 */}
      <mesh material={coneMat} position={[0, 0.28, 0]} castShadow>
        <coneGeometry args={[0.12, 0.50, 8]} />
      </mesh>
      {/* 흰 반사띠 */}
      <mesh material={bandMat} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.085, 0.10, 0.05, 8]} />
      </mesh>
    </group>
  )
}
