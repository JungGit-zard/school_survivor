// 모든 일회성 VFX 이벤트를 한 곳에서 렌더하고 수명 만료 시 정리하는 공유 레이어.
// 근거: Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md §4

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { subscribeVfx } from '../lib/vfxEvents.js'
import { VFX_COLORS } from '../lib/vfxPalette.js'
import { fadeAlpha } from '../lib/vfxMath.js'
import { getChargeWarningArrowConfig } from '../lib/vfxGeometry.js'
import { useGameStore } from '../store/useGameStore.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'

// Plan §4-3 / §5 권장 동시 효과 상한.
const MAX_ACTIVE = 80

// ── 효과 1: HitSpark — 무기 적중 지점 작은 별/십자 ────────────────────────────
export function HitSpark({ event, onDone }) {
  const ref = useRef()
  const matRef = useRef()
  const LIFE = event.life ?? 220
  const shardAngles = useMemo(() => [0, Math.PI / 2, Math.PI, Math.PI * 1.5], [])

  // STUDIO_OUTER_MOTION_ONLY — 이 useFrame은 StudioTunedGroup의 바깥 그룹만 움직인다.
  // 스튜디오 파츠는 건드리지 않으므로 튜닝을 덮어쓰지 않고 부모 변형으로 곱해질 뿐이다.
  useFrame(() => {
    if (!ref.current) return
    const age = performance.now() - event.startMs
    if (age >= LIFE) { onDone(event.id); return }
    const t = age / LIFE
    const pop = Math.sin(t * Math.PI)
    const scale = (event.baseScale ?? 0.18) + t * (event.growScale ?? 0.30)
    ref.current.scale.setScalar(scale)
    ref.current.rotation.y += 0.32
    if (matRef.current) matRef.current.opacity = Math.max(0, 1 - t * t) * (0.75 + pop * 0.25)
  })

  return (
    <StudioTunedGroup itemId="vfx-hit-spark">
      <group ref={ref} position={[event.x, event.y ?? 0.42, event.z]}>
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          ref={matRef}
          color={event.color ?? VFX_COLORS.stunYellow}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>
      {shardAngles.map((angle) => (
        <mesh key={angle} position={[Math.sin(angle) * 0.9, 0, Math.cos(angle) * 0.9]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.24, 0.08, 0.52]} />
          <meshBasicMaterial
            color={event.color ?? VFX_COLORS.stunYellow}
            transparent
            opacity={0.86}
            depthWrite={false}
          />
        </mesh>
      ))}
      </group>
    </StudioTunedGroup>
  )
}

// ── 효과 1b: CriticalHitBurst — 치명타 전용 별폭발 + 충격 링 ───────────────────
export function CriticalHitBurst({ event, onDone }) {
  const ref = useRef()
  const ringRef = useRef()
  const coreMatRef = useRef()
  const criticalFlashMatRef = useRef()
  const ringMatRef = useRef()
  const shardMatRefs = useRef([])
  const LIFE = event.life ?? 180
  const shardAngles = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), [])
  const strongScale = event.strong ? 1.28 : 1

  useFrame(() => {
    if (!ref.current) return
    const age = performance.now() - event.startMs
    if (age >= LIFE) { onDone(event.id); return }
    const t = age / LIFE
    const pop = Math.sin(t * Math.PI)
    const scale = ((event.baseScale ?? 0.113) + t * (event.growScale ?? 0.207)) * strongScale
    ref.current.scale.setScalar(scale)
    ref.current.rotation.y += 0.42
    if (ringRef.current) ringRef.current.scale.setScalar(1 + t * 1.7)
    const opacity = Math.max(0, 1 - t * t) * (0.72 + pop * 0.28)
    if (coreMatRef.current) coreMatRef.current.opacity = opacity
    if (criticalFlashMatRef.current) criticalFlashMatRef.current.opacity = Math.max(0, 1 - age / 60)
    if (ringMatRef.current) ringMatRef.current.opacity = Math.max(0, 0.78 * (1 - t))
    const shardOpacity = Math.max(0, 0.92 * (1 - t * 0.85))
    shardMatRefs.current.forEach((mat) => { if (mat) mat.opacity = shardOpacity })
  })

  return (
    <StudioTunedGroup itemId="vfx-critical-hit-burst">
      <group ref={ref} position={[event.x, event.y ?? 0.58, event.z]}>
        <mesh>
          <octahedronGeometry args={[1.05, 0]} />
          <meshBasicMaterial
            ref={coreMatRef}
            color={VFX_COLORS.criticalGold}
            transparent
            opacity={1}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh scale={[1.45, 1.45, 1.45]}>
          <octahedronGeometry args={[1.02, 0]} />
          <meshBasicMaterial
            ref={criticalFlashMatRef}
            color={0xffffff}
            transparent
            opacity={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.14, 24]} />
          <meshBasicMaterial
            ref={ringMatRef}
            color={VFX_COLORS.criticalOrange}
            transparent
            opacity={0.78}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {shardAngles.map((angle, index) => (
          <mesh
            key={angle}
            position={[Math.sin(angle) * 1.18, index % 2 === 0 ? 0.05 : -0.02, Math.cos(angle) * 1.18]}
            rotation={[0, angle, index % 2 === 0 ? 0.25 : -0.25]}
          >
            <boxGeometry args={[0.22, 0.08, 0.88]} />
            <meshBasicMaterial
              ref={(mat) => { if (mat) shardMatRefs.current[index] = mat }}
              color={index % 2 === 0 ? VFX_COLORS.criticalCream : VFX_COLORS.criticalOrange}
              transparent
              opacity={0.92}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </StudioTunedGroup>
  )
}

// ── 효과 2: ChargeWarningLine — E05/B01 돌진 예고 라인 ────────────────────────
export function ChargeWarningLine({ event, onDone }) {
  const meshRef = useRef()
  const matRef  = useRef()
  const LIFE    = event.life ?? 700
  const length  = event.length ?? 4.5
  const angle   = event.angle ?? 0
  const color   = event.color ?? VFX_COLORS.chargeOrange
  const arrowShape = useMemo(() => {
    const shape = new THREE.Shape()
    const config = getChargeWarningArrowConfig({ width: event.width, length })
    const [first, ...rest] = config.points
    shape.moveTo(first[0], first[1])
    rest.forEach(([x, y]) => shape.lineTo(x, y))
    shape.closePath()
    return shape
  }, [event.width, length])

  useFrame(() => {
    const age = performance.now() - event.startMs
    if (age >= LIFE) { onDone(event.id); return }
    const t = age / LIFE
    // 깜빡이며 알파 감쇠 → 다급함 표현
    const blink = 0.55 + 0.30 * Math.sin(t * Math.PI * 6)
    if (matRef.current) matRef.current.opacity = blink * fadeAlpha(t, 0.05, 0.25)
  })

  // 적 중심에서 charge 방향으로 length만큼 뻗는 사각 plane.
  // angle은 atan2(dx, dz) 형식. plane은 XZ 바닥에 깔리도록 회전.
  const cx = event.x + Math.sin(angle) * length / 2
  const cz = event.z + Math.cos(angle) * length / 2

  return (
    <StudioTunedGroup itemId="vfx-charge-warning">
      <mesh
        ref={meshRef}
        position={[cx, 0.03, cz]}
        rotation={[-Math.PI / 2, 0, -angle]}
      >
        <shapeGeometry args={[arrowShape]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </StudioTunedGroup>
  )
}

// ── 효과 3: PickupPop — 드랍 스폰 시 살짝 솟는 링 ──────────────────────────────
export function PickupPop({ event, onDone }) {
  const ref    = useRef()
  const matRef = useRef()
  const LIFE   = event.life ?? 300
  const baseY  = event.y ?? 0.18
  const color  = event.color ?? VFX_COLORS.xpGreen

  useFrame(() => {
    if (!ref.current) return
    const age = performance.now() - event.startMs
    if (age >= LIFE) { onDone(event.id); return }
    const t = age / LIFE
    const scale = 0.4 + t * 0.7
    ref.current.scale.set(scale, 1, scale)
    ref.current.position.y = baseY + t * 0.32
    if (matRef.current) matRef.current.opacity = 0.7 * (1 - t)
  })

  return (
    <StudioTunedGroup itemId="vfx-pickup-pop">
      <mesh ref={ref} position={[event.x, baseY, event.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.26, 18]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </StudioTunedGroup>
  )
}

// type 별 렌더러 매핑. 새 효과 타입 추가는 여기에 한 줄 등록.
const RENDERERS = {
  hitSpark:           HitSpark,
  criticalHitBurst:   CriticalHitBurst,
  chargeWarningLine:  ChargeWarningLine,
  pickupPop:          PickupPop,
}

export default function VFXLayer() {
  const [events, setEvents] = useState([])
  const eventsRef = useRef([])
  const pendingRef = useRef(false)
  const gameKey = useGameStore((s) => s.gameKey)

  // 동일 마이크로태스크 내 다수 emit/onDone 호출을 setState 1회로 합친다.
  // 1 프레임에 여러 effect가 추가/완료되어도 React 리스트 reconciliation은 한 번만.
  const flushPending = useCallback(() => {
    if (pendingRef.current) return
    pendingRef.current = true
    queueMicrotask(() => {
      pendingRef.current = false
      setEvents([...eventsRef.current])
    })
  }, [])

  // 게임 재시작(gameKey 증분) 시 잔여 이벤트 클리어.
  useEffect(() => {
    eventsRef.current = []
    setEvents([])
  }, [gameKey])

  useEffect(() => {
    return subscribeVfx((event) => {
      eventsRef.current.push(event)
      // 상한 초과 시 가장 오래된 것부터 버림 (in-place로 스프레드 없이 처리).
      if (eventsRef.current.length > MAX_ACTIVE) {
        eventsRef.current = eventsRef.current.slice(eventsRef.current.length - MAX_ACTIVE)
      }
      flushPending()
    })
  }, [flushPending])

  const onDone = useCallback((id) => {
    const idx = eventsRef.current.findIndex((e) => e.id === id)
    if (idx !== -1) eventsRef.current.splice(idx, 1)
    flushPending()
  }, [flushPending])

  return (
    <>
      {events.map((e) => {
        const Renderer = RENDERERS[e.type]
        if (!Renderer) return null
        return <Renderer key={e.id} event={e} onDone={onDone} />
      })}
    </>
  )
}
