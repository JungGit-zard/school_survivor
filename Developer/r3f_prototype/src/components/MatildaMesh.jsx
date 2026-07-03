import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import matildaFaceTextureUrl from '../assets/character/matilda_face_texture.png'
import { PLAYER_MESH_RAW_HEIGHT, PLAYER_MESH_SCALE, PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

export const MATILDA_VISUAL_SCALE = PLAYER_MESH_SCALE * 2
export const MATILDA_WORLD_HEIGHT = PLAYER_MESH_RAW_HEIGHT * MATILDA_VISUAL_SCALE

export const MATILDA_IDLE_ANIMATION = {
  floatBaseY: 0.18,
  floatBobY: 0.045,
  floatSpeed: 1.7,
  swayZ: 0.025,
}

export const MATILDA_DEFAULT_MOVEMENT_POSE = false
export const MATILDA_FORWARD_LEAN_RAD = Math.PI / 4
export const MATILDA_BODY_CENTER_Y = 0.82
const MATILDA_FORWARD_LEAN_OFFSET_Y = MATILDA_BODY_CENTER_Y * (1 - Math.cos(MATILDA_FORWARD_LEAN_RAD))
const MATILDA_FORWARD_LEAN_OFFSET_Z = -MATILDA_BODY_CENTER_Y * Math.sin(MATILDA_FORWARD_LEAN_RAD)

export const MATILDA_IDLE_POSE = {
  rootFloatY: MATILDA_IDLE_ANIMATION.floatBaseY,
  rootOffsetZ: 0,
  upperPivotOffsetY: 0,
  upperPivotOffsetZ: 0,
  upperLeanX: 0,
  headLeanX: 0,
  leftFoot: {
    position: [-0.17, -0.46, 0.07],
    positionZ: 0.07,
    rotationX: 0,
  },
  rightFoot: {
    position: [0.17, -0.46, 0.07],
    positionZ: 0.07,
    rotationX: 0,
  },
}

export const MATILDA_MOVEMENT_POSE = {
  rootFloatY: MATILDA_IDLE_ANIMATION.floatBaseY,
  rootOffsetZ: 0,
  upperPivotOffsetY: MATILDA_FORWARD_LEAN_OFFSET_Y,
  upperPivotOffsetZ: MATILDA_FORWARD_LEAN_OFFSET_Z,
  upperLeanX: MATILDA_FORWARD_LEAN_RAD,
  headLeanX: 0,
  leftFoot: {
    position: [-0.17, -0.46, 0.07],
    positionZ: 0.07,
    rotationX: 0,
  },
  rightFoot: {
    position: [0.17, -0.46, 0.07],
    positionZ: 0.07,
    rotationX: 0,
  },
}

export const MATILDA_MODEL_PARTS = [
  'head',
  'longHair',
  'backLongHair',
  'horns',
  'pointedEars',
  'batWings',
  'dress',
  'puffySleeves',
  'skirt',
  'magentaRibbon',
  'arms',
  'legs',
  'boots',
  'tail',
]

export const MATILDA_REFERENCE_FEATURES = {
  chibiProportions: true,
  frontBangs: true,
  largeBatWings: true,
  puffySleeves: true,
  shortSkirt: true,
  heartRibbon: true,
}

export const MATILDA_DEFAULT_FACE_TEXTURE_SOURCE = 'assets/character/matilda_face_texture.png'

export const MATILDA_PALETTE = {
  hair: 0xb43752,
  horn: 0x171018,
  wingMembrane: 0x3b1d45,
  dress: 0x241426,
  trim: 0xd94b8c,
  skin: 0xffc7a6,
}

export const MATILDA_BACK_HAIR_COVERAGE = {
  headWidth: 0.60,
  headCenterY: 1.43,
  headZ: 0,
  upperBackY: 0.98,
  backHairWidth: 0.78,
  backHairHeight: 1.38,
  backHairCenterY: 1.00,
  backHairTopY: 1.69,
  backHairBottomY: 0.31,
  backHairZ: -0.23,
}

export const MATILDA_FACE_TEXTURE_SLOT = {
  target: 'head-front',
  propName: 'faceTextureUrl',
  width: 0.60,
  height: 0.56,
  x: 0,
  y: 1.43,
  z: 0.225,
  headCenterZ: 0,
}

export const MATILDA_ARM_LAYOUT = {
  left: {
    center: [-0.47, 0.72, 0.02],
    rotationZ: -0.32,
    shoulderX: -0.36,
    shoulderY: 1.06,
    handX: -0.58,
    handY: 0.38,
  },
  right: {
    center: [0.47, 0.72, 0.02],
    rotationZ: 0.32,
    shoulderX: 0.36,
    shoulderY: 1.06,
    handX: 0.58,
    handY: 0.38,
  },
}

function Part({ groupRef = null, size, position, rotation = [0, 0, 0], color, emissive = 0.1, outlineScale = 1.06 }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outMat = useMemo(() => outlineMat(0.96), [])
  const outline = inflateScale(outlineScale)

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh renderOrder={0} geometry={geo} material={outMat} scale={[outline, outline, outline]} />
      <mesh renderOrder={1} geometry={geo} material={mat} />
    </group>
  )
}

function TexturedFace({ textureUrl, local = false }) {
  const texture = useLoader(THREE.TextureLoader, textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false

  return (
    <mesh renderOrder={4} position={[MATILDA_FACE_TEXTURE_SLOT.x, local ? 0 : MATILDA_FACE_TEXTURE_SLOT.y, MATILDA_FACE_TEXTURE_SLOT.z]}>
      <planeGeometry args={[MATILDA_FACE_TEXTURE_SLOT.width, MATILDA_FACE_TEXTURE_SLOT.height]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function FaceSlot({ faceTextureUrl, local = false }) {
  if (faceTextureUrl) return <TexturedFace textureUrl={faceTextureUrl} local={local} />
  return null
}

export default function MatildaMesh({ faceTextureUrl = matildaFaceTextureUrl, movementPose = MATILDA_DEFAULT_MOVEMENT_POSE }) {
  const pal = MATILDA_PALETTE
  const idleRef = useRef()
  const upperRef = useRef()
  const headRef = useRef()
  const leftFootRef = useRef()
  const rightFootRef = useRef()

  useFrame(({ clock }) => {
    if (!idleRef.current) return
    const t = clock.elapsedTime
    const pose = movementPose ? MATILDA_MOVEMENT_POSE : MATILDA_IDLE_POSE
    idleRef.current.position.y = pose.rootFloatY + Math.sin(t * MATILDA_IDLE_ANIMATION.floatSpeed) * MATILDA_IDLE_ANIMATION.floatBobY
    idleRef.current.position.z = pose.rootOffsetZ
    idleRef.current.rotation.z = Math.sin(t * 1.25) * MATILDA_IDLE_ANIMATION.swayZ
    if (upperRef.current) {
      upperRef.current.position.y = pose.upperPivotOffsetY
      upperRef.current.position.z = pose.upperPivotOffsetZ
      upperRef.current.rotation.x = pose.upperLeanX
    }
    if (headRef.current) headRef.current.rotation.x = pose.headLeanX
    if (leftFootRef.current) leftFootRef.current.rotation.x = pose.leftFoot.rotationX
    if (rightFootRef.current) rightFootRef.current.rotation.x = pose.rightFoot.rotationX
  })

  const pose = movementPose ? MATILDA_MOVEMENT_POSE : MATILDA_IDLE_POSE

  return (
    <group ref={idleRef} scale={[MATILDA_VISUAL_SCALE, MATILDA_VISUAL_SCALE, MATILDA_VISUAL_SCALE]}>
      <group ref={upperRef}>
        <group ref={headRef} position={[0, 1.43, 0]}>
          <Part size={[0.60, 0.56, 0.42]} position={[0, 0, 0]} color={pal.skin} emissive={0.12} />
          <FaceSlot faceTextureUrl={faceTextureUrl} local />
          <Part size={[0.72, 0.34, 0.50]} position={[0, 0.27, -0.02]} color={pal.hair} emissive={0.14} />
          <Part size={[0.56, 0.22, 0.10]} position={[0, 0.16, 0.245]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
          <Part size={[0.16, 0.34, 0.10]} position={[-0.23, 0.04, 0.25]} rotation={[0, 0, -0.12]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
          <Part size={[0.16, 0.34, 0.10]} position={[0.23, 0.04, 0.25]} rotation={[0, 0, 0.12]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
          <Part size={[0.14, 0.42, 0.14]} position={[-0.25, 0.57, 0]} rotation={[0, 0, -0.34]} color={pal.horn} emissive={0.04} />
          <Part size={[0.14, 0.42, 0.14]} position={[0.25, 0.57, 0]} rotation={[0, 0, 0.34]} color={pal.horn} emissive={0.04} />
          <Part size={[0.20, 0.22, 0.08]} position={[-0.42, 0, 0.03]} rotation={[0, 0, -0.50]} color={pal.skin} emissive={0.08} />
          <Part size={[0.20, 0.22, 0.08]} position={[0.42, 0, 0.03]} rotation={[0, 0, 0.50]} color={pal.skin} emissive={0.08} />
        </group>
        <Part
          size={[
            MATILDA_BACK_HAIR_COVERAGE.backHairWidth,
            MATILDA_BACK_HAIR_COVERAGE.backHairHeight,
            0.20,
          ]}
          position={[0, MATILDA_BACK_HAIR_COVERAGE.backHairCenterY, MATILDA_BACK_HAIR_COVERAGE.backHairZ]}
          color={pal.hair}
          emissive={0.12}
        />
        <Part size={[0.22, 1.02, 0.22]} position={[-0.40, 0.98, -0.06]} color={pal.hair} emissive={0.12} />
        <Part size={[0.22, 1.02, 0.22]} position={[0.40, 0.98, -0.06]} color={pal.hair} emissive={0.12} />
        <Part size={[0.48, 0.48, 0.32]} position={[0, 0.82, 0]} color={pal.dress} emissive={0.12} />
        <Part size={[0.72, 0.34, 0.42]} position={[0, 0.42, 0.02]} color={pal.dress} emissive={0.12} />
        <Part size={[0.60, 0.10, 0.36]} position={[0, 0.70, 0.03]} color={pal.trim} emissive={0.22} />
        <Part size={[0.24, 0.18, 0.08]} position={[-0.12, 0.74, 0.25]} rotation={[0, 0, 0.64]} color={pal.trim} emissive={0.24} />
        <Part size={[0.24, 0.18, 0.08]} position={[0.12, 0.74, 0.26]} rotation={[0, 0, -0.64]} color={pal.trim} emissive={0.24} />
        <Part size={[0.30, 0.28, 0.28]} position={[-0.50, 0.94, 0.04]} color={pal.dress} emissive={0.10} />
        <Part size={[0.30, 0.28, 0.28]} position={[0.50, 0.94, 0.04]} color={pal.dress} emissive={0.10} />
        <Part size={[0.22, 0.72, 0.18]} position={MATILDA_ARM_LAYOUT.left.center} rotation={[0, 0, MATILDA_ARM_LAYOUT.left.rotationZ]} color={pal.skin} emissive={0.08} />
        <Part size={[0.22, 0.72, 0.18]} position={MATILDA_ARM_LAYOUT.right.center} rotation={[0, 0, MATILDA_ARM_LAYOUT.right.rotationZ]} color={pal.skin} emissive={0.08} />
        <Part size={[0.82, 0.66, 0.08]} position={[-0.72, 0.94, -0.18]} rotation={[0.12, 0.20, 0.32]} color={pal.wingMembrane} emissive={0.12} outlineScale={1.04} />
        <Part size={[0.82, 0.66, 0.08]} position={[0.72, 0.94, -0.18]} rotation={[0.12, -0.20, -0.32]} color={pal.wingMembrane} emissive={0.12} outlineScale={1.04} />
        <Part size={[0.32, 0.18, 0.08]} position={[-0.96, 1.20, -0.12]} rotation={[0, 0, -0.42]} color={pal.horn} emissive={0.05} outlineScale={1.02} />
        <Part size={[0.32, 0.18, 0.08]} position={[0.96, 1.20, -0.12]} rotation={[0, 0, 0.42]} color={pal.horn} emissive={0.05} outlineScale={1.02} />
        <Part size={[0.12, 0.78, 0.12]} position={[0, -0.02, -0.26]} rotation={[0.52, 0, 0]} color={pal.hair} emissive={0.12} />
        <Part size={[0.16, 0.12, 0.08]} position={[0.02, -0.43, -0.18]} rotation={[0, 0, -0.55]} color={pal.horn} emissive={0.04} />
        <Part size={[0.22, 0.56, 0.20]} position={[-0.17, -0.07, 0.02]} color={pal.skin} emissive={0.08} />
        <Part size={[0.22, 0.56, 0.20]} position={[0.17, -0.07, 0.02]} color={pal.skin} emissive={0.08} />
        <Part groupRef={leftFootRef} size={[0.34, 0.24, 0.34]} position={pose.leftFoot.position} color={pal.horn} emissive={0.04} />
        <Part groupRef={rightFootRef} size={[0.34, 0.24, 0.34]} position={pose.rightFoot.position} color={pal.horn} emissive={0.04} />
      </group>
    </group>
  )
}

export function getMatildaHeightRatio() {
  return MATILDA_WORLD_HEIGHT / PLAYER_MESH_WORLD_HEIGHT
}
