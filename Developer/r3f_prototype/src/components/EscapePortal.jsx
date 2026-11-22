import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clearPortalTarget, playerPos, publishPortalTarget } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { pickPortalPosition } from '../lib/portalPlacement.js'
import { clampGameplayFrameDelta } from '../lib/gameplayFrameTime.js'
import {
  PORTAL_SUCTION_DURATION,
  advancePortalSuctionClock,
  createPortalSuctionClock,
  resetPortalSuctionClock,
} from '../lib/portalSuctionClock.js'
import { PORTAL_VISUAL_STATE, applyPortalSuctionVisuals } from '../lib/portalVisualState.js'
import { createReeboMaterial } from '../lib/vfxShaders.js'
import StudioTunedGroup, {
  composeStudioPartRotation,
  composeStudioPartScale,
} from './StudioTunedGroup.jsx'

const PORTAL_RADIUS = 1.5
// 작동(흡입) 히트박스 — 시각 링(PORTAL_RADIUS)과 분리해 중앙 좁은 원으로 제한.
const PORTAL_TRIGGER_RADIUS = 0.6
const PORTAL_LIGHT_DISTANCE = 6
// Terry 2026-11-15 pick: REEBOO swirl (godot-stylized-2d-vfx-lite port, MIT, Copyright (c) 2026
// REEBOO Labs), outline pass dropped. Trial sizes were for a 1.1 ring; scaled to PORTAL_RADIUS here.
// Terry 2026-11-22 "탈출구 효과는 위로 뻗은 기둥은 삭제": the upward light pillar is gone. The floor swirl, the ring,
// and the portal light stay so the exit is still easy to find.
const PORTAL_VFX_COLORS = Object.freeze({ core: 0xffffff, mid: 0x9ff0ff, edge: 0x2f7fe0 })
const PORTAL_SWIRL_SIZE = (PORTAL_RADIUS * 2) / 0.92
const PORTAL_SWIRL_SPIN = 0.6
const PORTAL_SWIRL_SUCTION_SPIN = 2.4

export function createEscapePortalVfx() {
  const swirl = createReeboMaterial('swirl', { ...PORTAL_VFX_COLORS, billboard: false, u: { arms: 3, twist: 3, spin: PORTAL_SWIRL_SPIN, armW: 0.45, inner: 0.1, outer: 0.92 } })
  swirl.uniforms.uData.value.set(0, 1, 0, 3.1)
  return { swirl, geometry: new THREE.PlaneGeometry(1, 1) }
}
const PORTAL_LIGHT_DECAY = 2

// 탈출구는 열리는 순간에야 마운트된다(Game.jsx). 그때 소용돌이 셰이더를 처음 컴파일하면 그 프레임이 멈췄다.
// 같은 생성 함수(= 같은 프로그램 키)의 재질을 스테이지 내내 숨긴 채(visible=false, 드로콜 0) 붙여 두어 스테이지 진입
// 예열(gl.compileAsync — three r164 compile은 숨은 메시도 traverse한다)에 함께 컴파일되게 한다. 스테이지 도중에
// 떼지 않는다: 재질을 dispose하면 쓰는 곳이 없어진 프로그램이 지워져 탈출구가 다시 컴파일한다.
export function EscapePortalShaderPrewarm() {
  const vfx = useMemo(() => createEscapePortalVfx(), [])
  useEffect(() => () => { vfx.swirl.dispose(); vfx.geometry.dispose() }, [vfx])
  return (
    <group name="escape-portal-shader-prewarm" visible={false}>
      <mesh geometry={vfx.geometry} material={vfx.swirl} />
    </group>
  )
}

// Mounting a pointLight mid-run changes NUM_POINT_LIGHTS and recompiles every
// lit material that the stage-entry prewarm already compiled.  Gameplay keeps
// one EscapePortalSceneLight mounted for the whole stage at intensity 0; the
// portal borrows it while active.  Without a mounted host (Studio preview) the
// portal keeps its own light so the preview looks the same.
const portalSceneLight = { hosts: 0, anchor: null, visual: null }

export function getEscapePortalSceneLightIntensity(state = portalSceneLight) {
  return state.anchor && state.visual ? state.visual.lightIntensity : 0
}

export function EscapePortalSceneLight() {
  const lightRef = useRef()
  const appliedColorRef = useRef(PORTAL_VISUAL_STATE.idle.color)

  useEffect(() => {
    portalSceneLight.hosts += 1
    return () => {
      portalSceneLight.hosts -= 1
    }
  }, [])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return
    const intensity = getEscapePortalSceneLightIntensity()
    light.intensity = intensity
    if (intensity === 0) return
    const { anchor, visual } = portalSceneLight
    if (appliedColorRef.current !== visual.color) {
      light.color.set(visual.color)
      appliedColorRef.current = visual.color
    }
    anchor.getWorldPosition(light.position)
    light.parent?.worldToLocal(light.position)
  })

  return (
    <pointLight
      ref={lightRef}
      name="escape-portal-scene-light"
      color={PORTAL_VISUAL_STATE.idle.color}
      intensity={0}
      distance={PORTAL_LIGHT_DISTANCE}
      decay={PORTAL_LIGHT_DECAY}
    />
  )
}

export function getEscapePortalSceneLightState() {
  return portalSceneLight
}

function setPortalSceneLightAnchor(node) {
  portalSceneLight.anchor = node ?? null
}

export default function EscapePortal({ stageId }) {
  const clearStage = useGameStore((s) => s.clearStage)
  const phase       = useGameStore((s) => s.phase)

  const pos      = useMemo(() => pickPortalPosition(stageId, playerPos), [stageId])
  const ringRef  = useRef()
  const glowRef  = useRef()
  const ringMaterialRef = useRef()
  const glowMaterialRef = useRef()
  const portalLightRef = useRef()
  // Decided once per portal life so the light count never flips while mounted.
  // Held in a ref (no React state in this frame-driven component), initialised on first render only.
  const usesSceneLightRef = useRef(null)
  if (usesSceneLightRef.current === null) usesSceneLightRef.current = portalSceneLight.hosts > 0
  const usesSceneLight = usesSceneLightRef.current
  const spinRef = useRef({ ringY: 0, glowY: 0 })
  const vfx = useMemo(() => createEscapePortalVfx(), [])
  useEffect(() => () => { vfx.swirl.dispose(); vfx.geometry.dispose() }, [vfx])
  const vfxTimeRef = useRef(0)
  const suckingRef      = useRef(false)
  const suctionClockRef = useRef(null)
  const clearedRef      = useRef(false)
  if (suctionClockRef.current === null) suctionClockRef.current = createPortalSuctionClock()

  useEffect(() => {
    publishPortalTarget(pos[0], pos[2])
    return clearPortalTarget
  }, [pos])

  useEffect(() => {
    if (!usesSceneLight) return undefined
    portalSceneLight.visual = PORTAL_VISUAL_STATE.idle
    return () => {
      portalSceneLight.visual = null
    }
  }, [usesSceneLight])

  useFrame((_, delta) => {
    if (phase !== 'playing' || clearedRef.current) return

    const visualDelta = clampGameplayFrameDelta(delta)
    vfxTimeRef.current += visualDelta
    vfx.swirl.uniforms.uTime.value = vfxTimeRef.current

    // Studio 파츠의 회전·스케일은 정본 base/Studio/애니메이션 합성법칙으로만 갱신한다.
    spinRef.current.ringY += visualDelta * 1.2
    spinRef.current.glowY -= visualDelta * 0.6
    if (ringRef.current) {
      ringRef.current.rotation.y = composeStudioPartRotation(
        ringRef.current, 'y', 0, spinRef.current.ringY,
      )
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = composeStudioPartRotation(
        glowRef.current, 'y', 0, spinRef.current.glowY,
      )
    }

    const dx = playerPos.x - pos[0]
    const dz = playerPos.z - pos[2]
    const dist = Math.hypot(dx, dz)

    if (!suckingRef.current && dist < PORTAL_TRIGGER_RADIUS) {
      suckingRef.current = true
      resetPortalSuctionClock(suctionClockRef.current)
      applyPortalSuctionVisuals({
        ringMaterial: ringMaterialRef.current,
        glowMaterial: glowMaterialRef.current,
        light: usesSceneLight ? null : portalLightRef.current,
      })
      if (usesSceneLight) portalSceneLight.visual = PORTAL_VISUAL_STATE.sucking
      emitSfx({ id: 'portalSuction' })
      // Trigger frame only starts the sequence. The next playing frame owns
      // the first fixed suction step, preventing a resume hitch from skipping it.
      return
    }

    if (suckingRef.current) {
      const { elapsed, completedNow } = advancePortalSuctionClock(suctionClockRef.current, delta)
      // scale up glow during suction
      const t = Math.min(elapsed / PORTAL_SUCTION_DURATION, 1)
      vfx.swirl.uniforms.spin.value = PORTAL_SWIRL_SPIN + PORTAL_SWIRL_SUCTION_SPIN * t
      if (glowRef.current) {
        const scale = 1 + t * 1.5
        glowRef.current.scale.set(
          composeStudioPartScale(glowRef.current, 'x', 1, scale),
          composeStudioPartScale(glowRef.current, 'y', 1, scale),
          composeStudioPartScale(glowRef.current, 'z', 1, scale),
        )
      }

      if (completedNow && !clearedRef.current) {
        clearedRef.current = true
        emitSfx({ id: 'escapePortalClear' })
        clearStage()
      }
    }
  })

  return (
    <group position={pos}>
      <StudioTunedGroup itemId="stage-object-escape-portal">
        {/* outer rotating ring — kept mounted (Studio part order, suction state) but hidden: replaced by the swirl */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[PORTAL_RADIUS - 0.12, PORTAL_RADIUS, 48]} />
          <meshStandardMaterial
            ref={ringMaterialRef}
            color={PORTAL_VISUAL_STATE.idle.color}
            emissive={PORTAL_VISUAL_STATE.idle.color}
            emissiveIntensity={PORTAL_VISUAL_STATE.idle.ringEmissiveIntensity}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* inner glow disc — kept mounted but hidden: replaced by the swirl */}
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <circleGeometry args={[PORTAL_RADIUS - 0.14, 48]} />
          <meshStandardMaterial
            ref={glowMaterialRef}
            color={PORTAL_VISUAL_STATE.idle.color}
            emissive={PORTAL_VISUAL_STATE.idle.color}
            emissiveIntensity={PORTAL_VISUAL_STATE.idle.glowEmissiveIntensity}
            transparent
            opacity={PORTAL_VISUAL_STATE.idle.glowOpacity}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* point light for scene glow (borrowed from EscapePortalSceneLight in gameplay) */}
        {usesSceneLight ? (
          <group ref={setPortalSceneLightAnchor} name="escape-portal-light-anchor" />
        ) : (
          <pointLight
            ref={portalLightRef}
            color={PORTAL_VISUAL_STATE.idle.color}
            intensity={PORTAL_VISUAL_STATE.idle.lightIntensity}
            distance={PORTAL_LIGHT_DISTANCE}
            decay={PORTAL_LIGHT_DECAY}
          />
        )}
        {/* Terry 2026-11-15 pick: REEBOO swirl on the floor, no outline (the upward pillar was removed 2026-11-22) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[PORTAL_SWIRL_SIZE, PORTAL_SWIRL_SIZE, 1]} geometry={vfx.geometry} material={vfx.swirl} renderOrder={6} userData={{ studioNonFocusable: true, studioNonTunable: true }} />
      </StudioTunedGroup>
    </group>
  )
}
