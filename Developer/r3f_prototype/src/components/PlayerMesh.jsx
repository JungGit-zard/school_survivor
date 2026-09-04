import { createContext, useContext, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import playerNendoroid2HeadGlbUrl from '../assets/models/player/player-nendoroid-2head-2026-09-01.glb?url'
import { bagSwingState, playerArmActionState } from '../lib/refs.js'

import { getActivePlayerArmAction, getPlayerArmPose } from '../lib/playerArmAction.js'
import { outlineMat, toonMat, inflateScale, getCachedChamferedBoxGeo } from '../lib/toon.js'
import { PLAYER_MESH_SCALE } from '../lib/characterVisualScale.js'
import StudioTunedGroup, {
  captureStudioPartBaseTransform,
  composeStudioPartPosition,
  composeStudioPartRotation,
} from './StudioTunedGroup.jsx'

export const PLAYER_NENDEROID_2HEAD_GLB_URL = playerNendoroid2HeadGlbUrl
export const PLAYER_NENDEROID_2HEAD_GLB_PARTS = Object.freeze([
  'player__head_face',
  'player__hair_top',
  'player__hair_front_bangs',
  'player__hair_left_side',
  'player__hair_right_side',
  'player__hair_back_tail',
  'player__hair_clip',
  'player__eye_left',
  'player__eye_right',
  'player__body_blazer',
  'player__shirt_front',
  'player__tie',
  'player__skirt',
  'player__backpack',
  'player__backpack_pocket',
  'player__strap_left',
  'player__strap_right',
  'player__sleeve_left',
  'player__hand_left',
  'player__sleeve_right',
  'player__hand_right',
  'player__leg_left',
  'player__shoe_left_top',
  'player__shoe_left_sole',
  'player__leg_right',
  'player__shoe_right_top',
  'player__shoe_right_sole',
  'player__lantern_body',
  'player__lantern_head',
  'player__lantern_button',
])
export const PLAYER_NENDEROID_2HEAD_PROPORTIONS = Object.freeze({
  headHeight: 1.3,
  bodyHeight: 1.3,
  visualHeadCount: 2,
  topY: 1.3,
  chinY: 0,
  footBottomY: -1.3,
})

const PlayerNendoroidGeometryContext = createContext(null)
const PLAYER_BODY_SIZE = [0.82, 0.58, 0.42]
const PLAYER_BODY_POSITION = [0, -0.24, 0]
const PLAYER_HEAD_SIZE = [0.86, 0.82, 0.56]
const PLAYER_HEAD_BASE_Y = 0.38
const PLAYER_IDLE_BREATHE_Y = 0.028
const PLAYER_WALK_BOB_Y = 0.022
const PLAYER_MAX_HEAD_BOB_Y = Math.max(PLAYER_IDLE_BREATHE_Y, PLAYER_WALK_BOB_Y)
const PLAYER_LANTERN_POSITION = [0, -0.76, 0.2]
const PLAYER_LANTERN_BODY_SIZE = [0.34, 0.2, 0.24]
const PLAYER_LANTERN_HEAD_SIZE = [0.18, 0.24, 0.28]
const PLAYER_LANTERN_HANDLE_SIZE = [0.24, 0.06, 0.11]
const PLAYER_LANTERN_LIGHT_LENGTH = 2.08 / 3 / PLAYER_MESH_SCALE
const PLAYER_LANTERN_LIGHT_RADIUS = 1.8 / 3 / PLAYER_MESH_SCALE
const PLAYER_LANTERN_LENS_Y = -0.36
export const PLAYER_STENCIL_REF = 3
export const PLAYER_OCCLUSION_SAFE_SURFACE_RENDER_ORDER = 90
export const PLAYER_OCCLUSION_SAFE_OUTLINE_RENDER_ORDER = PLAYER_OCCLUSION_SAFE_SURFACE_RENDER_ORDER + 1
// 발바닥(로컬 y≈-1.30 × PLAYER_MESH_SCALE)이 바닥면 y=0에 정확히 닿도록 메시 전체를 올린다.
// = -RigidBody높이(0.32) + PLAYER_MESH_SCALE(0.2664) × 발바닥깊이(1.30)
const PLAYER_FLOOR_LIFT = 0.0263
export const PLAYER_CHARACTER_CHAMFER_STEPS = 1

export const PLAYER_MESH_LAYOUT = {
  floorLift: PLAYER_FLOOR_LIFT,
  body: {
    size: PLAYER_BODY_SIZE,
    position: PLAYER_BODY_POSITION,
  },
  head: {
    size: PLAYER_HEAD_SIZE,
    baseY: PLAYER_HEAD_BASE_Y,
  },
  motion: {
    idleBreatheY: PLAYER_IDLE_BREATHE_Y,
    walkBobY: PLAYER_WALK_BOB_Y,
    maxHeadBobY: PLAYER_MAX_HEAD_BOB_Y,
  },
  lantern: {
    position: PLAYER_LANTERN_POSITION,
    bodySize: PLAYER_LANTERN_BODY_SIZE,
    headSize: PLAYER_LANTERN_HEAD_SIZE,
    handleSize: PLAYER_LANTERN_HANDLE_SIZE,
    lightLength: PLAYER_LANTERN_LIGHT_LENGTH,
    lightRadius: PLAYER_LANTERN_LIGHT_RADIUS,
  },
  // 카메라가 틸트된 3/4 뷰라 투영에서 깊이(z)가 눌린다. 지오메트리를 미리 납작하게
  // 만들지 않고 거의 둥근 원판으로 두어 화면상 자연스러운 타원이 되게 한다.
  // lift 적용 후 월드 y≈0.06. 기존 y≈0.04에서 약 2px만큼 더 띄워
  // 바닥면(0)·복도 오버레이(≤0.012)와의 z-fighting/깜빡임을 줄인다.
  floorShadow: {
    position: [0, -1.075, 0.04],
    scale: [1.02, 0.94, 1],
    opacity: 0.52,
  },
}

function usePlayerStencilMaterial(createMaterial, dependencies) {
  return useMemo(() => {
    const material = createMaterial()
    material.stencilRef = PLAYER_STENCIL_REF
    return material
  }, dependencies)
}

// 깊이 버퍼는 반드시 켜 둔다. 파트마다 머티리얼 인스턴스가 달라서
// three의 불투명 정렬(renderOrder → material.id)이 z까지 가지 않는다 →
// depthTest를 끄면 그리는 순서(=JSX 선언 순서)가 가림을 결정해 버려,
// 뒤에서 보면 눈이 뒤통수를 뚫고 가방이 팔에 파묻힌다(2026-08-09 회귀).
// 소품 위로 띄우는 건 renderOrder만으로 처리한다.
export function createPlayerOcclusionSafeToonMaterial(color, emissive) {
  return toonMat(color, emissive)
}

function createPlayerOcclusionSafeOutlineMaterial() {
  return outlineMat(0.98)
}

function usePlayerNendoroidGeometry(partName, size) {
  const nodes = useContext(PlayerNendoroidGeometryContext)
  if (partName) {
    const geometry = nodes?.[partName]?.geometry
    if (!geometry) {
      throw new Error(`Player Nendoroid GLB missing required semantic part geometry: ${partName}`)
    }
    return geometry
  }
  return getCachedChamferedBoxGeo(...size, PLAYER_CHARACTER_CHAMFER_STEPS)
}

function Block({ size, position, rotation, color, emissive = 0.14, partName = null }) {
  const mat = usePlayerStencilMaterial(() => createPlayerOcclusionSafeToonMaterial(color, emissive), [color, emissive])
  const geo = usePlayerNendoroidGeometry(partName, size)

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={PLAYER_OCCLUSION_SAFE_SURFACE_RENDER_ORDER} geometry={geo} material={mat} />
    </group>
  )
}

export const PLAYER_CROWD_OUTLINE_RENDER_ORDER = PLAYER_OCCLUSION_SAFE_OUTLINE_RENDER_ORDER

export function createPlayerCrowdOutlineMaterial() {
  return createPlayerOcclusionSafeOutlineMaterial()
}

function OutlineBlock({ size, position, rotation, scale = 1.08, crowdVisible = false, partName = null }) {
  const mat = usePlayerStencilMaterial(
    crowdVisible ? createPlayerCrowdOutlineMaterial : createPlayerOcclusionSafeOutlineMaterial,
    [crowdVisible],
  )
  const geo = usePlayerNendoroidGeometry(partName, size)
  const s = inflateScale(scale)
  return <mesh renderOrder={PLAYER_OCCLUSION_SAFE_OUTLINE_RENDER_ORDER} geometry={geo} material={mat} position={position} rotation={rotation} scale={[s, s, s]} />
}

function PlayerLanternLight() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffdf72,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  return (
    <mesh position={[0, PLAYER_LANTERN_LENS_Y - PLAYER_MESH_LAYOUT.lantern.lightLength / 2, 0.02]} renderOrder={3} material={mat}>
      <coneGeometry args={[PLAYER_MESH_LAYOUT.lantern.lightRadius, PLAYER_MESH_LAYOUT.lantern.lightLength, 4, 1, true]} />
    </mesh>
  )
}

function PlayerOuterOutline() {
  return (
    <group>
      <OutlineBlock partName="player__body_blazer" size={[0.9, 0.66, 0.48]} position={[0, -0.24, 0]} crowdVisible />
      <OutlineBlock partName="player__hair_top" size={[1.08, 0.58, 0.76]} position={[0, 1.01, 0]} scale={1.3} crowdVisible />
      <OutlineBlock partName="player__hair_left_side" size={[0.25, 0.92, 0.52]} position={[-0.56, 0.46, 0.02]} scale={1.07} crowdVisible />
      <OutlineBlock partName="player__hair_right_side" size={[0.25, 0.86, 0.52]} position={[0.56, 0.49, 0.02]} scale={1.07} crowdVisible />
      <OutlineBlock partName="player__backpack" size={[0.54, 0.72, 0.22]} position={[0, -0.24, -0.39]} scale={1.07} crowdVisible />
    </group>
  )
}

function PlayerLanternModel() {
  return (
    <group rotation={[0, 0, -0.05]}>
      <OutlineBlock size={PLAYER_MESH_LAYOUT.lantern.bodySize} position={[0, -0.02, 0]} scale={1.05} />
      <Block size={PLAYER_MESH_LAYOUT.lantern.bodySize} position={[0, -0.02, 0]} color={0x1f63c9} emissive={0.18} />
      <Block size={[0.22, 0.08, 0.1]} position={[0, 0.09, 0.03]} color={0x17498f} emissive={0.12} />
      <Block size={PLAYER_MESH_LAYOUT.lantern.handleSize} position={[0, 0.15, 0.04]} color={0x123f82} emissive={0.1} />
      <Block size={[0.12, 0.05, 0.08]} position={[0, 0.21, 0.06]} color={0xffd33d} emissive={0.45} />
      <OutlineBlock size={PLAYER_MESH_LAYOUT.lantern.headSize} position={[0, -0.24, 0.02]} scale={1.05} />
      <Block size={PLAYER_MESH_LAYOUT.lantern.headSize} position={[0, -0.24, 0.02]} color={0x202633} emissive={0.04} />
      <Block size={[0.13, 0.035, 0.16]} position={[0, -0.36, 0.02]} color={0xf2f4ff} emissive={0.85} />
      <PlayerLanternLight />
      <Block size={[0.04, 0.14, 0.05]} position={[0, 0.27, -0.02]} color={0x111111} emissive={0.02} />
    </group>
  )
}

function setPlayerBodyFlash(root, flashMat, active) {
  root.traverse((obj) => {
    if (!obj.isMesh || obj.material?.type !== 'MeshToonMaterial') return
    if (active) {
      if (!obj.userData.playerBaseMaterial) obj.userData.playerBaseMaterial = obj.material
      obj.material = flashMat
      return
    }
    if (obj.userData.playerBaseMaterial) {
      obj.material = obj.userData.playerBaseMaterial
      delete obj.userData.playerBaseMaterial
    }
  })
}

export default function PlayerMesh({ groupRef, movingRef, hitFlashToken = 0, previewArmAction = null }) {
  const rootRef = useRef()
  const p = useRef({})
  const blend = useRef(0)
  const lastHitFlashToken = useRef(hitFlashToken)
  const hitFlashFrames = useRef(0)
  const hitFlashMat = usePlayerStencilMaterial(() => createPlayerOcclusionSafeToonMaterial(0xffffff, 1.0), [])
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: PLAYER_MESH_LAYOUT.floorShadow.opacity,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    []
  )
  const { nodes: nendoroidNodes } = useGLTF(PLAYER_NENDEROID_2HEAD_GLB_URL)

  const setRoot = (el) => {
    rootRef.current = el
    if (groupRef) groupRef.current = el
  }

  const reg = (key) => (el) => {
    if (!el) return
    captureStudioPartBaseTransform(el)
    p.current[key] = el
  }

  useFrame(({ clock }, delta) => {
    const parts = p.current
    if (!parts.legL) return

    if (hitFlashToken !== lastHitFlashToken.current) {
      lastHitFlashToken.current = hitFlashToken
      hitFlashFrames.current = 1
    }
    if (rootRef.current) {
      setPlayerBodyFlash(rootRef.current, hitFlashMat, hitFlashFrames.current > 0)
      if (hitFlashFrames.current > 0) hitFlashFrames.current -= 1
    }

    const isMoving = movingRef?.current ?? false
    blend.current += ((isMoving ? 1 : 0) - blend.current) * Math.min(1, delta * 10)
    const b = blend.current
    const t = performance.now() * 0.001
    const sw = Math.sin(t * 8.0) * 0.45 * b

    const breathe = Math.sin(t * 1.8) * PLAYER_MESH_LAYOUT.motion.idleBreatheY * (1 - b)
    const walkBob = Math.abs(Math.sin(t * 8.0)) * PLAYER_MESH_LAYOUT.motion.walkBobY * b
    const bob = breathe + walkBob

    parts.legL.rotation.x = composeStudioPartRotation(parts.legL, 'x', 0, sw)
    parts.legR.rotation.x = composeStudioPartRotation(parts.legR, 'x', 0, -sw)
    const armAction = previewArmAction
      ? { type: previewArmAction, progress: 0.5 }
      : getActivePlayerArmAction(playerArmActionState, clock.elapsedTime * 1000)
    const armPose = getPlayerArmPose({ action: armAction, walkSwing: sw })
    if (parts.lantern) parts.lantern.visible = armAction?.type === 'lanternAim' || armAction?.type === 'lanternFlashlight'
    parts.slvL.rotation.x = composeStudioPartRotation(parts.slvL, 'x', 0, armPose.slvL.x)
    parts.slvL.rotation.y = composeStudioPartRotation(parts.slvL, 'y', 0, armPose.slvL.y)
    // 아이들 호흡: 어깨(소매)가 들숨에 살짝 벌어졌다 돌아온다. 기존 피벗·계층 그대로, 회전만.
    const breatheArm = Math.sin(t * 1.8) * 0.03 * (1 - b)
    parts.slvL.rotation.z = composeStudioPartRotation(parts.slvL, 'z', 0, armPose.slvL.z + breatheArm)
    parts.slvR.rotation.x = composeStudioPartRotation(parts.slvR, 'x', 0, armPose.slvR.x)
    parts.slvR.rotation.y = composeStudioPartRotation(parts.slvR, 'y', 0, armPose.slvR.y)
    parts.slvR.rotation.z = composeStudioPartRotation(parts.slvR, 'z', 0, armPose.slvR.z - breatheArm)
    if (bagSwingState.active) {
      const swingT = bagSwingState.progress
      const swingPower = Math.sin(swingT * Math.PI)
      const sweep = -1.25 + swingT * 2.5
      parts.slvR.rotation.x = composeStudioPartRotation(parts.slvR, 'x', 0, -1.55 * swingPower)
      parts.slvR.rotation.y = composeStudioPartRotation(parts.slvR, 'y', 0, -0.35 * swingPower)
      parts.slvR.rotation.z = composeStudioPartRotation(parts.slvR, 'z', 0, -0.25 - sweep * 0.78)
      parts.slvL.rotation.x = composeStudioPartRotation(parts.slvL, 'x', 0, -0.35 * swingPower)
      parts.slvL.rotation.z = composeStudioPartRotation(parts.slvL, 'z', 0, 0.24 * swingPower)
    } else {
      parts.bag.rotation.x = composeStudioPartRotation(parts.bag, 'x', 0)
    }
    if (!bagSwingState.active) {
      parts.bag.rotation.z = composeStudioPartRotation(
        parts.bag,
        'z',
        0,
        -0.05 + Math.sin(t * 5.5) * 0.03 * b,
      )
    }

    if (parts.head) {
      const baseY = PLAYER_MESH_LAYOUT.head.baseY
      parts.head.position.y = composeStudioPartPosition(parts.head, 'y', baseY, bob)
      parts.hairTop.position.y = composeStudioPartPosition(parts.hairTop, 'y', 1.01, bob)
      parts.hairFr.position.y = composeStudioPartPosition(parts.hairFr, 'y', 0.69, bob)
      parts.hairSL.position.y = composeStudioPartPosition(parts.hairSL, 'y', 0.46, bob)
      parts.hairSR.position.y = composeStudioPartPosition(parts.hairSR, 'y', 0.49, bob)
      parts.hairTail.position.y = composeStudioPartPosition(parts.hairTail, 'y', 0.1, bob)
      parts.hairClip.position.y = composeStudioPartPosition(parts.hairClip, 'y', 0.87, bob)
      parts.eyeL.position.y = composeStudioPartPosition(parts.eyeL, 'y', 0.38, bob)
      parts.eyeR.position.y = composeStudioPartPosition(parts.eyeR, 'y', 0.38, bob)
    }
  })

  return (
    <PlayerNendoroidGeometryContext.Provider value={nendoroidNodes}>
    <group ref={setRoot}>
      <StudioTunedGroup itemId="player">
        <group position={[0, PLAYER_FLOOR_LIFT, 0]} scale={[PLAYER_MESH_SCALE, PLAYER_MESH_SCALE, PLAYER_MESH_SCALE]}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={PLAYER_MESH_LAYOUT.floorShadow.position}
            scale={PLAYER_MESH_LAYOUT.floorShadow.scale}
            renderOrder={1}
            material={shadowMat}
          >
            <circleGeometry args={[1, 36]} />
          </mesh>

      <PlayerOuterOutline />

      <Block partName="player__body_blazer" size={PLAYER_MESH_LAYOUT.body.size} position={PLAYER_MESH_LAYOUT.body.position} color={0xd42020} emissive={0.2} />
      <Block partName="player__shirt_front" size={[0.36, 0.36, 0.06]} position={[0, -0.2, 0.245]} color={0xf4f4f4} emissive={0.08} />
      <Block partName="player__tie" size={[0.14, 0.38, 0.07]} position={[0, -0.3, 0.29]} color={0xffd100} emissive={0.26} />

      <Block partName="player__skirt" size={[0.92, 0.28, 0.48]} position={[0, -0.61, 0]} color={0x123a9f} emissive={0.2} />

      <group ref={reg('head')} position={[0, PLAYER_MESH_LAYOUT.head.baseY, 0.03]}>
        <Block partName="player__head_face" size={PLAYER_MESH_LAYOUT.head.size} position={[0, 0, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('hairTop')} position={[0, 1.01, 0]}>
        <Block partName="player__hair_top" size={[1.08, 0.58, 0.76]} position={[0, 0, 0]} color={0xff8fb0} emissive={0.18} />
      </group>
      <group ref={reg('hairFr')} position={[0, 0.69, 0.35]}>
        <Block partName="player__hair_front_bangs" size={[0.92, 0.28, 0.18]} position={[0, 0, 0]} color={0xff8fb0} emissive={0.18} />
      </group>
      <group ref={reg('hairSL')} position={[-0.56, 0.46, 0.02]}>
        <Block partName="player__hair_left_side" size={[0.25, 0.92, 0.52]} position={[0, 0, 0]} color={0xd94070} emissive={0.14} />
      </group>
      <group ref={reg('hairSR')} position={[0.56, 0.49, 0.02]}>
        <Block partName="player__hair_right_side" size={[0.25, 0.86, 0.52]} position={[0, 0, 0]} color={0xd94070} emissive={0.14} />
      </group>
      <group ref={reg('hairTail')} position={[-0.5, 0.1, -0.34]}>
        <Block partName="player__hair_back_tail" size={[0.24, 0.68, 0.2]} position={[0, 0, 0]} color={0xd94070} emissive={0.14} />
      </group>
      <group ref={reg('hairClip')} position={[0.35, 0.87, 0.43]}>
        <Block partName="player__hair_clip" size={[0.28, 0.12, 0.08]} position={[0, 0, 0]} color={0xf4f4f4} emissive={0.08} />
      </group>

      <group ref={reg('eyeL')} position={[-0.2, 0.38, 0.325]}>
        <Block partName="player__eye_left" size={[0.13, 0.2, 0.035]} position={[0, 0, 0]} color={0xcf2f77} emissive={0.12} />
      </group>
      <group ref={reg('eyeR')} position={[0.2, 0.38, 0.325]}>
        <Block partName="player__eye_right" size={[0.13, 0.2, 0.035]} position={[0, 0, 0]} color={0xcf2f77} emissive={0.12} />
      </group>

      <group ref={reg('bag')} position={[0, -0.24, -0.39]}>
        <Block partName="player__backpack" size={[0.54, 0.72, 0.22]} position={[0, 0, 0]} color={0x38c8f0} emissive={0.2} />
        <Block partName="player__backpack_pocket" size={[0.34, 0.2, 0.07]} position={[0, 0.12, -0.135]} color={0x1668a0} emissive={0.12} />
      </group>
      <Block partName="player__strap_left" size={[0.1, 0.68, 0.08]} position={[-0.26, -0.24, 0.27]} color={0x005cff} emissive={0.18} />
      <Block partName="player__strap_right" size={[0.1, 0.68, 0.08]} position={[0.26, -0.24, 0.27]} color={0x005cff} emissive={0.18} />

      <group ref={reg('slvL')} position={[-0.6, -0.25, 0]}>
        <Block partName="player__sleeve_left" size={[0.25, 0.58, 0.3]} position={[0, 0, 0]} color={0xd42020} emissive={0.2} />
        <Block partName="player__hand_left" size={[0.24, 0.24, 0.24]} position={[0, -0.41, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('slvR')} position={[0.6, -0.25, 0]}>
        <Block partName="player__sleeve_right" size={[0.25, 0.58, 0.3]} position={[0, 0, 0]} color={0xd42020} emissive={0.2} />
        <Block partName="player__hand_right" size={[0.24, 0.24, 0.24]} position={[0, -0.41, 0]} color={0xffc39b} emissive={0.1} />
        <group ref={reg('lantern')} position={PLAYER_MESH_LAYOUT.lantern.position} visible={false}>
          <PlayerLanternModel />
        </group>
      </group>

      <group ref={reg('legL')} position={[-0.22, -0.9, 0]}>
        <OutlineBlock partName="player__leg_left" size={[0.23, 0.5, 0.24]} position={[0, 0, 0]} scale={1.16} />
        <Block partName="player__leg_left" size={[0.23, 0.5, 0.24]} position={[0, 0, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.29, 0.08]}>
          <OutlineBlock partName="player__shoe_left_top" size={[0.4, 0.18, 0.45]} position={[0, 0, 0]} scale={1.14} />
          <Block partName="player__shoe_left_top" size={[0.4, 0.18, 0.45]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <OutlineBlock partName="player__shoe_left_sole" size={[0.42, 0.08, 0.48]} position={[0, -0.07, 0]} scale={1.14} />
          <Block partName="player__shoe_left_sole" size={[0.42, 0.08, 0.48]} position={[0, -0.07, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>

      <group ref={reg('legR')} position={[0.22, -0.9, 0]}>
        <OutlineBlock partName="player__leg_right" size={[0.23, 0.5, 0.24]} position={[0, 0, 0]} scale={1.16} />
        <Block partName="player__leg_right" size={[0.23, 0.5, 0.24]} position={[0, 0, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.29, 0.08]}>
          <OutlineBlock partName="player__shoe_right_top" size={[0.4, 0.18, 0.45]} position={[0, 0, 0]} scale={1.14} />
          <Block partName="player__shoe_right_top" size={[0.4, 0.18, 0.45]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <OutlineBlock partName="player__shoe_right_sole" size={[0.42, 0.08, 0.48]} position={[0, -0.07, 0]} scale={1.14} />
          <Block partName="player__shoe_right_sole" size={[0.42, 0.08, 0.48]} position={[0, -0.07, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>
        </group>
      </StudioTunedGroup>
    </group>
    </PlayerNendoroidGeometryContext.Provider>
  )
}

useGLTF.preload(PLAYER_NENDEROID_2HEAD_GLB_URL)
