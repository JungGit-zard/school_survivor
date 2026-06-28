import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import matildaFaceTextureUrl from '../assets/character/matilda_face_texture.png'
import { PLAYER_MESH_RAW_HEIGHT, PLAYER_MESH_SCALE, PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

export const MATILDA_VISUAL_SCALE = PLAYER_MESH_SCALE * 2
export const MATILDA_WORLD_HEIGHT = PLAYER_MESH_RAW_HEIGHT * MATILDA_VISUAL_SCALE

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

function Part({ size, position, rotation = [0, 0, 0], color, emissive = 0.1, outlineScale = 1.06 }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const mat = useMemo(() => toonMat(color, emissive), [color, emissive])
  const outMat = useMemo(() => outlineMat(0.96), [])
  const outline = inflateScale(outlineScale)

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={0} geometry={geo} material={outMat} scale={[outline, outline, outline]} />
      <mesh renderOrder={1} geometry={geo} material={mat} />
    </group>
  )
}

function TexturedFace({ textureUrl }) {
  const texture = useLoader(THREE.TextureLoader, textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false

  return (
    <mesh renderOrder={4} position={[MATILDA_FACE_TEXTURE_SLOT.x, MATILDA_FACE_TEXTURE_SLOT.y, MATILDA_FACE_TEXTURE_SLOT.z]}>
      <planeGeometry args={[MATILDA_FACE_TEXTURE_SLOT.width, MATILDA_FACE_TEXTURE_SLOT.height]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function FaceSlot({ faceTextureUrl }) {
  if (faceTextureUrl) return <TexturedFace textureUrl={faceTextureUrl} />
  return null
}

export default function MatildaMesh({ faceTextureUrl = matildaFaceTextureUrl }) {
  const pal = MATILDA_PALETTE

  return (
    <group scale={[MATILDA_VISUAL_SCALE, MATILDA_VISUAL_SCALE, MATILDA_VISUAL_SCALE]}>
      <Part size={[0.60, 0.56, 0.42]} position={[0, 1.43, 0]} color={pal.skin} emissive={0.12} />
      <FaceSlot faceTextureUrl={faceTextureUrl} />
      <Part size={[0.72, 0.34, 0.50]} position={[0, 1.70, -0.02]} color={pal.hair} emissive={0.14} />
      <Part size={[0.56, 0.22, 0.10]} position={[0, 1.59, 0.245]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
      <Part size={[0.16, 0.34, 0.10]} position={[-0.23, 1.47, 0.25]} rotation={[0, 0, -0.12]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
      <Part size={[0.16, 0.34, 0.10]} position={[0.23, 1.47, 0.25]} rotation={[0, 0, 0.12]} color={pal.hair} emissive={0.14} outlineScale={1.03} />
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
      <Part size={[0.14, 0.42, 0.14]} position={[-0.25, 2.00, 0]} rotation={[0, 0, -0.34]} color={pal.horn} emissive={0.04} />
      <Part size={[0.14, 0.42, 0.14]} position={[0.25, 2.00, 0]} rotation={[0, 0, 0.34]} color={pal.horn} emissive={0.04} />
      <Part size={[0.20, 0.22, 0.08]} position={[-0.42, 1.43, 0.03]} rotation={[0, 0, -0.50]} color={pal.skin} emissive={0.08} />
      <Part size={[0.20, 0.22, 0.08]} position={[0.42, 1.43, 0.03]} rotation={[0, 0, 0.50]} color={pal.skin} emissive={0.08} />
      <Part size={[0.48, 0.48, 0.32]} position={[0, 0.82, 0]} color={pal.dress} emissive={0.12} />
      <Part size={[0.72, 0.34, 0.42]} position={[0, 0.42, 0.02]} color={pal.dress} emissive={0.12} />
      <Part size={[0.60, 0.10, 0.36]} position={[0, 0.70, 0.03]} color={pal.trim} emissive={0.22} />
      <Part size={[0.24, 0.18, 0.08]} position={[-0.12, 0.74, 0.25]} rotation={[0, 0, 0.64]} color={pal.trim} emissive={0.24} />
      <Part size={[0.24, 0.18, 0.08]} position={[0.12, 0.74, 0.26]} rotation={[0, 0, -0.64]} color={pal.trim} emissive={0.24} />
      <Part size={[0.30, 0.28, 0.28]} position={[-0.50, 0.94, 0.04]} color={pal.dress} emissive={0.10} />
      <Part size={[0.30, 0.28, 0.28]} position={[0.50, 0.94, 0.04]} color={pal.dress} emissive={0.10} />
      <Part size={[0.22, 0.72, 0.18]} position={MATILDA_ARM_LAYOUT.left.center} rotation={[0, 0, MATILDA_ARM_LAYOUT.left.rotationZ]} color={pal.skin} emissive={0.08} />
      <Part size={[0.22, 0.72, 0.18]} position={MATILDA_ARM_LAYOUT.right.center} rotation={[0, 0, MATILDA_ARM_LAYOUT.right.rotationZ]} color={pal.skin} emissive={0.08} />
      <Part size={[0.22, 0.56, 0.20]} position={[-0.17, -0.07, 0.02]} color={pal.skin} emissive={0.08} />
      <Part size={[0.22, 0.56, 0.20]} position={[0.17, -0.07, 0.02]} color={pal.skin} emissive={0.08} />
      <Part size={[0.34, 0.24, 0.34]} position={[-0.17, -0.46, 0.07]} color={pal.horn} emissive={0.04} />
      <Part size={[0.34, 0.24, 0.34]} position={[0.17, -0.46, 0.07]} color={pal.horn} emissive={0.04} />
      <Part size={[0.82, 0.66, 0.08]} position={[-0.72, 0.94, -0.18]} rotation={[0.12, 0.20, 0.32]} color={pal.wingMembrane} emissive={0.12} outlineScale={1.04} />
      <Part size={[0.82, 0.66, 0.08]} position={[0.72, 0.94, -0.18]} rotation={[0.12, -0.20, -0.32]} color={pal.wingMembrane} emissive={0.12} outlineScale={1.04} />
      <Part size={[0.32, 0.18, 0.08]} position={[-0.96, 1.20, -0.12]} rotation={[0, 0, -0.42]} color={pal.horn} emissive={0.05} outlineScale={1.02} />
      <Part size={[0.32, 0.18, 0.08]} position={[0.96, 1.20, -0.12]} rotation={[0, 0, 0.42]} color={pal.horn} emissive={0.05} outlineScale={1.02} />
      <Part size={[0.12, 0.78, 0.12]} position={[0, -0.02, -0.26]} rotation={[0.52, 0, 0]} color={pal.hair} emissive={0.12} />
      <Part size={[0.16, 0.12, 0.08]} position={[0.02, -0.43, -0.18]} rotation={[0, 0, -0.55]} color={pal.horn} emissive={0.04} />
    </group>
  )
}

export function getMatildaHeightRatio() {
  return MATILDA_WORLD_HEIGHT / PLAYER_MESH_WORLD_HEIGHT
}
