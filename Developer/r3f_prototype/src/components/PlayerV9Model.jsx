import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { toonMat } from '../lib/toon.js'
import { addPlayerV9Outlines } from '../lib/playerV9Outline.js'
import { bagSwingState, playerArmActionState } from '../lib/refs.js'
import { getActivePlayerArmAction, getPlayerArmPose } from '../lib/playerArmAction.js'
import StudioTunedGroup, {
  captureStudioPartBaseTransform,
  composeStudioPartPosition,
  composeStudioPartRotation,
} from './StudioTunedGroup.jsx'
import playerV9Url from '../assets/models/PLAYER_v9_final.glb?url'

// v9 final GLB raw bounds from the verified asset JSON/accessors:
// minY=0.015000, maxY=3.105000, height=3.0900000194.
// Existing gameplay player visual height is PLAYER_MESH_WORLD_HEIGHT = 3.35 * 0.2664 = 0.89244.
export const PLAYER_V9_MODEL_URL = playerV9Url
export const PLAYER_V9_RAW_HEIGHT = 3.0900000194087625
export const PLAYER_V9_RAW_MIN_Y = 0.014999999664723873
export const PLAYER_V9_WORLD_HEIGHT = 3.35 * 0.2664
export const PLAYER_V9_SCALE = PLAYER_V9_WORLD_HEIGHT / PLAYER_V9_RAW_HEIGHT
export const PLAYER_V9_FLOOR_Y = -0.32 - PLAYER_V9_RAW_MIN_Y * PLAYER_V9_SCALE

const PLAYER_V9_PARTS = Object.freeze({
  head: 'grp_head',
  slvL: 'grp_armL',
  slvR: 'grp_armR',
  legL: 'grp_legL',
  legR: 'grp_legR',
  bag: 'grp_pack',
})

const PLAYER_V9_LANTERN_OFFSET = new THREE.Matrix4().makeTranslation(0, -0.76, 0.2)
const PLAYER_V9_LANTERN_BODY_SIZE = [0.34, 0.2, 0.24]
const PLAYER_V9_LANTERN_HEAD_SIZE = [0.18, 0.24, 0.28]
const PLAYER_V9_LANTERN_HANDLE_SIZE = [0.24, 0.06, 0.11]
const PLAYER_V9_LANTERN_LIGHT_LENGTH = 2.08 / 3 / 0.2664
const PLAYER_V9_LANTERN_LIGHT_RADIUS = 1.8 / 3 / 0.2664
const PLAYER_V9_LANTERN_LENS_Y = -0.36

function cloneMaterial(material) {
  if (!material) return material
  // GLTFLoader already supplies linear Color values and sRGB base-color maps.
  // Keep those values intact when adopting the game's toon lighting pipeline.
  const cloned = toonMat(material.color, material.emissiveIntensity ?? 0, material.side)
  for (const key of ['name', 'map', 'alphaMap', 'normalMap', 'emissiveMap', 'transparent', 'opacity', 'alphaTest', 'vertexColors']) {
    if (material[key] !== undefined) cloned[key] = material[key]
  }
  if (material.normalScale) cloned.normalScale.copy(material.normalScale)
  if (material.emissive) cloned.emissive.copy(material.emissive)
  cloned.emissiveMap = material.emissiveMap ?? material.map ?? null
  cloned.depthTest = true
  cloned.depthWrite = true
  cloned.stencilRef = 3
  cloned.needsUpdate = true
  return cloned
}

function clonePlayerV9Scene(scene, gameplay) {
  const cloned = scene.clone(true)
  cloned.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    object.renderOrder = 90
    object.frustumCulled = false
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material)
  })
  addPlayerV9Outlines(cloned, gameplay ? 1.08 : 1.04)
  return cloned
}

function setPlayerV9Flash(root, flashMaterial, active) {
  root?.traverse((object) => {
    if (!object.isMesh || object.userData.studioRenderOutline) return
    if (active) {
      if (!object.userData.playerV9BaseMaterial) object.userData.playerV9BaseMaterial = object.material
      object.material = flashMaterial
      return
    }
    if (object.userData.playerV9BaseMaterial) {
      object.material = object.userData.playerV9BaseMaterial
      delete object.userData.playerV9BaseMaterial
    }
  })
}

function PlayerV9Shadow() {
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.44,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  )

  return (
    <mesh name="player-v9-shadow" rotation={[-Math.PI / 2, 0, 0]} position={[0, PLAYER_V9_RAW_MIN_Y + 0.01, 0.04]} scale={[0.78, 0.7, 1]} renderOrder={1} material={shadowMat}>
      <circleGeometry args={[1, 36]} />
    </mesh>
  )
}

function PlayerV9LanternBlock({ name, size, position, rotation, color, emissive = 0.14, scale = 1 }) {
  const material = useMemo(() => new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: emissive }), [color, emissive])
  return (
    <mesh name={name} position={position} rotation={rotation} scale={[scale, scale, scale]} renderOrder={92} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}

function PlayerV9LanternLight() {
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffdf72,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  return (
    <mesh name="player-v9-lantern-6" position={[0, PLAYER_V9_LANTERN_LENS_Y - PLAYER_V9_LANTERN_LIGHT_LENGTH / 2, 0.02]} renderOrder={93} material={material}>
      <coneGeometry args={[PLAYER_V9_LANTERN_LIGHT_RADIUS, PLAYER_V9_LANTERN_LIGHT_LENGTH, 4, 1, true]} />
    </mesh>
  )
}

function PlayerV9LanternModel() {
  return (
    <group name="player-v9-lantern-model" rotation={[0, 0, -0.05]}>
      <PlayerV9LanternBlock name="player-v9-lantern-0" size={PLAYER_V9_LANTERN_BODY_SIZE} position={[0, -0.02, 0]} color={0x1f63c9} emissive={0.18} />
      <PlayerV9LanternBlock name="player-v9-lantern-1" size={[0.22, 0.08, 0.1]} position={[0, 0.09, 0.03]} color={0x17498f} emissive={0.12} />
      <PlayerV9LanternBlock name="player-v9-lantern-2" size={PLAYER_V9_LANTERN_HANDLE_SIZE} position={[0, 0.15, 0.04]} color={0x123f82} emissive={0.1} />
      <PlayerV9LanternBlock name="player-v9-lantern-3" size={[0.12, 0.05, 0.08]} position={[0, 0.21, 0.06]} color={0xffd33d} emissive={0.45} />
      <PlayerV9LanternBlock name="player-v9-lantern-4" size={PLAYER_V9_LANTERN_HEAD_SIZE} position={[0, -0.24, 0.02]} color={0x202633} emissive={0.04} />
      <PlayerV9LanternBlock name="player-v9-lantern-5" size={[0.13, 0.035, 0.16]} position={[0, -0.36, 0.02]} color={0xf2f4ff} emissive={0.85} />
      <PlayerV9LanternLight />
      <PlayerV9LanternBlock name="player-v9-lantern-7" size={[0.04, 0.14, 0.05]} position={[0, 0.27, -0.02]} color={0x111111} emissive={0.02} />
    </group>
  )
}

export default function PlayerV9Model({ groupRef, movingRef, hitFlashToken = 0, previewArmAction = null, gameplay = false }) {
  const modelScale = PLAYER_V9_SCALE * (gameplay ? 0.9 : 1)
  const floorY = -0.32 - PLAYER_V9_RAW_MIN_Y * modelScale
  const gltf = useGLTF(PLAYER_V9_MODEL_URL)
  const scene = useMemo(() => clonePlayerV9Scene(gltf.scene, gameplay), [gltf.scene, gameplay])
  const modelRef = useRef(null)
  const lanternRef = useRef(null)
  const parts = useRef({})
  const blend = useRef(0)
  const lastHitFlashToken = useRef(hitFlashToken)
  const hitFlashFrames = useRef(0)
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), [])
  flashMat.stencilWrite = true
  flashMat.stencilRef = 3
  flashMat.stencilFunc = THREE.AlwaysStencilFunc
  flashMat.stencilZPass = THREE.ReplaceStencilOp

  const setRoot = (el) => {
    if (groupRef) groupRef.current = el
  }

  useEffect(() => {
    const found = {}
    scene.traverse((object) => {
      for (const [key, nodeName] of Object.entries(PLAYER_V9_PARTS)) {
        if (object.name === nodeName) {
          captureStudioPartBaseTransform(object)
          found[key] = object
        }
      }
    })
    parts.current = found
    return () => {
      scene.traverse((object) => {
        if (!object.userData.studioRenderOutline) return
        object.geometry.dispose()
        object.material.dispose()
      })
    }
  }, [scene])

  useFrame(({ clock }, delta) => {
    const p = parts.current
    if (!p.legL || !p.legR || !p.slvL || !p.slvR) return

    if (hitFlashToken !== lastHitFlashToken.current) {
      lastHitFlashToken.current = hitFlashToken
      hitFlashFrames.current = 1
    }
    setPlayerV9Flash(modelRef.current, flashMat, hitFlashFrames.current > 0)
    if (hitFlashFrames.current > 0) hitFlashFrames.current -= 1

    const isMoving = movingRef?.current ?? false
    blend.current += ((isMoving ? 1 : 0) - blend.current) * Math.min(1, delta * 10)
    const b = blend.current
    const t = performance.now() * 0.001
    const sw = Math.sin(t * 8.0) * 0.45 * b
    const breathe = Math.sin(t * 1.8) * 0.028 * (1 - b)
    const walkBob = Math.abs(Math.sin(t * 8.0)) * 0.022 * b
    const bob = breathe + walkBob

    p.legL.rotation.x = composeStudioPartRotation(p.legL, 'x', 0, sw)
    p.legR.rotation.x = composeStudioPartRotation(p.legR, 'x', 0, -sw)

    const armAction = previewArmAction
      ? { type: previewArmAction, progress: 0.5 }
      : getActivePlayerArmAction(playerArmActionState, clock.elapsedTime * 1000)
    const armPose = getPlayerArmPose({ action: armAction, walkSwing: sw })
    const breatheArm = Math.sin(t * 1.8) * 0.03 * (1 - b)

    p.slvL.rotation.x = composeStudioPartRotation(p.slvL, 'x', 0, armPose.slvL.x)
    p.slvL.rotation.y = composeStudioPartRotation(p.slvL, 'y', 0, armPose.slvL.y)
    p.slvL.rotation.z = composeStudioPartRotation(p.slvL, 'z', 0, armPose.slvL.z + breatheArm)
    p.slvR.rotation.x = composeStudioPartRotation(p.slvR, 'x', 0, armPose.slvR.x)
    p.slvR.rotation.y = composeStudioPartRotation(p.slvR, 'y', 0, armPose.slvR.y)
    p.slvR.rotation.z = composeStudioPartRotation(p.slvR, 'z', 0, armPose.slvR.z - breatheArm)

    if (lanternRef.current) {
      lanternRef.current.visible = armAction?.type === 'lanternAim' || armAction?.type === 'lanternFlashlight'
      modelRef.current.updateWorldMatrix(true, false)
      p.slvR.updateWorldMatrix(true, false)
      lanternRef.current.matrix.copy(modelRef.current.matrixWorld).invert().multiply(p.slvR.matrixWorld).multiply(PLAYER_V9_LANTERN_OFFSET)
      lanternRef.current.matrixAutoUpdate = false
    }

    if (bagSwingState.active) {
      const swingT = bagSwingState.progress
      const swingPower = Math.sin(swingT * Math.PI)
      const sweep = -1.25 + swingT * 2.5
      p.slvR.rotation.x = composeStudioPartRotation(p.slvR, 'x', 0, -1.55 * swingPower)
      p.slvR.rotation.y = composeStudioPartRotation(p.slvR, 'y', 0, -0.35 * swingPower)
      p.slvR.rotation.z = composeStudioPartRotation(p.slvR, 'z', 0, -0.25 - sweep * 0.78)
      p.slvL.rotation.x = composeStudioPartRotation(p.slvL, 'x', 0, -0.35 * swingPower)
      p.slvL.rotation.z = composeStudioPartRotation(p.slvL, 'z', 0, 0.24 * swingPower)
    }

    if (p.bag) {
      p.bag.rotation.z = composeStudioPartRotation(
        p.bag,
        'z',
        0,
        bagSwingState.active ? 0 : -0.05 + Math.sin(t * 5.5) * 0.03 * b,
      )
    }
    if (p.head) p.head.position.y = composeStudioPartPosition(p.head, 'y', 0, bob)
  })

  return (
    <group ref={setRoot}>
      <StudioTunedGroup itemId="player-v9">
        <group name="player-v9-model" ref={modelRef} position={[0, floorY, 0]} scale={[modelScale, modelScale, modelScale]}>
          <PlayerV9Shadow />
          <primitive object={scene} />
          <group name="player-v9-lantern" ref={lanternRef} visible={false}>
            <PlayerV9LanternModel />
          </group>
        </group>
      </StudioTunedGroup>
    </group>
  )
}

useGLTF.preload(PLAYER_V9_MODEL_URL)
