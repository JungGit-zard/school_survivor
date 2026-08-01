import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, getCachedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat } from '../lib/toon.js'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import boss01FaceUrl from '../assets/faces/b01_math_teacher_face.webp'
import boss02FaceUrl from '../assets/faces/b02_stage2_boss_face.webp'
import boss03FaceUrl from '../assets/faces/b03_pe_teacher_face.webp'
import boss04FaceUrl from '../assets/faces/b04_chef_boss_face.webp'
import MatildaMesh from './MatildaMesh.jsx'
import StudioTunedGroup, { composeStudioPartRotation, composeStudioPartScale } from './StudioTunedGroup.jsx'
import BossFacePartsOverlay from './BossFacePartsOverlay.jsx'

const disableRaycast = () => null

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
  RZL: { body: 0x5a2484, skin: 0x8fa85e, eye: 0x101010 },
  RZC: { body: 0x1671a6, skin: 0x8fa85e, eye: 0x101010 },
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
  'faceTexture',
  'suitJacket',
  'whiteShirt',
  'redTie',
  'brownPants',
  'blackShoes',
  'forwardArms',
  'raggedTears',
]

export const B01_BOSS_FACE = {
  size: [0.58, 0.50],
  position: [0, 0, 0.251],
  repeat: [1, 1],
  offset: [0, 0],
}

export const B01_MATH_SET_SQUARE_LAYOUT = {
  bodyColor: 0xf6c844,
  markColor: 0xff743d,
  bars: [
    { size: [0.96, 0.10, 0.10], position: [0, -0.40, 0], rotation: [0, 0, 0] },
    { size: [0.10, 0.95, 0.10], position: [-0.45, 0.025, 0], rotation: [0, 0, 0] },
    { size: [0.10, 1.24, 0.10], position: [0, 0.025, 0], rotation: [0, 0, 0.814] },
  ],
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

export const B04_CHEF_PALETTE = {
  skin: 0x7fa65a,
  skinShadow: 0x58783e,
  chefWhite: 0xf2efe2,
  chefShadow: 0xc9c7bd,
  eye: 0x101010,
  mouth: 0x35100f,
  teeth: 0xf4e8c8,
  tongue: 0xb93e45,
  neckerchief: 0xb92828,
  button: 0x171717,
  stain: 0x668446,
  belt: 0x36322f,
  checkerLight: 0x898b8d,
  checkerDark: 0x4d5054,
  shoe: 0x151515,
  sole: 0x080808,
}

export const B04_CHEF_PARTS = [
  'hat',
  'head',
  'faceTexture',
  'body',
  'neckerchief',
  'armL',
  'armR',
  'apron',
  'hips',
  'legL',
  'legR',
]

export const B04_CHEF_FACE = {
  size: [0.66, 0.48],
  position: [0, 0, 0.271],
  repeat: [1, 1],
  offset: [0, 0],
}

export const B03_PE_TEACHER_FACE_LAYOUT = {
  leftEye: { size: [0.12, 0.08, 0.045], position: [-0.14, 0.04, 0.245] },
  rightEye: { size: [0.12, 0.08, 0.045], position: [0.14, 0.04, 0.245] },
  leftBrow: { size: [0.20, 0.055, 0.04], position: [-0.14, 0.14, 0.265], rotation: [0, 0, -0.24] },
  rightBrow: { size: [0.20, 0.055, 0.04], position: [0.14, 0.14, 0.265], rotation: [0, 0, 0.24] },
  nose: { size: [0.10, 0.13, 0.06], position: [0, -0.04, 0.265] },
  mouth: { size: [0.26, 0.10, 0.045], position: [0, -0.17, 0.25] },
  tooth: { size: [0.07, 0.04, 0.035], position: [-0.05, -0.14, 0.28] },
}

// B03 얼굴 데칼 — 노출 얼굴면 cover-fit.
// 텍스처 자체에 빨간 줄무늬 머리띠·목의 빨간 끈+호루라기가 그려져 있으므로,
// 3D로 모델링됐던 이목구비/머리띠/호루라기 파츠는 제거하고 이 한 장으로 대체한다.
// 노출 얼굴면 실측: 헤드 박스 [0.56,0.48,0.44] 앞면(z=0.22) 전체가 노출된다(0.56×0.48,
// center y=0). 상단 헤어 블록(y 0.215~0.345, front z=0.215)은 앞면보다 뒤라 가리지 않는다.
// UV 윈도(cover-fit): 앞면 종횡비 7:6(0.56/0.48)에 맞춰 정사각 텍스처(1254px)의 상단
// 14.3%를 크롭(repeat.y=0.857) — 헤드밴드 위 빈 피부 여백(상단 8%)과 헤드밴드 상단
// 흰 줄 일부만 잘리고, 하단 호루라기(이미지 맨 아래까지 그려짐)는 온전히 보존된다.
// 이전 플레인 [0.58,0.58]은 앞면 높이(0.48)보다 커서 하단이 몸통 위로 삐져나와
// 스티커처럼 보였다 → 노출 앞면과 정확히 일치시킨다.
// z는 헤드 앞면(0.22)에서 +0.01만 띄워(0.23) 패럴랙스를 최소화.
export const B03_PE_TEACHER_FACE = {
  size: [0.56, 0.48],
  position: [0, 0, 0.23],
  repeat: [1, 0.857],
  offset: [0, 0],
}

export const RUN_ZOMBIE_VISUAL = {
  leader: {
    headband: 0x7d3fc6,
    headbandStripe: 0xffffff,
    jersey: 0x5a2484,
    shorts: 0x22152f,
    shoe: 0x6e35b8,
    bib: '001',
    medal: 0xf0b62d,
  },
  crew: {
    headband: 0x1880bd,
    headbandStripe: 0xffffff,
    jersey: 0xf0eee4,
    shorts: 0x1974aa,
    shoe: 0x1771a6,
    bib: '013',
  },
  parts: ['headband', 'bib', 'medal', 'wristbands', 'chunkyRunningShoes', 'runningPose'],
}

function BibDigits({ text, y = 0.03 }) {
  const digitColor = 0x151515
  return (
    <group name={`runZombieBib${text}`} position={[0, y, 0.292]}>
      <ZBlock size={[0.22, 0.18, 0.035]} position={[0, 0, 0]} color={0xf7f3df} emissive={0.05} outlineScale={1.0} />
      {String(text).split('').map((_, i) => (
        <ZBlock key={i} size={[0.025, 0.095, 0.02]} position={[-0.055 + i * 0.055, 0, 0.024]} color={digitColor} emissive={0.02} outlineScale={1.0} />
      ))}
    </group>
  )
}

function RunZombieMesh({ role = 'crew', hitFlash, reg }) {
  const isLeader = role === 'leader'
  const cfg = isLeader ? RUN_ZOMBIE_VISUAL.leader : RUN_ZOMBIE_VISUAL.crew
  const pal = ZOMBIE_PALETTE[isLeader ? 'RZL' : 'RZC']
  const shirt = cfg.jersey
  const trim = cfg.headband

  return (
    <group name={isLeader ? 'runZombieLeader' : 'runZombieCrew'}>
      <group ref={reg('head')} position={[0, 0.84, 0]}>
        <ZBlock size={[0.52, 0.48, 0.46]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <ZBlock size={[0.54, 0.10, 0.48]} position={[0, 0.11, 0.01]} color={cfg.headband} emissive={0.10} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.54, 0.035, 0.49]} position={[0, 0.14, 0.015]} color={cfg.headbandStripe} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.11, 0.10, 0.05]} position={[-0.12, 0.015, 0.25]} color={pal.eye} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.11, 0.10, 0.05]} position={[0.12, 0.015, 0.25]} color={pal.eye} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.20, 0.10, 0.05]} position={[0, -0.15, 0.25]} color={0x3a1210} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock size={[0.055, 0.045, 0.035]} position={[-0.04, -0.12, 0.282]} color={0xefe8c9} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group ref={reg('body')} position={[0, 0.29, 0]}>
        <ZBlock size={[0.58, 0.56, 0.40]} position={[0, 0, 0]} color={shirt} emissive={0.10} outlineScale={1.08} flash={hitFlash} />
        <ZBlock size={[0.62, 0.055, 0.42]} position={[0, 0.19, 0]} color={cfg.headbandStripe} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <BibDigits text={cfg.bib} />
        {isLeader && (
          <>
            <ZBlock size={[0.045, 0.24, 0.045]} position={[-0.07, 0.16, 0.29]} rotation={[0, 0, -0.35]} color={cfg.medal} emissive={0.16} outlineScale={1.0} flash={hitFlash} />
            <ZBlock size={[0.045, 0.24, 0.045]} position={[0.07, 0.16, 0.29]} rotation={[0, 0, 0.35]} color={cfg.medal} emissive={0.16} outlineScale={1.0} flash={hitFlash} />
            <ZBlock size={[0.13, 0.13, 0.045]} position={[0, -0.02, 0.315]} color={cfg.medal} emissive={0.20} outlineScale={1.02} flash={hitFlash} />
          </>
        )}
      </group>

      <group ref={reg('armL')} position={[-0.40, 0.54, 0]} rotation={[-0.88, 0, -0.28]}>
        <ZBlock size={[0.20, 0.47, 0.20]} position={[0, -0.24, 0]} color={shirt} emissive={0.08} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.08, 0.21]} position={[0, -0.45, 0]} color={trim} emissive={0.10} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.57, 0]} color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>
      <group ref={reg('armR')} position={[0.40, 0.54, 0]} rotation={[-1.45, 0, 0.28]}>
        <ZBlock size={[0.20, 0.47, 0.20]} position={[0, -0.24, 0]} color={shirt} emissive={0.08} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.21, 0.08, 0.21]} position={[0, -0.45, 0]} color={trim} emissive={0.10} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.18, 0.16, 0.18]} position={[0, -0.57, 0]} color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
      </group>

      <group ref={reg('legL')} position={[-0.16, 0.00, 0]} rotation={[0.36, 0, 0]}>
        <ZBlock size={[0.22, 0.46, 0.25]} position={[0, -0.23, 0]} color={cfg.shorts} emissive={0.08} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.28, 0.13, 0.38]} position={[0, -0.53, 0.08]} color={cfg.shoe} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.30, 0.045, 0.40]} position={[0, -0.61, 0.08]} color={0xf5f1e8} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
      </group>
      <group ref={reg('legR')} position={[0.16, 0.00, 0]} rotation={[-0.44, 0, 0]}>
        <ZBlock size={[0.22, 0.46, 0.25]} position={[0, -0.23, 0]} color={cfg.shorts} emissive={0.08} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.28, 0.13, 0.38]} position={[0, -0.53, 0.08]} color={cfg.shoe} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.30, 0.045, 0.40]} position={[0, -0.61, 0.08]} color={0xf5f1e8} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
      </group>
    </group>
  )
}

export const B02_STAGE2_BOSS_PALETTE = {
  skin: 0x75b6e9,
  skinShadow: 0x4f8fc7,
  blazer: 0x8f2f3b,
  blazerShadow: 0x5f1f27,
  shirt: 0xf2ead8,
  tie: 0x353538,
  lanyard: 0x3b3b3f,
  badge: 0xe0d7bd,
  skirt: 0x1c1b1d,
  shoe: 0x17100d,
  hair: 0x3b241a,
  hairShadow: 0x24150f,
  tear: 0x66bcea,
}

export const B02_STAGE2_BOSS_PARTS = [
  'blockHeadWithTextureFace',
  'brownBobAndBunHair',
  'redTornBlazer',
  'whiteShirtTieLanyard',
  'darkSkirt',
  'blueSkinHandsLegs',
  'blackShoes',
  'slightB02Walk',
]

export const B02_STAGE2_BOSS_FACE = {
  size: [0.58, 0.50],
  position: [0, 0, 0.251],
  repeat: [1, 1],
  offset: [0, 0],
}

function ZBlock({ name, studioPartId, size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false, children = null }) {
  const geo    = getCachedBoxGeo(...size)
  const outMat = getSharedOutlineMat()
  const mat    = flash ? getFlashMat() : getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)
  return (
    <group name={studioPartId ?? name} userData={studioPartId ? { studioPartId } : undefined} position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os, os, os]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      <mesh renderOrder={2} geometry={geo} material={mat} />
      {children}
    </group>
  )
}

function B01MathSetSquare({ hitFlash }) {
  const layout = B01_MATH_SET_SQUARE_LAYOUT

  return (
    <group name="b01MathSetSquare">
      {layout.bars.map((bar, index) => (
        <ZBlock
          key={index}
          {...bar}
          color={layout.bodyColor}
          emissive={0.18}
          outlineScale={1.06}
          flash={hitFlash}
        />
      ))}
      <ZBlock
        size={[0.32, 0.055, 0.115]}
        position={[-0.18, -0.39, 0.01]}
        color={layout.markColor}
        emissive={0.24}
        outlineScale={1.02}
        flash={hitFlash}
      />
    </group>
  )
}

function B01MathTeacherFaceTexture() {
  const texture = useLoader(THREE.TextureLoader, boss01FaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.repeat.set(...B01_BOSS_FACE.repeat)
  texture.offset.set(...B01_BOSS_FACE.offset)

  return (
    <mesh name="b01MathTeacherFaceTexture" position={B01_BOSS_FACE.position} renderOrder={4} userData={{ studioNonFocusable: true }}>
      <planeGeometry args={B01_BOSS_FACE.size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function B01BossZombieMesh({ hitFlash, reg, bossFaceRecipe }) {
  const pal = B01_BOSS_VISUAL_PALETTE

  return (
    <group>
      <group ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock size={[0.58, 0.50, 0.48]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        <ZBlock size={[0.60, 0.18, 0.56]} position={[-0.02, 0.25, -0.02]} rotation={[0.06, 0, -0.08]} color={pal.hair} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        {/* 눈·눈썹·입·치아·볼 그림자 등 모델링 이목구비 대신 사용자 제공 수학선생 얼굴 텍스처 데칼 사용 */}
        <B01MathTeacherFaceTexture />
        <BossFacePartsOverlay bossType="B01" recipe={bossFaceRecipe} />
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
        <group ref={reg('mathSetSquare')} visible={false} position={[0, -0.82, 0.08]} rotation={[1.45, 0, 0]} scale={[0.78, 0.78, 0.78]}>
          <B01MathSetSquare hitFlash={hitFlash} />
        </group>
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

function B03PeTeacherFaceTexture() {
  const texture = useLoader(THREE.TextureLoader, boss03FaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.repeat.set(...B03_PE_TEACHER_FACE.repeat)
  texture.offset.set(...B03_PE_TEACHER_FACE.offset)

  return (
    <mesh name="b03PeTeacherFaceTexture" position={B03_PE_TEACHER_FACE.position} renderOrder={4} userData={{ studioNonFocusable: true }}>
      <planeGeometry args={B03_PE_TEACHER_FACE.size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function B03PhysicalEducationBossMesh({ hitFlash, reg, bossFaceRecipe }) {
  const pal = B03_PE_TEACHER_PALETTE

  return (
    <group>
      <group name="b01PeTeacherHeadRig" ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock name="b01Head" size={[0.56, 0.48, 0.44]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01SportHair" size={[0.58, 0.13, 0.45]} position={[0, 0.28, -0.01]} color={pal.hair} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        {/* 눈·눈썹·코·입·이빨 등 모델링 이목구비 대신 사용자 제공 얼굴 텍스처 데칼 사용 */}
        <B03PeTeacherFaceTexture />
        <BossFacePartsOverlay bossType="B03" recipe={bossFaceRecipe} />
      </group>

      <group name="b01PeTeacherBodyRig" ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="b01Shoulders" size={[0.96, 0.26, 0.46]} position={[0, 0.27, 0]} color={pal.jerseyShadow} emissive={0.05} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01Body" size={[0.76, 0.64, 0.46]} position={[0, 0, 0]} color={pal.jersey} emissive={0.06} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b01ChestL" size={[0.30, 0.22, 0.09]} position={[-0.18, 0.15, 0.27]} color={pal.jerseyShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
        <ZBlock name="b01ChestR" size={[0.30, 0.22, 0.09]} position={[0.18, 0.15, 0.27]} color={pal.jerseyShadow} emissive={0.04} outlineScale={1.02} flash={hitFlash} />
        <ZBlock name="b01JerseyVLeft" size={[0.07, 0.46, 0.05]} position={[-0.13, 0.02, 0.275]} rotation={[0, 0, 0.36]} color={pal.jerseyStripe} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b01JerseyVRight" size={[0.07, 0.46, 0.05]} position={[0.13, 0.02, 0.275]} rotation={[0, 0, -0.36]} color={pal.jerseyStripe} emissive={0.06} outlineScale={1.0} flash={hitFlash} />
        {/* 목의 빨간 끈+호루라기는 얼굴 텍스처에 포함되어 중복되므로 3D 호루라기 파츠 제거 */}
      </group>

      <ZBlock name="b01Shorts" size={[0.68, 0.28, 0.44]} position={[0, -0.17, 0]} color={pal.shorts} emissive={0.05} outlineScale={1.07} flash={hitFlash} />

      <group name="b01PeTeacherArmLRig" ref={reg('armL')} position={[-0.55, 0.57, 0]} rotation={[-1.14, 0, 0.15]}>
        <ZBlock name="b01BicepL" size={[0.34, 0.38, 0.34]} position={[0, -0.19, 0]} color={pal.skin} emissive={0.07} outlineScale={1.07} flash={hitFlash} />
        <ZBlock name="b01ForearmL" size={[0.25, 0.32, 0.25]} position={[0, -0.43, 0.01]} color={pal.skinShadow} emissive={0.05} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b01WristbandL" size={[0.28, 0.10, 0.28]} position={[0, -0.58, 0.02]} color={pal.wristband} emissive={0.08} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b01FistL" size={[0.28, 0.24, 0.28]} position={[0, -0.72, 0.04]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherArmRRig" ref={reg('armR')} position={[0.55, 0.57, 0]} rotation={[-1.14, 0, -0.15]}>
        <ZBlock name="b01BicepR" size={[0.34, 0.38, 0.34]} position={[0, -0.19, 0]} color={pal.skin} emissive={0.07} outlineScale={1.07} flash={hitFlash} />
        <ZBlock name="b01ForearmR" size={[0.25, 0.32, 0.25]} position={[0, -0.43, 0.01]} color={pal.skinShadow} emissive={0.05} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b01WristbandR" size={[0.28, 0.10, 0.28]} position={[0, -0.58, 0.02]} color={pal.wristband} emissive={0.08} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="b01FistR" size={[0.28, 0.24, 0.28]} position={[0, -0.72, 0.04]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherLegLRig" ref={reg('legL')} position={[-0.19, 0.00, 0]}>
        <ZBlock size={[0.29, 0.34, 0.32]} position={[0, -0.12, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.25, 0.22, 0.28]} position={[0, -0.36, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.27, 0.10, 0.29]} position={[0, -0.51, 0]} color={pal.jerseyStripe} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.33, 0.12, 0.43]} position={[0, -0.61, 0.07]} color={pal.shoe} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.35, 0.05, 0.45]} position={[0, -0.69, 0.07]} color={pal.sole} emissive={0.02} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group name="b01PeTeacherLegRRig" ref={reg('legR')} position={[0.19, 0.00, 0]}>
        <ZBlock size={[0.29, 0.34, 0.32]} position={[0, -0.12, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock size={[0.25, 0.22, 0.28]} position={[0, -0.36, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.27, 0.10, 0.29]} position={[0, -0.51, 0]} color={pal.jerseyStripe} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock size={[0.33, 0.12, 0.43]} position={[0, -0.61, 0.07]} color={pal.shoe} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock size={[0.35, 0.05, 0.45]} position={[0, -0.69, 0.07]} color={pal.sole} emissive={0.02} outlineScale={1.02} flash={hitFlash} />
      </group>
    </group>
  )
}

function B02Stage2BossFaceTexture() {
  const texture = useLoader(THREE.TextureLoader, boss02FaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.repeat.set(...B02_STAGE2_BOSS_FACE.repeat)
  texture.offset.set(...B02_STAGE2_BOSS_FACE.offset)

  return (
    <mesh name="b02Stage2BossFaceTexture" position={B02_STAGE2_BOSS_FACE.position} renderOrder={4} userData={{ studioNonFocusable: true }}>
      <planeGeometry args={B02_STAGE2_BOSS_FACE.size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function B04ChefBossFaceTexture() {
  const texture = useLoader(THREE.TextureLoader, boss04FaceUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.repeat.set(...B04_CHEF_FACE.repeat)
  texture.offset.set(...B04_CHEF_FACE.offset)

  return (
    <mesh name="chefFaceTexture" position={B04_CHEF_FACE.position} renderOrder={4} userData={{ studioNonFocusable: true }}>
      <planeGeometry args={B04_CHEF_FACE.size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function B04ChefBossMesh({ hitFlash, reg, bossFaceRecipe }) {
  const pal = B04_CHEF_PALETTE

  return (
    <group name="chefRoot">
      <group name="chefHat" position={[0, 1.36, 0]}>
        <ZBlock name="chefHatBand" size={[0.76, 0.16, 0.54]} position={[0, -0.13, 0]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefHatLobeFarL" size={[0.24, 0.30, 0.42]} position={[-0.27, 0.06, 0]} rotation={[0, 0, -0.16]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefHatLobeMidL" size={[0.25, 0.36, 0.44]} position={[-0.14, 0.10, 0]} rotation={[0, 0, -0.07]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefHatLobeCenter" size={[0.27, 0.42, 0.46]} position={[0, 0.13, 0]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefHatLobeMidR" size={[0.25, 0.36, 0.44]} position={[0.14, 0.10, 0]} rotation={[0, 0, 0.07]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefHatLobeFarR" size={[0.24, 0.30, 0.42]} position={[0.27, 0.06, 0]} rotation={[0, 0, 0.16]} color={pal.chefWhite} emissive={0.08} outlineScale={1.06} flash={hitFlash} />
      </group>

      <group name="chefHeadRig" ref={reg('head')} position={[0, 0.93, 0]}>
        <ZBlock name="chefHead" size={[0.66, 0.48, 0.52]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        <B04ChefBossFaceTexture />
        <BossFacePartsOverlay bossType="B04" recipe={bossFaceRecipe} />
        <ZBlock name="chefEarL" size={[0.13, 0.22, 0.16]} position={[-0.39, -0.01, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="chefEarR" size={[0.13, 0.22, 0.16]} position={[0.39, -0.01, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.04} flash={hitFlash} />
      </group>

      <group name="chefBodyRig" ref={reg('body')} position={[0, 0.37, 0]}>
        <ZBlock name="chefJacket" size={[0.78, 0.60, 0.50]} position={[0, 0, 0]} color={pal.chefWhite} emissive={0.07} outlineScale={1.09} flash={hitFlash} />
        <ZBlock name="chefJacketPanelL" size={[0.31, 0.52, 0.055]} position={[-0.18, -0.01, 0.28]} color={pal.chefShadow} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefJacketPanelR" size={[0.31, 0.52, 0.055]} position={[0.18, -0.01, 0.28]} color={pal.chefWhite} emissive={0.07} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefButtonUpperL" size={[0.065, 0.065, 0.06]} position={[-0.12, 0.12, 0.325]} color={pal.button} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefButtonUpperR" size={[0.065, 0.065, 0.06]} position={[0.12, 0.12, 0.325]} color={pal.button} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefButtonLowerL" size={[0.065, 0.065, 0.06]} position={[-0.12, -0.09, 0.325]} color={pal.button} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefButtonLowerR" size={[0.065, 0.065, 0.06]} position={[0.12, -0.09, 0.325]} color={pal.button} emissive={0.02} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefStainL" size={[0.15, 0.11, 0.045]} position={[-0.27, -0.17, 0.325]} rotation={[0, 0, -0.18]} color={pal.stain} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefStainR" size={[0.12, 0.16, 0.045]} position={[0.28, 0.07, 0.325]} rotation={[0, 0, 0.23]} color={pal.stain} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="chefNeckerchief" position={[0, 0.68, 0.30]}>
        <ZBlock name="chefNeckBand" size={[0.38, 0.09, 0.08]} position={[0, 0, 0]} color={pal.neckerchief} emissive={0.10} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefNeckerchiefKnot" size={[0.15, 0.14, 0.09]} position={[0, -0.07, 0.04]} rotation={[0, 0, 0.78]} color={pal.neckerchief} emissive={0.10} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefNeckerchiefTailL" size={[0.11, 0.28, 0.07]} position={[-0.08, -0.22, 0.02]} rotation={[0, 0, 0.18]} color={pal.neckerchief} emissive={0.10} outlineScale={1.02} flash={hitFlash} />
        <ZBlock name="chefNeckerchiefTailR" size={[0.11, 0.28, 0.07]} position={[0.08, -0.22, 0.02]} rotation={[0, 0, -0.18]} color={pal.neckerchief} emissive={0.10} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group name="chefArmL" ref={reg('armL')} position={[-0.53, 0.61, 0]} rotation={[-0.96, 0, 0.15]}>
        <ZBlock name="chefSleeveL" size={[0.26, 0.48, 0.26]} position={[0, -0.24, 0]} color={pal.chefWhite} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefWristL" size={[0.20, 0.12, 0.20]} position={[0, -0.50, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefFistL" size={[0.28, 0.23, 0.28]} position={[0, -0.66, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="chefArmR" ref={reg('armR')} position={[0.53, 0.61, 0]} rotation={[-0.96, 0, -0.15]}>
        <ZBlock name="chefSleeveR" size={[0.26, 0.48, 0.26]} position={[0, -0.24, 0]} color={pal.chefWhite} emissive={0.07} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefWristR" size={[0.20, 0.12, 0.20]} position={[0, -0.50, 0]} color={pal.skinShadow} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefFistR" size={[0.28, 0.23, 0.28]} position={[0, -0.66, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
      </group>

      <group name="chefApron" position={[0, 0.16, 0]}>
        <ZBlock name="chefApronBelt" size={[0.82, 0.11, 0.52]} position={[0, 0.16, 0]} color={pal.belt} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="chefApronPanel" size={[0.58, 0.42, 0.065]} position={[0, -0.07, 0.31]} color={pal.chefWhite} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefApronSideTieL" size={[0.14, 0.26, 0.08]} position={[-0.43, 0.02, 0.03]} rotation={[0, 0, -0.12]} color={pal.chefWhite} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefApronSideTieR" size={[0.14, 0.26, 0.08]} position={[0.43, 0.02, 0.03]} rotation={[0, 0, 0.12]} color={pal.chefWhite} emissive={0.07} outlineScale={1.03} flash={hitFlash} />
        <ZBlock name="chefApronBackKnot" size={[0.28, 0.20, 0.14]} position={[0, 0.11, -0.34]} rotation={[0, 0, 0.78]} color={pal.chefWhite} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
      </group>

      <group name="chefHips" position={[0, -0.08, 0]}>
        <ZBlock name="chefCheckerHips" size={[0.66, 0.28, 0.46]} position={[0, 0, 0]} color={pal.checkerDark} emissive={0.04} outlineScale={1.07} flash={hitFlash} />
        <ZBlock name="chefHipsPatchL" size={[0.23, 0.13, 0.055]} position={[-0.17, 0.05, 0.26]} color={pal.checkerLight} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefHipsPatchR" size={[0.23, 0.13, 0.055]} position={[0.17, -0.05, 0.26]} color={pal.checkerDark} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="chefLegL" ref={reg('legL')} position={[-0.19, -0.22, 0]}>
        <ZBlock name="chefPantsL" size={[0.29, 0.42, 0.31]} position={[0, -0.21, 0]} color={pal.checkerDark} emissive={0.04} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefLegPatchL" size={[0.14, 0.16, 0.055]} position={[-0.06, -0.18, 0.18]} color={pal.checkerLight} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefShoeL" size={[0.35, 0.15, 0.50]} position={[0, -0.50, 0.09]} color={pal.shoe} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="chefSoleL" size={[0.37, 0.055, 0.52]} position={[0, -0.59, 0.09]} color={pal.sole} emissive={0.01} outlineScale={1.02} flash={hitFlash} />
      </group>

      <group name="chefLegR" ref={reg('legR')} position={[0.19, -0.22, 0]}>
        <ZBlock name="chefPantsR" size={[0.29, 0.42, 0.31]} position={[0, -0.21, 0]} color={pal.checkerLight} emissive={0.05} outlineScale={1.06} flash={hitFlash} />
        <ZBlock name="chefLegPatchR" size={[0.14, 0.16, 0.055]} position={[0.06, -0.18, 0.18]} color={pal.checkerDark} emissive={0.03} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="chefShoeR" size={[0.35, 0.15, 0.50]} position={[0, -0.50, 0.09]} color={pal.shoe} emissive={0.03} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="chefSoleR" size={[0.37, 0.055, 0.52]} position={[0, -0.59, 0.09]} color={pal.sole} emissive={0.01} outlineScale={1.02} flash={hitFlash} />
      </group>
    </group>
  )
}

function B02Stage2BossMesh({ hitFlash, reg, bossFaceRecipe }) {
  const pal = B02_STAGE2_BOSS_PALETTE

  return (
    <group>
      <group name="b02HeadRig" ref={reg('head')} position={[0, 0.88, 0]}>
        <ZBlock name="b02Head" size={[0.58, 0.50, 0.48]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} />
        <ZBlock name="b02FrontHair" size={[0.62, 0.18, 0.60]} position={[-0.03, 0.26, -0.01]} rotation={[0.02, 0, -0.04]} color={pal.hair} emissive={0.035} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02LeftSideHair" size={[0.12, 0.46, 0.18]} position={[-0.34, 0.02, -0.03]} color={pal.hairShadow} emissive={0.025} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b02RightSideHair" size={[0.12, 0.46, 0.18]} position={[0.34, 0.02, -0.03]} color={pal.hairShadow} emissive={0.025} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b02BackHair" size={[0.58, 0.44, 0.18]} position={[0.02, 0.06, -0.30]} color={pal.hair} emissive={0.03} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02HairBun" size={[0.24, 0.22, 0.22]} position={[0.24, 0.33, -0.24]} rotation={[0.05, 0, 0.08]} color={pal.hair} emissive={0.03} outlineScale={1.05} flash={hitFlash} />
        <B02Stage2BossFaceTexture />
        <BossFacePartsOverlay bossType="B02" recipe={bossFaceRecipe} />
      </group>

      <group name="b02BodyRig" ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="b02Blazer" size={[0.66, 0.62, 0.44]} position={[0, 0.01, 0]} color={pal.blazer} emissive={0.07} outlineScale={1.09} flash={hitFlash} />
        <ZBlock name="b02LeftBlazerPanel" size={[0.22, 0.58, 0.055]} position={[-0.19, -0.01, 0.25]} rotation={[0, 0, -0.06]} color={pal.blazerShadow} emissive={0.045} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02RightBlazerPanel" size={[0.22, 0.58, 0.055]} position={[0.19, -0.01, 0.25]} rotation={[0, 0, 0.06]} color={pal.blazerShadow} emissive={0.045} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02WhiteShirt" size={[0.26, 0.54, 0.065]} position={[0, 0.02, 0.285]} color={pal.shirt} emissive={0.065} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02Tie" size={[0.08, 0.39, 0.072]} position={[0.01, -0.05, 0.325]} rotation={[0, 0, -0.05]} color={pal.tie} emissive={0.055} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02TieKnot" size={[0.14, 0.11, 0.075]} position={[0, 0.23, 0.33]} rotation={[0, 0, 0.78]} color={pal.tie} emissive={0.055} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02LanyardL" size={[0.045, 0.34, 0.074]} position={[-0.08, 0.06, 0.335]} rotation={[0, 0, -0.23]} color={pal.lanyard} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02LanyardR" size={[0.045, 0.34, 0.074]} position={[0.08, 0.06, 0.335]} rotation={[0, 0, 0.23]} color={pal.lanyard} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02Badge" size={[0.11, 0.13, 0.078]} position={[0, -0.13, 0.345]} color={pal.badge} emissive={0.045} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02BlazerTearL" size={[0.08, 0.14, 0.08]} position={[-0.31, -0.08, 0.22]} rotation={[0, 0, 0.2]} color={pal.tear} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02BlazerTearR" size={[0.07, 0.13, 0.08]} position={[0.31, 0.12, 0.22]} rotation={[0, 0, -0.24]} color={pal.tear} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
      </group>

      <ZBlock name="b02Skirt" size={[0.62, 0.28, 0.42]} position={[0, -0.17, 0]} color={pal.skirt} emissive={0.045} outlineScale={1.07} flash={hitFlash} />

      <group name="b02ArmLRig" ref={reg('armL')} position={[-0.43, 0.55, 0]} rotation={[-1.08, 0, 0.12]}>
        <ZBlock name="b02SleeveL" size={[0.23, 0.50, 0.22]} position={[0, -0.25, 0]} color={pal.blazer} emissive={0.065} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02HandL" size={[0.21, 0.17, 0.20]} position={[0, -0.55, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b02SleeveTearL" size={[0.08, 0.13, 0.06]} position={[0.08, -0.31, 0.13]} rotation={[0, 0, -0.2]} color={pal.tear} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="b02ArmRRig" ref={reg('armR')} position={[0.43, 0.55, 0]} rotation={[-1.08, 0, -0.12]}>
        <ZBlock name="b02SleeveR" size={[0.23, 0.50, 0.22]} position={[0, -0.25, 0]} color={pal.blazer} emissive={0.065} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02HandR" size={[0.21, 0.17, 0.20]} position={[0, -0.55, 0]} color={pal.skin} emissive={0.07} outlineScale={1.04} flash={hitFlash} />
        <ZBlock name="b02SleeveTearR" size={[0.08, 0.13, 0.06]} position={[-0.08, -0.31, 0.13]} rotation={[0, 0, 0.2]} color={pal.tear} emissive={0.05} outlineScale={1.0} flash={hitFlash} />
      </group>

      <group name="b02LegLRig" ref={reg('legL')} position={[-0.16, 0.00, 0]}>
        <ZBlock name="b02LegL" size={[0.23, 0.44, 0.25]} position={[0, -0.24, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02LegShadowL" size={[0.09, 0.12, 0.052]} position={[-0.07, -0.20, 0.15]} rotation={[0, 0, 0.25]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02ShoeL" size={[0.27, 0.12, 0.37]} position={[0, -0.52, 0.06]} color={pal.shoe} emissive={0.035} outlineScale={1.03} flash={hitFlash} />
      </group>

      <group name="b02LegRRig" ref={reg('legR')} position={[0.16, 0.00, 0]}>
        <ZBlock name="b02LegR" size={[0.23, 0.44, 0.25]} position={[0, -0.24, 0]} color={pal.skin} emissive={0.07} outlineScale={1.05} flash={hitFlash} />
        <ZBlock name="b02LegShadowR" size={[0.09, 0.12, 0.052]} position={[0.07, -0.20, 0.15]} rotation={[0, 0, -0.25]} color={pal.skinShadow} emissive={0.04} outlineScale={1.0} flash={hitFlash} />
        <ZBlock name="b02ShoeR" size={[0.27, 0.12, 0.37]} position={[0, -0.52, 0.06]} color={pal.shoe} emissive={0.035} outlineScale={1.03} flash={hitFlash} />
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

// ZombieMesh의 애니메이션은 파츠 그룹의 JSX 선언 회전(스튜디오가 캡처하는 base)과 무관하게
// 매 프레임 절대값을 강제 대입한다(예: 팔 rotation.x). 보스 타입마다 팔의 JSX 회전값이 서로
// 달라(예: E01 -1.15, B04 -0.96), composeStudioPartRotation에 원래 식을 그대로 넘기면 캡처된
// base가 중복으로 더해져 타입마다 다른 크기로 포즈가 틀어진다. composeZombieRotation은
// animOffset에서 캡처된 base를 미리 상쇄해 지정한 절대값(target)을 그대로 보존하고
// 그 위에 스튜디오 튜닝 오프셋만 얹는다.
function composeZombieRotation(object, axis, target) {
  const capturedBase = object?.userData?.studioPartBaseRotation?.[axis] ?? 0
  return composeStudioPartRotation(object, axis, 0, target - capturedBase)
}

function setZombieScale(object, multiplier) {
  if (!object) return
  object.scale.set(
    composeStudioPartScale(object, 'x', 1, multiplier),
    composeStudioPartScale(object, 'y', 1, multiplier),
    composeStudioPartScale(object, 'z', 1, multiplier),
  )
}

// animPhase: 'normal' | 'warn' | 'charge' | 'stun' | 'retreat'
// staticPose: 로비 보스 카드처럼 상호작용 없는 프리뷰에서 내부 파트 애니메이션 계산을 완전히 건너뛰는 정적 포즈 게이트.
export default function ZombieMesh({ type = 'E01', animPhase = 'normal', hitFlash = false, isMatilda = false, staticPose = false, bossFaceRecipe }) {
  const p    = useRef({})
  const pal  = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01
  const specialAgeRef = useRef(0)
  // 누적(+=,*=) 애니메이션의 순수 오프셋만 담는다. THREE 오브젝트의 rotation을 직접
  // 읽어 누적하면 거기 이미 섞여 들어간 스튜디오 오프셋까지 감쇠·수렴 대상이 되어
  // 매 프레임 지수적으로 지워진다(스튜디오 튜닝이 서서히 사라지는 버그).
  const anim = useRef({
    bodyRotX: 0,
    bodyRotZ: 0,
    headRotX: 0,
    armLRotY: 0,
    armRRotY: 0,
    armLRotZ: 0,
    armRRotZ: 0,
    legLRotX: 0,
    legRRotX: 0,
  })

  // 안정적인 ref 콜백 — 매 렌더마다 새 함수 생성 방지
  const regRef = useRef(null)
  if (!regRef.current) {
    const pc = p
    regRef.current = (k) => {
      let cb = regRef.current._cbs[k]
      if (!cb) {
        cb = (el) => {
          if (!el) return
          // 애니메이션이 돌기 전 JSX 선언값 = staticPose에서 유지할 rest 포즈다.
          pc.current[k] = el
        }
        regRef.current._cbs[k] = cb
      }
      return cb
    }
    regRef.current._cbs = {}
  }
  const reg = regRef.current

  // staticPose에서는 내부 파트 애니메이션 계산을 시작하지 않아 선언된 rest 포즈를 유지한다.
  // 로비 쇼타임은 바깥 래퍼만 움직이고, ZombieMesh 내부 보행/고개 흔들림은 정지한다.
  useFrame((state, delta) => {
    if (staticPose) return
    const pt = p.current
    if (!pt.legL) return
    const specialActive = type === 'B01' && animPhase === 'special'
    if (pt.mathSetSquare) pt.mathSetSquare.visible = specialActive
    const t = state.clock.elapsedTime
    specialAgeRef.current = specialActive ? specialAgeRef.current + delta : 0
    const a = anim.current

    if (specialActive) {
      const progress = Math.min(1, specialAgeRef.current / 0.75)
      if (pt.body) {
        setZombieScale(pt.body, 1)
        a.bodyRotX += (0.10 - a.bodyRotX) * Math.min(1, delta * 14)
        pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
        a.bodyRotZ = Math.sin(progress * Math.PI) * -0.16
        pt.body.rotation.z = composeZombieRotation(pt.body, 'z', a.bodyRotZ)
      }
      if (pt.head) pt.head.rotation.z = composeZombieRotation(pt.head, 'z', Math.sin(progress * Math.PI) * 0.12)
      pt.armR.rotation.x = composeZombieRotation(pt.armR, 'x', -0.82)
      a.armRRotY = -0.22
      pt.armR.rotation.y = composeZombieRotation(pt.armR, 'y', a.armRRotY)
      a.armRRotZ = -1.20 + progress * 2.80
      pt.armR.rotation.z = composeZombieRotation(pt.armR, 'z', a.armRRotZ)
      pt.armL.rotation.x = composeZombieRotation(pt.armL, 'x', -0.92)
      a.armLRotZ = 0.38
      pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
      a.legLRotX *= 0.82
      pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
      a.legRRotX *= 0.82
      pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)
      return
    }

    // retreat: 역방향 뒷걸음 + 팔 크게 벌림 + 몸·머리 반응
    if (animPhase === 'retreat') {
      // 몸통: 뒤로 강하게 기울고 좌우로 비틀림
      if (pt.body) {
        setZombieScale(pt.body, 1)
        a.bodyRotX += (-0.52 - a.bodyRotX) * Math.min(1, delta * 18)
        pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
        a.bodyRotZ += (Math.sin(t * 8) * 0.14 - a.bodyRotZ) * Math.min(1, delta * 12)
        pt.body.rotation.z = composeZombieRotation(pt.body, 'z', a.bodyRotZ)
      }
      // 다리: 빠른 역방향 2보
      const freq = type === 'E02' ? 10.0 : type === 'E03' ? 6.5 : 8.5
      const sw = Math.sin(-t * freq * 1.6) * 0.55
      a.legLRotX = sw
      pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
      a.legRRotX = -sw
      pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)
      // 팔: 좌우로 크게 벌어짐 (위에서 봐도 확실히 보임) + 뒤로 들림
      const armFlail = Math.sin(t * 5.5) * 0.22
      pt.armL.rotation.x = composeZombieRotation(pt.armL, 'x', -0.70 + armFlail)
      pt.armR.rotation.x = composeZombieRotation(pt.armR, 'x', -0.70 - armFlail)
      a.armLRotZ = 0.95 + Math.sin(t * 3.8) * 0.18   // 오른쪽으로 크게 벌어짐
      pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
      a.armRRotZ = -0.95 - Math.sin(t * 3.8) * 0.18   // 왼쪽으로 크게 벌어짐
      pt.armR.rotation.z = composeZombieRotation(pt.armR, 'z', a.armRRotZ)
      // 머리: 뒤로 젖혀지고 좌우로 흔들림
      if (pt.head) {
        a.headRotX += (0.42 - a.headRotX) * Math.min(1, delta * 20)
        pt.head.rotation.x = composeZombieRotation(pt.head, 'x', a.headRotX)
        pt.head.rotation.z = composeZombieRotation(pt.head, 'z', Math.sin(t * 9) * 0.18)
      }
      return
    }

    // warn: 몸통 빠른 진동 (돌진 예고) — retreat 후 틸트/팔/머리 잔존 방지
    if (animPhase === 'warn') {
      const fl = Math.floor(t * 14) % 2
      if (pt.body) {
        setZombieScale(pt.body, fl ? 1.06 : 0.96)
        a.bodyRotX += (0 - a.bodyRotX) * Math.min(1, delta * 10)
        pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
        a.bodyRotZ += (0 - a.bodyRotZ) * Math.min(1, delta * 10)
        pt.body.rotation.z = composeZombieRotation(pt.body, 'z', a.bodyRotZ)
      }
      if (pt.head) {
        a.headRotX += (0 - a.headRotX) * Math.min(1, delta * 10)
        pt.head.rotation.x = composeZombieRotation(pt.head, 'x', a.headRotX)
      }
      a.armLRotZ += (0 - a.armLRotZ) * Math.min(1, delta * 8)
      pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
      a.armRRotZ += (0 - a.armRRotZ) * Math.min(1, delta * 8)
      pt.armR.rotation.z = composeZombieRotation(pt.armR, 'z', a.armRRotZ)
      return
    }
    if (pt.body) setZombieScale(pt.body, 1)

    // charge: 앞으로 기울임 / 그 외: retreat에서 남은 팔·머리 리셋
    const bodyTiltX = animPhase === 'charge' ? 0.45 : 0
    if (pt.body) {
      a.bodyRotX += (bodyTiltX - a.bodyRotX) * Math.min(1, delta * 12)
      pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
      a.bodyRotZ += (0 - a.bodyRotZ) * Math.min(1, delta * 8)
      pt.body.rotation.z = composeZombieRotation(pt.body, 'z', a.bodyRotZ)
    }
    if (pt.head) {
      a.headRotX += (0 - a.headRotX) * Math.min(1, delta * 8)
      pt.head.rotation.x = composeZombieRotation(pt.head, 'x', a.headRotX)
    }
    a.armLRotY += (0 - a.armLRotY) * Math.min(1, delta * 6)
    pt.armL.rotation.y = composeZombieRotation(pt.armL, 'y', a.armLRotY)
    a.armRRotY += (0 - a.armRRotY) * Math.min(1, delta * 6)
    pt.armR.rotation.y = composeZombieRotation(pt.armR, 'y', a.armRRotY)
    a.armLRotZ += (0 - a.armLRotZ) * Math.min(1, delta * 6)
    pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
    a.armRRotZ += (0 - a.armRRotZ) * Math.min(1, delta * 6)
    pt.armR.rotation.z = composeZombieRotation(pt.armR, 'z', a.armRRotZ)

    // stun: 멈춤
    if (animPhase === 'stun') {
      a.legLRotX *= 0.85
      pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
      a.legRRotX *= 0.85
      pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)
      return
    }

    // 런좀비 크루: 일반 좀비 보행이 아니라 전력질주 실루엣.
    // 팔은 앞뒤로 크게 펌핑, 몸은 진행 방향으로 숙이고, 다리는 빠른 보폭으로 교차한다.
    if (type === 'RZL' || type === 'RZC') {
      const stride = Math.sin(t * 13.5)
      const pump = Math.sin(t * 13.5 + Math.PI)
      if (pt.body) {
        a.bodyRotX += (0.36 - a.bodyRotX) * Math.min(1, delta * 14)
        pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
        pt.body.rotation.z = composeZombieRotation(pt.body, 'z', Math.sin(t * 7.2) * 0.055)
      }
      if (pt.head) {
        a.headRotX += (-0.08 - a.headRotX) * Math.min(1, delta * 12)
        pt.head.rotation.x = composeZombieRotation(pt.head, 'x', a.headRotX)
        pt.head.rotation.z = composeZombieRotation(pt.head, 'z', Math.sin(t * 8.5) * 0.11)
      }
      a.legLRotX = stride * 0.82
      pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
      a.legRRotX = -stride * 0.82
      pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)
      pt.armL.rotation.x = composeZombieRotation(pt.armL, 'x', -1.05 + pump * 0.50)
      pt.armR.rotation.x = composeZombieRotation(pt.armR, 'x', -1.05 - pump * 0.50)
      a.armLRotZ = -0.22 + Math.sin(t * 6.5) * 0.08
      pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
      a.armRRotZ = 0.22 - Math.sin(t * 6.5) * 0.08
      pt.armR.rotation.z = composeZombieRotation(pt.armR, 'z', a.armRRotZ)
      return
    }

    // 걷기 사이클 (타입별 속도 차이)
    const freq = type === 'B02' ? 6.2 : type === 'E02' ? 9.0 : type === 'E03' ? 5.0 : 7.0
    const amp  = type === 'B02' ? (animPhase === 'charge' ? 0.46 : 0.30) : (animPhase === 'charge' ? 0.55 : 0.38)
    const sw   = Math.sin(t * freq) * amp
    a.legLRotX = sw
    pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
    a.legRRotX = -sw
    pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)

    // 좀비 팔: 항상 앞으로 뻗은 상태에서 소폭 흔들림
    const armBase = type === 'B02' ? -1.05 : -1.15
    const armAmp = type === 'B02' ? 0.045 : 0.06
    pt.armL.rotation.x = composeZombieRotation(pt.armL, 'x', armBase + Math.sin(t * 2.8) * armAmp)
    pt.armR.rotation.x = composeZombieRotation(pt.armR, 'x', armBase + Math.sin(t * 2.8 + Math.PI) * armAmp)

    // 머리 흔들림
    if (pt.head) pt.head.rotation.z = composeZombieRotation(pt.head, 'z', Math.sin(t * 1.6) * (type === 'B02' ? 0.045 : 0.07))
  })

  if (isMatilda) {
    return <MatildaMesh movementPose={animPhase !== 'stun'} />
  }

  if (type === 'B01') {
    return (
      <StudioTunedGroup itemId="zombie-b01">
        <B01BossZombieMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />
      </StudioTunedGroup>
    )
  }

  if (type === 'RZL' || type === 'RZC') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
        <RunZombieMesh role={type === 'RZL' ? 'leader' : 'crew'} hitFlash={hitFlash} reg={reg} />
      </StudioTunedGroup>
    )
  }

  if (type === 'B03') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('B03')}>
        <B03PhysicalEducationBossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />
      </StudioTunedGroup>
    )
  }

  if (type === 'B04') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('B04')}>
        <B04ChefBossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />
      </StudioTunedGroup>
    )
  }

  if (type === 'B02') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
        <B02Stage2BossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />
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
