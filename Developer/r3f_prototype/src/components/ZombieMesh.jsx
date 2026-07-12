import { useEffect, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat } from '../lib/toon.js'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import boss02FaceUrl from '../assets/enemies/boss_02.webp'
import MatildaMesh from './MatildaMesh.jsx'
import StudioTunedGroup from './StudioTunedGroup.jsx'

// 타입별 색상 팔레트
export const ZOMBIE_PALETTE = {
  E01: { body: 0x4a7a2c, skin: 0x8ab060, eye: 0xff2020 },
  E02: { body: 0x7a28b8, skin: 0xb870d8, eye: 0xff8020 },
  E03: { body: 0x253e18, skin: 0x425e30, eye: 0xff2020 },
  E04: { body: 0xb05010, skin: 0xd08840, eye: 0xffcc00 },
  E05: { body: 0x9a1818, skin: 0xc84030, eye: 0xff0000 },
  E06: { body: 0x520808, skin: 0x801818, eye: 0xff4400 },
  B01: { body: 0x100808, skin: 0x281010, eye: 0xff0000 },
  B02: { body: 0x111923, skin: 0x8fb0d8, eye: 0x111111 },
  B03: { body: 0x18324a, skin: 0x91ad68, eye: 0xff493d },
}

export const B01_BOSS_VISUAL_PALETTE = {
  skin: 0x9fb87a,
  skinShadow: 0x6e8758,
  jacket: 0x1d2732,
  jacketShadow: 0x121820,
  shirt: 0xd8d0b8,
  tie: 0x9f2222,
  pants: 0x5a351d,
  shoe: 0x111317,
  hair: 0x2f281f,
  eye: 0xe4e8d6,
  pupil: 0x141414,
  mouth: 0x3a1210,
  teeth: 0xefe8c9,
}

export const B01_BOSS_VISUAL_PARTS = [
  'blockHead',
  'raggedHair',
  'simplifiedFace',
  'suitJacket',
  'whiteShirt',
  'redTie',
  'brownPants',
  'blackShoes',
  'forwardArms',
  'raggedTears',
]

export const B01_BOSS_FACE_LAYOUT = {
  leftEye: { size: [0.12, 0.09, 0.035], position: [-0.14, 0.05, 0.265], color: 'dark' },
  rightEye: { size: [0.14, 0.105, 0.035], position: [0.14, 0.05, 0.265], color: 'light' },
  rightPupil: { size: [0.045, 0.045, 0.02], position: [0.14, 0.045, 0.292] },
  leftBrow: { size: [0.18, 0.055, 0.035], position: [-0.14, 0.14, 0.292], rotation: [0, 0, -0.14] },
  rightBrow: { size: [0.2, 0.055, 0.035], position: [0.14, 0.15, 0.292], rotation: [0, 0, 0.12] },
  mouth: { size: [0.18, 0.105, 0.04], position: [0.01, -0.16, 0.27] },
  tooth: { size: [0.055, 0.04, 0.035], position: [-0.005, -0.125, 0.295] },
  cheekShadow: { size: [0.07, 0.16, 0.035], position: [0.275, -0.02, 0.20] },
}

export const B03_PE_TEACHER_PALETTE = {
  skin: 0x91ad68,
  skinShadow: 0x60784b,
  jersey: 0x18324a,
  jerseyShadow: 0x0e2030,
  jerseyStripe: 0xf1eee2,
  shorts: 0x26394d,
  whistle: 0xf5c542,
  wristband: 0xd94a3d,
  shoe: 0xe9e7dd,
  sole: 0x25282d,
  hair: 0x27231f,
  eye: 0xff493d,
  mouth: 0x3a1210,
  teeth: 0xefe8c9,
}

export const B03_PE_TEACHER_PARTS = [
  'squareHead',
  'sportHair',
  'angryFace',
  'wideShoulders',
  'sleevelessJersey',
  'chestMuscles',
  'oversizedBiceps',
  'wristbands',
  'whistle',
  'gymShorts',
  'socksAndSneakers',
]

export const B03_PE_TEACHER_FACE_LAYOUT = {
  leftEye: { size: [0.12, 0.08, 0.045], position: [-0.14, 0.04, 0.245] },
  rightEye: { size: [0.12, 0.08, 0.045], position: [0.14, 0.04, 0.245] },
  leftBrow: { size: [0.20, 0.055, 0.04], position: [-0.14, 0.14, 0.265], rotation: [0, 0, -0.24] },
  rightBrow: { size: [0.20, 0.055, 0.04], position: [0.14, 0.14, 0.265], rotation: [0, 0, 0.24] },
  nose: { size: [0.10, 0.13, 0.06], position: [0, -0.04, 0.265] },
  mouth: { size: [0.26, 0.10, 0.045], position: [0, -0.17, 0.25] },
  tooth: { size: [0.07, 0.04, 0.035], position: [-0.05, -0.14, 0.28] },
}

export const B02_TEACHER_BOSS_PALETTE = {
  skin: 0x8fb0d8,
  skinShadow: 0x5d789b,
  suit: 0x111923,
  suitShadow: 0x090d12,
  shirt: 0xe7e3d6,
  skirt: 0x101821,
  shoe: 0x08090b,
  hair: 0x2e251e,
  hairShadow: 0x1f1713,
}

export const B02_TEACHER_BOSS_PARTS = [
  'headWithFaceTexture',
  'topHairPlate',
  'leftHairPlate',
  'rightHairPlate',
  'backHairPlate',
  'bunBlock',
  'teacherSuit',
  'skirt',
  'forwardArms',
  'blueSkinHandsAndLegs',
  'blackShoes',
]

export const B02_TEACHER_BOSS_FACE = {
  size: [0.62, 0.62],
  position: [0, 0, 0.276],
  repeat: [1, 1],
  offset: [0, 0],
}

function ZBlock({ name, studioPartId, size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getSharedOutlineMat()
  const mat    = flash ? getFlashMat() : getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)
  return (
    <group name={studioPartId ?? name} userData={studioPartId ? { studioPartId } : undefined} position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os, os, os]} userData={{ studioRenderOutline: true }} />
      <mesh renderOrder={2} geometry={geo} material={mat} />
    </group>
  )
}

function B01BossZombieMesh({ hitFlash, reg }) {
  const pal = B01_BOSS_VISUAL_PALETTE
  const face = B01_BOSS_FACE_LAYOUT

  return (
    <group>
      <group ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock size={[0.58, 0.50, 0.48]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        <ZBlock size={[0.60, 0.18, 0.46]} position={[-0.02, 0.25, -0.02]} rotation={[0.06, 0, -0.08]} color={pal.hair} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={face.leftBrow.size} position={face.leftBrow.position} rotation={face.leftBrow.rotation} color={pal.hair} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.rightBrow.size} position={face.rightBrow.position} rotation={face.rightBrow.rotation} color={pal.hair} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.leftEye.size} position={face.leftEye.position} color={pal.pupil} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.rightEye.size} position={face.rightEye.position} color={pal.eye} emissive={0.18} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.rightPupil.size} position={face.rightPupil.position} color={pal.pupil} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.mouth.size} position={face.mouth.position} color={pal.mouth} emissive={0.08} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.tooth.size} position={face.tooth.position} color={pal.teeth} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.cheekShadow.size} position={face.cheekShadow.position} color={pal.skinShadow} emissive={0.035} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('body')} position={[0, 0.26, 0]}>
        <ZBlock size={[0.62, 0.62, 0.42]} position={[0, 0, 0]} color={pal.jacket} emissive={0.08} outlineScale={1.09} flash={hitFlash} />
        <ZBlock size={[0.22, 0.54, 0.05]} position={[0, 0.02, 0.235]} color={pal.shirt} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.09, 0.44, 0.06]} position={[0, -0.02, 0.27]} rotation={[0, 0, -0.08]} color={pal.tie} emissive={0.10} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.16, 0.14, 0.055]} position={[0, 0.27, 0.275]} rotation={[0, 0, 0.75]} color={pal.tie} emissive={0.10} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.11, 0.16, 0.055]} position={[-0.22, -0.10, 0.255]} rotation={[0, 0, -0.28]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.09, 0.12, 0.055]} position={[0.24, 0.10, 0.255]} rotation={[0, 0, 0.34]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.18, 0.18, 0.08]} position={[0.25, -0.23, -0.08]} rotation={[0, 0, -0.18]} color={pal.jacketShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group ref={reg('armL')} position={[-0.43, 0.54, 0]} rotation={[-1.14, 0, 0.15]}>
        <ZBlock size={[0.23, 0.54, 0.22]} position={[0, -0.27, 0]} color={pal.jacket} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.18, 0.20]} position={[0, -0.58, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.11, 0.11, 0.05]} position={[0.05, -0.35, 0.12]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('armR')} position={[0.43, 0.54, 0]} rotation={[-1.14, 0, -0.15]}>
        <ZBlock size={[0.23, 0.54, 0.22]} position={[0, -0.27, 0]} color={pal.jacket} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.18, 0.20]} position={[0, -0.58, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.11, 0.12, 0.05]} position={[-0.05, -0.35, 0.12]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('legL')} position={[-0.16, 0.00, 0]}>
        <ZBlock size={[0.23, 0.52, 0.28]} position={[0, -0.26, 0]} color={pal.pants} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.25, 0.12, 0.35]} position={[0, -0.57, 0.05]} color={pal.shoe} emissive={0.04} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.10, 0.15, 0.05]} position={[-0.08, -0.20, 0.17]} rotation={[0, 0, 0.3]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('legR')} position={[0.16, 0.00, 0]}>
        <ZBlock size={[0.23, 0.52, 0.28]} position={[0, -0.26, 0]} color={pal.pants} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.25, 0.12, 0.35]} position={[0, -0.57, 0.05]} color={pal.shoe} emissive={0.04} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.09, 0.13, 0.05]} position={[0.08, -0.35, 0.17]} rotation={[0, 0, -0.2]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>
    </group>
  )
}

function B03PhysicalEducationBossMesh({ hitFlash, reg }) {
  const pal = B03_PE_TEACHER_PALETTE
  const face = B03_PE_TEACHER_FACE_LAYOUT

  return (
    <group>
      <group name="b01PeTeacherHeadRig" ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock name="b01Head" studioPartId="b03-head" size={[0.56, 0.48, 0.44]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01SportHair" studioPartId="b03-hair" size={[0.58, 0.13, 0.45]} position={[0, 0.28, -0.01]} color={pal.hair} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b01EyeL" size={face.leftEye.size} position={face.leftEye.position} color={pal.eye} emissive={0.7} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01EyeR" size={face.rightEye.size} position={face.rightEye.position} color={pal.eye} emissive={0.7} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01BrowL" size={face.leftBrow.size} position={face.leftBrow.position} rotation={face.leftBrow.rotation} color={pal.hair} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01BrowR" size={face.rightBrow.size} position={face.rightBrow.position} rotation={face.rightBrow.rotation} color={pal.hair} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01Nose" size={face.nose.size} position={face.nose.position} color={pal.skinShadow} emissive={0.035} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.mouth.size} position={face.mouth.position} color={pal.mouth} emissive={0.08} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={face.tooth.size} position={face.tooth.position} color={pal.teeth} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherBodyRig" ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="b01Shoulders" studioPartId="b03-shoulders" size={[0.96, 0.26, 0.46]} position={[0, 0.27, 0]} color={pal.jerseyShadow} emissive={0.05} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01Body" studioPartId="b03-body" size={[0.76, 0.64, 0.46]} position={[0, 0, 0]} color={pal.jersey} emissive={0.06} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01ChestL" studioPartId="b03-chest-l" size={[0.30, 0.22, 0.09]} position={[-0.18, 0.15, 0.27]} color={pal.jerseyShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
        <ZBlock name="b01ChestR" studioPartId="b03-chest-r" size={[0.30, 0.22, 0.09]} position={[0.18, 0.15, 0.27]} color={pal.jerseyShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
        <ZBlock name="b01JerseyVLeft" size={[0.07, 0.46, 0.05]} position={[-0.13, 0.02, 0.275]} rotation={[0, 0, 0.36]} color={pal.jerseyStripe} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01JerseyVRight" size={[0.07, 0.46, 0.05]} position={[0.13, 0.02, 0.275]} rotation={[0, 0, -0.36]} color={pal.jerseyStripe} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01WhistleCordL" size={[0.03, 0.28, 0.035]} position={[-0.06, 0.05, 0.32]} rotation={[0, 0, 0.28]} color={pal.sole} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01WhistleCordR" size={[0.03, 0.28, 0.035]} position={[0.06, 0.05, 0.32]} rotation={[0, 0, -0.28]} color={pal.sole} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01Whistle" studioPartId="b03-whistle" size={[0.14, 0.10, 0.075]} position={[0, -0.08, 0.35]} color={pal.whistle} emissive={0.20} outlineScale={1.03} flash={hitFlash} />
      </group>

      <ZBlock name="b01Shorts" studioPartId="b03-shorts" size={[0.68, 0.28, 0.44]} position={[0, -0.17, 0]} color={pal.shorts} emissive={0.05} outlineScale={1.07} flash={hitFlash} />

      <group name="b01PeTeacherArmLRig" ref={reg('armL')} position={[-0.55, 0.57, 0]} rotation={[-1.14, 0, 0.15]}>
        <ZBlock name="b01BicepL" studioPartId="b03-bicep-l" size={[0.34, 0.38, 0.34]} position={[0, -0.19, 0]} color={pal.skin} emissive={0.07} outlineScale={1.07} flash={hitFlash} />
        <ZBlock name="b01ForearmL" studioPartId="b03-arm-l" size={[0.25, 0.32, 0.25]} position={[0, -0.43, 0.01]} color={pal.skinShadow} emissive={0.05} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b01WristbandL" studioPartId="b03-wristband-l" size={[0.28, 0.10, 0.28]} position={[0, -0.58, 0.02]} color={pal.wristband} emissive={0.08} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b01FistL" size={[0.28, 0.24, 0.28]} position={[0, -0.72, 0.04]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherArmRRig" ref={reg('armR')} position={[0.55, 0.57, 0]} rotation={[-1.14, 0, -0.15]}>
        <ZBlock name="b01BicepR" studioPartId="b03-bicep-r" size={[0.34, 0.38, 0.34]} position={[0, -0.19, 0]} color={pal.skin} emissive={0.07} outlineScale={1.07} flash={hitFlash} />
        <ZBlock name="b01ForearmR" studioPartId="b03-arm-r" size={[0.25, 0.32, 0.25]} position={[0, -0.43, 0.01]} color={pal.skinShadow} emissive={0.05} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b01WristbandR" studioPartId="b03-wristband-r" size={[0.28, 0.10, 0.28]} position={[0, -0.58, 0.02]} color={pal.wristband} emissive={0.08} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b01FistR" size={[0.28, 0.24, 0.28]} position={[0, -0.72, 0.04]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherLegLRig" ref={reg('legL')} position={[-0.19, 0.00, 0]}>
        <ZBlock studioPartId="b03-leg-l" size={[0.29, 0.34, 0.32]} position={[0, -0.12, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.25, 0.22, 0.28]} position={[0, -0.36, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock studioPartId="b03-sock-l" size={[0.27, 0.10, 0.29]} position={[0, -0.51, 0]} color={pal.jerseyStripe} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock studioPartId="b03-shoe-l" size={[0.33, 0.12, 0.43]} position={[0, -0.61, 0.07]} color={pal.shoe} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.35, 0.05, 0.45]} position={[0, -0.69, 0.07]} color={pal.sole} emissive={0.02} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherLegRRig" ref={reg('legR')} position={[0.19, 0.00, 0]}>
        <ZBlock studioPartId="b03-leg-r" size={[0.29, 0.34, 0.32]} position={[0, -0.12, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.25, 0.22, 0.28]} position={[0, -0.36, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock studioPartId="b03-sock-r" size={[0.27, 0.10, 0.29]} position={[0, -0.51, 0]} color={pal.jerseyStripe} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock studioPartId="b03-shoe-r" size={[0.33, 0.12, 0.43]} position={[0, -0.61, 0.07]} color={pal.shoe} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.35, 0.05, 0.45]} position={[0, -0.69, 0.07]} color={pal.sole} emissive={0.02} outlineScale={1.02} flash={hitFlash} />
      </group>
    </group>
  )
}

function B02TeacherFaceTexture() {
  const texture = useLoader(THREE.TextureLoader, boss02FaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.repeat.set(...B02_TEACHER_BOSS_FACE.repeat)
  texture.offset.set(...B02_TEACHER_BOSS_FACE.offset)
  texture.generateMipmaps = false

  return (
    <mesh name="b02TeacherFaceTexture" position={B02_TEACHER_BOSS_FACE.position} renderOrder={4} userData={{ studioNonFocusable: true }}>
      <planeGeometry args={B02_TEACHER_BOSS_FACE.size} />
      <meshBasicMaterial map={texture} toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function B02TeacherBossMesh({ hitFlash, reg }) {
  const pal = B02_TEACHER_BOSS_PALETTE

  return (
    <group>
      <group name="b02TeacherHeadRig" ref={reg('head')} position={[0, 0.92, 0]}>
        <ZBlock name="b02Head" studioPartId="b02-head" size={[0.62, 0.62, 0.50]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        <B02TeacherFaceTexture />
        <ZBlock name="b02HairTopPlate" studioPartId="b02-hair-top-plate" size={[0.70, 0.12, 0.56]} position={[0, 0.37, -0.02]} color={pal.hair} emissive={0.035} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b02HairLeftPlate" studioPartId="b02-hair-left-plate" size={[0.12, 0.52, 0.50]} position={[-0.37, 0.02, -0.02]} color={pal.hair} emissive={0.03} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b02HairRightPlate" studioPartId="b02-hair-right-plate" size={[0.12, 0.52, 0.50]} position={[0.37, 0.02, -0.02]} color={pal.hair} emissive={0.03} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b02HairBackPlate" studioPartId="b02-hair-back-plate" size={[0.66, 0.56, 0.12]} position={[0, 0.02, -0.31]} color={pal.hairShadow} emissive={0.025} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b02BunBlock" studioPartId="b02-bun-block" size={[0.32, 0.26, 0.24]} position={[0, 0.40, -0.43]} color={pal.hairShadow} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
      </group>

      <group name="b02TeacherBodyRig" ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="b02Body" studioPartId="b02-body" size={[0.60, 0.56, 0.42]} position={[0, 0.07, 0]} color={pal.suit} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b02Shirt" studioPartId="b02-shirt" size={[0.24, 0.38, 0.05]} position={[0, 0.13, 0.235]} color={pal.shirt} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02Skirt" studioPartId="b02-skirt" size={[0.62, 0.42, 0.42]} position={[0, -0.39, 0]} color={pal.skirt} emissive={0.065} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b02SuitTearL" studioPartId="b02-suit-tear-l" size={[0.10, 0.14, 0.055]} position={[-0.20, -0.10, 0.255]} rotation={[0, 0, -0.25]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02SuitTearR" studioPartId="b02-suit-tear-r" size={[0.10, 0.13, 0.055]} position={[0.23, -0.32, 0.255]} rotation={[0, 0, 0.28]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="b02TeacherArmLRig" ref={reg('armL')} position={[-0.43, 0.55, 0]} rotation={[-1.14, 0, 0.13]}>
        <ZBlock name="b02ArmL" studioPartId="b02-arm-l" size={[0.23, 0.55, 0.22]} position={[0, -0.27, 0]} color={pal.suit} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02HandL" studioPartId="b02-hand-l" size={[0.21, 0.18, 0.20]} position={[0, -0.59, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
      </group>

      <group name="b02TeacherArmRRig" ref={reg('armR')} position={[0.43, 0.55, 0]} rotation={[-1.14, 0, -0.13]}>
        <ZBlock name="b02ArmR" studioPartId="b02-arm-r" size={[0.23, 0.55, 0.22]} position={[0, -0.27, 0]} color={pal.suit} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02HandR" studioPartId="b02-hand-r" size={[0.21, 0.18, 0.20]} position={[0, -0.59, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
      </group>

      <group name="b02TeacherLegLRig" ref={reg('legL')} position={[-0.16, -0.08, 0]}>
        <ZBlock name="b02LegL" studioPartId="b02-leg-l" size={[0.23, 0.44, 0.27]} position={[0, -0.25, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02ShoeL" studioPartId="b02-shoe-l" size={[0.27, 0.13, 0.36]} position={[0, -0.54, 0.06]} color={pal.shoe} emissive={0.035} outlineScale={1.03} flash={hitFlash} />
      </group>

      <group name="b02TeacherLegRRig" ref={reg('legR')} position={[0.16, -0.08, 0]}>
        <ZBlock name="b02LegR" studioPartId="b02-leg-r" size={[0.23, 0.44, 0.27]} position={[0, -0.25, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02ShoeR" studioPartId="b02-shoe-r" size={[0.27, 0.13, 0.36]} position={[0, -0.54, 0.06]} color={pal.shoe} emissive={0.035} outlineScale={1.03} flash={hitFlash} />
      </group>
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const geo = getCachedBoxGeo(...size)
  const mat = getSharedOutlineMat()
  const s   = inflateScale(scale)
  return <mesh renderOrder={0} geometry={geo} material={mat} position={position} rotation={rotation} scale={[s, s, s]} />
}

function ZombieOuterOutline() {
  return (
    <group>
      <OutlineBlock size={[0.62, 0.58, 0.54]} position={[0, 0.82, 0]} />
      <OutlineBlock size={[0.66, 0.68, 0.48]} position={[0, 0.28, 0]} />
      <OutlineBlock size={[0.24, 0.70, 0.24]} position={[-0.44, 0.26, 0.08]} rotation={[-1.05, 0, 0.12]} scale={1.07} />
      <OutlineBlock size={[0.24, 0.70, 0.24]} position={[0.44, 0.26, 0.08]} rotation={[-1.05, 0, -0.12]} scale={1.07} />
      <OutlineBlock size={[0.26, 0.66, 0.32]} position={[-0.15, -0.28, 0.02]} scale={1.07} />
      <OutlineBlock size={[0.26, 0.66, 0.32]} position={[0.15, -0.28, 0.02]} scale={1.07} />
    </group>
  )
}

// animPhase: 'normal' | 'warn' | 'charge' | 'stun' | 'retreat'
// frozen: 그래픽 스튜디오 파트 편집용 정적 포즈 — true면 애니메이션을 멈추고 rest 포즈 유지 (인게임 기본 false)
export default function ZombieMesh({ type = 'E01', animPhase = 'normal', hitFlash = false, isMatilda = false, frozen = false }) {
  const p    = useRef({})
  const pal  = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01

  // 안정적인 ref 콜백 — 매 렌더마다 새 함수 생성 방지
  const regRef = useRef(null)
  if (!regRef.current) {
    const pc = p
    regRef.current = (k) => {
      let cb = regRef.current._cbs[k]
      if (!cb) {
        cb = (el) => {
          if (!el) return
          // 애니메이션이 돌기 전 JSX 선언값 = rest 포즈를 캡처 (frozen 진입 시 복원용)
          if (!el.userData.zombieRestRotation) el.userData.zombieRestRotation = el.rotation.clone()
          if (!el.userData.zombieRestScale) el.userData.zombieRestScale = el.scale.clone()
          pc.current[k] = el
        }
        regRef.current._cbs[k] = cb
      }
      return cb
    }
    regRef.current._cbs = {}
  }
  const reg = regRef.current

  // frozen 진입 시 애니메이션 잔존 transform을 rest 포즈로 되돌리고,
  // 애니메이션 도중 캡처됐을 수 있는 스튜디오 base(rotation/scale)를 폐기해
  // rest 기준으로 재캡처되게 한다. position은 애니메이션 대상이 아니므로 base 유지.
  useEffect(() => {
    if (!frozen) return
    Object.values(p.current).forEach((el) => {
      if (!el) return
      if (el.userData.zombieRestRotation) el.rotation.copy(el.userData.zombieRestRotation)
      if (el.userData.zombieRestScale) el.scale.copy(el.userData.zombieRestScale)
      if (el.userData.studioPartBasePosition) el.position.copy(el.userData.studioPartBasePosition)
      delete el.userData.studioPartBaseRotation
      delete el.userData.studioPartBaseScale
    })
  }, [frozen, type])

  useFrame((state, delta) => {
    if (frozen) return
    const pt = p.current
    if (!pt.legL) return
    const t = state.clock.elapsedTime

    // retreat: 역방향 뒷걸음 + 팔 크게 벌림 + 몸·머리 반응
    if (animPhase === 'retreat') {
      // 몸통: 뒤로 강하게 기울고 좌우로 비틀림
      if (pt.body) {
        pt.body.scale.setScalar(1)
        pt.body.rotation.x += (-0.52 - pt.body.rotation.x) * Math.min(1, delta * 18)
        pt.body.rotation.z += (Math.sin(t * 8) * 0.14 - pt.body.rotation.z) * Math.min(1, delta * 12)
      }
      // 다리: 빠른 역방향 2보
      const freq = type === 'E02' ? 10.0 : type === 'E03' ? 6.5 : 8.5
      const sw = Math.sin(-t * freq * 1.6) * 0.55
      pt.legL.rotation.x =  sw
      pt.legR.rotation.x = -sw
      // 팔: 좌우로 크게 벌어짐 (위에서 봐도 확실히 보임) + 뒤로 들림
      const armFlail = Math.sin(t * 5.5) * 0.22
      pt.armL.rotation.x = -0.70 + armFlail
      pt.armR.rotation.x = -0.70 - armFlail
      pt.armL.rotation.z =  0.95 + Math.sin(t * 3.8) * 0.18   // 오른쪽으로 크게 벌어짐
      pt.armR.rotation.z = -0.95 - Math.sin(t * 3.8) * 0.18   // 왼쪽으로 크게 벌어짐
      // 머리: 뒤로 젖혀지고 좌우로 흔들림
      if (pt.head) {
        pt.head.rotation.x += (0.42 - pt.head.rotation.x) * Math.min(1, delta * 20)
        pt.head.rotation.z = Math.sin(t * 9) * 0.18
      }
      return
    }

    // warn: 몸통 빠른 진동 (돌진 예고) — retreat 후 틸트/팔/머리 잔존 방지
    if (animPhase === 'warn') {
      const fl = Math.floor(t * 14) % 2
      if (pt.body) {
        pt.body.scale.setScalar(fl ? 1.06 : 0.96)
        pt.body.rotation.x += (0 - pt.body.rotation.x) * Math.min(1, delta * 10)
        pt.body.rotation.z += (0 - pt.body.rotation.z) * Math.min(1, delta * 10)
      }
      if (pt.head) pt.head.rotation.x += (0 - pt.head.rotation.x) * Math.min(1, delta * 10)
      pt.armL.rotation.z += (0 - pt.armL.rotation.z) * Math.min(1, delta * 8)
      pt.armR.rotation.z += (0 - pt.armR.rotation.z) * Math.min(1, delta * 8)
      return
    }
    if (pt.body) pt.body.scale.setScalar(1)

    // charge: 앞으로 기울임 / 그 외: retreat에서 남은 팔·머리 리셋
    const bodyTiltX = animPhase === 'charge' ? 0.45 : 0
    if (pt.body) {
      pt.body.rotation.x += (bodyTiltX - pt.body.rotation.x) * Math.min(1, delta * 12)
      pt.body.rotation.z += (0 - pt.body.rotation.z) * Math.min(1, delta * 8)
    }
    if (pt.head) pt.head.rotation.x += (0 - pt.head.rotation.x) * Math.min(1, delta * 8)
    pt.armL.rotation.z += (0 - pt.armL.rotation.z) * Math.min(1, delta * 6)
    pt.armR.rotation.z += (0 - pt.armR.rotation.z) * Math.min(1, delta * 6)

    // stun: 멈춤
    if (animPhase === 'stun') {
      p.current.legL.rotation.x *= 0.85
      p.current.legR.rotation.x *= 0.85
      return
    }

    // 걷기 사이클 (타입별 속도 차이)
    const freq = type === 'E02' ? 9.0 : type === 'E03' ? 5.0 : 7.0
    const amp  = animPhase === 'charge' ? 0.55 : 0.38
    const sw   = Math.sin(t * freq) * amp
    pt.legL.rotation.x =  sw
    pt.legR.rotation.x = -sw

    // 좀비 팔: 항상 앞으로 뻗은 상태에서 소폭 흔들림
    const armBase = -1.15
    pt.armL.rotation.x = armBase + Math.sin(t * 2.8) * 0.06
    pt.armR.rotation.x = armBase + Math.sin(t * 2.8 + Math.PI) * 0.06

    // 머리 흔들림
    if (pt.head) pt.head.rotation.z = Math.sin(t * 1.6) * 0.07
  })

  if (isMatilda) {
    return <MatildaMesh movementPose={animPhase !== 'stun'} />
  }

  if (type === 'B01') {
    return (
      <StudioTunedGroup itemId="zombie-b01">
        <B01BossZombieMesh hitFlash={hitFlash} reg={reg} />
      </StudioTunedGroup>
    )
  }

  if (type === 'B03') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('B03')}>
        <B03PhysicalEducationBossMesh hitFlash={hitFlash} reg={reg} />
      </StudioTunedGroup>
    )
  }

  if (type === 'B02') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('B02')}>
        <B02TeacherBossMesh hitFlash={hitFlash} reg={reg} />
      </StudioTunedGroup>
    )
  }

  return (
    <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
      <group>
      {/* ── 머리 ── */}
      <group ref={reg('head')} position={[0, 0.82, 0]}>
        <ZBlock size={[0.52, 0.48, 0.46]} position={[0, 0, 0]}       color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        {/* 눈 (빨갛게 빛남) */}
        <ZBlock size={[0.10, 0.09, 0.06]} position={[-0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.10, 0.09, 0.06]} position={[ 0.12, 0.04, 0.24]} color={pal.eye} emissive={0.9} outlineScale={1.0} flash={hitFlash} />
      </group>

      {/* ── 몸통 ── */}
      <group ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock size={[0.56, 0.58, 0.40]} position={[0, 0, 0]}       color={pal.body} emissive={0.14} outlineScale={1.09} flash={hitFlash} />
      </group>

      {/* ── 왼팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armL')} position={[-0.40, 0.52, 0]} rotation={[-1.15, 0, 0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른팔 (어깨 pivot, 앞으로 뻗음) ── */}
      <group ref={reg('armR')} position={[ 0.40, 0.52, 0]} rotation={[-1.15, 0, -0.12]}>
        <ZBlock size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]}   color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]}   color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 왼다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legL')} position={[-0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legR')} position={[ 0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>
      </group>
    </StudioTunedGroup>
  )
}
