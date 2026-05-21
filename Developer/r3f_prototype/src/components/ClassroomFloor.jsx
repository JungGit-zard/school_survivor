/**
 * ClassroomFloor — tile_school_interior_floor
 * Stage 1: "버려진 교실" 컨셉
 *
 * 색상 기준: 2026-05-20 stage-graphic-redesign-requirements
 *   주색   0xa99a73 / 밝은변형 0xc9cb9f / 어두운변형 0x805947 / 이음새 0x623333
 *
 * Props (충돌 없음, 시각 전용):
 *   - PropFallenDesk        쓰러진 책상
 *   - PropChairPile         의자 더미
 *   - PropContamLocker      오염된 사물함
 *   - PropWarningTape       감염 경고 테이프
 *   - PropSafetyCone        안전 콘
 *   - PropWindowShadow      깨진 창문 그림자
 *   - PropExamPaper         찢어진 시험지
 *   - PropContamPuddle      정적 오염 웅덩이 (보스 장판과 구분: 저채도·무펄스·얇은 테두리)
 */

import { useMemo } from 'react'
import * as THREE from 'three'

// ── 색상 팔레트 (2026-05-20 문서 기준) ────────────────────────────────────────
const C_BASE    = '#a99a73'   // 주색 마루
const C_LIGHT   = '#c9cb9f'   // 밝은 변형
const C_DARK    = '#805947'   // 어두운 변형
const C_SEAM    = '#623333'   // 이음새
const C_HI      = '#d4c89a'   // 이음새 하이라이트

const FLOOR_SIZE = 96
const TEX_SIZE   = 256
const REPEAT     = 10

// ── 절차적 나무 마루 텍스처 ────────────────────────────────────────────────────
function buildWoodTexture() {
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

// ── ClassroomFloor ────────────────────────────────────────────────────────────
export default function ClassroomFloor() {
  const woodTex = useMemo(() => buildWoodTexture(), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: woodTex }),
    [woodTex]
  )

  return (
    <group>
      {/* 바닥 평면 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <primitive object={floorMat} />
      </mesh>

      {/* ── Props — 외곽 배치, 중앙(±8 유닛) 비워둠 ── */}

      {/* 쓰러진 책상 */}
      <PropFallenDesk position={[ 14,  0, -12]} rotation={[0,  0.5, 0]} />
      <PropFallenDesk position={[-16,  0,  11]} rotation={[0, -0.6, 0]} />
      <PropFallenDesk position={[ 18,  0,  14]} rotation={[0,  1.2, 0]} />

      {/* 의자 더미 */}
      <PropChairPile position={[-10, 0, -15]} rotation={[0, 0.3, 0]} />
      <PropChairPile position={[ 16, 0,   6]} rotation={[0, 2.1, 0]} />

      {/* 오염된 사물함 */}
      <PropContamLocker position={[-18, 0,  -8]} rotation={[0,  0.0, 0]} />
      <PropContamLocker position={[ 17, 0, -14]} rotation={[0, -0.1, 0]} />

      {/* 감염 경고 테이프 */}
      <PropWarningTape position={[  0, 0, -16]} rotation={[0,  0.15, 0]} />
      <PropWarningTape position={[ 12, 0,  16]} rotation={[0, -0.2,  0]} />
      <PropWarningTape position={[-14, 0,   4]} rotation={[0,  1.55, 0]} />

      {/* 안전 콘 */}
      <PropSafetyCone position={[-9,  0, -11]} />
      <PropSafetyCone position={[11,  0,  13]} />
      <PropSafetyCone position={[-17, 0,  15]} />
      <PropSafetyCone position={[ 15, 0,  -5]} />

      {/* 깨진 창문 그림자 */}
      <PropWindowShadow position={[-18, 0.01,  -3]} rotation={[0,  0.1, 0]} />
      <PropWindowShadow position={[ 16, 0.01, -10]} rotation={[0, -0.2, 0]} />

      {/* 찢어진 시험지 */}
      <PropExamPaper position={[ 9,  0.005, -10]} rotation={[0,  0.7, 0]} />
      <PropExamPaper position={[-5,  0.005,  16]} rotation={[0, -1.2, 0]} />
      <PropExamPaper position={[13,  0.005,  10]} rotation={[0,  2.0, 0]} />
      <PropExamPaper position={[-12, 0.005, -14]} rotation={[0,  0.3, 0]} />

      {/* 정적 오염 웅덩이 (저채도 초록, 무펄스 — 보스 장판과 구분) */}
      <PropContamPuddle position={[-11, 0.005, -6]}  scale={1.1} />
      <PropContamPuddle position={[ 13, 0.005,  9]}  scale={0.9} />
      <PropContamPuddle position={[-15, 0.005, 13]}  scale={1.3} />
    </group>
  )
}

// ── PropFallenDesk ────────────────────────────────────────────────────────────
function PropFallenDesk({ position, rotation }) {
  const deskMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x5C3D1A }), [])
  const legMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x3E2710 }), [])
  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      <mesh material={deskMat} position={[0, 0.1, 0]} rotation={[0, 0, Math.PI * 0.07]} castShadow>
        <boxGeometry args={[1.6, 0.08, 0.7]} />
      </mesh>
      {[[-0.65,0.22,0.27],[0.65,0.22,0.27],[-0.65,0.22,-0.27],[0.65,0.22,-0.27]].map(([x,y,z],i) => (
        <mesh key={i} material={legMat} position={[x,y,z]} rotation={[0,0,-0.3]} castShadow>
          <boxGeometry args={[0.06, 0.55, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}

// ── PropChairPile ─────────────────────────────────────────────────────────────
function PropChairPile({ position, rotation }) {
  const mat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x4a2e0e }), [])
  const mat2 = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x6b4520 }), [])
  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      {/* 아래 의자 */}
      <mesh material={mat} position={[0, 0.12, 0]}>
        <boxGeometry args={[0.55, 0.06, 0.55]} />
      </mesh>
      {[[-0.22,0.33,0.22],[0.22,0.33,0.22],[-0.22,0.33,-0.22],[0.22,0.33,-0.22]].map(([x,y,z],i) => (
        <mesh key={i} material={mat} position={[x,y,z]}>
          <boxGeometry args={[0.05, 0.45, 0.05]} />
        </mesh>
      ))}
      {/* 위 의자 — 기울어짐 */}
      <mesh material={mat2} position={[0.1, 0.55, 0.05]} rotation={[0.3, 0.2, 0.15]}>
        <boxGeometry args={[0.50, 0.06, 0.50]} />
      </mesh>
    </group>
  )
}

// ── PropContamLocker ──────────────────────────────────────────────────────────
function PropContamLocker({ position, rotation }) {
  const bodyMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x4a5c4a }), [])
  const contamMat = useMemo(() => new THREE.MeshLambertMaterial({
    color: 0x2d5c2d, transparent: true, opacity: 0.75
  }), [])
  const doorMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: 0x3d4e3d }), [])
  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      {/* 사물함 본체 */}
      <mesh material={bodyMat} position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.55, 1.4, 0.45]} />
      </mesh>
      {/* 문 */}
      <mesh material={doorMat} position={[0, 0.7, 0.23]}>
        <boxGeometry args={[0.50, 1.35, 0.02]} />
      </mesh>
      {/* 오염 흘러내림 — 표면 얼룩 */}
      <mesh material={contamMat} position={[0.1, 0.55, 0.24]}>
        <planeGeometry args={[0.18, 0.6]} />
      </mesh>
      <mesh material={contamMat} position={[-0.08, 0.8, 0.24]}>
        <planeGeometry args={[0.12, 0.35]} />
      </mesh>
    </group>
  )
}

// ── PropWarningTape ───────────────────────────────────────────────────────────
function buildTapeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 32
  const ctx = canvas.getContext('2d')
  for (let x = 0; x < 128; x += 32) {
    ctx.fillStyle = '#FFD600'; ctx.fillRect(x,      0, 16, 32)
    ctx.fillStyle = '#1A1A1A'; ctx.fillRect(x + 16, 0, 16, 32)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PropWarningTape({ position, rotation }) {
  const tex = useMemo(() => buildTapeTexture(), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial({
    map: tex, transparent: true, opacity: 0.88, depthWrite: false
  }), [tex])
  return (
    <group position={position} rotation={rotation} renderOrder={1}>
      <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[3.5, 0.22]} />
      </mesh>
    </group>
  )
}

// ── PropSafetyCone ────────────────────────────────────────────────────────────
function PropSafetyCone({ position }) {
  const coneMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xFF6600 }), [])
  const bandMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xFFFFFF }), [])
  const baseMat = useMemo(() => new THREE.MeshLambertMaterial({ color: 0xCC4400 }), [])
  return (
    <group position={position} renderOrder={1}>
      <mesh material={baseMat} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.18, 0.20, 0.05, 8]} />
      </mesh>
      <mesh material={coneMat} position={[0, 0.28, 0]} castShadow>
        <coneGeometry args={[0.12, 0.50, 8]} />
      </mesh>
      <mesh material={bandMat} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.085, 0.10, 0.05, 8]} />
      </mesh>
    </group>
  )
}

// ── PropWindowShadow — 깨진 창문 그림자 (바닥에 투영) ────────────────────────
function buildWindowShadowTex() {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 128, 128)

  ctx.strokeStyle = 'rgba(30,20,10,0.55)'
  ctx.lineWidth = 3

  // 창문 프레임
  ctx.strokeRect(10, 10, 108, 108)
  // 가로 중간대
  ctx.beginPath(); ctx.moveTo(10, 64); ctx.lineTo(118, 64); ctx.stroke()
  // 세로 중간대
  ctx.beginPath(); ctx.moveTo(64, 10); ctx.lineTo(64, 118); ctx.stroke()
  // 깨진 균열 선
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(64, 64); ctx.lineTo(90, 30); ctx.lineTo(118, 45)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(64, 64); ctx.lineTo(40, 90); ctx.lineTo(15, 80)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PropWindowShadow({ position, rotation }) {
  const tex = useMemo(() => buildWindowShadowTex(), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.55, depthWrite: false
  }), [tex])
  return (
    <mesh material={mat} position={position} rotation={[-Math.PI / 2, 0, rotation?.[1] ?? 0]} renderOrder={1}>
      <planeGeometry args={[3.5, 3.5]} />
    </mesh>
  )
}

// ── PropExamPaper — 찢어진 시험지 ────────────────────────────────────────────
function buildPaperTex() {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 80
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f0ead8'
  ctx.fillRect(0, 0, 64, 80)
  // 글자 흉내 (수평 선)
  ctx.strokeStyle = 'rgba(60,60,80,0.28)'
  ctx.lineWidth = 1
  for (let y = 10; y < 75; y += 8) {
    ctx.beginPath()
    ctx.moveTo(6, y); ctx.lineTo(58, y); ctx.stroke()
  }
  // 찢긴 하단 가장자리
  ctx.fillStyle = '#f0ead8'
  ctx.beginPath()
  ctx.moveTo(0, 60)
  for (let x = 0; x < 64; x += 8) {
    ctx.lineTo(x + 4, 60 + (Math.sin(x * 0.7) * 5 + 5))
  }
  ctx.lineTo(64, 60); ctx.lineTo(64, 80); ctx.lineTo(0, 80)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PropExamPaper({ position, rotation }) {
  const tex = useMemo(() => buildPaperTex(), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial({
    map: tex, transparent: true, opacity: 0.90, depthWrite: false
  }), [tex])
  return (
    <mesh material={mat} position={position} rotation={[-Math.PI / 2, 0, rotation?.[1] ?? 0]} renderOrder={1}>
      <planeGeometry args={[0.45, 0.58]} />
    </mesh>
  )
}

// ── PropContamPuddle — 정적 오염 웅덩이 ──────────────────────────────────────
// 보스 동적 장판과 구분:
//   - 저채도 탁한 녹색 (vs 보스: 선명한 형광 녹색)
//   - 펄스 애니메이션 없음 (vs 보스: 펄스 있음)
//   - 얇고 희미한 외곽선 (vs 보스: 두꺼운 외곽선)
//   - 낮은 불투명도
function buildPuddleTex() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  const cx = 64, cy = 64, r = 52

  // 바깥 테두리 (얇음)
  ctx.strokeStyle = 'rgba(50,90,40,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= 360; i += 12) {
    const a = (i * Math.PI) / 180
    const rr = r + Math.sin(i * 0.33) * 7
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath(); ctx.stroke()

  // 내부 채우기 (탁하고 어두운 녹색 — 저채도)
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0,   'rgba(55,80,40,0.60)')
  grad.addColorStop(0.6, 'rgba(45,70,35,0.45)')
  grad.addColorStop(1,   'rgba(30,55,25,0.10)')
  ctx.fillStyle = grad
  ctx.beginPath()
  for (let i = 0; i <= 360; i += 12) {
    const a = (i * Math.PI) / 180
    const rr = r + Math.sin(i * 0.33) * 7
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath(); ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function PropContamPuddle({ position, scale = 1 }) {
  const tex = useMemo(() => buildPuddleTex(), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.70, depthWrite: false
  }), [tex])
  const s = scale * 2.2
  return (
    <mesh
      material={mat}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[s, s, 1]}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
