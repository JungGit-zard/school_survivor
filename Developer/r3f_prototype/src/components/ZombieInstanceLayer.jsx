// Fixed-pool renderer for E01-E06 and the running-zombie squad.  It deliberately
// consumes the simulation's typed-array slot as the GPU instance slot: no React
// entity mount, Map insertion order, or local Studio fallback is involved.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.webp'
import { enemyPool, playerPos, screenBounds } from '../lib/refs.js'
import { isExpansionNormalCode } from '../lib/expansionVisuals.js'
import { getFirebaseStudioRuntimeState } from '../lib/studioRuntimeState.js'
import { DEFAULT_STUDIO_TUNING, GRAPHICS_STUDIO_TUNING_EVENT, getStudioZombieItemId, loadStudioTunings, normalizeStudioTuning } from '../lib/graphicsStudioConfig.js'
import { composeStudioPartMultiplier, composeStudioPartOffset, composeStudioPartTransformCache, getStudioOutlineScaleFactor, getStudioTransformProps, hasStudioMaterialTuning, tuneStudioColorInto } from './StudioTunedGroup.jsx'
import { getCachedChamferedBoxGeo, getToonGradient } from '../lib/toon.js'
import { POSED_ZOMBIE_ANIM_BASE_ROTATION, POSED_ZOMBIE_BASE, POSED_ZOMBIE_FIRST_TYPE_CODE, POSED_ZOMBIE_MARK_SLOT, POSED_ZOMBIE_PART_KEYS, POSED_ZOMBIE_PART_OUTLINES, POSED_ZOMBIE_PART_ROLES, POSED_ZOMBIE_TYPES, ZOMBIE_PALETTE, buildPosedZombieParts, buildPosedZombiePartsFromRig, buildPosedZombieStatePose, buildPosedZombieStatePoseFromRig } from './ZombieMesh.jsx'
import { PROJECTILE_ZOMBIE_TYPE_CODES, PROJECTILE_ZOMBIE_TYPE_NAME_SLOTS, projectileZombieFaceId, PROJECTILE_ZOMBIE_MAX_PROPS, PROJECTILE_ZOMBIE_PROP_PARENTS, PROJECTILE_ZOMBIE_PROP_SHAPES, PROJECTILE_ZOMBIE_STATE_POSE_DELTAS, PROJECTILE_ZOMBIE_TYPES, PROJECTILE_ZOMBIE_VISUALS, getProjectileZombieSlotColors, getProjectileZombieTelegraphProgress, projectileZombieStatePhase } from '../lib/projectileZombieVisuals.js'
import { composePooledFaceMatrix, createProjectileZombieFaceMaterial, getFaceAspect } from '../lib/projectileZombieFace.js'
import { ENEMY_RENDER_FAR, POOLED_CHARGE_CUE_PARTS, POOLED_ENEMY_CAPACITY, PROCEDURAL_FACE_ZOMBIE_CAPACITY, isProceduralFaceZombieCandidate, SPAWN_REVEAL_MS, SPAWN_SMOKE_MS, applyPooledZombieStudioPartTunings, fillEnemyHealthBarLayout, fillVisibleChargeCueSlots, getPooledChargeCueY, getPooledEnemyAnimationTime, getPooledEnemyRenderTier, getSpawnSmokeOpacity, pooledZombiePartSlotsForNumericPath, setSlotOpacity, shouldRenderPooledEnemyPart, updateHealthVisualState } from './PooledEnemyVisuals.js'

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const m = new THREE.Matrix4(); const a = new THREE.Matrix4(); const e = new THREE.Euler('XYZ')
const p = new THREE.Vector3(); const s = new THREE.Vector3(); const q = new THREE.Quaternion(); const color = new THREE.Color()
const translate = new THREE.Matrix4(); const rotate = new THREE.Matrix4(); const inflate = new THREE.Matrix4(); const shadowRotation = new THREE.Euler(-Math.PI / 2, 0, 0)
const IDENTITY = new THREE.Matrix4()
const parentMats = Array.from({ length: 6 }, () => new THREE.Matrix4())
const cameraRotation = new THREE.Matrix4(); const barBase = new THREE.Matrix4(); const barPart = new THREE.Matrix4()
const tuneBase = new THREE.Color(); const tuneOut = new THREE.Color()
// 미니 체력바·스폰 연기의 Studio 아이템. 보스 체력바(MiniHealthBar)·스튜디오 프리뷰와 같은 id다.
export const HEALTH_BAR_STUDIO_ITEM_ID = 'ui-mini-health-bar'
export const SPAWN_PUFF_STUDIO_ITEM_ID = 'vfx-zombie-spawn-puff'
// 스튜디오 기본 외곽선(#050209, 불투명도 .96) — 인스턴스 외곽선 속성의 기본값이다.
const DEFAULT_OUTLINE_RGBA = (() => { const c = new THREE.Color(DEFAULT_STUDIO_TUNING.outlineColor); return new Float32Array([c.r, c.g, c.b, DEFAULT_STUDIO_TUNING.outlineOpacity]) })()
// 재질 표 한 칸 = 렌더 파트 하나: [r, g, b, 발광, 외곽선 r, g, b, 외곽선 불투명도, 외곽선 굵기 배율]
export const MATERIAL_STRIDE = 9
const OUTLINE = 1
const RUN_TYPES = new Set([7, 8])
const COIN_JINGLE_TYPE = 16
const SCREEN_RUNNER_TYPES = new Set([7, 8, 13, 14])
// typeCode 17-36은 확장팩 전용 레이어(ExpansionZombieInstanceLayer)가 그리므로 이 표에서는
// 빈칸으로 둔다. 신규 일반 좀비 12종은 그 위 37-48에 고정 배정됐다.
const EXPANSION_TYPE_SLOT_COUNT = 20
const TYPE_NAMES = ['', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', '', '', '', '', 'RZT', 'RZG', 'E07', 'E08']
  .concat(new Array(EXPANSION_TYPE_SLOT_COUNT).fill(''))
  .concat(POSED_ZOMBIE_TYPES)
  // 49-63 = 신규 투사체 좀비 15종(E46-E60), 64 예약(빈칸), 65-74 = 2차 10종(E61-E70). lib/projectileZombieVisuals.js가 정본이다.
  .concat(PROJECTILE_ZOMBIE_TYPE_NAME_SLOTS)
// E07(type 15, 웃는얼굴 좀비)의 몸통은 셰이더 얼굴이라 이 박스 인스턴스 파이프라인에
// 들어오지 않는다 — ProceduralFaceZombieLayer가 그린다. 여기서는 파트를 0개만 찍어
// 다른 잡몹과 동일한 그림자·체력바·스폰 연기만 붙인다. 단, 얼굴 레이어 슬롯(16) 밖으로 넘친
// E07은 여기서 STANDARD 툰 박스 몸통(E07 팔레트)으로 그린다 — PooledEnemyVisuals의 분배 규칙.
const NO_INSTANCED_PART_COUNT = 0
const TYPE_ITEM_IDS = TYPE_NAMES.map((type) => type ? getStudioZombieItemId(type) : '')
const TYPE_PALETTES = TYPE_NAMES.map((type) => ZOMBIE_PALETTE[type] || ZOMBIE_PALETTE.E01)

const STANDARD = [
  ['head','skin',[.52,.48,.46],[0,.82,0],[0,0,0],1.08], ['eyeL','eye',[.10,.09,.06],[0,.82,0],[-.12,.04,.24],1], ['eyeR','eye',[.10,.09,.06],[0,.82,0],[.12,.04,.24],1],
  ['body','body',[.56,.58,.40],[0,.28,0],[0,0,0],1.09], ['armL','body',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03],
  ['armR','body',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03], ['legL','body',[.22,.52,.26],[-.15,0,0],[0,-.26,0],1.06], ['footL','foot',[.24,.12,.34],[-.15,0,0],[0,-.57,.05],1.03], ['legR','body',[.22,.52,.26],[.15,0,0],[0,-.26,0],1.06], ['footR','foot',[.24,.12,.34],[.15,0,0],[0,-.57,.05],1.03],
]
// The run squad keeps every readable silhouette element from RunZombieMesh.  Medal
// parts are leader-only; crew matrices are zeroed instead of creating a second tree.
const RUN = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['headband','trim',[.54,.10,.48],[0,.84,0],[0,.11,.01],1.04], ['headbandStripe','stripe',[.54,.035,.49],[0,.84,0],[0,.14,.015],1], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.20,.10,.05],[0,.84,0],[0,-.15,.25],1],
  ['jersey','jersey',[.58,.56,.40],[0,.29,0],[0,0,0],1.08], ['jerseyStripe','stripe',[.62,.055,.42],[0,.29,0],[0,.19,0],1], ['bib','bib',[.22,.18,.035],[0,.29,0],[0,.03,.292],1], ['bibDigits','digit',[.025,.095,.02],[0,.29,0],[0,.03,.316],1],
  ['armL','jersey',[.20,.47,.20],[-.40,.54,0],[0,-.24,0],1.05], ['wristL','trim',[.21,.08,.21],[-.40,.54,0],[0,-.45,0],1.03], ['armR','jersey',[.20,.47,.20],[.40,.54,0],[0,-.24,0],1.05], ['wristR','trim',[.21,.08,.21],[.40,.54,0],[0,-.45,0],1.03], ['shortsL','shorts',[.22,.46,.25],[-.16,0,0],[0,-.23,0],1.05], ['shoeL','shoe',[.28,.13,.38],[-.16,0,0],[0,-.53,.08],1.04], ['soleL','sole',[.30,.045,.40],[-.16,0,0],[0,-.61,.08],1], ['shortsR','shorts',[.22,.46,.25],[.16,0,0],[0,-.23,0],1.05], ['shoeR','shoe',[.28,.13,.38],[.16,0,0],[0,-.53,.08],1.04], ['soleR','sole',[.30,.045,.40],[.16,0,0],[0,-.61,.08],1], ['medal','medal',[.13,.13,.045],[0,.29,0],[0,-.02,.315],1.02,'leader'],
]
// Exact fixed-pool leaves for Stage2GuardChaseZombieMesh. These do not reuse
// the Stage 3 running-crew geometry: the fugitive needs coat/scarf/belt and
// the guard needs cap/brim/vest/badge at the same numeric child paths.
const RZT = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['hair','hair',[.54,.14,.47],[0,.84,0],[0,.17,-.015],1.03], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.18,.10,.05],[0,.84,0],[0,-.16,.25],1],
  ['body','coat',[.58,.68,.42],[0,.28,0],[0,0,0],1.08], ['scarf','scarf',[.60,.075,.44],[0,.28,0],[0,.25,.02],1], ['coatBelt','coatShadow',[.62,.06,.44],[0,.28,0],[0,-.10,.02],1],
  ['armL','coat',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03], ['armR','coat',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03],
  ['legL','pants',[.22,.50,.26],[-.15,0,0],[0,-.25,0],1.05], ['shoeL','shoe',[.26,.12,.36],[-.15,0,0],[0,-.55,.06],1.03], ['legR','pants',[.22,.50,.26],[.15,0,0],[0,-.25,0],1.05], ['shoeR','shoe',[.26,.12,.36],[.15,0,0],[0,-.55,.06],1.03],
]
const RZG = [
  ['head','skin',[.52,.48,.46],[0,.84,0],[0,0,0],1.08], ['cap','cap',[.56,.12,.50],[0,.84,0],[0,.18,0],1.03], ['capBrim','cap',[.34,.055,.18],[0,.84,0],[0,.13,.28],1], ['eyeL','eye',[.11,.10,.05],[0,.84,0],[-.12,.015,.25],1], ['eyeR','eye',[.11,.10,.05],[0,.84,0],[.12,.015,.25],1], ['mouth','mouth',[.22,.075,.05],[0,.84,0],[0,-.15,.25],1],
  ['body','uniform',[.58,.58,.42],[0,.28,0],[0,0,0],1.08], ['vest','vest',[.61,.48,.055],[0,.28,0],[0,.01,.24],1], ['badge','badge',[.10,.13,.05],[0,.28,0],[-.14,.12,.285],1],
  ['armL','uniform',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05], ['handL','skin',[.18,.16,.18],[-.40,.52,0],[0,-.55,0],1.03], ['armR','uniform',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05], ['handR','skin',[.18,.16,.18],[.40,.52,0],[0,-.55,0],1.03],
  ['legL','pants',[.22,.50,.26],[-.15,0,0],[0,-.25,0],1.05], ['shoeL','shoe',[.26,.12,.36],[-.15,0,0],[0,-.55,.06],1.03], ['legR','pants',[.22,.50,.26],[.15,0,0],[0,-.25,0],1.05], ['shoeR','shoe',[.26,.12,.36],[.15,0,0],[0,-.55,.06],1.03],
]
const COIN_JINGLE = [
  ['head','skin',[.52,.48,.46],[0,.82,0],[0,0,0],1.08,'chamfer2'], ['eyeL','eye',[.10,.09,.06],[0,.82,0],[-.12,.04,.24],1,'chamfer2'], ['eyeR','eye',[.10,.09,.06],[0,.82,0],[.12,.04,.24],1,'chamfer2'], ['foreheadCoin','coin',[.20,.06,.20],[0,.82,0],[0,.26,.04],1.03,'chamfer2'],
  ['body','body',[.56,.58,.40],[0,.28,0],[0,0,0],1.09,'chamfer2'], ['coinBag','coinBag',[.26,.30,.13],[0,.28,0],[.20,-.04,.28],1.05,'chamfer2'], ['bagCoin','coin',[.15,.035,.15],[0,.28,0],[.20,.05,.36],1.02,'chamfer2'],
  ['armL','body',[.20,.50,.20],[-.40,.52,0],[0,-.25,0],1.05,'chamfer2'], ['handCoinL','coin',[.16,.035,.16],[-.40,.52,0],[0,-.58,.08],1.03,'chamfer2'], ['armR','body',[.20,.50,.20],[.40,.52,0],[0,-.25,0],1.05,'chamfer2'], ['handCoinR','coin',[.16,.035,.16],[.40,.52,0],[0,-.58,.08],1.03,'chamfer2'],
  ['legL','body',[.22,.52,.26],[-.15,0,0],[0,-.26,0],1.06,'chamfer2'], ['footL','foot',[.24,.12,.34],[-.15,0,0],[0,-.57,.05],1.03,'chamfer2'], ['legR','body',[.22,.52,.26],[.15,0,0],[0,-.26,0],1.06,'chamfer2'], ['footR','foot',[.24,.12,.34],[.15,0,0],[0,-.57,.05],1.03,'chamfer2'],
]
// 신규 일반 좀비 12종(E34-E45)이 공유하는 단 하나의 파트 슬롯 세트.
// 12개 전용 테이블 대신 13슬롯 한 세트만 늘린다: 베이스 박스 크기가 STANDARD과 같아
// 지오메트리 캐시를 그대로 재사용하고, 타입별 비례는 인스턴스 행렬 끝의 비균등
// 스케일로만 표현하기 때문이다. 13번째 슬롯이 스펙이 허용한 표식 박스 하나다.
const POSED_BASE_SIZES = [
  POSED_ZOMBIE_BASE.head, POSED_ZOMBIE_BASE.eye, POSED_ZOMBIE_BASE.eye, POSED_ZOMBIE_BASE.body,
  POSED_ZOMBIE_BASE.arm, POSED_ZOMBIE_BASE.hand, POSED_ZOMBIE_BASE.arm, POSED_ZOMBIE_BASE.hand,
  POSED_ZOMBIE_BASE.leg, POSED_ZOMBIE_BASE.foot, POSED_ZOMBIE_BASE.leg, POSED_ZOMBIE_BASE.foot,
  POSED_ZOMBIE_BASE.mark,
]
// part[0]은 애니메이션 키(= 부모 피벗)이고, part[3]/part[4]의 피벗·오프셋은 타입별
// 리그 표(POSED_PIVOT/POSED_OFFSET)가 대신하므로 자리값이다.
const POSED = POSED_ZOMBIE_PART_KEYS.map((key, i) => [key, POSED_ZOMBIE_PART_ROLES[i], POSED_BASE_SIZES[i], [0, 0, 0], [0, 0, 0], POSED_ZOMBIE_PART_OUTLINES[i], 'posed'])
const RZT_OFFSET = STANDARD.length + RUN.length
const RZG_OFFSET = RZT_OFFSET + RZT.length
const COIN_JINGLE_OFFSET = RZG_OFFSET + RZG.length
const POSED_SLOT_BASE = COIN_JINGLE_OFFSET + COIN_JINGLE.length
const ALL_PARTS = STANDARD.concat(RUN, RZT, RZG, COIN_JINGLE, POSED)

// 타입별 파트 행. 12종이 같은 슬롯(= 같은 InstancedMesh)을 쓰면서 피벗·오프셋·포즈·비례만
// 다르게 들고 간다. ZombieMesh의 buildPosedZombieParts 한 표에서 만들어지므로 공유 박스
// 트리(스튜디오·프리뷰)와 고정풀 인스턴스 경로가 같은 수치를 쓴다.
// 행 구조는 기존 테이블과 같고 part[7]=포즈 회전 델타, part[8]=박스 비례만 더 있다.
const POSED_BY_TYPE = POSED_ZOMBIE_TYPES.map((type) => buildPosedZombieParts(type).map((part, i) => [
  part.key, part.role, POSED_BASE_SIZES[i], part.pivot, part.offset, part.outline, 'posed',
  // 공유 보행 애니메이션이 주는 절대 기준 회전에서의 델타만 싣는다.
  part.rot.map((value, axis) => value - POSED_ZOMBIE_ANIM_BASE_ROTATION[part.key][axis]),
  part.box,
]))
// 상태별(예고/타격/회복) 포즈 회전 델타. 타입×상태×13슬롯을 마운트 시 한 번만 만든다.
// 파트 슬롯·카탈로그·스튜디오 입력은 건드리지 않는다 — 회전 델타만 더한다.
const POSED_STATE_POSE_BY_TYPE = POSED_ZOMBIE_TYPES.map((type) => ({
  warn: buildPosedZombieStatePose(type, 'warn'),
  charge: buildPosedZombieStatePose(type, 'charge'),
  stun: buildPosedZombieStatePose(type, 'stun'),
}))
// 1-based. 0이면 포즈형이 아니다.
const POSED_TYPE_INDEX = new Int16Array(TYPE_NAMES.length)
POSED_ZOMBIE_TYPES.forEach((type, typeIndex) => { POSED_TYPE_INDEX[POSED_ZOMBIE_FIRST_TYPE_CODE + typeIndex] = typeIndex + 1 })
// 신규 투사체 15종: POSED 13슬롯(같은 InstancedMesh)을 그대로 공유하고, 눈 2슬롯과 표식 슬롯은
// 끈다(얼굴 셰이더가 눈을 그린다). 소품은 아래 형태 클래스 풀, 얼굴은 얼굴 IM 1개가 맡는다.
// 1-based. 0이면 신규 15종이 아니다.
const PROJ_TYPE_INDEX = new Int16Array(TYPE_NAMES.length)
PROJECTILE_ZOMBIE_TYPES.forEach((type, typeIndex) => { PROJ_TYPE_INDEX[PROJECTILE_ZOMBIE_TYPE_CODES[type]] = typeIndex + 1 })
// 얼굴 셰이더 분기 번호(1..15). 2차 10종은 1차 얼굴을 재사용한다.
const PROJ_FACE_ID = PROJECTILE_ZOMBIE_TYPES.map((_, typeIndex) => projectileZombieFaceId(typeIndex + 1))
const PROJ_BY_TYPE = PROJECTILE_ZOMBIE_TYPES.map((type) => buildPosedZombiePartsFromRig(PROJECTILE_ZOMBIE_VISUALS[type].rig).map((part, i) => [
  part.key, part.role, POSED_BASE_SIZES[i], part.pivot, part.offset, part.outline, 'posed',
  part.rot.map((value, axis) => value - (POSED_ZOMBIE_ANIM_BASE_ROTATION[part.key]?.[axis] ?? 0)),
  part.box,
]))
const PROJ_STATE_POSE_BY_TYPE = PROJECTILE_ZOMBIE_TYPES.map((type) => {
  const rig = PROJECTILE_ZOMBIE_VISUALS[type].rig; const deltas = PROJECTILE_ZOMBIE_STATE_POSE_DELTAS[type]
  return { warn: buildPosedZombieStatePoseFromRig(rig, deltas, 'warn'), charge: buildPosedZombieStatePoseFromRig(rig, deltas, 'charge'), stun: buildPosedZombieStatePoseFromRig(rig, deltas, 'stun') }
})
const PROJ_SLOT_COLORS = PROJECTILE_ZOMBIE_TYPES.map((type) => getProjectileZombieSlotColors(type))
const PROJ_HEAD_BOX = PROJECTILE_ZOMBIE_TYPES.map((type) => PROJECTILE_ZOMBIE_VISUALS[type].rig.head.scale)
const PROJ_FACE_ASPECT = PROJ_HEAD_BOX.map((box) => getFaceAspect(box))
// 소품이 붙는 부모 파트의 첫 슬롯(그 슬롯 행렬이 부모 피벗·회전 프레임이다).
const PROJ_PARENT_SLOT = [0, 3, 4, 6, 8, 10]
const PROJ_SLOT_TO_PARENT = new Int8Array(13).fill(-1); PROJ_PARENT_SLOT.forEach((slot, index) => { PROJ_SLOT_TO_PARENT[slot] = index })
const PROJ_SKIPPED_SLOT = new Uint8Array(13); PROJ_SKIPPED_SLOT[1] = 1; PROJ_SKIPPED_SLOT[2] = 1; PROJ_SKIPPED_SLOT[POSED_ZOMBIE_MARK_SLOT] = 1
// 소품 외곽선 두께(로컬): 축마다 같은 두께가 되도록 축별 배율을 미리 계산한다.
const PROP_OUTLINE_THICKNESS = 0.05
export const PROP_CAPACITY = POOLED_ENEMY_CAPACITY * 2
const PROJ_PROPS = PROJECTILE_ZOMBIE_TYPES.map((type) => PROJECTILE_ZOMBIE_VISUALS[type].props.slice(0, PROJECTILE_ZOMBIE_MAX_PROPS).map((item) => {
  const local = new THREE.Matrix4(); const outline = new THREE.Matrix4()
  const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(item.rot[0], item.rot[1], item.rot[2], 'XYZ'))
  local.makeTranslation(item.offset[0], item.offset[1], item.offset[2]).multiply(rot).multiply(new THREE.Matrix4().makeScale(item.size[0], item.size[1], item.size[2]))
  outline.copy(local).multiply(new THREE.Matrix4().makeScale(...item.size.map((v) => (v + PROP_OUTLINE_THICKNESS) / v)))
  return { shape: PROJECTILE_ZOMBIE_PROP_SHAPES.indexOf(item.shape), parent: PROJECTILE_ZOMBIE_PROP_PARENTS.indexOf(item.parent), local, outline, color: item.color }
}))
function createPropGeometry(shape) {
  if (shape === 'box') return getCachedChamferedBoxGeo(1, 1, 1, 1)
  if (shape === 'cylinder') return new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
  if (shape === 'cone') return new THREE.ConeGeometry(0.5, 1, 10)
  return new THREE.SphereGeometry(0.5, 12, 8)
}
// 컴파일 프리웜(compileAsync는 traverseVisible만 돈다)을 위해 visible은 늘 true, count만 0으로 둔다.
function alwaysVisibleIM(geometry, material, capacity) { const x = new THREE.InstancedMesh(geometry, material, capacity); x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < capacity; i++) x.setMatrixAt(i, ZERO); x.count = 0; x.visible = true; return x }
export function markAlwaysVisibleUpdate(x, count, attributes) { x.count = count; x.visible = true; markInstanceAttributePrefix(x.instanceMatrix, count, 16); if (attributes) for (let i = 0; i < attributes.length; i++) markInstanceAttributePrefix(attributes[i], count, attributes[i].itemSize) }
// 15(E07): 얼굴 슬롯 밖으로 넘쳐 여기서 박스 몸통으로 그려지는 E07도 얼굴 레이어 E07과 같은
// Studio 아이템(zombie-procedural-face-test)의 루트 변환·재질을 받는다. 그 아이템의 파트 경로는
// 박스 몸통 슬롯에 대응하지 않으므로(pooledZombiePartSlotsForNumericPath가 0) 파트 값은 닿지 않는다.
const STUDIO_TUNED_TYPE_CODES = [1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 15].concat(POSED_ZOMBIE_TYPES.map((_, i) => POSED_ZOMBIE_FIRST_TYPE_CODE + i))
const PART_STRIDE = 9
const PART_COUNT = ALL_PARTS.length
const partSlotScratch = new Int16Array(12)
// 스튜디오 하이드레이트 뒤 refresh()도 반드시 이 표에서 시작한다. 0으로 채운 표를 쓰면 튜닝 목록
// (STUDIO_TUNED_TYPE_CODES) 밖의 타입(E08, 투사체 15종 E46-E60)은 파트 스케일 배율이 0이 되어
// 행렬이 전부 0 스케일 = 몸통이 통째로 안 보인다(2026-11-05 실측 회귀).
function createDefaultStudioPartTransforms() {
  const transforms = new Float32Array(TYPE_NAMES.length * PART_COUNT * PART_STRIDE)
  for (let type = 0; type < TYPE_NAMES.length; type += 1) {
    for (let part = 0; part < PART_COUNT; part += 1) {
      const scaleOffset = (type * PART_COUNT + part) * PART_STRIDE + 6
      transforms[scaleOffset] = 1
      transforms[scaleOffset + 1] = 1
      transforms[scaleOffset + 2] = 1
    }
  }
  return transforms
}
// Studio 기본 발광(.14). 스튜디오 프리뷰와 StudioTunedGroup의 applyStudioTuning은 툰 파트마다
// 발광 = 자기 색 × emissiveIntensity를 준다. Studio 아이템이 없는 타입(E08, 투사체 E46-E70)은 0이라
// 예전 모습 그대로다. 같은 InstancedMesh를 여러 타입이 나눠 쓰므로 인스턴스 속성으로 싣는다.
function createDefaultStudioEmissive() {
  const emissive = new Float32Array(TYPE_NAMES.length)
  for (let i = 0; i < STUDIO_TUNED_TYPE_CODES.length; i += 1) emissive[STUDIO_TUNED_TYPE_CODES[i]] = DEFAULT_STUDIO_TUNING.emissiveIntensity
  return emissive
}
// 역할별 팔레트 색. 프레임 루프와 Studio 재질 표가 같은 표를 쓴다.
function pooledPartHex(type, role, pal) {
  const run = type === 7; const fugitive = type === 13; const guard = type === 14
  return role==='mark'?pal.mark:role==='skin'?pal.skin:role==='eye'?pal.eye:role==='foot'?0x1a1a1a:role==='hair'?0x35251c:role==='coat'?0xb48755:role==='scarf'?0xd8b057:role==='coatShadow'?0x76502d:role==='cap'?0x102c4a:role==='uniform'?0x173a5e:role==='vest'?0xe3bf3f:role==='badge'?0xf3d46b:role==='pants'?(fugitive?0x382d29:0x13263b):role==='trim'?(run?0x7d3fc6:0x1880bd):role==='stripe'?0xffffff:role==='jersey'?(run?0x5a2484:0xf0eee4):role==='shorts'?(run?0x22152f:0x1974aa):role==='shoe'?(fugitive?0x171717:guard?0x111317:run?0x6e35b8:0x1771a6):role==='sole'?0xf5f1e8:role==='bib'?0xb48755:role==='digit'?0x151515:role==='mouth'?(fugitive?0x381510:guard?0x35100f:0x151515):role==='medal'?0xf0b62d:pal.body
}
function typeRenderParts(type) {
  const posed = POSED_TYPE_INDEX[type] || 0; const proj = PROJ_TYPE_INDEX[type] || 0
  const parts = type === 13 ? RZT : type === 14 ? RZG : RUN_TYPES.has(type) ? RUN : STANDARD
  return type === COIN_JINGLE_TYPE ? COIN_JINGLE : posed ? POSED_BY_TYPE[posed - 1] : proj ? PROJ_BY_TYPE[proj - 1] : parts
}
function typeSlotBase(type) {
  const posed = POSED_TYPE_INDEX[type] || 0; const proj = PROJ_TYPE_INDEX[type] || 0
  return type === 13 ? RZT_OFFSET : type === 14 ? RZG_OFFSET : type === COIN_JINGLE_TYPE ? COIN_JINGLE_OFFSET : (posed || proj) ? POSED_SLOT_BASE : RUN_TYPES.has(type) ? STANDARD.length : 0
}
const materialSlotScratch = new Int16Array(16)
function writeStudioMaterialSlot(table, j, hex, t) {
  const o = j * MATERIAL_STRIDE
  tuneStudioColorInto(tuneOut, tuneBase.setHex(hex), t)
  table[o] = tuneOut.r; table[o + 1] = tuneOut.g; table[o + 2] = tuneOut.b; table[o + 3] = t.emissiveIntensity
  tuneOut.set(t.outlineColor)
  table[o + 4] = tuneOut.r; table[o + 5] = tuneOut.g; table[o + 6] = tuneOut.b; table[o + 7] = t.outlineOpacity; table[o + 8] = getStudioOutlineScaleFactor(t)
}
// 풀 좀비 한 타입의 Studio 재질 표(렌더 파트마다 MATERIAL_STRIDE칸). 스튜디오가 박스 트리에 하는 일을
// 그대로 따른다: applyStudioTuning(루트)이 모든 파트를 칠하고, applySavedStudioPartTunings가 재질 값을
// 가진 파트/그룹 항목으로 그 파트를 원래 색에서 다시 칠한다(경로 사전순, 같은 경로는 그룹 → 파트 순).
// 파트 경로 → 슬롯은 변환과 같은 pooledZombiePartSlotsForNumericPath를 쓴다. 재질 값이 하나도 없으면
// null — 팔레트 경로와 기본 발광이 그대로 쓰인다.
export function buildPooledStudioMaterialTable(type, itemId, tunings = {}) {
  const root = normalizeStudioTuning(tunings[itemId])
  const groupPrefix = `${itemId}::group::`; const partPrefix = `${itemId}::part::`
  const saved = Object.keys(tunings)
    .filter((key) => key.startsWith(groupPrefix) || key.startsWith(partPrefix))
    .map((key) => {
      const group = key.startsWith(groupPrefix)
      const paths = group ? [...new Set(key.slice(groupPrefix.length).split('+').filter(Boolean))] : [key.slice(partPrefix.length)]
      return { key, group, paths, tuning: normalizeStudioTuning(tunings[key]) }
    })
    .sort((a, b) => (a.group !== b.group ? (a.group ? -1 : 1) : a.key.localeCompare(b.key)))
  const byPath = new Map()
  saved.forEach((entry) => entry.paths.forEach((path) => { if (!byPath.has(path)) byPath.set(path, []); byPath.get(path).push(entry) }))
  const painted = [...byPath.entries()].sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([path, entries]) => entries.filter((entry) => hasStudioMaterialTuning(entry.tuning)).map((entry) => [path, entry.tuning]))
  if (!hasStudioMaterialTuning(root) && !painted.length) return null
  const parts = typeRenderParts(type); const pal = TYPE_PALETTES[type]; const slotBase = typeSlotBase(type)
  const table = new Float32Array(parts.length * MATERIAL_STRIDE)
  for (let j = 0; j < parts.length; j += 1) writeStudioMaterialSlot(table, j, pooledPartHex(type, parts[j][1], pal), root)
  painted.forEach(([path, tuning]) => {
    const count = pooledZombiePartSlotsForNumericPath(type, path, materialSlotScratch)
    for (let n = 0; n < count; n += 1) {
      const j = materialSlotScratch[n] - slotBase
      if (j >= 0 && j < parts.length) writeStudioMaterialSlot(table, j, pooledPartHex(type, parts[j][1], pal), tuning)
    }
  })
  return table
}
// Bubble, tail and block-letter GO! parts from ChargeToonCue.  A fixed 16-slot
// pool bounds its draw cost even when every E05 enters warning together.
const CUE = POOLED_CHARGE_CUE_PARTS

// 상태 코드 정본: 1 CHASE / 2 WARN / 3 CHARGE / 4 STUN / 5 COIN_LURE / 6 COIN_FLEE
// 신규 12종(novelZombieBehavior.js): 7 APPROACH / 8 TELEGRAPH / 9 ATTACK / 10 RECOVER
//                                   11 TELEGRAPH_ALT / 12 ATTACK_ALT / 13 RECOVER_ALT
// 7~13을 빼먹으면 12종의 예고·타격·회복 전 구간이 평시 보행으로 렌더된다(실측: E34가
// 1800프레임 중 702프레임을 예고로 보내는데 전부 평시 포즈였다).
export function phase(pool, i) {
  const state = pool.state[i]
  if (state === 2 || state === 8 || state === 11) return 'warn'
  if (state === 3 || state === 9 || state === 12) return 'charge'
  if (state === 4 || state === 10 || state === 13) return 'stun'
  // 신규 투사체 15종(14~17): lib/projectileZombieVisuals.js의 상태 계약.
  return projectileZombieStatePhase(state) || 'normal'
}
function setPartRotation(dst, key, time, type, state, posed = 0) {
  if (SCREEN_RUNNER_TYPES.has(type)) {
    const stride = Math.sin(time * 13.5); const pump = Math.sin(time * 13.5 + Math.PI)
    const chase = type === 13 || type === 14
    if (key === 'armL') return dst.set((chase ? -1.18 : -1.05) + pump * .5, 0, (chase ? -.20 : -.22) + Math.sin(time * 6.5) * .08)
    if (key === 'armR') return dst.set((chase ? -1.50 : -1.05) - pump * .5, 0, (chase ? .20 : .22) - Math.sin(time * 6.5) * .08)
    if (key === 'shortsL' || key === 'shoeL' || key === 'soleL') return dst.set(stride * .82, 0, 0)
    if (key === 'shortsR' || key === 'shoeR' || key === 'soleR') return dst.set(-stride * .82, 0, 0)
    if (key === 'legL') return dst.set(stride * .82, 0, 0)
    if (key === 'legR') return dst.set(-stride * .82, 0, 0)
    const torso = key === 'jersey' || key === 'body'
    return dst.set(key === 'head' ? -.08 : torso ? .36 : 0, 0, torso ? Math.sin(time * 7.2) * .055 : 0)
  }
  // 포즈형 12종은 예고/회복에서 제자리에 선다(telegraphMove 'hold'/'plant'). 보행 사인을
  // 같이 멈춰야 '제자리 걷기'로 보이지 않는다. 기존 타입(E05/B01)의 warn 거동은 불변.
  const planted = state === 'stun' || (posed > 0 && state === 'warn')
  const walk = planted ? 0 : Math.sin(time * (type === 2 ? 9 : type === 3 ? 5 : 7)) * (state === 'charge' ? .55 : .38)
  if (key === 'legL' || key === 'footL') return dst.set(walk, 0, 0)
  if (key === 'legR' || key === 'footR') return dst.set(-walk, 0, 0)
  if (key === 'armL' || key === 'handL') return dst.set(-1.15 + (planted ? 0 : Math.sin(time * 2.8) * .06), 0, .12)
  if (key === 'armR' || key === 'handR') return dst.set(-1.15 + (planted ? 0 : Math.sin(time * 2.8 + Math.PI) * .06), 0, -.12)
  if (key === 'head') return dst.set(0, 0, planted ? 0 : Math.sin(time * 1.6) * .07)
  return dst.set(state === 'charge' ? .45 : 0, 0, 0)
}
function makeMat(eye = false) { const x = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient(), emissive: 0, emissiveIntensity: eye ? .9 : .12 }); x.stencilWrite = true; x.stencilRef = OUTLINE; x.stencilFunc = THREE.AlwaysStencilFunc; x.stencilZPass = THREE.ReplaceStencilOp; return x }
function makeOutline() { const x = new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide, transparent: true, opacity: .96, depthWrite: false }); x.stencilWrite = true; x.stencilRef = OUTLINE; x.stencilFunc = THREE.NotEqualStencilFunc; return x }
function makeCueMat() { const x = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, toneMapped: false }); return x }
function im(part, material) { const chamferSteps = part[6] === 'chamfer2' ? 2 : 1; const geometry = getCachedChamferedBoxGeo(...part[2], chamferSteps); const x = new THREE.InstancedMesh(geometry, material, POOLED_ENEMY_CAPACITY); x.frustumCulled = false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); x.count=0; x.visible=false; return x }
export function installInstanceAlpha(geometry, material, count) { const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1); geometry.setAttribute('instanceAlpha', alpha); material.onBeforeCompile = (shader) => { shader.vertexShader = `attribute float instanceAlpha; varying float pooledInstanceAlpha;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\npooledInstanceAlpha = instanceAlpha;'); shader.fragmentShader = `varying float pooledInstanceAlpha;\n${shader.fragmentShader}`.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= pooledInstanceAlpha;') }; material.customProgramCacheKey = () => 'pooled-instance-alpha-v1'; return alpha }
// 몸통 발광: 재질 발광은 흰색 × 1로 두고, 셰이더에서 인스턴스 색 × 인스턴스 발광 세기를 곱한다.
// 결과는 스튜디오의 applyStudioTuning(발광 = 튜닝된 색 × emissiveIntensity)과 같다.
export function installInstanceEmissive(geometry, material, count) { const emissive = new THREE.InstancedBufferAttribute(new Float32Array(count), 1); emissive.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute('instanceEmissive', emissive); material.onBeforeCompile = (shader) => { shader.vertexShader = `attribute float instanceEmissive; varying float pooledInstanceEmissive;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\npooledInstanceEmissive = instanceEmissive;'); shader.fragmentShader = `varying float pooledInstanceEmissive;\n${shader.fragmentShader}`.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor;\n#endif\ntotalEmissiveRadiance *= pooledInstanceEmissive;') }; material.customProgramCacheKey = () => 'pooled-zombie-emissive-v1'; return emissive }
// 외곽선 색·불투명도: 재질은 흰색 × 1, 인스턴스 vec4(rgb, a)를 diffuseColor에 곱한다.
export function installInstanceOutline(geometry, material, count) { const outline = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4); outline.setUsage(THREE.DynamicDrawUsage); fillDefaultOutline(outline.array); geometry.setAttribute('instanceOutline', outline); material.onBeforeCompile = (shader) => { shader.vertexShader = `attribute vec4 instanceOutline; varying vec4 pooledInstanceOutline;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\npooledInstanceOutline = instanceOutline;'); shader.fragmentShader = `varying vec4 pooledInstanceOutline;\n${shader.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor *= pooledInstanceOutline;') }; material.customProgramCacheKey = () => 'pooled-zombie-outline-v1'; return outline }
function fillDefaultOutline(array) { for (let i = 0; i < array.length; i += 4) { array[i] = DEFAULT_OUTLINE_RGBA[0]; array[i + 1] = DEFAULT_OUTLINE_RGBA[1]; array[i + 2] = DEFAULT_OUTLINE_RGBA[2]; array[i + 3] = DEFAULT_OUTLINE_RGBA[3] } }
// 인스턴스 속성은 지오메트리에 붙으므로, 다른 메시와 공유하는 캐시 박스를 복사해 메시마다 따로 쓴다.
function bodyIM(part) { const x = im(part, makeMat()); x.material.emissive.setHex(0xffffff); x.material.emissiveIntensity = 1; x.geometry = new THREE.BufferGeometry().copy(x.geometry); x.userData.instanceEmissive = installInstanceEmissive(x.geometry, x.material, POOLED_ENEMY_CAPACITY); x.setColorAt(0, color.setHex(0xffffff)); x.instanceColor.setUsage(THREE.DynamicDrawUsage); return x }
function outlineIM(part) { const x = im(part, makeOutline()); x.material.color.setHex(0xffffff); x.material.opacity = 1; x.geometry = new THREE.BufferGeometry().copy(x.geometry); x.userData.instanceOutline = installInstanceOutline(x.geometry, x.material, POOLED_ENEMY_CAPACITY); return x }
// MiniHealthBar와 같은 계층: 좀비 위치 · Studio 루트 · (0, y, 0) · 카메라 회전 · 바별 x 오프셋 · 크기.
function setBarMatrix(mesh, slot, dx, sx, sy) { barPart.makeScale(sx, sy, 1); barPart.elements[12] = dx; a.multiplyMatrices(barBase, barPart); mesh.setMatrixAt(slot, a) }
function createDefaultStudioSmoke() { return { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(1, 1, 1) } }
function composeStudioRoot(out, transform) { p.set(transform.position[0], transform.position[1], transform.position[2]); e.set(transform.rotation[0], transform.rotation[1], transform.rotation[2]); q.setFromEuler(e); s.set(transform.scale[0], transform.scale[1], transform.scale[2]); return out.compose(p, q, s) }
function plane(material) { const geometry=new THREE.PlaneGeometry(1,1); const x = new THREE.InstancedMesh(geometry,material,POOLED_ENEMY_CAPACITY); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); x.userData.instanceAlpha=installInstanceAlpha(geometry,material,POOLED_ENEMY_CAPACITY); for(let i=0;i<POOLED_ENEMY_CAPACITY;i++) x.setMatrixAt(i,ZERO); x.count=0; x.visible=false; return x }
function cueIM(def, material) { const geometry=def.radius?new THREE.SphereGeometry(def.radius,12,8):new THREE.BoxGeometry(...def.size); const x = new THREE.InstancedMesh(geometry, material, 16); x.frustumCulled=false; x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for(let i=0;i<16;i++)x.setMatrixAt(i,ZERO); x.count=0; x.visible=false; return x }
function clearRanges(attribute) { if (!attribute) return; if (typeof attribute.clearUpdateRanges === 'function') attribute.clearUpdateRanges(); else if (Array.isArray(attribute.updateRanges)) attribute.updateRanges.length = 0 }
export function markInstanceAttributePrefix(attribute, count, itemSize) { clearRanges(attribute); if (!attribute || count <= 0) return false; const safeCount = Math.min(count, attribute.count); attribute.addUpdateRange(0, safeCount * itemSize); attribute.needsUpdate = true; return true }
export function markInstancedMeshPrefixUpdate(x, count, options = {}) { x.visible = count > 0; return { matrix: options.matrix ? markInstanceAttributePrefix(x.instanceMatrix, count, 16) : false, color: options.color ? markInstanceAttributePrefix(x.instanceColor, count, 3) : false, alpha: options.alpha ? markInstanceAttributePrefix(x.userData.instanceAlpha, count, 1) : false } }
export function markInstancedMeshFullUpdate(x, options = {}) { x.visible = x.count > 0; return { matrix: options.matrix ? markInstanceAttributePrefix(x.instanceMatrix, x.instanceMatrix?.count || 0, 16) : false, color: options.color ? markInstanceAttributePrefix(x.instanceColor, x.instanceColor?.count || 0, 3) : false, alpha: options.alpha ? markInstanceAttributePrefix(x.userData.instanceAlpha, x.userData.instanceAlpha?.count || 0, 1) : false } }
function markResetMeshes(meshes, options) { for (let i=0;i<meshes.length;i++) markInstancedMeshFullUpdate(meshes[i], options) }
function markFrameMeshes(meshes, counts, options) { for (let i=0;i<meshes.length;i++) markInstancedMeshPrefixUpdate(meshes[i], counts[i], options) }
function markFrameMeshesUniform(meshes, count, options) { for (let i=0;i<meshes.length;i++) markInstancedMeshPrefixUpdate(meshes[i], count, options) }
function markFrameUserAttribute(meshes, counts, key, itemSize) { for (let i=0;i<meshes.length;i++) markInstanceAttributePrefix(meshes[i].userData[key], counts[i], itemSize) }

export { PART_COUNT, POSED_SLOT_BASE }

// 풀 렌더러가 타입코드마다 고르는 팔레트·파트 세트·슬롯 구간을 한 곳에서 드러낸다.
// 프레임 루프와 같은 선택식을 쓰므로 E01 팔레트 폴백이 조용히 숨지 못한다.
export function resolvePooledZombieVisual(typeCode) {
  const name = TYPE_NAMES[typeCode] || ''
  const posed = POSED_TYPE_INDEX[typeCode] || 0
  const proj = PROJ_TYPE_INDEX[typeCode] || 0
  const renderParts = typeRenderParts(typeCode)
  const slotBase = typeSlotBase(typeCode)
  return {
    name,
    posedIndex: posed,
    itemId: TYPE_ITEM_IDS[typeCode] || '',
    palette: TYPE_PALETTES[typeCode],
    paletteIsE01Fallback: !ZOMBIE_PALETTE[name],
    projectileIndex: proj,
    faceId: proj ? PROJ_FACE_ID[proj - 1] : 0,
    hidesEyeSlots: proj > 0,
    propCount: proj ? PROJ_PROPS[proj - 1].length : 0,
    partCount: typeCode === 15 ? NO_INSTANCED_PART_COUNT : proj ? renderParts.length - 3 : renderParts.length,
    partRoles: renderParts.map((part) => part[1]),
    slotBase,
    markKey: posed ? renderParts[POSED_ZOMBIE_MARK_SLOT][0] : null,
    studioTuned: STUDIO_TUNED_TYPE_CODES.indexOf(typeCode) >= 0,
  }
}

export default function ZombieInstanceLayer({ resetKey }) {
  const { camera } = useThree(); const smokeTexture = useLoader(THREE.TextureLoader, spawnSmokeUrl)
  const studio = useRef({ revision: null, rootMatrices: [], rootScaleX: new Float32Array(TYPE_NAMES.length), rootScaleZ: new Float32Array(TYPE_NAMES.length), supported: new Uint8Array(TYPE_NAMES.length), partTransforms: createDefaultStudioPartTransforms(), material: [], emissive: createDefaultStudioEmissive(), outlineTuned: false, barRoot: new THREE.Matrix4(), smoke: createDefaultStudioSmoke() }); const cueOverflowRef = useRef(0); const cueIndicesRef = useRef(new Int16Array(16))
  const renderTiers = useRef(new Uint8Array(POOLED_ENEMY_CAPACITY))
  const partCounts = useRef(new Int16Array(PART_COUNT))
  const health = useRef({ generation:new Uint16Array(200), lastRatio:new Float32Array(200), trailRatio:new Float32Array(200), flash:new Float32Array(200), ratio:new Float32Array(200), visibleTrailRatio:new Float32Array(200) })
  const healthBarLayout = useRef(new Float32Array(3))
  const propCountsRef = useRef(new Int16Array(PROJECTILE_ZOMBIE_PROP_SHAPES.length))
  const all = useMemo(() => {
    const body = ALL_PARTS.map(bodyIM); const out=ALL_PARTS.map(outlineIM)
    const shadow=plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3,depthTest:true,depthWrite:false}));
    const bars=[plane(new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.88,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xd72832,transparent:true,opacity:.95,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false,depthWrite:false})),plane(new THREE.MeshBasicMaterial({color:0xffd23c,transparent:true,opacity:1,depthTest:false,depthWrite:false}))]
    smokeTexture.colorSpace=THREE.SRGBColorSpace; const smoke=plane(new THREE.MeshBasicMaterial({map:smokeTexture,transparent:true,depthTest:false,depthWrite:false,alphaTest:.01,toneMapped:false}))
    const cue=CUE.map(def=>cueIM(def,makeCueMat()))
    // 신규 투사체 15종 소품: 형태 클래스 4종 × (툰 + 외곽선) = 최대 8 드로콜.
    const propGeometries=PROJECTILE_ZOMBIE_PROP_SHAPES.map(createPropGeometry)
    const propBody=propGeometries.map(g=>alwaysVisibleIM(g,makeMat(false),PROP_CAPACITY)); const propOut=propGeometries.map(g=>alwaysVisibleIM(g,makeOutline(),PROP_CAPACITY))
    for(let i=0;i<propBody.length;i++){propBody[i].setColorAt(0,color.setHex(0xffffff));propBody[i].instanceColor.setUsage(THREE.DynamicDrawUsage)}
    // 얼굴: 분기 셰이더 1개 = 1 드로콜. vec4 aFace(id, time, tele, progress) + vec2 aFaceAux(aspect, flash).
    const faceGeometry=new THREE.PlaneGeometry(1,1); const faceAttr=new THREE.InstancedBufferAttribute(new Float32Array(POOLED_ENEMY_CAPACITY*4),4); const faceAux=new THREE.InstancedBufferAttribute(new Float32Array(POOLED_ENEMY_CAPACITY*2),2); faceAttr.setUsage(THREE.DynamicDrawUsage); faceAux.setUsage(THREE.DynamicDrawUsage); faceGeometry.setAttribute('aFace',faceAttr); faceGeometry.setAttribute('aFaceAux',faceAux)
    const face=alwaysVisibleIM(faceGeometry,createProjectileZombieFaceMaterial(),POOLED_ENEMY_CAPACITY); face.userData.faceAttr=faceAttr; face.userData.faceAux=faceAux
    // Studio 색 튜닝은 처음 색에서 다시 계산한다(applyStudioTuning의 studioBaseColor와 같은 규칙).
    for(let i=0;i<bars.length;i++)bars[i].material.userData.pooledBaseColor=bars[i].material.color.clone()
    smoke.material.userData.pooledBaseColor=smoke.material.color.clone()
    return {body,out,shadow,bars,smoke,cue,propBody,propOut,face}
  }, [smokeTexture])
  useEffect(() => () => {
    const dispose = (mesh) => { mesh.geometry.dispose(); mesh.material.dispose() }
    for (let i=0;i<all.body.length;i++) dispose(all.body[i])
    for (let i=0;i<all.out.length;i++) dispose(all.out[i])
    for (let i=0;i<all.bars.length;i++) dispose(all.bars[i])
    for (let i=0;i<all.cue.length;i++) dispose(all.cue[i])
    dispose(all.shadow); dispose(all.smoke)
    // 박스 소품 지오메트리는 toon.js 공용 캐시라 해제하지 않는다.
    for (let i=0;i<all.propBody.length;i++) { if (PROJECTILE_ZOMBIE_PROP_SHAPES[i] !== 'box') all.propBody[i].geometry.dispose(); all.propBody[i].material.dispose(); all.propOut[i].material.dispose() }
    dispose(all.face)
  }, [all])
  useLayoutEffect(() => {
    // A keyed Physics reset must never show old instance matrices for even one
    // frame.  The meshes themselves stay allocated and are repopulated by the
    // next pool frame, so no GPU buffer is recreated.
    for (let i = 0; i < all.body.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.body[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.out.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.out[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.bars.length; i += 1) for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.bars[i].setMatrixAt(slot, ZERO)
    for (let i = 0; i < all.cue.length; i += 1) for (let slot = 0; slot < 16; slot += 1) all.cue[i].setMatrixAt(slot, ZERO)
    for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) { all.shadow.setMatrixAt(slot, ZERO); all.smoke.setMatrixAt(slot, ZERO) }
    for (let i = 0; i < all.body.length; i += 1) all.body[i].instanceColor?.array.fill(0)
    for (let i = 0; i < all.cue.length; i += 1) all.cue[i].instanceColor?.array.fill(0)
    // Matrix zeroing alone hides the old run, but stale alpha/health trail
    // state can bleed into a recycled slot before its next full visual update.
    health.current.generation.fill(0)
    health.current.lastRatio.fill(0)
    health.current.trailRatio.fill(0)
    health.current.flash.fill(0)
    health.current.ratio.fill(0)
    health.current.visibleTrailRatio.fill(0)
    // The normal bars and blob shadow have no per-frame alpha write.  Restore
    // their steady-state defaults here; only the delayed trail and smoke start
    // transparent until their frame-path explicitly activates them.
    all.bars[0].userData.instanceAlpha.array.fill(1)
    all.bars[1].userData.instanceAlpha.array.fill(1)
    all.bars[2].userData.instanceAlpha.array.fill(0)
    all.bars[3].userData.instanceAlpha.array.fill(1)
    all.smoke.userData.instanceAlpha.array.fill(0)
    renderTiers.current.fill(0)
    partCounts.current.fill(0)
    for (let i = 0; i < all.body.length; i += 1) all.body[i].count = 0
    for (let i = 0; i < all.out.length; i += 1) all.out[i].count = 0
    for (let i = 0; i < all.bars.length; i += 1) all.bars[i].count = 0
    for (let i = 0; i < all.cue.length; i += 1) all.cue[i].count = 0
    all.shadow.count = 0
    all.smoke.count = 0
    for (let i = 0; i < all.propBody.length; i += 1) { for (let slot = 0; slot < PROP_CAPACITY; slot += 1) { all.propBody[i].setMatrixAt(slot, ZERO); all.propOut[i].setMatrixAt(slot, ZERO) } markAlwaysVisibleUpdate(all.propBody[i], 0); markAlwaysVisibleUpdate(all.propOut[i], 0) }
    for (let slot = 0; slot < POOLED_ENEMY_CAPACITY; slot += 1) all.face.setMatrixAt(slot, ZERO)
    all.face.userData.faceAttr.array.fill(0); all.face.userData.faceAux.array.fill(0)
    markAlwaysVisibleUpdate(all.face, 0)
    markResetMeshes(all.body, { matrix: true, color: true }); markResetMeshes(all.out, { matrix: true }); markResetMeshes(all.bars, { matrix: true, alpha: true }); markResetMeshes(all.cue, { matrix: true, color: true }); markInstancedMeshFullUpdate(all.shadow, { matrix: true, alpha: true }); markInstancedMeshFullUpdate(all.smoke, { matrix: true, alpha: true })
  }, [all, resetKey])
  useEffect(() => { const refresh=()=>{ const state=getFirebaseStudioRuntimeState(); if (!state?.datasets || !Number.isInteger(state.revision)) return; const tunings=loadStudioTunings(); const rootMatrices=[]; const rootScaleX=new Float32Array(TYPE_NAMES.length);const rootScaleZ=new Float32Array(TYPE_NAMES.length); const supported=new Uint8Array(TYPE_NAMES.length); const partTransforms=createDefaultStudioPartTransforms(); for(const t of STUDIO_TUNED_TYPE_CODES){const id=TYPE_ITEM_IDS[t];const transform=getStudioTransformProps(tunings[id]);const root=new THREE.Matrix4();p.set(transform.position[0],transform.position[1],transform.position[2]);e.set(transform.rotation[0],transform.rotation[1],transform.rotation[2]);q.setFromEuler(e);s.set(transform.scale[0],transform.scale[1],transform.scale[2]);root.compose(p,q,s);rootMatrices[t]=root;rootScaleX[t]=transform.scale[0];rootScaleZ[t]=transform.scale[2];supported[t]=1;const base=t*PART_COUNT*PART_STRIDE;for(let part=0;part<PART_COUNT;part+=1){partTransforms[base+part*PART_STRIDE+6]=1;partTransforms[base+part*PART_STRIDE+7]=1;partTransforms[base+part*PART_STRIDE+8]=1}applyPooledZombieStudioPartTunings(partTransforms,t,PART_COUNT,id,tunings,getStudioTransformProps,composeStudioPartTransformCache,partSlotScratch)}
    // Studio 재질(색·밝기·채도·색 강도·발광·외곽선 색/불투명도/굵기): 재질 값이 있는 타입만 표를 굽는다.
    const material=[]; const emissive=createDefaultStudioEmissive(); let outlineTuned=false
    for(let n=0;n<STUDIO_TUNED_TYPE_CODES.length;n+=1){const t=STUDIO_TUNED_TYPE_CODES[n];const table=buildPooledStudioMaterialTable(t,TYPE_ITEM_IDS[t],tunings);if(table){material[t]=table;outlineTuned=true}}
    // 튜닝이 사라지면 프레임 루프가 외곽선 속성을 더 쓰지 않으므로 여기서 기본값으로 한 번 되돌린다.
    if(!outlineTuned&&studio.current.outlineTuned)for(let i=0;i<all.out.length;i+=1){fillDefaultOutline(all.out[i].userData.instanceOutline.array);markInstanceAttributePrefix(all.out[i].userData.instanceOutline,POOLED_ENEMY_CAPACITY,4)}
    // 미니 체력바·스폰 연기: 보스 체력바(MiniHealthBar)·스폰 연기와 같은 Studio 아이템의 루트 변환과 색.
    const barTuning=normalizeStudioTuning(tunings[HEALTH_BAR_STUDIO_ITEM_ID]); const barRoot=composeStudioRoot(new THREE.Matrix4(),getStudioTransformProps(barTuning))
    for(let i=0;i<all.bars.length;i+=1){const barMaterial=all.bars[i].material;tuneStudioColorInto(barMaterial.color,barMaterial.userData.pooledBaseColor,barTuning)}
    const smokeTuning=normalizeStudioTuning(tunings[SPAWN_PUFF_STUDIO_ITEM_ID]); const smokeTransform=getStudioTransformProps(smokeTuning); const smoke=createDefaultStudioSmoke(); smoke.position.fromArray(smokeTransform.position); smoke.quaternion.setFromEuler(e.set(smokeTransform.rotation[0],smokeTransform.rotation[1],smokeTransform.rotation[2])); smoke.scale.fromArray(smokeTransform.scale)
    tuneStudioColorInto(all.smoke.material.color,all.smoke.material.userData.pooledBaseColor,smokeTuning)
    studio.current={revision:state.revision,rootMatrices,rootScaleX,rootScaleZ,supported,partTransforms,material,emissive,outlineTuned,barRoot,smoke} }; refresh(); window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh); return()=>window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT,refresh) },[all])
  useFrame((_,delta) => {
    const pool=enemyPool; if (!pool) return; const max=Math.min(199,Number.isInteger(pool.highestActive)?pool.highestActive:199); const tiers=renderTiers.current;const counts=partCounts.current;counts.fill(0)
    let bodyCount=0; let healthCount=0; let smokeCount=0; let faceCount=0; let e07FaceClaims=0; const propCounts=propCountsRef.current; propCounts.fill(0); const faceArr=all.face.userData.faceAttr.array; const auxArr=all.face.userData.faceAux.array
    const outlineTuned=studio.current.outlineTuned; cameraRotation.makeRotationFromQuaternion(camera.quaternion)
    for(let i=0;i<200;i++) {
      const active=i<=max&&pool.active[i]===1; if(!active){tiers[i]=0;continue}
      const timer=pool.spawnTimer[i]; const type=pool.type[i]; if(isExpansionNormalCode(type))continue; const e07FaceDrawn=type===15&&isProceduralFaceZombieCandidate(pool,i,screenBounds)&&++e07FaceClaims<=PROCEDURAL_FACE_ZOMBIE_CAPACITY; const tier=getPooledEnemyRenderTier(screenBounds,pool.posX[i],pool.posZ[i],playerPos.x,playerPos.z,tiers[i]); tiers[i]=tier
      if(!tier)continue
      const bodyVisible=timer>=SPAWN_REVEAL_MS&&((type>=1&&type<=8)||type===13||type===14||type===15||type===COIN_JINGLE_TYPE||POSED_TYPE_INDEX[type]>0||PROJ_TYPE_INDEX[type]>0); const smokeVisible=timer>=0&&timer<SPAWN_SMOKE_MS
      if(bodyVisible){const renderSlot=bodyCount++;const rootMatrix=studio.current.rootMatrices[type]||IDENTITY;const mat=studio.current.material[type];const baseEmissive=studio.current.emissive[type];const scale=(pool.visualScale[i]||1)*.333;const state=phase(pool,i);const time=getPooledEnemyAnimationTime(timer,tier);const pal=TYPE_PALETTES[type];const posed=POSED_TYPE_INDEX[type]||0;const proj=PROJ_TYPE_INDEX[type]||0;const parts=type===13?RZT:type===14?RZG:RUN_TYPES.has(type)?RUN:STANDARD;const renderParts=type===COIN_JINGLE_TYPE?COIN_JINGLE:posed?POSED_BY_TYPE[posed-1]:proj?PROJ_BY_TYPE[proj-1]:parts;const offset=type===13?RZT_OFFSET:type===14?RZG_OFFSET:type===COIN_JINGLE_TYPE?COIN_JINGLE_OFFSET:(posed||proj)?POSED_SLOT_BASE:RUN_TYPES.has(type)?STANDARD.length:0;const partCount=e07FaceDrawn?NO_INSTANCED_PART_COUNT:renderParts.length;const statePose=posed&&state!=='normal'?POSED_STATE_POSE_BY_TYPE[posed-1][state]:proj&&state!=='normal'?PROJ_STATE_POSE_BY_TYPE[proj-1][state]:null;const flashing=pool.hitFlashTimer[i]>0
        const screenRunnerLift=type===13||type===14?scale*.45:0;p.set(pool.posX[i],pool.posY[i]+screenRunnerLift,pool.posZ[i]);e.set(0,pool.yaw[i],0);q.setFromEuler(e);s.set(scale,scale,scale);m.compose(p,q,s);m.multiply(rootMatrix)
        p.set(pool.posX[i],.018,pool.posZ[i]);s.set(Math.max(.05,scale*(studio.current.rootScaleX[type]||1)*.62),Math.max(.05,scale*(studio.current.rootScaleZ[type]||1)*.34),1);q.setFromEuler(shadowRotation);a.compose(p,q,s);all.shadow.setMatrixAt(renderSlot,a)
        for(let j=0;j<partCount;j++){const part=renderParts[j];const slot=offset+j;if((proj&&PROJ_SKIPPED_SLOT[j])||!shouldRenderPooledEnemyPart(type,(posed||proj)?j:slot,tier)||(part[6]==='leader'&&type!==7))continue;const partRenderSlot=counts[slot]++;const partBase=type*PART_COUNT*PART_STRIDE+slot*PART_STRIDE;const pose=part[7];a.copy(m);translate.makeTranslation(composeStudioPartOffset(part[3][0],studio.current.partTransforms[partBase]),composeStudioPartOffset(part[3][1],studio.current.partTransforms[partBase+1]),composeStudioPartOffset(part[3][2],studio.current.partTransforms[partBase+2]));a.multiply(translate);setPartRotation(e,part[0],time,type,state,posed||proj);e.set(composeStudioPartOffset(e.x,studio.current.partTransforms[partBase+3],(pose?pose[0]:0)+(statePose?statePose[j][0]:0)),composeStudioPartOffset(e.y,studio.current.partTransforms[partBase+4],(pose?pose[1]:0)+(statePose?statePose[j][1]:0)),composeStudioPartOffset(e.z,studio.current.partTransforms[partBase+5],(pose?pose[2]:0)+(statePose?statePose[j][2]:0)));rotate.makeRotationFromEuler(e);a.multiply(rotate);inflate.makeScale(composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+6]),composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+7]),composeStudioPartMultiplier(1,studio.current.partTransforms[partBase+8]));a.multiply(inflate);if(proj&&PROJ_SLOT_TO_PARENT[j]>=0)parentMats[PROJ_SLOT_TO_PARENT[j]].copy(a);translate.makeTranslation(part[4][0],part[4][1],part[4][2]);a.multiply(translate);const box=part[8];if(box){inflate.makeScale(box[0],box[1],box[2]);a.multiply(inflate)}all.body[slot].setMatrixAt(partRenderSlot,a);const mo=j*MATERIAL_STRIDE;if(flashing)color.setHex(0xffffff);else if(mat)color.fromArray(mat,mo);else color.setHex(proj?PROJ_SLOT_COLORS[proj-1][j]:pooledPartHex(type,part[1],pal));all.body[slot].setColorAt(partRenderSlot,color);all.body[slot].userData.instanceEmissive.array[partRenderSlot]=mat?mat[mo+3]:baseEmissive;if(outlineTuned){const ol=all.out[slot].userData.instanceOutline.array;const oo=partRenderSlot*4;const src=mat||DEFAULT_OUTLINE_RGBA;const so=mat?mo+4:0;ol[oo]=src[so];ol[oo+1]=src[so+1];ol[oo+2]=src[so+2];ol[oo+3]=src[so+3]}const outlineScale=(1+(part[5]-1)*2)*(mat?mat[mo+8]:1);inflate.makeScale(outlineScale,outlineScale,outlineScale);a.multiply(inflate);all.out[slot].setMatrixAt(partRenderSlot,a)}
        if(proj&&tier!==ENEMY_RENDER_FAR){const props=PROJ_PROPS[proj-1];for(let k=0;k<props.length;k++){const item=props[k];const shape=item.shape;const propSlot=propCounts[shape];if(propSlot>=PROP_CAPACITY)continue;propCounts[shape]=propSlot+1;a.multiplyMatrices(parentMats[item.parent],item.local);all.propBody[shape].setMatrixAt(propSlot,a);color.setHex(flashing?0xffffff:item.color);all.propBody[shape].setColorAt(propSlot,color);a.multiplyMatrices(parentMats[item.parent],item.outline);all.propOut[shape].setMatrixAt(propSlot,a)}
          const faceSlot=faceCount++;composePooledFaceMatrix(a,parentMats[0],PROJ_HEAD_BOX[proj-1]);all.face.setMatrixAt(faceSlot,a);const fo=faceSlot*4;faceArr[fo]=PROJ_FACE_ID[proj-1];faceArr[fo+1]=time%600;faceArr[fo+2]=state==='warn'?1:0;faceArr[fo+3]=getProjectileZombieTelegraphProgress(type,pool.state[i],pool.stateTimer[i]);auxArr[faceSlot*2]=PROJ_FACE_ASPECT[proj-1];auxArr[faceSlot*2+1]=flashing?1:0}
        if(tier!==ENEMY_RENDER_FAR){const healthSlot=healthCount++;const ratio=(pool.maxHp[i]>0?pool.hp[i]/pool.maxHp[i]:1);updateHealthVisualState(health.current,i,pool.generation[i],ratio,delta);const visibleTrailRatio=health.current.visibleTrailRatio[i];const currentRatio=health.current.ratio[i];const flash=health.current.flash[i];const layout=fillEnemyHealthBarLayout(healthBarLayout.current,pool.visualScale[i]);const w=layout[0];const h=layout[1];translate.makeTranslation(pool.posX[i],pool.posY[i],pool.posZ[i]);barBase.multiplyMatrices(translate,studio.current.barRoot);translate.makeTranslation(0,layout[2],0);barBase.multiply(translate).multiply(cameraRotation);setBarMatrix(all.bars[0],healthSlot,0,w+.008,h+.008);setBarMatrix(all.bars[1],healthSlot,0,w,h);setBarMatrix(all.bars[2],healthSlot,-w*(1-visibleTrailRatio)/2,w*visibleTrailRatio,h);setBarMatrix(all.bars[3],healthSlot,-w*(1-currentRatio)/2,w*currentRatio,h);setSlotOpacity(all.bars[2].userData.instanceAlpha,healthSlot,visibleTrailRatio-currentRatio>.006?.18+flash*.82:0)}
      }
      if(smokeVisible){const smokeSlot=smokeCount++;const t=timer/SPAWN_SMOKE_MS;const size=(pool.visualScale[i]||1)*.333*(1.7+(1-(1-t)*(1-t))*(3.1-1.7));const puff=studio.current.smoke;p.set(0,(pool.visualScale[i]||1)*.333*(1+t*.32),0).multiply(puff.scale).applyQuaternion(puff.quaternion).add(puff.position);p.x+=pool.posX[i];p.y+=pool.posY[i];p.z+=pool.posZ[i];q.copy(camera.quaternion);s.set(size*puff.scale.x,size*puff.scale.y,1);a.compose(p,q,s);all.smoke.setMatrixAt(smokeSlot,a);setSlotOpacity(all.smoke.userData.instanceAlpha,smokeSlot,getSpawnSmokeOpacity(timer))}
    }
    const cueIndices=cueIndicesRef.current;cueOverflowRef.current=fillVisibleChargeCueSlots(pool,tiers,cueIndices);let cueCount=0
    for(let ci=0;ci<16;ci++){const enemyIndex=cueIndices[ci];if(enemyIndex<0)continue;const cueSlot=cueCount++;const pulse=1+Math.sin(pool.spawnTimer[enemyIndex]*.012)*.08;p.set(pool.posX[enemyIndex],getPooledChargeCueY(pool.posY[enemyIndex],pool.visualScale[enemyIndex]),pool.posZ[enemyIndex]);q.copy(camera.quaternion);s.set(pulse,pulse,pulse);m.compose(p,q,s);for(let part=0;part<CUE.length;part++){a.copy(m);const cuePart=CUE[part];translate.makeTranslation(cuePart.position[0],cuePart.position[1],cuePart.position[2]);a.multiply(translate);if(cuePart.rotation){e.set(cuePart.rotation[0],cuePart.rotation[1],cuePart.rotation[2]);rotate.makeRotationFromEuler(e);a.multiply(rotate)}all.cue[part].setMatrixAt(cueSlot,a);color.setHex(cuePart.color);all.cue[part].setColorAt(cueSlot,color)}}
    for(let i=0;i<all.body.length;i++){all.body[i].count=counts[i];all.out[i].count=counts[i]}for(let i=0;i<all.bars.length;i++)all.bars[i].count=healthCount;for(let i=0;i<all.cue.length;i++)all.cue[i].count=cueCount;all.shadow.count=bodyCount;all.smoke.count=smokeCount
    for(let i=0;i<all.propBody.length;i++){markAlwaysVisibleUpdate(all.propBody[i],propCounts[i],[all.propBody[i].instanceColor]);markAlwaysVisibleUpdate(all.propOut[i],propCounts[i])}
    markAlwaysVisibleUpdate(all.face,faceCount,[all.face.userData.faceAttr,all.face.userData.faceAux])
    markFrameMeshes(all.body, counts, { matrix: true, color: true }); markFrameUserAttribute(all.body, counts, 'instanceEmissive', 1); markFrameMeshes(all.out, counts, { matrix: true }); if (outlineTuned) markFrameUserAttribute(all.out, counts, 'instanceOutline', 4); markInstancedMeshPrefixUpdate(all.shadow, bodyCount, { matrix: true }); markInstancedMeshPrefixUpdate(all.bars[0], healthCount, { matrix: true }); markInstancedMeshPrefixUpdate(all.bars[1], healthCount, { matrix: true }); markInstancedMeshPrefixUpdate(all.bars[2], healthCount, { matrix: true, alpha: true }); markInstancedMeshPrefixUpdate(all.bars[3], healthCount, { matrix: true }); markInstancedMeshPrefixUpdate(all.smoke, smokeCount, { matrix: true, alpha: true }); markFrameMeshesUniform(all.cue, cueCount, { matrix: true, color: true })
  })
  return <>{<primitive object={all.shadow} renderOrder={1}/>} {ALL_PARTS.map((x,i)=><primitive key={`b${i}`} object={all.body[i]} renderOrder={2}/>)} {ALL_PARTS.map((x,i)=><primitive key={`o${i}`} object={all.out[i]} renderOrder={1}/>)} {all.bars.map((x,i)=><primitive key={`h${i}`} object={all.bars[i]} renderOrder={20+i}/>)} {all.cue.map((x,i)=><primitive key={`cue${i}`} object={all.cue[i]} renderOrder={30}/>)} <primitive object={all.smoke} renderOrder={100}/> {all.propBody.map((x,i)=><primitive key={`pb${i}`} object={x} renderOrder={2}/>)} {all.propOut.map((x,i)=><primitive key={`po${i}`} object={x} renderOrder={1}/>)} <primitive object={all.face} renderOrder={0.5}/></>
}
