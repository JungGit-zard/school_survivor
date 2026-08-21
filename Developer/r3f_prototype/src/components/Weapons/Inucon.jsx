import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../store/useGameStore.js'
import { playerPos } from '../../lib/refs.js'
import { createChibikoTrail, getChibikoTrailTarget, recordChibikoTrailPoint } from '../../lib/chibiko.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup, { composeStudioPartPosition, composeStudioPartRotation } from '../StudioTunedGroup.jsx'
import {
  INUCON_CONTACT_PULSE_INTERVAL_MS,
  INUCON_HEAL_INTERVAL_MS,
  INUCON_TRAIL_FOLLOW_DISTANCE,
  computeInuconHealAmount,
  createInuconPushConfig,
  shouldRenderInuconCompanion,
} from '../../lib/inucon.js'

function Part({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.07, geometry = null }) {
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const actualGeometry = geometry ?? boxGeometry
  const s = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      {outlineMaterial && <mesh renderOrder={0} geometry={actualGeometry} material={outlineMaterial} scale={[s, s, s]} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={actualGeometry} material={material} />
    </group>
  )
}

function BlobPart({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.065 }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(0.5, 18, 14), [])
  const s = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation} scale={size}>
      {outlineMaterial && <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[s, s, s]} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function CapsulePart({ radius = 0.08, length = 0.5, position, rotation = [0, 0, 0], scale = [1, 1, 1], material, outlineMaterial, outlineScale = 1.065 }) {
  const geometry = useMemo(() => new THREE.CapsuleGeometry(radius, length, 6, 14), [radius, length])
  const s = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {outlineMaterial && <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[s, s, s]} userData={{ studioRenderOutline: true }} />}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

function TriEar({ position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.08 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0.3)
    shape.lineTo(-0.17, -0.19)
    shape.lineTo(0.17, -0.19)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 })
    g.center()
    return g
  }, [])
  return <Part size={[1, 1, 1]} position={position} rotation={rotation} material={material} outlineMaterial={outlineMaterial} outlineScale={outlineScale} geometry={geometry} />
}

const INUCON_FACE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const INUCON_FACE_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec2 vUv;

  float softCircle(vec2 point, vec2 center, vec2 radius) {
    vec2 normalized = (point - center) / radius;
    return 1.0 - smoothstep(0.82, 1.0, dot(normalized, normalized));
  }

  float softLine(vec2 point, vec2 start, vec2 end, float width) {
    vec2 segment = end - start;
    float projection = clamp(dot(point - start, segment) / dot(segment, segment), 0.0, 1.0);
    return 1.0 - smoothstep(width * 0.72, width, length(point - (start + segment * projection)));
  }

  void main() {
    vec2 point = vUv - 0.5;
    // 원본 레퍼런스처럼 색을 거의 쓰지 않고, 검은 선/점만 얼굴 앞면에 얹는다.
    float blinkAmount = pow(max(0.0, sin(uTime * 0.62)), 28.0);
    float eyeHeight = mix(0.052, 0.009, blinkAmount);
    float leftEye = softCircle(point, vec2(-0.155, 0.115), vec2(0.050, eyeHeight));
    float rightEye = softCircle(point, vec2(0.155, 0.105), vec2(0.050, eyeHeight));
    float nose = softCircle(point, vec2(0.0, -0.025), vec2(0.068, 0.045));
    float mouth = softLine(point, vec2(0.0, -0.063), vec2(-0.075, -0.13), 0.017)
      + softLine(point, vec2(0.0, -0.063), vec2(0.075, -0.13), 0.017)
      + softLine(point, vec2(-0.075, -0.13), vec2(-0.135, -0.103), 0.016)
      + softLine(point, vec2(0.075, -0.13), vec2(0.135, -0.103), 0.016);
    float darkMask = clamp(leftEye + rightEye + nose + mouth, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.025, 0.018, 0.015), darkMask);
  }
`

function InuconProceduralFace() {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  usePlayingFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh
      position={[0, 1.255, 0.515]}
      renderOrder={4}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={[0.62, 0.5]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={INUCON_FACE_VERTEX_SHADER}
        fragmentShader={INUCON_FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function InuconModel() {
  const parts = useRef({})
  const outline = useMemo(() => outlineMat(0.97), [])
  const dogMat = useMemo(() => toonMat(0xf0a542, 0.055), [])
  const dogShadeMat = useMemo(() => toonMat(0xd4872e, 0.045), [])
  const scarfMat = useMemo(() => toonMat(0xc58cff, 0.08), [])

  const reg = (key) => (el) => { if (el) parts.current[key] = el }

  usePlayingFrame(({ clock }) => {
    const t = clock.elapsedTime
    const bob = Math.sin(t * 4.4) * 0.035
    const wag = Math.sin(t * 8.5) * 0.34
    const wave = Math.sin(t * 4.8) * 0.16
    if (parts.current.root) {
      parts.current.root.position.y = composeStudioPartPosition(parts.current.root, 'y', 0, bob)
      parts.current.root.rotation.z = composeStudioPartRotation(parts.current.root, 'z', 0, Math.sin(t * 3.1) * 0.045)
    }
    if (parts.current.tail) parts.current.tail.rotation.z = composeStudioPartRotation(parts.current.tail, 'z', 0, -0.3 + wag)
    if (parts.current.armR) parts.current.armR.rotation.z = composeStudioPartRotation(parts.current.armR, 'z', 0, -0.55 + wave)
    if (parts.current.armL) parts.current.armL.rotation.z = composeStudioPartRotation(parts.current.armL, 'z', 0, 0.18 - wave * 0.5)
  })

  return (
    <StudioTunedGroup itemId="weapon-inucon">
      <group ref={reg('root')}>
        {/* 레퍼런스 기준: 세로로 긴 주황 강아지 + 굵은 검은 손그림 외곽선 + 한쪽 손 번쩍. */}
        <BlobPart size={[0.62, 0.58, 0.46]} position={[0, 1.28, 0]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
        <TriEar position={[-0.2, 1.64, 0.02]} rotation={[0, 0, -0.22]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
        <TriEar position={[0.23, 1.63, 0.02]} rotation={[0, 0, 0.26]} material={dogMat} outlineMaterial={outline} outlineScale={1.085} />
        <InuconProceduralFace />
        <BlobPart size={[0.42, 1.5, 0.36]} position={[-0.02, 0.43, 0]} material={dogMat} outlineMaterial={outline} outlineScale={1.095} />
        <CapsulePart radius={0.075} length={0.92} position={[-0.33, 0.77, 0.02]} rotation={[0, 0, -0.02]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.065} />
        <CapsulePart radius={0.06} length={0.4} position={[-0.1, 0.94, -0.01]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.05, 1.7]} material={scarfMat} outlineMaterial={outline} outlineScale={1.035} />
        <group ref={reg('armR')} position={[0.36, 0.92, 0.02]} rotation={[0, 0, -0.72]}>
          <CapsulePart radius={0.07} length={0.92} position={[0.23, 0.42, 0]} rotation={[0, 0, -0.18]} scale={[1, 1, 0.88]} material={dogMat} outlineMaterial={outline} outlineScale={1.07} />
        </group>
        <group ref={reg('armL')} position={[-0.31, 0.75, 0]}>
          <CapsulePart radius={0.055} length={0.56} position={[0, -0.02, 0]} rotation={[0, 0, 0.08]} scale={[1, 1, 0.86]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.055} />
        </group>
        <CapsulePart radius={0.06} length={0.22} position={[-0.14, -0.34, 0]} rotation={[0, 0, -0.12]} scale={[1, 1, 0.82]} material={dogShadeMat} outlineMaterial={outline} outlineScale={1.055} />
        <CapsulePart radius={0.06} length={0.22} position={[0.09, -0.34, 0]} rotation={[0, 0, 0.12]} scale={[1, 1, 0.82]} material={dogMat} outlineMaterial={outline} outlineScale={1.055} />
        <group ref={reg('tail')} position={[-0.23, 0.96, -0.04]}>
          <CapsulePart radius={0.055} length={0.26} position={[-0.24, 0.02, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]} scale={[1, 1, 0.86]} material={dogMat} outlineMaterial={outline} outlineScale={1.055} />
        </group>
      </group>
    </StudioTunedGroup>
  )
}

export function InuconWeapon() {
  const groupRef = useRef()
  const posRef = useRef(new THREE.Vector3())
  const targetRef = useRef(new THREE.Vector3())
  const trailRef = useRef(createChibikoTrail())
  const initializedRef = useRef(false)
  const lastHealAtRef = useRef(null)
  const lastPushAtRef = useRef(null)
  const weapons = useGameStore((s) => s.weapons)
  const healPlayer = useGameStore((s) => s.healPlayer)
  const active = shouldRenderInuconCompanion(weapons)

  usePlayingFrame(({ clock }, delta) => {
    if (!active || !groupRef.current) return
    const w = weapons.inucon ?? {}
    const now = clock.elapsedTime * 1000
    if (lastHealAtRef.current === null) lastHealAtRef.current = now
    if (lastPushAtRef.current === null) lastPushAtRef.current = now - INUCON_CONTACT_PULSE_INTERVAL_MS

    recordChibikoTrailPoint(trailRef.current, playerPos, now)
    const follow = getChibikoTrailTarget(trailRef.current, now, { followDistance: w.followDistance ?? INUCON_TRAIL_FOLLOW_DISTANCE })
    targetRef.current.set(follow.x, follow.y, follow.z)
    if (!initializedRef.current) { posRef.current.copy(targetRef.current); initializedRef.current = true }

    const moveX = targetRef.current.x - posRef.current.x
    const moveZ = targetRef.current.z - posRef.current.z
    posRef.current.lerp(targetRef.current, Math.min(1, delta * 6.4))
    const bob = Math.sin(clock.elapsedTime * 4.4) * 0.025
    groupRef.current.position.set(posRef.current.x, 0.15 + bob, posRef.current.z)
    const trailYaw = Math.hypot(moveX, moveZ) > 0.001 ? Math.atan2(moveX, moveZ) : groupRef.current.rotation.y
    let diff = trailYaw - groupRef.current.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    groupRef.current.rotation.y += diff * Math.min(1, delta * 9)

    const push = createInuconPushConfig(w)
    if (now - lastPushAtRef.current >= push.pulseIntervalMs) {
      const hits = applyRadialDamage({
        x: playerPos.x, z: playerPos.z, radius: push.radius, damage: 0,
        knockback: push.knockback, knockbackMs: push.knockbackMs, ignoreSightBlock: true, weaponKey: 'inucon',
      })
      if (hits > 0) lastPushAtRef.current = now
      else lastPushAtRef.current = now - push.pulseIntervalMs + 100
    }

    const healIntervalMs = Number.isFinite(w.healIntervalMs) ? w.healIntervalMs : INUCON_HEAL_INTERVAL_MS
    if (now - lastHealAtRef.current >= healIntervalMs) {
      const player = useGameStore.getState().player
      const healAmount = computeInuconHealAmount(player.maxHp, w.healPercent)
      lastHealAtRef.current = now
      if (healAmount > 0) {
        healPlayer(healAmount)
        if (player.hp < player.maxHp) {
          emitSfx({ id: 'pickupHeal', volume: 0.42 })
          useGameStore.getState().recordMissionEvent({ type: 'companion_heal', companionId: 'inucon' })
        }
      }
    }
  })

  if (!active) {
    initializedRef.current = false
    lastHealAtRef.current = null
    lastPushAtRef.current = null
    trailRef.current.length = 0
    return null
  }

  return <group ref={groupRef} scale={[0.265, 0.265, 0.265]}><InuconModel /></group>
}
