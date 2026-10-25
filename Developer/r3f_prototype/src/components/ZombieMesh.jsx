import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { inflateScale, getCachedBoxGeo, getCachedChamferedBoxGeo, getCachedToonMat, getSharedOutlineMat, getFlashMat } from '../lib/toon.js'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import boss01FaceUrl from '../assets/faces/b01_math_teacher_face.webp'
import boss02FaceUrl from '../assets/faces/b02_stage2_boss_face.webp'
import boss03FaceUrl from '../assets/faces/b03_pe_teacher_face.webp'
import boss04FaceUrl from '../assets/faces/b04_chef_boss_face.webp'
import ExpansionZombieMesh from './expansion/ExpansionZombieMesh.jsx'
import { getExpansionVisual } from '../lib/expansionVisuals.js'
import MatildaMesh from './MatildaMesh.jsx'
import ProceduralFaceTestZombie from './ProceduralFaceTestZombie.jsx'
import StudioTunedGroup, { composeStudioPartPosition, composeStudioPartRotation, composeStudioPartScale } from './StudioTunedGroup.jsx'
import BossFacePartsOverlay from './BossFacePartsOverlay.jsx'

const disableRaycast = () => null
export const ZOMBIE_CHARACTER_CHAMFER_STEPS = 1

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
  RZT: { body: 0xa87843, skin: 0x8fa85e, eye: 0xffd45c },
  RZG: { body: 0x173a5e, skin: 0x88a75f, eye: 0xff573d },
  E08: { body: 0x5a3b16, skin: 0x9bb66a, eye: 0xffd23a, coin: 0xf6c844, coinDark: 0xb97316, coinBag: 0x8a5a24 },
  // E07/B04는 전용 메시 분기(ProceduralFaceTestZombie / B04ChefBossMesh)를 쓰지만
  // EnemyDeathCollapse가 ZOMBIE_PALETTE[type]을 직접 조회한다. 항목이 없어 E01 녹색으로
  // 폴백되던 사망 파편 색을 각 메시의 실제 색으로 맞춘다.
  E07: { body: 0x486d9b, skin: 0x568a55, eye: 0xffedae },
  B04: { body: 0xf2efe2, skin: 0x7fa65a, eye: 0x101010 },
  // 신규 일반 좀비 12종. 제한된 평면 색만 쓰고 mark는 표식 박스 하나의 색이다.
  E34: { body: 0x4f5a22, skin: 0x8a9452, eye: 0xff2020, mark: 0xd8dca0 },
  E35: { body: 0x1d3a38, skin: 0x5c7b72, eye: 0xff2020, mark: 0x9fc4b4 },
  E36: { body: 0x9a7a3c, skin: 0xc2a86a, eye: 0xff2020, mark: 0xe8d9a8 },
  E37: { body: 0x44607a, skin: 0x7e99ad, eye: 0xffb02a, mark: 0xd4e2ea },
  E38: { body: 0x1f3356, skin: 0x6fa8a0, eye: 0xffb02a, mark: 0xbfe3dc },
  E39: { body: 0x173430, skin: 0x4e716a, eye: 0xffb02a, mark: 0xf0e6c6 },
  E40: { body: 0x5b3a86, skin: 0x9a7ec0, eye: 0xff6a2a, mark: 0xe8812e },
  E41: { body: 0x1c6a6a, skin: 0x62a3a0, eye: 0xff6a2a, mark: 0xcfe8e4 },
  E42: { body: 0x6b2a4a, skin: 0xa06b86, eye: 0xff6a2a, mark: 0xe0b8cc },
  E43: { body: 0xd8cfa8, skin: 0xb6ad86, eye: 0x2a2418, mark: 0x2f8f8a },
  E44: { body: 0x322a62, skin: 0x6d659c, eye: 0xffe3a0, mark: 0xcdc7e6 },
  E45: { body: 0x1b3d44, skin: 0x567f85, eye: 0xffe3a0, mark: 0xf2e8cc },
}

// 공용 박스 좀비의 신발 색. 공유 박스 트리와 신규 포즈형이 같은 상수를 쓴다.
export const ZOMBIE_SHOE_COLOR = 0x1a1a1a

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

export const STAGE2_GUARD_CHASE_VISUAL = {
  fugitive: { coat: 0xb48755, coatShadow: 0x76502d, scarf: 0xd8b057, pants: 0x382d29, shoe: 0x171717, hair: 0x35251c },
  guard: { uniform: 0x173a5e, vest: 0xe3bf3f, cap: 0x102c4a, badge: 0xf3d46b, pants: 0x13263b, shoe: 0x111317 },
  parts: ['longTanTrenchCoat', 'panicScarf', 'navySecurityCap', 'yellowSecurityVest', 'badge', 'fullClothing'],
}

// ── 신규 일반 좀비 12종 (E34-E45) 박스 실루엣 정본 ────────────────────────────
// 출처: Planner/stage_zombie_original_concepts_20261025.md 각 항목의 "박스 실루엣"·"구별점".
// 규칙: 전원이 E01과 같은 박스 가족(머리·눈2·몸통·팔2·손2·다리2·발2)만 쓴다. 정체성은
//   (1) 파츠 비례 = 베이스 박스에 곱하는 비균등 스케일
//   (2) 포즈 = 파츠 피벗과 회전
//   (3) 실루엣에 통합된 작은 표식 박스 하나(표식은 부모 파츠에 붙어 함께 움직인다)
// 로만 만든다. 복잡한 옷·소품·무기·갑옷·질감·추가 장식 파츠는 만들지 않는다.
// 베이스 박스 크기는 E01(STANDARD)과 동일하므로 지오메트리 캐시가 그대로 재사용되고,
// 12종이 인스턴스 파트 슬롯 한 세트를 공유한다.
export const POSED_ZOMBIE_BASE = Object.freeze({
  head: Object.freeze([0.52, 0.48, 0.46]),
  eye: Object.freeze([0.10, 0.09, 0.06]),
  eyeOffset: Object.freeze([0.12, 0.04, 0.24]),
  body: Object.freeze([0.56, 0.58, 0.40]),
  arm: Object.freeze([0.20, 0.50, 0.20]),
  armOffsetY: -0.25,
  hand: Object.freeze([0.18, 0.16, 0.18]),
  handOffsetY: -0.55,
  leg: Object.freeze([0.22, 0.52, 0.26]),
  legOffsetY: -0.26,
  foot: Object.freeze([0.24, 0.12, 0.34]),
  footOffset: Object.freeze([0, -0.57, 0.05]),
  mark: Object.freeze([0.12, 0.10, 0.06]),
})

// 공유 박스 트리의 보행 애니메이션이 각 파츠에 부여하는 절대 기준 회전.
// 포즈 회전은 이 기준에서의 델타로 고정풀 인스턴스 경로에 더해진다.
export const POSED_ZOMBIE_ANIM_BASE_ROTATION = Object.freeze({
  head: Object.freeze([0, 0, 0]),
  body: Object.freeze([0, 0, 0]),
  armL: Object.freeze([-1.15, 0, 0.12]),
  armR: Object.freeze([-1.15, 0, -0.12]),
  legL: Object.freeze([0, 0, 0]),
  legR: Object.freeze([0, 0, 0]),
})

// 13개 파트 슬롯의 애니메이션 키(= 부모 피벗)와 색 역할. 표식 슬롯의 키는 타입별이다.
export const POSED_ZOMBIE_PART_KEYS = Object.freeze([
  'head', 'head', 'head', 'body', 'armL', 'armL', 'armR', 'armR', 'legL', 'legL', 'legR', 'legR', 'mark',
])
export const POSED_ZOMBIE_PART_ROLES = Object.freeze([
  'skin', 'eye', 'eye', 'body', 'body', 'skin', 'body', 'skin', 'body', 'foot', 'body', 'foot', 'mark',
])
export const POSED_ZOMBIE_PART_OUTLINES = Object.freeze([
  1.08, 1, 1, 1.09, 1.05, 1.03, 1.05, 1.03, 1.06, 1.03, 1.06, 1.03, 1,
])
// E01 공유 박스 트리와 동일한 파츠별 emissive. 표식만 약간 밝게 둬 평면 색으로 읽힌다.
export const POSED_ZOMBIE_PART_EMISSIVE = Object.freeze([
  0.08, 0.9, 0.9, 0.14, 0.10, 0.07, 0.10, 0.07, 0.10, 0.05, 0.10, 0.05, 0.16,
])
export const POSED_ZOMBIE_MARK_SLOT = 12
export const POSED_ZOMBIE_PART_COUNT = 13

export const POSED_ZOMBIE_RIGS = Object.freeze({
  // 1. 박자접기형 — 작은 머리, 긴 몸통, 팔꿈치를 앞에서 겹친 가느다란 옆모습.
  // 기존 차저의 직선 예고·장거리 돌진이 아니라 폭이 줄어드는 준비 포즈로 읽힌다.
  E34: {
    stage: 1, label: '박자접기형',
    head: { scale: [0.82, 0.86, 0.82], pivot: [0, 0.80, 0], rot: [0, 0, 0] },
    body: { scale: [0.78, 1.26, 0.86], pivot: [0, 0.34, 0], rot: [0, 0, 0] },
    armL: { scale: [0.95, 1.00, 0.95], pivot: [-0.22, 0.56, 0], rot: [-1.22, 0, 0.78] },
    armR: { scale: [0.95, 1.00, 0.95], pivot: [0.22, 0.56, 0], rot: [-1.22, 0, -0.78] },
    legL: { scale: [0.90, 1.00, 0.90], pivot: [-0.11, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [0.90, 1.00, 0.90], pivot: [0.11, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'body', scale: [1.00, 0.90, 0.70], offset: [-0.15, 0.25, 0.20] },
  },
  // 2. 모서리비껴형 — 짧고 넓은 몸통, 한 팔은 몸 옆에 붙고 다른 팔은 낮게 비껴 있다.
  // 정면을 유지하지 않는 선회 접촉이므로 머리를 축에서 돌려 둔다.
  E35: {
    stage: 1, label: '모서리비껴형',
    head: { scale: [1.00, 0.92, 1.00], pivot: [0, 0.78, 0], rot: [0, 0.42, 0] },
    body: { scale: [1.30, 0.74, 1.00], pivot: [0, 0.24, 0], rot: [0, 0.18, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.33, 0.50, 0], rot: [-0.12, 0, 0.04] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.38, 0.44, 0], rot: [-0.40, 0, -0.62] },
    legL: { scale: [1.00, 0.92, 1.00], pivot: [-0.17, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [1.00, 0.92, 1.00], pivot: [0.17, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'head', scale: [0.50, 1.00, 1.20], offset: [0.27, 0, 0.04] },
  },
  // 3. 반걸음되짚기형 — 상체는 반듯하고 한쪽 다리만 뒤로 길게 접힌 비대칭 정지 포즈,
  // 팔은 아래로 수직. 12종 중 유일하게 두 팔이 모두 수직으로 내려와 있다.
  E36: {
    stage: 1, label: '반걸음되짚기형',
    head: { scale: [1.00, 1.00, 1.00], pivot: [0, 0.84, 0], rot: [0, 0, 0] },
    body: { scale: [0.96, 1.04, 0.96], pivot: [0, 0.30, 0], rot: [-0.06, 0, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.36, 0.52, 0], rot: [-0.06, 0, 0.02] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.36, 0.52, 0], rot: [-0.06, 0, -0.02] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.15, 0, 0.06], rot: [0.10, 0, 0] },
    legR: { scale: [1.00, 1.12, 1.00], pivot: [0.16, 0.02, -0.16], rot: [-0.72, 0, 0] },
    mark: { parent: 'body', scale: [1.40, 0.70, 0.70], offset: [0, -0.21, 0.20] },
  },
  // 4. 빗금엇갈림형 — 길고 가는 몸통, 머리는 한쪽으로 치우치고 팔은 서로 다른 높이로 교차.
  // 머리와 흉곽이 서로 다른 방향을 보는 '꼬인 축'이 예고다.
  E37: {
    stage: 2, label: '빗금엇갈림형',
    head: { scale: [0.90, 0.90, 0.90], pivot: [-0.14, 0.84, 0], rot: [0, -0.26, 0.16] },
    body: { scale: [0.74, 1.22, 0.80], pivot: [0, 0.33, 0], rot: [0, 0.30, 0.10] },
    armL: { scale: [0.95, 1.00, 0.95], pivot: [-0.26, 0.64, 0.04], rot: [-1.30, 0, 0.72] },
    armR: { scale: [0.95, 1.00, 0.95], pivot: [0.26, 0.42, 0.04], rot: [-1.05, 0, -0.98] },
    legL: { scale: [0.90, 1.08, 0.90], pivot: [-0.12, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [0.90, 1.08, 0.90], pivot: [0.12, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'body', scale: [1.70, 0.42, 0.70], offset: [0.07, 0.12, 0.19] },
  },
  // 5. 빈칸반응형 — 폭이 좁은 몸통, 머리가 한쪽 어깨선에 붙은 비대칭 실루엣,
  // 반대편 팔은 낮고 길게 늘어진다. 12종 중 머리가 가장 낮다.
  E38: {
    stage: 2, label: '빈칸반응형',
    head: { scale: [0.96, 0.90, 0.96], pivot: [0.17, 0.72, 0], rot: [0, 0.16, -0.34] },
    body: { scale: [0.72, 1.00, 0.88], pivot: [0, 0.28, 0], rot: [0, 0, -0.06] },
    armL: { scale: [0.92, 1.40, 0.92], pivot: [-0.34, 0.48, 0], rot: [-0.22, 0, 0.16] },
    armR: { scale: [1.00, 0.78, 1.00], pivot: [0.34, 0.54, 0], rot: [-0.95, 0, -0.20] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.13, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [1.00, 1.00, 1.00], pivot: [0.13, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'head', scale: [0.85, 0.70, 0.60], offset: [0, 0.17, 0.21] },
  },
  // 6. 선끝접기형 — 매우 낮고 긴 몸통, 머리는 몸통 중앙보다 뒤, 한 팔만 몸 아래로 접힘.
  // 12종 중 유일하게 몸통이 앞으로 눕고 앞뒤로 가장 길다.
  E39: {
    stage: 2, label: '선끝접기형',
    head: { scale: [0.94, 0.86, 0.94], pivot: [0, 0.58, -0.22], rot: [0.18, 0, 0] },
    body: { scale: [1.10, 0.62, 1.42], pivot: [0, 0.26, 0], rot: [0.52, 0, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.30, 0.40, 0], rot: [-2.35, 0, 0.30] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.34, 0.46, 0], rot: [-1.35, 0, -0.08] },
    legL: { scale: [1.00, 0.80, 1.00], pivot: [-0.19, 0, 0], rot: [0, 0, 0.12] },
    legR: { scale: [1.00, 0.80, 1.00], pivot: [0.19, 0, 0], rot: [0, 0, -0.12] },
    mark: { parent: 'armL', scale: [0.90, 0.65, 0.90], offset: [0, -0.74, 0] },
  },
  // 7. 중심축비틀기형 — 좁은 허리, 한쪽으로 과장된 어깨, 반대 방향 높이로 벌어진 두 팔.
  // 골반(다리)은 정면인 채 몸통만 축에서 돌아 있는 상태가 핵심 예고다.
  E40: {
    stage: 3, label: '중심축비틀기형',
    head: { scale: [1.00, 1.00, 1.00], pivot: [0, 0.82, 0], rot: [0, -0.30, 0] },
    body: { scale: [1.16, 0.96, 0.86], pivot: [0, 0.30, 0], rot: [0, 0.46, 0] },
    armL: { scale: [1.25, 1.00, 1.25], pivot: [-0.52, 0.62, 0], rot: [-1.30, 0, 0.55] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.34, 0.40, 0], rot: [-0.55, 0, -0.70] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.17, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [1.00, 1.00, 1.00], pivot: [0.17, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'body', scale: [0.80, 1.30, 0.70], offset: [-0.31, 0.24, 0.08] },
  },
  // 8. 쌍박자교대형 — 길쭉한 몸통, 한쪽씩 높이가 다른 사각 팔, 한쪽 다리가 뒤로 물러난 체형.
  // 낮은 팔과 높은 팔이 앞으로 뻗는 높이 차가 두 단계 타격 순서를 읽히게 한다.
  E41: {
    stage: 3, label: '쌍박자교대형',
    head: { scale: [0.88, 0.94, 0.88], pivot: [0, 0.82, 0], rot: [0, 0, 0] },
    body: { scale: [0.86, 1.18, 0.86], pivot: [0, 0.32, 0], rot: [0, 0, 0] },
    armL: { scale: [1.12, 1.00, 1.12], pivot: [-0.38, 0.42, 0], rot: [-1.72, 0, 0.10] },
    armR: { scale: [1.12, 1.00, 1.12], pivot: [0.38, 0.62, 0], rot: [-0.78, 0, -0.10] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.15, 0, 0.08], rot: [0.06, 0, 0] },
    legR: { scale: [1.00, 1.00, 1.00], pivot: [0.16, 0, -0.14], rot: [-0.34, 0, 0] },
    mark: { parent: 'body', scale: [1.80, 0.45, 0.70], offset: [0, -0.09, 0.20] },
  },
  // 9. 반원발맞춤형 — 네모를 유지한 머리, 긴 몸통, 양발을 나란히 모으고 두 팔을 곡선
  // 양끝처럼 벌린 자세. 12종 중 유일하게 좌우 대칭 넓은 팔 + 모은 발이다.
  E42: {
    stage: 3, label: '반원발맞춤형',
    head: { scale: [1.06, 1.00, 1.06], pivot: [0, 0.83, 0], rot: [0, 0, 0] },
    body: { scale: [0.90, 1.14, 0.90], pivot: [0, 0.31, 0], rot: [0, 0, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.44, 0.56, 0], rot: [-0.70, 0, 1.05] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.44, 0.56, 0], rot: [-0.70, 0, -1.05] },
    legL: { scale: [0.94, 1.00, 0.94], pivot: [-0.06, 0, 0], rot: [0, 0, 0], footShift: [-0.02, 0, 0] },
    legR: { scale: [0.94, 1.00, 0.94], pivot: [0.06, 0, 0], rot: [0, 0, 0], footShift: [0.02, 0, 0] },
    mark: { parent: 'body', scale: [0.80, 0.90, 0.80], offset: [0.26, -0.02, 0.05] },
  },
  // 10. 엇높이교차형 — 짧고 넓은 몸통, 한 팔은 허리 높이, 다른 팔은 어깨 높이로 벌어진다.
  // E42의 같은 높이 대칭 벌림과 달리 두 팔 피벗 높이가 계단처럼 다르다.
  E43: {
    stage: 4, label: '엇높이교차형',
    head: { scale: [1.00, 0.90, 1.00], pivot: [0, 0.78, 0], rot: [0, 0, 0] },
    body: { scale: [1.26, 0.80, 1.04], pivot: [0, 0.26, 0], rot: [0, 0, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.46, 0.34, 0], rot: [-1.10, 0, 0.84] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.46, 0.62, 0], rot: [-1.10, 0, -0.84] },
    legL: { scale: [1.00, 0.86, 1.00], pivot: [-0.18, 0, 0], rot: [0, 0, 0] },
    legR: { scale: [1.00, 0.86, 1.00], pivot: [0.18, 0, 0], rot: [0, 0, 0] },
    mark: { parent: 'armL', scale: [0.85, 0.70, 0.85], offset: [0, -0.72, 0] },
  },
  // 11. 발맞춤후퇴형 — 좁은 어깨와 길게 늘어진 몸통, 발은 평행하게 놓이고 팔은 서로 다른
  // 쪽으로 접힌다. 12종 중 몸통 폭이 가장 좁고, 두 다리가 모두 한쪽으로 치우쳐 선다.
  E44: {
    stage: 4, label: '발맞춤후퇴형',
    head: { scale: [0.92, 1.00, 0.92], pivot: [0, 0.80, 0], rot: [0, 0.22, 0] },
    body: { scale: [0.66, 1.10, 0.78], pivot: [0, 0.30, 0], rot: [0, 0.26, 0] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.28, 0.52, 0], rot: [-1.95, 0, 0.95] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.28, 0.52, 0], rot: [-0.45, 0, -1.25] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.03, 0, 0], rot: [0, 0.30, 0] },
    legR: { scale: [1.00, 1.00, 1.00], pivot: [0.25, 0, 0], rot: [0, 0.30, 0] },
    mark: { parent: 'body', scale: [1.30, 0.50, 0.70], offset: [-0.24, 0.23, 0.02] },
  },
  // 12. 무게중심넘김형 — 어깨가 비스듬히 내려가고 골반은 반대편으로 기운 사다리꼴 인상,
  // 한쪽 무릎만 접힌 다리. 12종 중 유일하게 몸통과 다리가 반대로 기운다.
  E45: {
    stage: 4, label: '무게중심넘김형',
    head: { scale: [1.00, 0.96, 1.00], pivot: [0, 0.80, 0], rot: [0, 0, 0.26] },
    body: { scale: [1.18, 0.88, 0.92], pivot: [0, 0.27, 0], rot: [0, 0, -0.34] },
    armL: { scale: [1.00, 1.00, 1.00], pivot: [-0.42, 0.42, 0], rot: [-0.95, 0, 0.42] },
    armR: { scale: [1.00, 1.00, 1.00], pivot: [0.40, 0.62, 0], rot: [-1.25, 0, 0.10] },
    legL: { scale: [1.00, 1.00, 1.00], pivot: [-0.19, 0, 0], rot: [0.08, 0, 0.26] },
    legR: { scale: [1.00, 0.82, 1.00], pivot: [0.13, -0.02, 0], rot: [-0.52, 0, 0.26] },
    mark: { parent: 'body', scale: [0.80, 0.85, 0.70], offset: [0.27, -0.18, 0.05] },
  },
})

// 상태별 포즈 델타(라디안). 위 고정 포즈 rot 위에 **더해지는** 값이고 파트 슬롯은
// 13개 그대로다 — 소품·의상·무기·질감을 하나도 추가하지 않고 회전만 쓴다.
//
// 왜 필요한가: 12종은 상태 코드 7~13(novelZombieBehavior.js)으로 움직이는데
// ZombieInstanceLayer의 phase()가 2/3/4만 보고 있어서 예고·타격·회복 전 구간이
// 평시 보행으로 렌더됐다. 고정 포즈는 타입별로만 다르고 상태별 분기가 없었으므로,
// 'hold'/'plant'로 멈춰 서는 10종은 팔다리 보행 사인만 계속 돌아 "제자리 걷기"로 보였다.
//
// 회색조 판독: balanceqa의 24×32 정면 투영 IoU 최악 쌍(E35↔E36 0.755, E35↔E43,
// E34↔E44, E40↔E42)은 **예고 포즈에서 서로 반대 방향으로** 벌린다.
//   · E35 예고 = 두 팔을 한쪽으로 모아 낮게 쓸고 측면으로 깊게 기움(낮고 넓은 한쪽 쏠림)
//   · E36 예고 = 두 팔을 머리 위로 수직, 다리는 모음(높고 좁은 기둥)
//   · E43 예고 = 깊게 웅크리고 두 팔을 뒤아래로, 다리는 넓은 스플릿
//   · E34 예고 = 두 팔을 가슴 앞에서 교차, 다리 모음(가장 좁음)
//   · E44 예고 = 두 팔을 넓게 벌리고 한쪽 다리를 뒤로 높이 듦
//   · E40 예고 = 한 팔은 매우 높이, 다른 팔은 아래로(수직 비대칭)
//   · E42 예고 = 두 팔을 대칭으로 내리고 다리를 넓은 V로(E40과 정반대)
export const POSED_ZOMBIE_STATE_POSE_DELTAS = Object.freeze({
  E34: {
    telegraph: { head: [0.40, 0, 0], body: [0.50, 0, 0], armL: [-0.30, 0, -0.95], armR: [-0.30, 0, 0.95], legL: [0.55, 0, 0.10], legR: [0.55, 0, -0.10] },
    attack: { head: [-0.30, 0, 0], body: [-0.34, 0, 0], armL: [-0.10, 0, -0.70], armR: [-0.10, 0, 0.70], legL: [-0.42, 0, 0], legR: [0.42, 0, 0] },
  },
  E35: {
    telegraph: { head: [0, 0.38, 0], body: [0, 0.34, 0.42], armL: [-0.18, 0, 0.88], armR: [-0.18, 0, 1.00], legL: [0, 0, 0.30], legR: [0, 0, 0.18] },
    attack: { head: [0, -0.46, 0], body: [0, -0.40, -0.48], armL: [0.30, 0, -0.55], armR: [0.30, 0, -0.30], legL: [0, 0, -0.25], legR: [0, 0, -0.12] },
  },
  E36: {
    telegraph: { head: [-0.18, 0, 0], body: [-0.22, 0, 0], armL: [-1.45, 0, -0.10], armR: [-1.45, 0, 0.10], legL: [0, 0, 0.10], legR: [0.50, 0, -0.10] },
    attack: { head: [0.42, 0, 0], body: [0.56, 0, 0], armL: [0.95, 0, 0.20], armR: [0.95, 0, -0.20], legL: [-0.30, 0, 0], legR: [0.25, 0, 0] },
  },
  E37: {
    telegraph: { head: [0, -0.40, 0.24], body: [0, 0.46, 0.18], armL: [-0.62, 0, -0.48], armR: [0.55, 0, -0.42], legL: [0, 0, 0.12], legR: [0, 0, -0.12] },
    attack: { head: [0, 0.52, -0.28], body: [0, -0.58, -0.22], armL: [0.48, 0, 0.62], armR: [-0.70, 0, 0.55], legL: [-0.20, 0, 0], legR: [0.20, 0, 0] },
  },
  E38: {
    telegraph: { head: [0, 0.24, -0.42], body: [0.20, 0, -0.26], armL: [0.22, 0, 0.95], armR: [-0.80, 0, -0.28], legL: [0, 0, 0.22], legR: [0, 0, -0.08] },
    attack: { head: [-0.26, 0, 0.30], body: [-0.30, 0, 0.22], armL: [-1.30, 0, -0.55], armR: [0.40, 0, 0.25], legL: [-0.48, 0, 0], legR: [0.30, 0, 0] },
  },
  E39: {
    telegraph: { head: [0.30, 0, 0], body: [0.34, 0, 0], armL: [0.55, 0, -0.22], armR: [-0.70, 0, 0.30], legL: [0, 0, 0.18], legR: [0, 0, -0.18] },
    attack: { head: [-0.52, 0, 0], body: [-0.70, 0, 0], armL: [-0.85, 0, 0.70], armR: [-1.15, 0, -0.80], legL: [0.30, 0, 0], legR: [-0.30, 0, 0] },
  },
  E40: {
    telegraph: { head: [0, -0.50, 0], body: [0, 0.52, 0], armL: [-1.05, 0, 0.25], armR: [0.60, 0, 0.30], legL: [0, 0, 0], legR: [0, 0, 0] },
    attack: { head: [0, 0.56, 0], body: [0, -0.62, 0], armL: [0.70, 0, -0.70], armR: [-0.60, 0, -0.65], legL: [-0.18, 0, 0], legR: [0.18, 0, 0] },
  },
  E41: {
    telegraph: { head: [0.32, 0, 0], body: [0.44, 0, 0], armL: [0.58, 0, 0.28], armR: [-0.28, 0, -0.28], legL: [0.34, 0, 0], legR: [-0.68, 0, 0] },
    attack: { head: [0.18, 0, 0], body: [0.26, 0, 0], armL: [0.85, 0, -0.20], armR: [-0.45, 0, 0.20], legL: [-0.40, 0, 0], legR: [0.38, 0, 0] },
  },
  E42: {
    telegraph: { head: [0.16, 0, 0], body: [0.22, 0, 0], armL: [0.55, 0, -0.95], armR: [0.55, 0, 0.95], legL: [0, 0, 0.62], legR: [0, 0, -0.62] },
    attack: { head: [-0.22, 0, 0], body: [-0.26, 0, 0], armL: [-0.80, 0, 0.45], armR: [-0.80, 0, -0.45], legL: [0, 0, -0.30], legR: [0, 0, 0.30] },
  },
  E43: {
    telegraph: { head: [0, 0, 0], body: [0, 0, 0], armL: [1.10, 0, 0.73], armR: [1.10, 0, -0.73], legL: [0, 0, -0.22], legR: [0, 0, 0.22] },
    attack: { head: [-0.40, 0, 0], body: [-0.62, 0, 0], armL: [-0.95, 0, -0.40], armR: [-0.95, 0, 0.40], legL: [-0.35, 0, 0], legR: [0.35, 0, 0] },
  },
  E44: {
    telegraph: { head: [0, 0.34, 0.30], body: [0, 0.30, 0.38], armL: [1.40, 0, -0.95], armR: [0.10, 0, 1.05], legL: [0.10, 0, 0.20], legR: [-1.00, 0, 0.20] },
    attack: { head: [0, -0.34, 0], body: [0, -0.30, 0], armL: [-0.55, 0, -0.80], armR: [-0.20, 0, 0.95], legL: [-0.35, 0, 0], legR: [0.60, 0, 0] },
  },
  E45: {
    telegraph: { head: [0, 0, 0.34], body: [0, 0, -0.42], armL: [-0.30, 0, 0.62], armR: [0.35, 0, 0.70], legL: [0.20, 0, 0.22], legR: [-0.30, 0, 0.22] },
    attack: { head: [0, 0, -0.44], body: [0, 0, 0.52], armL: [0.45, 0, -0.70], armR: [-0.85, 0, -0.55], legL: [-0.40, 0, -0.26], legR: [0.42, 0, -0.26] },
  },
})

// 회복(RECOVER/RECOVER_ALT)은 타격 포즈에서 돌아오는 중이라 같은 델타를 감쇠해 쓴다.
// 별도 1세트를 더 authoring하지 않고도 예고·타격·회복이 세 가지로 구분된다.
export const POSED_ZOMBIE_RECOVER_DAMPING = 0.34
const POSED_ZOMBIE_NO_POSE_DELTA = Object.freeze([0, 0, 0])

// 13개 파트 슬롯에 대한 상태 포즈 델타. state는 ZombieInstanceLayer의 phase() 값이다
// ('warn' = 예고, 'charge' = 타격, 'stun' = 회복). 파트 슬롯 수는 바뀌지 않는다.
export function buildPosedZombieStatePose(type, state) {
  const rig = POSED_ZOMBIE_RIGS[type]
  const deltas = POSED_ZOMBIE_STATE_POSE_DELTAS[type]
  if (!rig || !deltas) return null
  const source = state === 'warn' ? deltas.telegraph : deltas.attack
  const damping = state === 'stun' ? POSED_ZOMBIE_RECOVER_DAMPING : 1
  return Array.from({ length: POSED_ZOMBIE_PART_COUNT }, (_, index) => {
    const key = index === POSED_ZOMBIE_MARK_SLOT ? rig.mark.parent : POSED_ZOMBIE_PART_KEYS[index]
    const delta = source[key] ?? POSED_ZOMBIE_NO_POSE_DELTA
    return [delta[0] * damping, delta[1] * damping, delta[2] * damping]
  })
}

// 런타임 ID 고정 배정(2026-10-25). typeCode 37-48은 확장팩(17-36) 위의 빈 구간이다.
export const POSED_ZOMBIE_TYPES = Object.freeze(['E34', 'E35', 'E36', 'E37', 'E38', 'E39', 'E40', 'E41', 'E42', 'E43', 'E44', 'E45'])
export const POSED_ZOMBIE_FIRST_TYPE_CODE = 37

export function isPosedZombieType(type) {
  return Object.prototype.hasOwnProperty.call(POSED_ZOMBIE_RIGS, type)
}

function scaled3(base, scale) {
  return [base[0] * scale[0], base[1] * scale[1], base[2] * scale[2]]
}

// 13개 파트 슬롯의 최종 수치를 한 곳에서 계산한다. 공유 박스 트리(ZombieMesh)와
// 고정풀 인스턴스 경로(ZombieInstanceLayer)가 이 한 표만 소비해 동일 포즈를 그린다.
export function buildPosedZombieParts(type) {
  const rig = POSED_ZOMBIE_RIGS[type]
  if (!rig) return null
  const base = POSED_ZOMBIE_BASE
  const head = rig.head
  const markParent = rig[rig.mark.parent]
  const upperArm = (bone) => ({
    pivot: bone.pivot, offset: [0, base.armOffsetY * bone.scale[1], 0], rot: bone.rot, box: bone.scale, size: base.arm,
  })
  const hand = (bone) => ({
    pivot: bone.pivot,
    offset: [0, base.handOffsetY * bone.scale[1], 0],
    rot: bone.rot,
    box: [bone.scale[0], 1, bone.scale[2]],
    size: base.hand,
  })
  const foot = (bone) => {
    const shift = bone.footShift ?? [0, 0, 0]
    return {
      pivot: bone.pivot,
      offset: [base.footOffset[0] + shift[0], base.footOffset[1] * bone.scale[1] + shift[1], base.footOffset[2] + shift[2]],
      rot: bone.rot,
      box: [bone.scale[0], 1, bone.scale[2]],
      size: base.foot,
    }
  }
  const eye = (sign) => ({
    pivot: head.pivot,
    offset: [sign * base.eyeOffset[0] * head.scale[0], base.eyeOffset[1] * head.scale[1], base.eyeOffset[2] * head.scale[2]],
    rot: head.rot,
    box: [1, 1, 1],
    size: base.eye,
  })
  const parts = [
    { pivot: head.pivot, offset: [0, 0, 0], rot: head.rot, box: head.scale, size: base.head },
    eye(-1),
    eye(1),
    { pivot: rig.body.pivot, offset: [0, 0, 0], rot: rig.body.rot, box: rig.body.scale, size: base.body },
    upperArm(rig.armL), hand(rig.armL),
    upperArm(rig.armR), hand(rig.armR),
    { pivot: rig.legL.pivot, offset: [0, base.legOffsetY * rig.legL.scale[1], 0], rot: rig.legL.rot, box: rig.legL.scale, size: base.leg },
    foot(rig.legL),
    { pivot: rig.legR.pivot, offset: [0, base.legOffsetY * rig.legR.scale[1], 0], rot: rig.legR.rot, box: rig.legR.scale, size: base.leg },
    foot(rig.legR),
    // 표식은 부모 파츠의 피벗·회전을 그대로 타고 오프셋만 갖는다. 자체 기울기를 두지
    // 않는 이유: 공유 박스 트리는 부모 회전과 기울기를 행렬 곱으로, 인스턴스 경로는
    // 오일러 합으로 합성하므로 기울기가 있으면 두 경로가 미세하게 어긋난다.
    { pivot: markParent.pivot, offset: rig.mark.offset, rot: markParent.rot, box: rig.mark.scale, size: base.mark },
  ]
  return parts.map((part, index) => ({
    ...part,
    key: index === POSED_ZOMBIE_MARK_SLOT ? rig.mark.parent : POSED_ZOMBIE_PART_KEYS[index],
    role: POSED_ZOMBIE_PART_ROLES[index],
    outline: POSED_ZOMBIE_PART_OUTLINES[index],
    worldSize: scaled3(part.size, part.box),
  }))
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

function Stage2GuardChaseZombieMesh({ type, hitFlash, reg }) {
  const isFugitive = type === 'RZT'
  const pal = ZOMBIE_PALETTE[type]
  const visual = isFugitive ? STAGE2_GUARD_CHASE_VISUAL.fugitive : STAGE2_GUARD_CHASE_VISUAL.guard
  const torso = isFugitive ? visual.coat : visual.uniform

  return (
    <group name={isFugitive ? 'stage2TrenchCoatFugitive' : 'stage2SecurityGuardPursuer'}>
      <group ref={reg('head')} position={[0, 0.84, 0]}>
        <ZBlock name="chaseHead" size={[0.52, 0.48, 0.46]} position={[0, 0, 0]} color={pal.skin} emissive={0.07} outlineScale={1.08} flash={hitFlash} />
        {isFugitive ? (
          <>
            <ZBlock name="fugitiveHair" size={[0.54, 0.14, 0.47]} position={[0, 0.17, -0.015]} color={visual.hair} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
            <ZBlock name="fugitiveEyeL" size={[0.11, 0.10, 0.05]} position={[-0.12, 0.015, 0.25]} color={pal.eye} emissive={0.16} outlineScale={1} flash={hitFlash} />
            <ZBlock name="fugitiveEyeR" size={[0.11, 0.10, 0.05]} position={[0.12, 0.015, 0.25]} color={pal.eye} emissive={0.16} outlineScale={1} flash={hitFlash} />
            <ZBlock name="fugitivePanicMouth" size={[0.18, 0.10, 0.05]} position={[0, -0.16, 0.25]} color={0x381510} emissive={0.04} outlineScale={1} flash={hitFlash} />
          </>
        ) : (
          <>
            <ZBlock name="guardCap" size={[0.56, 0.12, 0.50]} position={[0, 0.18, 0]} color={visual.cap} emissive={0.06} outlineScale={1.03} flash={hitFlash} />
            <ZBlock name="guardCapBrim" size={[0.34, 0.055, 0.18]} position={[0, 0.13, 0.28]} color={visual.cap} emissive={0.05} outlineScale={1} flash={hitFlash} />
            <ZBlock name="guardEyeL" size={[0.11, 0.10, 0.05]} position={[-0.12, 0.015, 0.25]} color={pal.eye} emissive={0.12} outlineScale={1} flash={hitFlash} />
            <ZBlock name="guardEyeR" size={[0.11, 0.10, 0.05]} position={[0.12, 0.015, 0.25]} color={pal.eye} emissive={0.12} outlineScale={1} flash={hitFlash} />
            <ZBlock name="guardCommandMouth" size={[0.22, 0.075, 0.05]} position={[0, -0.15, 0.25]} color={0x35100f} emissive={0.04} outlineScale={1} flash={hitFlash} />
          </>
        )}
      </group>
      <group ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="chaseTorso" size={[0.58, isFugitive ? 0.68 : 0.58, 0.42]} position={[0, 0, 0]} color={torso} emissive={0.10} outlineScale={1.08} flash={hitFlash} />
        {isFugitive ? (
          <><ZBlock name="fugitiveScarf" size={[0.60, 0.075, 0.44]} position={[0, 0.25, 0.02]} color={visual.scarf} emissive={0.08} outlineScale={1} flash={hitFlash} /><ZBlock name="fugitiveCoatBelt" size={[0.62, 0.06, 0.44]} position={[0, -0.10, 0.02]} color={visual.coatShadow} emissive={0.05} outlineScale={1} flash={hitFlash} /></>
        ) : (
          <><ZBlock name="guardSafetyVest" size={[0.61, 0.48, 0.055]} position={[0, 0.01, 0.24]} color={visual.vest} emissive={0.12} outlineScale={1} flash={hitFlash} /><ZBlock name="guardBadge" size={[0.10, 0.13, 0.05]} position={[-0.14, 0.12, 0.285]} color={visual.badge} emissive={0.18} outlineScale={1} flash={hitFlash} /></>
        )}
      </group>
      <group ref={reg('armL')} position={[-0.40, 0.52, 0]} rotation={[-1.18, 0, -0.20]}><ZBlock name="chaseArmL" size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]} color={torso} emissive={0.08} outlineScale={1.05} flash={hitFlash} /><ZBlock name="chaseHandL" size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]} color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} /></group>
      <group ref={reg('armR')} position={[0.40, 0.52, 0]} rotation={[-1.50, 0, 0.20]}><ZBlock name="chaseArmR" size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]} color={torso} emissive={0.08} outlineScale={1.05} flash={hitFlash} /><ZBlock name="chaseHandR" size={[0.18, 0.16, 0.18]} position={[0, -0.55, 0]} color={pal.skin} emissive={0.07} outlineScale={1.03} flash={hitFlash} /></group>
      <group ref={reg('legL')} position={[-0.15, 0, 0]}><ZBlock name="chaseLegL" size={[0.22, 0.50, 0.26]} position={[0, -0.25, 0]} color={visual.pants} emissive={0.07} outlineScale={1.05} flash={hitFlash} /><ZBlock name="chaseShoeL" size={[0.26, 0.12, 0.36]} position={[0, -0.55, 0.06]} color={visual.shoe} emissive={0.05} outlineScale={1.03} flash={hitFlash} /></group>
      <group ref={reg('legR')} position={[0.15, 0, 0]}><ZBlock name="chaseLegR" size={[0.22, 0.50, 0.26]} position={[0, -0.25, 0]} color={visual.pants} emissive={0.07} outlineScale={1.05} flash={hitFlash} /><ZBlock name="chaseShoeR" size={[0.26, 0.12, 0.36]} position={[0, -0.55, 0.06]} color={visual.shoe} emissive={0.05} outlineScale={1.03} flash={hitFlash} /></group>
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

// boxScale은 베이스 지오메트리에만 곱하는 비균등 비례다. 새 그룹을 만들지 않으므로
// 기존 파츠의 Studio 숫자 자식 경로가 바뀌지 않고, 고정풀 인스턴스 경로가 인스턴스
// 행렬 끝에 곱하는 스케일과 같은 순서(피벗→회전→오프셋→박스스케일)로 합성된다.
function ZBlock({ name, studioPartId, size, position, rotation, color, emissive = 0.12, outlineScale = 1.08, flash = false, chamferSteps = ZOMBIE_CHARACTER_CHAMFER_STEPS, groupRef = null, boxScale = null, children = null }) {
  const geo    = chamferSteps > 0 ? getCachedChamferedBoxGeo(...size, chamferSteps) : getCachedBoxGeo(...size)
  const outMat = getSharedOutlineMat()
  const mat    = flash ? getFlashMat() : getCachedToonMat(color, emissive)
  const os     = inflateScale(outlineScale)
  const bx     = boxScale ? boxScale[0] : 1
  const by     = boxScale ? boxScale[1] : 1
  const bz     = boxScale ? boxScale[2] : 1
  return (
    <group ref={groupRef} name={studioPartId ?? name} userData={studioPartId ? { studioPartId } : undefined} position={position} rotation={rotation}>
      <mesh renderOrder={1} geometry={geo} material={outMat} scale={[os * bx, os * by, os * bz]} userData={{ studioRenderOutline: true }} raycast={disableRaycast} />
      <mesh renderOrder={2} geometry={geo} material={mat} scale={[bx, by, bz]} />
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
        <group name="b01JerseyVLeft" />
        <group name="b01JerseyVRight" />
        {/* 목의 빨간 끈+호루라기는 얼굴 텍스처에 포함되어 중복되므로 3D 호루라기 파츠 제거 */}
      </group>

      <ZBlock name="b01Shorts" groupRef={reg('shorts')} size={[0.68, 0.28, 0.44]} position={[0, -0.17, 0]} color={pal.shorts} emissive={0.05} outlineScale={1.07} flash={hitFlash} />

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


function CoinJingleZombieMesh({ hitFlash, reg }) {
  const pal = ZOMBIE_PALETTE.E08
  return (
    <group name="coinJingleZombie">
      <group ref={reg('head')} position={[0, 0.82, 0]}>
        <ZBlock name="coinJingleHead" size={[0.52, 0.48, 0.46]} position={[0, 0, 0]} color={pal.skin} emissive={0.08} outlineScale={1.08} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleEyeL" size={[0.10, 0.09, 0.06]} position={[-0.12, 0.04, 0.24]} color={pal.eye} emissive={0.95} outlineScale={1.0} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleEyeR" size={[0.10, 0.09, 0.06]} position={[0.12, 0.04, 0.24]} color={pal.eye} emissive={0.95} outlineScale={1.0} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleForeheadCoin" size={[0.20, 0.06, 0.20]} position={[0, 0.26, 0.04]} rotation={[Math.PI / 2, 0, 0]} color={pal.coin} emissive={0.28} outlineScale={1.03} flash={hitFlash} chamferSteps={2} />
      </group>
      <group ref={reg('body')} position={[0, 0.28, 0]}>
        <ZBlock name="coinJingleBody" size={[0.56, 0.58, 0.40]} position={[0, 0, 0]} color={pal.body} emissive={0.12} outlineScale={1.09} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleCoinBag" size={[0.26, 0.30, 0.13]} position={[0.20, -0.04, 0.28]} color={pal.coinBag} emissive={0.10} outlineScale={1.05} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleBagCoin" size={[0.15, 0.035, 0.15]} position={[0.20, 0.05, 0.36]} rotation={[Math.PI / 2, 0, 0]} color={pal.coin} emissive={0.30} outlineScale={1.02} flash={hitFlash} chamferSteps={2} />
      </group>
      <group ref={reg('armL')} position={[-0.40, 0.52, 0]} rotation={[-1.15, 0, 0.12]}>
        <ZBlock name="coinJingleArmL" size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]} color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleCoinL" size={[0.16, 0.035, 0.16]} position={[0, -0.58, 0.08]} rotation={[Math.PI / 2, 0, 0]} color={pal.coin} emissive={0.32} outlineScale={1.03} flash={hitFlash} chamferSteps={2} />
      </group>
      <group ref={reg('armR')} position={[0.40, 0.52, 0]} rotation={[-1.15, 0, -0.12]}>
        <ZBlock name="coinJingleArmR" size={[0.20, 0.50, 0.20]} position={[0, -0.25, 0]} color={pal.body} emissive={0.10} outlineScale={1.05} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleCoinR" size={[0.16, 0.035, 0.16]} position={[0, -0.58, 0.08]} rotation={[Math.PI / 2, 0, 0]} color={pal.coin} emissive={0.32} outlineScale={1.03} flash={hitFlash} chamferSteps={2} />
      </group>
      <group ref={reg('legL')} position={[-0.15, 0.00, 0]}>
        <ZBlock name="coinJingleLegL" size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]} color={pal.body} emissive={0.09} outlineScale={1.06} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleFootL" size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} chamferSteps={2} />
      </group>
      <group ref={reg('legR')} position={[0.15, 0.00, 0]}>
        <ZBlock name="coinJingleLegR" size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]} color={pal.body} emissive={0.09} outlineScale={1.06} flash={hitFlash} chamferSteps={2} />
        <ZBlock name="coinJingleFootR" size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={0x1a1a1a} emissive={0.05} outlineScale={1.03} flash={hitFlash} chamferSteps={2} />
      </group>
    </group>
  )
}

// 신규 일반 좀비 12종 전부가 쓰는 단 하나의 포즈형 박스 컴포넌트.
// 타입별 차이는 POSED_ZOMBIE_RIGS 데이터(비례·포즈·표식 하나)만으로 만든다.
const POSED_ZOMBIE_GROUP_KEYS = ['head', 'body', 'armL', 'armR', 'legL', 'legR']

function PosedBoxZombieMesh({ type, hitFlash, reg }) {
  const rig = POSED_ZOMBIE_RIGS[type]
  const pal = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01
  const parts = buildPosedZombieParts(type)
  const colorOf = (role) => (
    role === 'eye' ? pal.eye
      : role === 'skin' ? pal.skin
        : role === 'foot' ? ZOMBIE_SHOE_COLOR
          : role === 'mark' ? (pal.mark ?? pal.skin)
            : pal.body
  )

  return (
    <group name={`posedBoxZombie${type}`}>
      {POSED_ZOMBIE_GROUP_KEYS.map((key) => (
        <group key={key} ref={reg(key)} position={rig[key].pivot} rotation={rig[key].rot}>
          {parts.map((part, index) => part.key !== key ? null : (
            <ZBlock
              key={index}
              name={`${type}-part-${index}`}
              size={part.size}
              boxScale={part.box}
              position={part.offset}
              color={colorOf(part.role)}
              emissive={POSED_ZOMBIE_PART_EMISSIVE[index]}
              outlineScale={part.outline}
              flash={hitFlash}
            />
          ))}
        </group>
      ))}
    </group>
  )
}

function OutlineBlock({ size, position, rotation, scale = 1.08 }) {
  const geo = getCachedChamferedBoxGeo(...size, ZOMBIE_CHARACTER_CHAMFER_STEPS)
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
export default function ZombieMesh({ type = 'E01', animPhase = 'normal', hitFlash = false, isMatilda = false, staticPose = false, titleRunPose = false, bossFaceRecipe }) {
  const p    = useRef({})
  const pal  = ZOMBIE_PALETTE[type] ?? ZOMBIE_PALETTE.E01
  // 포즈형 12종은 공유 보행 애니메이션을 그대로 쓰되, 각 파츠의 휴지 포즈를 0이 아니라
  // 리그 값으로 수렴시킨다. 그렇지 않으면 정체성인 포즈가 매 프레임 0으로 지워진다.
  const posedRig = POSED_ZOMBIE_RIGS[type] ?? null
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
    const restHeadX = posedRig ? posedRig.head.rot[0] : 0
    const restHeadZ = posedRig ? posedRig.head.rot[2] : 0
    const restBodyZ = posedRig ? posedRig.body.rot[2] : 0
    const restArmLZ = posedRig ? posedRig.armL.rot[2] : 0
    const restArmRZ = posedRig ? posedRig.armR.rot[2] : 0
    const restLegLX = posedRig ? posedRig.legL.rot[0] : 0
    const restLegRX = posedRig ? posedRig.legR.rot[0] : 0
    const bodyTiltX = (animPhase === 'charge' ? 0.45 : 0) + (posedRig ? posedRig.body.rot[0] : 0)
    const titleB03Charge = titleRunPose && type === 'B03' && animPhase === 'charge'
    const b03ChargeTorsoLift = titleB03Charge
      ? Math.sin(bodyTiltX) * 0.23
      : 0
    const b03TitleShortsLift = titleB03Charge ? 0.50 : 0
    const b03TitleLegLift = titleB03Charge ? 0.12 : 0
    const b03TitleLegSpread = titleB03Charge ? 0.04 : 0
    if (pt.body) pt.body.position.y = composeStudioPartPosition(pt.body, 'y', 0.28, b03ChargeTorsoLift)
    if (pt.shorts) pt.shorts.position.y = composeStudioPartPosition(pt.shorts, 'y', -0.17, b03TitleShortsLift)
    if (pt.legL) {
      pt.legL.position.y = composeStudioPartPosition(pt.legL, 'y', 0, b03TitleLegLift)
      pt.legL.position.x = composeStudioPartPosition(pt.legL, 'x', -0.19, -b03TitleLegSpread)
    }
    if (pt.legR) {
      pt.legR.position.y = composeStudioPartPosition(pt.legR, 'y', 0, b03TitleLegLift)
      pt.legR.position.x = composeStudioPartPosition(pt.legR, 'x', 0.19, b03TitleLegSpread)
    }

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
    if (pt.body) {
      a.bodyRotX += (bodyTiltX - a.bodyRotX) * Math.min(1, delta * 12)
      pt.body.rotation.x = composeZombieRotation(pt.body, 'x', a.bodyRotX)
      a.bodyRotZ += (restBodyZ - a.bodyRotZ) * Math.min(1, delta * 8)
      pt.body.rotation.z = composeZombieRotation(pt.body, 'z', a.bodyRotZ)
    }
    if (pt.head) {
      a.headRotX += (restHeadX - a.headRotX) * Math.min(1, delta * 8)
      pt.head.rotation.x = composeZombieRotation(pt.head, 'x', a.headRotX)
    }
    a.armLRotY += (0 - a.armLRotY) * Math.min(1, delta * 6)
    pt.armL.rotation.y = composeZombieRotation(pt.armL, 'y', a.armLRotY)
    a.armRRotY += (0 - a.armRRotY) * Math.min(1, delta * 6)
    pt.armR.rotation.y = composeZombieRotation(pt.armR, 'y', a.armRRotY)
    a.armLRotZ += (restArmLZ - a.armLRotZ) * Math.min(1, delta * 6)
    pt.armL.rotation.z = composeZombieRotation(pt.armL, 'z', a.armLRotZ)
    a.armRRotZ += (restArmRZ - a.armRRotZ) * Math.min(1, delta * 6)
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
    if (type === 'RZL' || type === 'RZC' || type === 'RZT' || type === 'RZG') {
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
    const amp  = type === 'B02'
      ? (animPhase === 'charge' ? 0.46 : 0.30)
      : (titleRunPose && type === 'B03' && animPhase === 'charge' ? 0.30 : (animPhase === 'charge' ? 0.55 : 0.38))
    const sw   = Math.sin(t * freq) * amp
    a.legLRotX = restLegLX + sw
    pt.legL.rotation.x = composeZombieRotation(pt.legL, 'x', a.legLRotX)
    a.legRRotX = restLegRX - sw
    pt.legR.rotation.x = composeZombieRotation(pt.legR, 'x', a.legRRotX)

    // 좀비 팔: 항상 앞으로 뻗은 상태에서 소폭 흔들림
    const armBase = type === 'B02' ? -1.05 : -1.15
    const armAmp = type === 'B02' ? 0.045 : 0.06
    const armBaseL = posedRig ? posedRig.armL.rot[0] : armBase
    const armBaseR = posedRig ? posedRig.armR.rot[0] : armBase
    pt.armL.rotation.x = composeZombieRotation(pt.armL, 'x', armBaseL + Math.sin(t * 2.8) * armAmp)
    pt.armR.rotation.x = composeZombieRotation(pt.armR, 'x', armBaseR + Math.sin(t * 2.8 + Math.PI) * armAmp)

    // 머리 흔들림
    if (pt.head) pt.head.rotation.z = composeZombieRotation(pt.head, 'z', restHeadZ + Math.sin(t * 1.6) * (type === 'B02' ? 0.045 : 0.07))
  })

  if (!isMatilda && getExpansionVisual(type)) {
    return <ExpansionZombieMesh type={type} animPhase={animPhase} hitFlash={hitFlash} staticPose={staticPose} />
  }

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

  // E07 웃는얼굴 좀비: 셰이더로 얼굴을 직접 그리는 실험 모델을 그대로 실전 투입한다.
  // 스튜디오 아이템 id도 동일(zombie-procedural-face-test)이라 스튜디오 튜닝이 그대로 먹는다.
  if (type === 'E07') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('E07')}>
        <ProceduralFaceTestZombie />
      </StudioTunedGroup>
    )
  }

  if (type === 'E08') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId('E08')}>
        <CoinJingleZombieMesh hitFlash={hitFlash} reg={reg} />
      </StudioTunedGroup>
    )
  }

  if (type === 'RZT' || type === 'RZG') {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
        <Stage2GuardChaseZombieMesh type={type} hitFlash={hitFlash} reg={reg} />
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

  // 신규 일반 좀비 12종(E34-E45). 전용 컴포넌트 12개가 아니라 리그 데이터로 구동되는
  // 포즈형 박스 가족 하나를 공유한다.
  if (posedRig) {
    return (
      <StudioTunedGroup itemId={getStudioZombieItemId(type)}>
        <PosedBoxZombieMesh type={type} hitFlash={hitFlash} reg={reg} />
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
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={ZOMBIE_SHOE_COLOR} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>

      {/* ── 오른다리 (힙 pivot, 신발 포함) ── */}
      <group ref={reg('legR')} position={[ 0.15, 0.00, 0]}>
        <ZBlock size={[0.22, 0.52, 0.26]} position={[0, -0.26, 0]}   color={pal.body} emissive={0.10} outlineScale={1.06} flash={hitFlash} />
        <ZBlock size={[0.24, 0.12, 0.34]} position={[0, -0.57, 0.05]} color={ZOMBIE_SHOE_COLOR} emissive={0.05} outlineScale={1.03} flash={hitFlash} />
      </group>
      </group>
    </StudioTunedGroup>
  )
}
