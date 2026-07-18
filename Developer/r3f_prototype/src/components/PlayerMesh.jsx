import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bagSwingState, playerArmActionState } from '../lib/refs.js'
import { getActivePlayerArmAction, getPlayerArmPose } from '../lib/playerArmAction.js'
import { outlineMat, toonMat, inflateScale } from '../lib/toon.js'
import { PLAYER_MESH_SCALE } from '../lib/characterVisualScale.js'
import StudioTunedGroup, {
  captureStudioPartBaseTransform,
  composeStudioPartPosition,
  composeStudioPartRotation,
} from './StudioTunedGroup.jsx'

const PLAYER_BODY_SIZE = [0.75, 0.72, 0.5]
const PLAYER_BODY_POSITION = [0, 0.46, 0]
const PLAYER_HEAD_SIZE = [0.72, 0.66, 0.56]
const PLAYER_HEAD_BASE_Y = 1.12
const PLAYER_IDLE_BREATHE_Y = 0.018
const PLAYER_WALK_BOB_Y = 0.022
const PLAYER_MAX_HEAD_BOB_Y = Math.max(PLAYER_IDLE_BREATHE_Y, PLAYER_WALK_BOB_Y)
const PLAYER_HEAD_OUTLINE_OFFSET_Y = 0.19
const PLAYER_LANTERN_POSITION = [0, -0.76, 0.2]
const PLAYER_LANTERN_BODY_SIZE = [0.34, 0.2, 0.24]
const PLAYER_LANTERN_HEAD_SIZE = [0.18, 0.24, 0.28]
const PLAYER_LANTERN_HANDLE_SIZE = [0.24, 0.06, 0.11]
const PLAYER_LANTERN_LIGHT_LENGTH = 2.08 / 3 / PLAYER_MESH_SCALE
const PLAYER_LANTERN_LIGHT_RADIUS = 1.8 / 3 / PLAYER_MESH_SCALE
const PLAYER_LANTERN_LENS_Y = -0.36
// 발바닥(로컬 y≈-1.30 × PLAYER_MESH_SCALE)이 바닥면 y=0에 정확히 닿도록 메시 전체를 올린다.
// = -RigidBody높이(0.32) + PLAYER_MESH_SCALE(0.2664) × 발바닥깊이(1.30)
const PLAYER_FLOOR_LIFT = 0.0263

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
  outline: {
    headSize: [1.04, 0.98, 0.82],
    headOffsetY: PLAYER_HEAD_OUTLINE_OFFSET_Y,
    headPosition: [0, PLAYER_HEAD_BASE_Y + PLAYER_HEAD_OUTLINE_OFFSET_Y, 0.04],
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
  // lift 적용 후 월드 y≈0.04로 바닥면(0)·복도 오버레이(≤0.012)보다 확실히 위.
  floorShadow: {
    position: [0, -1.15, 0.04],
    scale: [1.02, 0.94, 1],
    opacity: 0.52,
  },
}

function Block({ size, position, rotation, color, emissive = 0.14 }) {
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={2} geometry={geo} material={mat} />
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const mat = useMemo(() => outlineMat(0.98), [])
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const s = inflateScale(scale)
  return <mesh renderOrder={0} geometry={geo} material={mat} position={position} rotation={rotation} scale={[s, s, s]} />
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
      <OutlineBlock size={[1.04, 0.94, 0.62]} position={[0, 0.35, 0]} />
      <OutlineBlock size={PLAYER_MESH_LAYOUT.outline.headSize} position={PLAYER_MESH_LAYOUT.outline.headPosition} />
      <OutlineBlock size={[0.24, 1.05, 0.30]} position={[-0.68, 0.32, 0]} scale={1.07} />
      <OutlineBlock size={[0.24, 1.05, 0.30]} position={[0.68, 0.32, 0]} scale={1.07} />
      <OutlineBlock size={[0.56, 0.78, 0.36]} position={[-0.54, 0.46, -0.22]} scale={1.07} />
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
  const hitFlashMat = useMemo(() => toonMat(0xffffff, 1.0), [])
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
    parts.slvL.rotation.z = composeStudioPartRotation(parts.slvL, 'z', 0, armPose.slvL.z)
    parts.slvR.rotation.x = composeStudioPartRotation(parts.slvR, 'x', 0, armPose.slvR.x)
    parts.slvR.rotation.y = composeStudioPartRotation(parts.slvR, 'y', 0, armPose.slvR.y)
    parts.slvR.rotation.z = composeStudioPartRotation(parts.slvR, 'z', 0, armPose.slvR.z)
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
      parts.hairTop.position.y = composeStudioPartPosition(parts.hairTop, 'y', baseY + 0.48, bob)
      parts.hairFr.position.y = composeStudioPartPosition(parts.hairFr, 'y', baseY + 0.22, bob)
      parts.hairSL.position.y = composeStudioPartPosition(parts.hairSL, 'y', baseY + 0.05, bob)
      parts.hairSR.position.y = composeStudioPartPosition(parts.hairSR, 'y', baseY + 0.08, bob)
      parts.hairTail.position.y = composeStudioPartPosition(parts.hairTail, 'y', baseY - 0.38, bob)
      parts.hairClip.position.y = composeStudioPartPosition(parts.hairClip, 'y', baseY + 0.6, bob)
      parts.eyeL.position.y = composeStudioPartPosition(parts.eyeL, 'y', baseY - 0.08, bob)
      parts.eyeR.position.y = composeStudioPartPosition(parts.eyeR, 'y', baseY - 0.08, bob)
    }
  })

  return (
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

      <Block size={PLAYER_MESH_LAYOUT.body.size} position={PLAYER_MESH_LAYOUT.body.position} color={0xd42020} emissive={0.2} />
      <Block size={[0.38, 0.18, 0.12]} position={[0, 0.82, 0.32]} color={0xf4f4f4} emissive={0.08} />
      <Block size={[0.8, 0.13, 0.5]} position={[0, 0.1, 0]} color={0xffd100} emissive={0.26} />

      <Block size={[0.94, 0.36, 0.56]} position={[0, -0.16, 0]} color={0x4a90d9} emissive={0.18} />

      <group ref={reg('head')} position={[0, PLAYER_MESH_LAYOUT.head.baseY, 0]}>
        <Block size={PLAYER_MESH_LAYOUT.head.size} position={[0, 0, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('hairTop')} position={[0, PLAYER_MESH_LAYOUT.head.baseY + 0.48, 0]}>
        <Block size={[0.94, 0.34, 0.8]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairFr')} position={[0, PLAYER_MESH_LAYOUT.head.baseY + 0.22, 0.32]}>
        <Block size={[0.8, 0.26, 0.2]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairSL')} position={[-0.46, PLAYER_MESH_LAYOUT.head.baseY + 0.05, 0]}>
        <Block size={[0.22, 0.58, 0.48]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairSR')} position={[0.46, PLAYER_MESH_LAYOUT.head.baseY + 0.08, 0]}>
        <Block size={[0.22, 0.46, 0.44]} position={[0, 0, 0]} color={0xff7096} emissive={0.18} />
      </group>
      <group ref={reg('hairTail')} position={[-0.5, PLAYER_MESH_LAYOUT.head.baseY - 0.38, -0.06]}>
        <Block size={[0.2, 0.5, 0.18]} position={[0, 0, 0]} color={0xd94070} emissive={0.12} />
      </group>
      <group ref={reg('hairClip')} position={[0.34, PLAYER_MESH_LAYOUT.head.baseY + 0.6, 0.28]}>
        <Block size={[0.25, 0.16, 0.2]} position={[0, 0, 0]} color={0xf4f4f4} emissive={0.08} />
      </group>

      <group ref={reg('eyeL')} position={[-0.18, PLAYER_MESH_LAYOUT.head.baseY - 0.08, 0.28]}>
        <Block size={[0.13, 0.14, 0.08]} position={[0, 0, 0]} color={0xd94070} emissive={0.1} />
      </group>
      <group ref={reg('eyeR')} position={[0.18, PLAYER_MESH_LAYOUT.head.baseY - 0.08, 0.28]}>
        <Block size={[0.13, 0.14, 0.08]} position={[0, 0, 0]} color={0xd94070} emissive={0.1} />
      </group>

      <group ref={reg('bag')} position={[-0.52, 0.46, -0.22]}>
        <Block size={[0.5, 0.7, 0.32]} position={[0, 0, 0]} color={0x38c8f0} emissive={0.2} />
        <Block size={[0.32, 0.22, 0.1]} position={[0, 0.24, 0.22]} color={0x1668a0} emissive={0.12} />
      </group>
      <Block size={[0.1, 0.6, 0.1]} position={[-0.22, 0.46, 0.3]} color={0x1668a0} emissive={0.12} />
      <Block size={[0.1, 0.6, 0.1]} position={[0.22, 0.46, 0.3]} color={0x1668a0} emissive={0.12} />

      <group ref={reg('slvL')} position={[-0.6, 0.72, 0]}>
        <Block size={[0.36, 0.66, 0.36]} position={[0, -0.33, 0]} color={0xd42020} emissive={0.2} />
        <Block size={[0.26, 0.26, 0.26]} position={[0, -0.76, 0]} color={0xffc39b} emissive={0.1} />
      </group>

      <group ref={reg('slvR')} position={[0.6, 0.72, 0]}>
        <Block size={[0.36, 0.66, 0.36]} position={[0, -0.33, 0]} color={0xd42020} emissive={0.2} />
        <Block size={[0.26, 0.26, 0.26]} position={[0, -0.76, 0]} color={0xffc39b} emissive={0.1} />
        <group ref={reg('lantern')} position={PLAYER_MESH_LAYOUT.lantern.position} visible={false}>
          <PlayerLanternModel />
        </group>
      </group>

      <group ref={reg('legL')} position={[-0.22, -0.34, 0]}>
        <OutlineBlock size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} scale={1.16} />
        <Block size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.76, 0.06]}>
          <OutlineBlock size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} scale={1.14} />
          <Block size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <OutlineBlock size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} scale={1.14} />
          <Block size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>

      <group ref={reg('legR')} position={[0.22, -0.34, 0]}>
        <OutlineBlock size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} scale={1.16} />
        <Block size={[0.26, 0.7, 0.3]} position={[0, -0.35, 0]} color={0xebebf2} emissive={0.06} />
        <group position={[0, -0.76, 0.06]}>
          <OutlineBlock size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} scale={1.14} />
          <Block size={[0.38, 0.2, 0.44]} position={[0, 0, 0]} color={0x8090a8} emissive={0.12} />
          <OutlineBlock size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} scale={1.14} />
          <Block size={[0.4, 0.1, 0.46]} position={[0, -0.15, 0]} color={0x4a5566} emissive={0.08} />
        </group>
      </group>
        </group>
      </StudioTunedGroup>
    </group>
  )
}
