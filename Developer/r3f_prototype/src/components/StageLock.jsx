import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import StudioTunedGroup from './StudioTunedGroup.jsx'
import { STAGE_LOCK_STUDIO_ITEM_ID } from '../lib/graphicsStudioConfig.js'
import {
  getCachedBoxGeo,
  getCachedChamferedBoxGeo,
  getCachedCylinderGeo,
  getCachedToonMat,
  getSharedOutlineMat,
  inflateScale,
} from '../lib/toon.js'

const GOLD = 0xf5b82e
const GOLD_DARK = 0xc78618
const SILVER = 0xd8dde6
const KEYHOLE = 0x151312

// 2026-11-21 Terry "자물쇠 두께 만들어줘 / 모델링 손좀 봐": 옆에서 봐도 덩어리로 보이는 두꺼운 몸통
// (깊이 = 폭의 55%, 모서리 둥글림), 둥근 관 모양 고리, 앞·뒤 판과 열쇠구멍. 좌우·앞뒤 대칭이고
// 몸통 중심이 x=0·z=0 이라 세로축으로 돌려도 흔들리지 않는다.
export const STAGE_LOCK_BODY = { w: 0.92, h: 0.74, d: 0.5, y: 0.3 }
const BODY = STAGE_LOCK_BODY
const BODY_TOP = BODY.y + BODY.h / 2
const SHACKLE = { span: 0.27, tube: 0.075, legBottom: BODY_TOP - 0.1, arcY: 0.9 }
const TUBE_OUTLINE = 0.026
const PLATE = { w: 0.6, h: 0.5, d: 0.04 }
const PLATE_Z = BODY.d / 2 + PLATE.d / 2 - 0.01
const KEYHOLE_Z = PLATE_Z + PLATE.d / 2 + 0.006
// 모델 외곽 상자(-0.07 ~ 1.245)의 세로 중앙. 미리보기에서 이만큼 내려 화면 정중앙에 둔다.
export const STAGE_LOCK_CENTER_Y = 0.59

const _torusCache = new Map()
function getCachedHalfTorusGeo(radius, tube) {
  const key = `${radius},${tube}`
  let g = _torusCache.get(key)
  // 반원 고리: 8각 단면 × 10토막이면 이 크기에서 충분히 둥글다.
  if (!g) { g = new THREE.TorusGeometry(radius, tube, 8, 10, Math.PI); _torusCache.set(key, g) }
  return g
}

function LockBody() {
  const geometry = getCachedChamferedBoxGeo(BODY.w, BODY.h, BODY.d, 2, 0.22)
  const os = inflateScale(1.035)
  return (
    <group name="body" position={[0, BODY.y, 0]} userData={{ stageLockPart: 'body' }}>
      <mesh renderOrder={1} geometry={geometry} material={getSharedOutlineMat()} scale={[os, os, os]} userData={{ studioRenderOutline: true }} />
      <mesh renderOrder={2} geometry={geometry} material={getCachedToonMat(GOLD, 0.18)} />
    </group>
  )
}

function ShackleLeg({ name, x }) {
  const length = SHACKLE.arcY - SHACKLE.legBottom
  return (
    <group name={name} position={[x, SHACKLE.legBottom + length / 2, 0]} userData={{ stageLockPart: name }}>
      <mesh renderOrder={1} geometry={getCachedCylinderGeo(SHACKLE.tube + TUBE_OUTLINE, SHACKLE.tube + TUBE_OUTLINE, length, 10)} material={getSharedOutlineMat()} userData={{ studioRenderOutline: true }} />
      <mesh renderOrder={2} geometry={getCachedCylinderGeo(SHACKLE.tube, SHACKLE.tube, length, 10)} material={getCachedToonMat(SILVER, 0.08)} />
    </group>
  )
}

function ShackleArc() {
  return (
    <group name="shackle-top" position={[0, SHACKLE.arcY, 0]} userData={{ stageLockPart: 'shackle-top' }}>
      <mesh renderOrder={1} geometry={getCachedHalfTorusGeo(SHACKLE.span, SHACKLE.tube + TUBE_OUTLINE)} material={getSharedOutlineMat()} userData={{ studioRenderOutline: true }} />
      <mesh renderOrder={2} geometry={getCachedHalfTorusGeo(SHACKLE.span, SHACKLE.tube)} material={getCachedToonMat(SILVER, 0.08)} />
    </group>
  )
}

function Collar({ name, x }) {
  return (
    <group name={name} position={[x, BODY_TOP + 0.02, 0]} userData={{ stageLockPart: 'collar' }}>
      <mesh renderOrder={2} geometry={getCachedChamferedBoxGeo(0.2, 0.07, 0.2, 1, 0.3)} material={getCachedToonMat(GOLD_DARK, 0.14)} />
    </group>
  )
}

// 앞·뒤 판 + 열쇠구멍(동그라미 + 아래 홈). 판은 몸통보다 살짝 어두운 금색이라 두께감이 더 산다.
function Face({ name, side }) {
  const dark = getCachedToonMat(KEYHOLE, 0.02)
  return (
    <group name={name} rotation={[0, side < 0 ? Math.PI : 0, 0]} userData={{ stageLockPart: 'keyhole' }}>
      <mesh renderOrder={2} position={[0, BODY.y, PLATE_Z]} geometry={getCachedChamferedBoxGeo(PLATE.w, PLATE.h, PLATE.d, 1, 0.4)} material={getCachedToonMat(GOLD_DARK, 0.16)} />
      <mesh renderOrder={3} position={[0, BODY.y + 0.05, KEYHOLE_Z]} rotation={[Math.PI / 2, 0, 0]} geometry={getCachedCylinderGeo(0.075, 0.075, 0.018, 10)} material={dark} />
      <mesh renderOrder={3} position={[0, BODY.y - 0.06, KEYHOLE_Z]} geometry={getCachedBoxGeo(0.055, 0.17, 0.018)} material={dark} />
    </group>
  )
}

function StageLockCore() {
  return (
    <group name="stage-lock-low-poly">
      <LockBody />
      <ShackleLeg name="shackle-left" x={-SHACKLE.span} />
      <ShackleArc />
      <ShackleLeg name="shackle-right" x={SHACKLE.span} />
      <Collar name="collar-left" x={-SHACKLE.span} />
      <Collar name="collar-right" x={SHACKLE.span} />
      <Face name="keyhole" side={1} />
      <Face name="keyhole-back" side={-1} />
    </group>
  )
}

export function StageLockModel() {
  return (
    <StudioTunedGroup itemId={STAGE_LOCK_STUDIO_ITEM_ID}>
      <StageLockCore />
    </StudioTunedGroup>
  )
}

// ── 회전 ─────────────────────────────────────────────────────────────────────
// 모델 자체를 세로축으로 3초에 한 바퀴 돌린다. 모든 자물쇠 캔버스가 rAF 하나를 공유하고,
// 화면에 보이는 캔버스만 30fps로 다시 그린다(frameloop="demand" + invalidate). 탭이 숨겨지면 rAF가 멈추고,
// 보이는 자물쇠가 하나도 없으면 rAF 자체를 끈다. React 상태는 프레임마다 바꾸지 않는다.
export const STAGE_LOCK_SPIN_MS = 3000
export const STAGE_LOCK_STILL_ANGLE = -0.62 // 움직임 줄이기: 3/4 정면에서 멈춤
const SPIN_FRAME_MS = 1000 / 30

const spinners = new Set()
let rafId = 0
let lastDraw = -Infinity

function anyVisible() {
  for (const s of spinners) if (s.visible) return true
  return false
}

function spinTick(now) {
  rafId = 0
  if (!anyVisible()) return
  rafId = requestAnimationFrame(spinTick)
  if (typeof document !== 'undefined' && document.hidden) return
  if (now >= lastDraw && now - lastDraw < SPIN_FRAME_MS - 1) return
  lastDraw = now
  const angle = ((now % STAGE_LOCK_SPIN_MS) / STAGE_LOCK_SPIN_MS) * Math.PI * 2
  for (const s of spinners) {
    if (!s.visible || !s.group?.rotation) continue
    s.group.rotation.y = angle
    s.invalidate()
  }
}

function ensureSpinLoop() {
  if (rafId || typeof requestAnimationFrame !== 'function' || !anyVisible()) return
  rafId = requestAnimationFrame(spinTick)
}

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null
    if (!mq?.addEventListener) return undefined
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function SpinningLock({ spin }) {
  const groupRef = useRef(null)
  const invalidate = useThree((state) => state.invalidate)
  const domElement = useThree((state) => state.gl?.domElement)

  useEffect(() => {
    const group = groupRef.current
    if (!group) return undefined
    if (!spin) {
      if (group.rotation) group.rotation.y = STAGE_LOCK_STILL_ANGLE
      invalidate()
      return undefined
    }
    const entry = { group, invalidate, visible: true }
    spinners.add(entry)
    let observer = null
    if (domElement && typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver((records) => {
        const record = records[records.length - 1]
        entry.visible = !!record?.isIntersecting
        if (entry.visible) ensureSpinLoop()
      })
      observer.observe(domElement)
    }
    ensureSpinLoop()
    return () => {
      observer?.disconnect()
      spinners.delete(entry)
      if (rafId && !anyVisible() && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }
  }, [spin, invalidate, domElement])

  return (
    <group ref={groupRef} name="stage-lock-spin" rotation={[0, STAGE_LOCK_STILL_ANGLE, 0]}>
      <group position={[0, -STAGE_LOCK_CENTER_Y, 0]}>
        <StageLockModel />
      </group>
    </group>
  )
}

// card: 로비 스테이지 카드(글자가 위에 겹치므로 예전 크기 유지). icon: 미션센터처럼 자물쇠가 주인공인 칸.
const FRAMINGS = {
  card: { position: [0, 1.0, 4.1], fov: 34 },
  icon: { position: [0, 0.62, 2.75], fov: 34 },
}

export function StageLockPreview({ style = null, testId = 'stage-lock-preview', ariaLabel = '잠긴 스테이지 3D 자물쇠', spin = true, framing = 'card' }) {
  const reducedMotion = useReducedMotion()
  const spinning = spin && !reducedMotion
  const cam = FRAMINGS[framing] ?? FRAMINGS.card
  return (
    <Canvas
      frameloop="demand"
      data-testid={testId}
      data-spinning={spinning ? 'true' : 'false'}
      aria-label={ariaLabel}
      camera={{ position: cam.position, fov: cam.fov, near: 0.01, far: 30 }}
      gl={{ stencil: true, antialias: true, powerPreference: 'low-power' }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', background: 'transparent', ...style }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <SpinningLock spin={spinning} />
    </Canvas>
  )
}

export default StageLockModel
