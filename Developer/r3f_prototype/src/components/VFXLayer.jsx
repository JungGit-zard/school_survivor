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

// 게임 런타임은 월드 XZ 배치를 StudioTunedGroup **바깥** 그룹이 맡는다. 그래야 Studio 루트
// scale/rotation/position이 월드 원점이 아니라 효과 자리를 기준으로 걸린다(미리보기와 같은 기준).
// Studio 미리보기는 anchored 없이 렌더하므로 미리보기 트리와 파츠 경로는 그대로다.
function VfxAnchor({ anchored, x, z, children }) {
  if (!anchored) return children
  return <group position={[x, 0, z]}>{children}</group>
}

// Studio 재질 튜닝은 메시 재질을 복제본으로 교체한다. 마운트 때 잡은 JSX 재질이 아니라
// 지금 메시에 붙어 있는 재질에 투명도를 써야 페이드가 유지된다.
function setLiveOpacity(mesh, opacity) {
  const material = mesh?.material
  if (material) material.opacity = opacity
}

// ── 효과 1: HitSpark — 무기 적중 지점 작은 별/십자 ────────────────────────────
export function HitSpark({ event, onDone, anchored = false }) {
  const ref = useRef()
  const meshRef = useRef()
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
    setLiveOpacity(meshRef.current, Math.max(0, 1 - t * t) * (0.75 + pop * 0.25))
  })

  return (
    <VfxAnchor anchored={anchored} x={event.x} z={event.z}>
    <StudioTunedGroup itemId="vfx-hit-spark">
      <group ref={ref} position={[anchored ? 0 : event.x, event.y ?? 0.42, anchored ? 0 : event.z]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
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
    </VfxAnchor>
  )
}

// ── 효과 1b: CriticalHitBurst — 치명타 전용 큰 별 1개 팝 ───────────────────
export function CriticalHitBurst({ event, onDone, anchored = false }) {
  const ref = useRef()
  const starMeshRef = useRef()
  const LIFE = event.life ?? 180
  const strongScale = event.strong ? 1.18 : 1
  const starShape = useMemo(() => {
    const shape = new THREE.Shape()
    const outer = 1
    const inner = 0.45
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner
      const angle = -Math.PI / 2 + i * Math.PI / 5
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const age = performance.now() - event.startMs
    if (age >= LIFE) { onDone(event.id); return }
    const t = age / LIFE
    const pop = Math.sin(t * Math.PI)
    const scale = ((event.baseScale ?? 0.34) + pop * (event.growScale ?? 0.30)) * strongScale
    ref.current.scale.setScalar(scale)
    ref.current.rotation.z += 0.045
    setLiveOpacity(starMeshRef.current, Math.max(0, 1 - t * t) * (0.72 + pop * 0.28))
  })

  return (
    <VfxAnchor anchored={anchored} x={event.x} z={event.z}>
    <StudioTunedGroup itemId="vfx-critical-hit-burst">
      <group ref={ref} position={[anchored ? 0 : event.x, event.y ?? 0.72, anchored ? 0 : event.z]} rotation={[-0.35, 0, 0]}>
        <mesh ref={starMeshRef}>
          <shapeGeometry args={[starShape]} />
          <meshBasicMaterial
            color={VFX_COLORS.criticalGold}
            transparent
            opacity={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </StudioTunedGroup>
    </VfxAnchor>
  )
}

// ── 효과 2: ChargeWarningLine — E05/B01 돌진 예고 라인 ────────────────────────
export function ChargeWarningLine({ event, onDone, anchored = false }) {
  const meshRef = useRef()
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
    setLiveOpacity(meshRef.current, blink * fadeAlpha(t, 0.05, 0.25))
  })

  // 적 중심에서 charge 방향으로 length만큼 뻗는 사각 plane.
  // angle은 atan2(dx, dz) 형식. plane은 XZ 바닥에 깔리도록 회전.
  // 화살표 도형의 끝은 로컬 +Y다. X축 +π/2 → Z축 -angle 순서여야 끝이 (sin a, 0, cos a),
  // 즉 돌진 방향을 가리킨다(-π/2면 Z가 뒤집혀 돌진 반대쪽을 가리킨다). 재질은 DoubleSide.
  const cx = event.x + Math.sin(angle) * length / 2
  const cz = event.z + Math.cos(angle) * length / 2

  return (
    <VfxAnchor anchored={anchored} x={cx} z={cz}>
    <StudioTunedGroup itemId="vfx-charge-warning">
      <mesh
        ref={meshRef}
        position={[anchored ? 0 : cx, 0.03, anchored ? 0 : cz]}
        rotation={[Math.PI / 2, 0, -angle]}
      >
        <shapeGeometry args={[arrowShape]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </StudioTunedGroup>
    </VfxAnchor>
  )
}

// ── 효과 3: PickupPop — 드랍 스폰 시 살짝 솟는 링 ──────────────────────────────
export function PickupPop({ event, onDone, anchored = false }) {
  const ref    = useRef()
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
    setLiveOpacity(ref.current, 0.7 * (1 - t))
  })

  return (
    <VfxAnchor anchored={anchored} x={event.x} z={event.z}>
    <StudioTunedGroup itemId="vfx-pickup-pop">
      <mesh ref={ref} position={[anchored ? 0 : event.x, baseY, anchored ? 0 : event.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.26, 18]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </StudioTunedGroup>
    </VfxAnchor>
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
        return <Renderer key={e.id} event={e} onDone={onDone} anchored />
      })}
    </>
  )
}
