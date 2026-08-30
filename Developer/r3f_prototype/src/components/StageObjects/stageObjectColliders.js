import * as THREE from 'three'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { STAGE_PROP_PLACEMENTS_EVENT } from '../../lib/stagePropPlacements.js'

export const BLOCKING_STAGE_OBJECT_TYPES = new Set([
  'classroomChair',
  'classroomDesk',
  'corridorLockerBank',
  'corridorJanitorCart',
  'corridorLostFoundBoard',
  'basketballHoop',
  'basketballBallCart',
  'basketballCluster',
  'gymBench',
  'gymTrainingCones',
  'gymMats',
  'gymScoreboard',
  'gymBanner',
  'gymExitDoor',
  'gymEquipmentSpill',
  // stage4 급식실 대형 가구 8종. kitchenClutter(바닥 잡동사니)는 의도적으로 제외한다 —
  // getStageObjectSightObstacles()가 blocking 플래그를 무시하고 이 집합만 보기 때문에,
  // 여기 넣으면 바닥 냄비·봉지가 E04 원거리 투사체의 시야를 끊는다(스4 시그니처 훼손).
  'kitchenPrepTable',
  'kitchenCookLine',
  'kitchenSinkCounter',
  'kitchenRefrigerator',
  'kitchenTrayRack',
  'kitchenShelfCart',
  'kitchenTrashBins',
  'kitchenCrateStack',
  'pressureCauldron',
])

const DESK_COLLIDER_PARTS = [
  { key: 'desk-footprint', position: [0, 0.42, 0], size: [1.76, 0.84, 1.04] },
]

const CHAIR_COLLIDER_PARTS = [
  { key: 'chair-seat-footprint', position: [0, 0.38, 0], size: [1.02, 0.76, 0.9] },
  { key: 'chair-back-footprint', position: [0, 0.44, -0.36], size: [1.02, 0.88, 0.16] },
]

const CORRIDOR_LOCKER_COLLIDER_PARTS = [
  { key: 'locker-footprint', position: [0, 0.78, 0], size: [1.34, 1.56, 0.54] },
]

const CORRIDOR_CART_COLLIDER_PARTS = [
  { key: 'cart-footprint', position: [0, 0.42, 0], size: [1.1, 0.84, 0.58] },
]

const CORRIDOR_LOST_FOUND_COLLIDER_PARTS = [
  { key: 'lost-found-footprint', position: [0, 0.78, 0], size: [1.34, 1.56, 0.18] },
]

const BASKETBALL_HOOP_COLLIDER_PARTS = [
  { key: 'hoop-wood-base', position: [0, 0.06, 0], size: [1.72, 0.12, 1.02] },
  { key: 'hoop-blue-base', position: [0, 0.38, 0], size: [0.72, 0.62, 0.52] },
  { key: 'hoop-post', position: [0, 1.26, -0.18], size: [0.20, 1.28, 0.20] },
  { key: 'hoop-support-arm', position: [0, 1.86, 0.04], size: [0.92, 0.16, 0.18] },
  { key: 'hoop-backboard', position: [0, 2.32, 0.4], size: [1.72, 1.08, 0.12] },
  { key: 'hoop-rim', position: [0, 1.94, 0.98], size: [0.9, 0.18, 0.56] },
]

const BASKETBALL_CART_COLLIDER_PARTS = [
  { key: 'ball-cart-frame', position: [0, 0.58, 0], size: [1.55, 1.04, 0.95] },
  { key: 'ball-cart-basket', position: [0, 0.82, 0], size: [1.28, 0.58, 0.74] },
  { key: 'ball-cart-wheel-left', position: [-0.58, 0.12, 0.34], size: [0.24, 0.24, 0.18] },
  { key: 'ball-cart-wheel-right', position: [0.58, 0.12, -0.34], size: [0.24, 0.24, 0.18] },
]

const BASKETBALL_CLUSTER_COLLIDER_PARTS = [
  { key: 'basketball-0', position: [-0.62, 0.19, -0.22], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-1', position: [-0.18, 0.19, 0.24], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-2', position: [0.26, 0.19, -0.18], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-3', position: [0.68, 0.19, 0.18], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-4', position: [0.05, 0.19, 0.66], size: [0.36, 0.36, 0.36] },
  { key: 'basketball-5', position: [-0.74, 0.19, 0.52], size: [0.36, 0.36, 0.36] },
]

const GYM_BENCH_COLLIDER_PARTS = [
  { key: 'gym-bench-seat', position: [0, 0.58, 0], size: [2.35, 0.18, 0.42] },
  { key: 'gym-bench-left-leg', position: [-0.82, 0.28, 0], size: [0.18, 0.56, 0.52] },
  { key: 'gym-bench-right-leg', position: [0.82, 0.28, 0], size: [0.18, 0.56, 0.52] },
]

const GYM_TRAINING_CONES_COLLIDER_PARTS = [
  { key: 'gym-cone-0', position: [-0.78, 0.18, -0.44], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-1', position: [-0.34, 0.18, 0.16], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-2', position: [0.12, 0.18, -0.28], size: [0.34, 0.36, 0.34] },
  { key: 'gym-cone-3', position: [0.56, 0.18, 0.32], size: [0.34, 0.36, 0.34] },
]

const GYM_MATS_COLLIDER_PARTS = [
  { key: 'gym-mats-stack', position: [0, 0.4, 0], size: [1.65, 0.68, 1.05] },
]

const GYM_SCOREBOARD_COLLIDER_PARTS = [
  // The visible panel is wall-mounted, but the gameplay blocker needs a low
  // mounting footprint so the player collider cannot pass through its base.
  { key: 'gym-scoreboard-mount', position: [0, 0.32, 0.08], size: [2.72, 0.64, 0.2] },
  { key: 'gym-scoreboard-panel', position: [0, 1.15, 0.08], size: [2.72, 1.34, 0.2] },
]

const GYM_BANNER_COLLIDER_PARTS = [
  // A low wall-mount footprint keeps the suspended banner a genuine gameplay
  // obstacle without changing its visual placement.
  { key: 'gym-banner-mount', position: [0, 0.32, 0], size: [2.45, 0.64, 0.12] },
  { key: 'gym-banner-cloth', position: [0, 1.12, 0], size: [2.45, 0.64, 0.12] },
  { key: 'gym-banner-rope', position: [0, 1.52, 0], size: [2.64, 0.12, 0.12] },
]

const GYM_EXIT_DOOR_COLLIDER_PARTS = [
  { key: 'gym-exit-door-panel', position: [0, 1.0, 0], size: [1.42, 2.0, 0.22] },
  { key: 'gym-exit-door-sign', position: [0, 2.25, 0.06], size: [1.62, 0.36, 0.16] },
]

const GYM_EQUIPMENT_SPILL_COLLIDER_PARTS = [
  { key: 'gym-equipment-cooler', position: [-0.58, 0.26, 0], rotation: [0, 0, Math.PI / 2], size: [0.62, 0.74, 0.52] },
  { key: 'gym-equipment-water', position: [-0.02, 0.04, 0.32], size: [0.82, 0.08, 0.46] },
  { key: 'gym-equipment-box', position: [0.84, 0.24, -0.1], size: [0.64, 0.42, 0.52] },
  { key: 'gym-equipment-whistle', position: [-1.28, 0.08, -0.38], rotation: [0, 0.25, 0], size: [0.32, 0.12, 0.18] },
]

// ── stage4 급식실 콜라이더 ──────────────────────────────────────────────────
// 치수는 KitchenProps.jsx 실측(THREE.Box3.setFromObject) 기준에서 각 축을 소폭
// 안쪽으로 깎은 값이다(시각 모델보다 콜라이더가 튀어나오지 않게).
// COLLIDER_DEFS는 타입당 parts 배열 하나뿐이라 변형별 사이즈를 지원하지 않는다.
// 변형 차이가 있는 타입은 아래 주석에 어느 변형을 기준으로 삼았는지 남긴다.

// 기준: bare/pans/cutting(2.24 x 1.09, 상판 0.90).
// side 변형(1.74 x 0.95)은 좌우로 약 0.21씩 넓게 잡히지만, 벽면 배식 카운터 전용이라
// 중앙 조리대의 커버리지 부족보다 이쪽 과잉이 안전하다.
const KITCHEN_PREP_TABLE_COLLIDER_PARTS = [
  { key: 'kitchen-prep-table-footprint', position: [0, 0.47, 0], size: [2.16, 0.94, 1.02] },
]

// 실측 전체 높이 2.23은 후드까지 포함한 값이다. 후드는 머리 위를 지나므로
// 콜라이더는 하부 캐비닛(상판 0.94)만 잡는다.
const KITCHEN_COOK_LINE_COLLIDER_PARTS = [
  { key: 'kitchen-cook-line-base', position: [0, 0.46, 0], size: [2.66, 0.92, 1.12] },
]

// 실측 1.43은 수전 끝까지다. 몸통(상판 0.88)만 막는다.
const KITCHEN_SINK_COUNTER_COLLIDER_PARTS = [
  { key: 'kitchen-sink-counter-footprint', position: [0, 0.44, 0], size: [2.26, 0.88, 0.94] },
]

// 기준: closed(1.26 x 1.97 x 0.97). open 변형의 문 스윙(1.42 x 1.44)은 콜라이더에서 제외 —
// 열린 문에 플레이어가 걸리는 편이 문을 통과하는 것보다 나쁘다.
const KITCHEN_REFRIGERATOR_COLLIDER_PARTS = [
  { key: 'kitchen-refrigerator-body', position: [0, 0.96, 0], size: [1.20, 1.92, 0.92] },
]

const KITCHEN_TRAY_RACK_COLLIDER_PARTS = [
  { key: 'kitchen-tray-rack-frame', position: [0, 0.84, 0], size: [0.72, 1.68, 0.78] },
]

const KITCHEN_SHELF_CART_COLLIDER_PARTS = [
  { key: 'kitchen-shelf-cart-frame', position: [0, 0.60, 0], size: [1.04, 1.20, 0.52] },
]

// 기준: wheelie(0.70 x 1.06 x 0.71). round(0.68 x 0.87 x 0.66)는 미세하게 넓게 잡힌다.
const KITCHEN_TRASH_BINS_COLLIDER_PARTS = [
  { key: 'kitchen-trash-bin-body', position: [0, 0.51, 0], size: [0.68, 1.02, 0.68] },
]

// 기준: count=3(0.75 x 1.02 x 0.63). count 1~6은 높이만 단당 0.34씩 달라지고
// 풋프린트는 동일하므로 count=3 높이로 고정한다.
const KITCHEN_CRATE_STACK_COLLIDER_PARTS = [
  { key: 'kitchen-crate-stack-footprint', position: [0, 0.49, 0], size: [0.72, 0.98, 0.60] },
]

const PRESSURE_CAULDRON_COLLIDER_PARTS = [
  { key: 'pressure-cauldron-vessel', position: [0, 0.72, 0], size: [2.752, 1.184, 2.752] },
  { key: 'pressure-cauldron-front-twin-steps', position: [0, 0.112, 1.352], size: [1.184, 0.224, 0.336] },
  { key: 'pressure-cauldron-left-cabinet', position: [-1.384, 0.58, 0.072], size: [0.344, 0.872, 0.504] },
  { key: 'pressure-cauldron-right-auxiliary', position: [1.352, 0.368, -0.064], size: [0.496, 0.552, 0.632] },
  { key: 'pressure-cauldron-handwheel', position: [1.272, 0.472, 0.816], size: [0.336, 0.472, 0.368] },
]

const COLLIDER_DEFS = {
  classroomChair: {
    variants: CLASSROOM_CHAIR_VARIANTS,
    parts: CHAIR_COLLIDER_PARTS,
  },
  classroomDesk: {
    variants: CLASSROOM_DESK_VARIANTS,
    parts: DESK_COLLIDER_PARTS,
  },
  corridorLockerBank: { parts: CORRIDOR_LOCKER_COLLIDER_PARTS },
  corridorJanitorCart: { parts: CORRIDOR_CART_COLLIDER_PARTS },
  corridorLostFoundBoard: { parts: CORRIDOR_LOST_FOUND_COLLIDER_PARTS },
  basketballHoop: { parts: BASKETBALL_HOOP_COLLIDER_PARTS },
  basketballBallCart: { parts: BASKETBALL_CART_COLLIDER_PARTS },
  basketballCluster: { parts: BASKETBALL_CLUSTER_COLLIDER_PARTS },
  gymBench: { parts: GYM_BENCH_COLLIDER_PARTS },
  gymTrainingCones: { parts: GYM_TRAINING_CONES_COLLIDER_PARTS },
  gymMats: { parts: GYM_MATS_COLLIDER_PARTS },
  gymScoreboard: { parts: GYM_SCOREBOARD_COLLIDER_PARTS },
  gymBanner: { parts: GYM_BANNER_COLLIDER_PARTS },
  gymExitDoor: { parts: GYM_EXIT_DOOR_COLLIDER_PARTS },
  gymEquipmentSpill: { parts: GYM_EQUIPMENT_SPILL_COLLIDER_PARTS },
  kitchenPrepTable: { parts: KITCHEN_PREP_TABLE_COLLIDER_PARTS },
  kitchenCookLine: { parts: KITCHEN_COOK_LINE_COLLIDER_PARTS },
  kitchenSinkCounter: { parts: KITCHEN_SINK_COUNTER_COLLIDER_PARTS },
  kitchenRefrigerator: { parts: KITCHEN_REFRIGERATOR_COLLIDER_PARTS },
  kitchenTrayRack: { parts: KITCHEN_TRAY_RACK_COLLIDER_PARTS },
  kitchenShelfCart: { parts: KITCHEN_SHELF_CART_COLLIDER_PARTS },
  kitchenTrashBins: { parts: KITCHEN_TRASH_BINS_COLLIDER_PARTS },
  kitchenCrateStack: { parts: KITCHEN_CRATE_STACK_COLLIDER_PARTS },
  pressureCauldron: { parts: PRESSURE_CAULDRON_COLLIDER_PARTS },
}

const MIN_BLOCKING_HALF_HEIGHT = 0.44
const SIGHT_BLOCK_PADDING = 0.08

function segmentIntersectsAxisAlignedBox(fromX, fromZ, toX, toZ, halfX, halfZ) {
  const dx = toX - fromX
  const dz = toZ - fromZ
  let enter = 0
  let exit = 1

  if (Math.abs(dx) < 1e-8) {
    if (fromX < -halfX || fromX > halfX) return false
  } else {
    const first = (-halfX - fromX) / dx
    const second = (halfX - fromX) / dx
    enter = Math.max(enter, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    if (enter > exit) return false
  }

  if (Math.abs(dz) < 1e-8) return fromZ >= -halfZ && fromZ <= halfZ
  const first = (-halfZ - fromZ) / dz
  const second = (halfZ - fromZ) / dz
  enter = Math.max(enter, Math.min(first, second))
  exit = Math.min(exit, Math.max(first, second))
  if (enter > exit) return false
  return true
}

// 월드 델타를 장애물 로컬 프레임으로 되돌리는 계수. Three.js의 yaw θ는 로컬 +X를
// 월드 (cosθ, 0, -sinθ)로 보내므로 역변환은
//   localX =  dx*cosY - dz*sinY
//   localZ =  dx*sinY + dz*cosY
// 이다. cosY/sinY는 장애물 생성 시 한 번만 계산해 얼려 두고(getStageObjectSightObstacles),
// 여기서는 읽기만 한다. 직접 만든 장애물 리터럴을 위해 rotationY 폴백을 남긴다.
export function obstacleCosY(obstacle) {
  if (obstacle.cosY !== undefined) return obstacle.cosY
  return obstacle.rotationY ? Math.cos(obstacle.rotationY) : 1
}

export function obstacleSinY(obstacle) {
  if (obstacle.sinY !== undefined) return obstacle.sinY
  return obstacle.rotationY ? Math.sin(obstacle.rotationY) : 0
}

export function isStageObjectSightBlocked(from, to, obstacles, padding = SIGHT_BLOCK_PADDING) {
  for (const obstacle of obstacles) {
    const cos = obstacleCosY(obstacle)
    const sin = obstacleSinY(obstacle)
    const fromDx = from.x - obstacle.x
    const fromDz = from.z - obstacle.z
    const toDx = to.x - obstacle.x
    const toDz = to.z - obstacle.z
    const fromX = fromDx * cos - fromDz * sin
    const fromZ = fromDx * sin + fromDz * cos
    const toX = toDx * cos - toDz * sin
    const toZ = toDx * sin + toDz * cos
    if (segmentIntersectsAxisAlignedBox(
      fromX,
      fromZ,
      toX,
      toZ,
      obstacle.halfX + padding,
      obstacle.halfZ + padding
    )) return true
  }
  return false
}

export function isStageObjectEnemyTrackingBlocked(from, to, obstacles, padding = SIGHT_BLOCK_PADDING) {
  for (const obstacle of obstacles) {
    // Enemy chase should only be interrupted by the stage2 lost-and-found board,
    // and only when the player/enemy are on opposite sides of that board. Other
    // props still block physics/projectiles, but do not make zombies give up
    // tracking merely because the player brushes against their front face.
    if (obstacle.type !== 'corridorLostFoundBoard') continue
    // 게시판은 얇은 판이고 실제로 yaw가 걸려 있다(스2 분실물 게시판 ≈ 45°).
    // "판의 앞/뒤"는 월드 Z가 아니라 판 로컬 Z이므로 로컬 좌표에서 판정한다.
    const cos = obstacleCosY(obstacle)
    const sin = obstacleSinY(obstacle)
    const fromDx = from.x - obstacle.x
    const fromDz = from.z - obstacle.z
    const toDx = to.x - obstacle.x
    const toDz = to.z - obstacle.z
    const fromX = fromDx * cos - fromDz * sin
    const fromZ = fromDx * sin + fromDz * cos
    const toX = toDx * cos - toDz * sin
    const toZ = toDx * sin + toDz * cos
    const limitZ = obstacle.halfZ + padding
    const limitX = obstacle.halfX + padding
    const fromBeyondZ = fromZ < -limitZ || fromZ > limitZ
    const toBeyondZ = toZ < -limitZ || toZ > limitZ
    const oppositeZ = fromZ * toZ < 0
    const crossesBoardWidth = Math.abs(fromX) <= limitX
      || Math.abs(toX) <= limitX
      || segmentIntersectsAxisAlignedBox(fromX, fromZ, toX, toZ, limitX, limitZ)
    if (fromBeyondZ && toBeyondZ && oppositeZ && crossesBoardWidth) return true
  }
  return false
}

function normalizeRotation(rotation = [0, 0, 0]) {
  return Array.isArray(rotation) ? rotation : [0, rotation, 0]
}

function normalizeScale(scale = 1) {
  return Array.isArray(scale) ? scale : [scale, scale, scale]
}

function multiplyPosition(position, scale) {
  return position.map((value, index) => value * scale[index])
}

function multiplyHalfExtents(size, scale, type) {
  return size.map((value, index) => {
    const halfExtent = (value * scale[index]) / 2
    return index === 1 && type !== 'pressureCauldron'
      ? Math.max(MIN_BLOCKING_HALF_HEIGHT, halfExtent)
      : halfExtent
  })
}

function transformLocalPosition(position, modelPosition, modelRotation) {
  const vector = new THREE.Vector3(...position)
  vector.applyEuler(new THREE.Euler(...modelRotation))
  vector.add(new THREE.Vector3(...modelPosition))
  return vector.toArray()
}

function combineRotations(modelRotation, partRotation = [0, 0, 0]) {
  const modelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...modelRotation))
  const partQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...partRotation))
  const combined = modelQuat.multiply(partQuat)
  return new THREE.Euler().setFromQuaternion(combined).toArray().slice(0, 3)
}

export function getStageObjectColliderParts(placement = {}) {
  const def = COLLIDER_DEFS[placement.type]
  if (!def) return []

  const variantName = placement.props?.variant ?? 'upright'
  const variant = def.variants?.[variantName] ?? def.variants?.upright ?? {}
  const placementScale = normalizeScale(placement.scale)

  return def.parts.map(({ key, position, rotation = [0, 0, 0], size }) => {
    const modelPosition = variant.modelPosition ?? [0, 0, 0]
    const modelRotation = variant.modelRotation ?? [0, 0, 0]

    return {
      key,
      args: multiplyHalfExtents(size, placementScale, placement.type),
      position: multiplyPosition(
        transformLocalPosition(position, modelPosition, modelRotation),
        placementScale
      ),
      rotation: combineRotations(modelRotation, rotation),
    }
  })
}

// A single horizontal AABB for interaction systems.  It deliberately uses the
// same scaled/variant-aware collider parts that Rapier receives, so contact
// prompts cannot drift from physical prop footprints.
export function getStageObjectFootprint(placement = {}) {
  const parts = getStageObjectColliderParts(placement)
  if (parts.length === 0) return null

  const rootPosition = new THREE.Vector3(...placement.position)
  const rootRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...normalizeRotation(placement.rotation))
  )
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }

  for (const part of parts) {
    const center = new THREE.Vector3(...part.position).applyQuaternion(rootRotation).add(rootPosition)
    const rotation = rootRotation.clone().multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation))
    )
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements
    const [halfX, halfY, halfZ] = part.args
    const worldHalfX = Math.abs(matrix[0]) * halfX + Math.abs(matrix[4]) * halfY + Math.abs(matrix[8]) * halfZ
    const worldHalfZ = Math.abs(matrix[2]) * halfX + Math.abs(matrix[6]) * halfY + Math.abs(matrix[10]) * halfZ

    bounds.minX = Math.min(bounds.minX, center.x - worldHalfX)
    bounds.maxX = Math.max(bounds.maxX, center.x + worldHalfX)
    bounds.minZ = Math.min(bounds.minZ, center.z - worldHalfZ)
    bounds.maxZ = Math.max(bounds.maxZ, center.z + worldHalfZ)
  }

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
    halfX: (bounds.maxX - bounds.minX) / 2,
    halfZ: (bounds.maxZ - bounds.minZ) / 2,
  }
}

export function getStageObjectColliders(stageId = 'stage1') {
  return getStageObjectPlacements(stageId)
    .filter(({ type, blocking }) => BLOCKING_STAGE_OBJECT_TYPES.has(type) && (stageId === 'stage3' || blocking !== false))
    .map((placement) => ({
      id: `${placement.id}-collider`,
      position: placement.position,
      rotation: normalizeRotation(placement.rotation),
      parts: getStageObjectColliderParts(placement),
    }))
}

const YAW_EPSILON = 1e-6

// 회전 프랍을 월드 AABB로 접으면 좀비는 플레이어보다 큰 상자에 막힌다.
// 플레이어 쪽 Rapier 콜라이더(StageObjectColliderLayer.jsx)는 part.rotation을 그대로
// 넘긴 진짜 회전 OBB이므로, AABB−OBB 차이인 네 모서리가 "플레이어만 들어가고 좀비는
// 원리적으로 못 오는" 무적 지대가 된다. 45° 회전에서 최대이고 좌표를 옮겨도 사라지지
// 않는다. 그래서 시야·이동 장애물도 같은 OBB(yaw + 로컬 반치수)로 내보낸다.
function horizontalObb(matrix, halfX, halfY, halfZ) {
  // 로컬 X/Z 축의 수평 성분 중 긴 쪽에서 yaw를 뽑는다. 파트가 Z축으로 90° 누운 경우
  // (gym-equipment-cooler)는 로컬 X가 수직이라 X만 보면 yaw가 통째로 틀어진다.
  const axisXHorizontalSq = matrix[0] * matrix[0] + matrix[2] * matrix[2]
  const axisZHorizontalSq = matrix[8] * matrix[8] + matrix[10] * matrix[10]
  let rotationY = axisZHorizontalSq >= axisXHorizontalSq
    ? Math.atan2(matrix[8], matrix[10])
    : Math.atan2(-matrix[2], matrix[0])
  if (Math.abs(rotationY) < YAW_EPSILON) rotationY = 0
  const cos = rotationY === 0 ? 1 : Math.cos(rotationY)
  const sin = rotationY === 0 ? 0 : Math.sin(rotationY)
  // yaw 프레임 축의 월드 방향: X' = (cos, 0, -sin), Z' = (sin, 0, cos).
  // 박스의 support = Σ half_i * |axis_i · 방향|. 순수 yaw면 정확히 (halfX, halfZ)로 돌아온다.
  return {
    rotationY,
    cos,
    sin,
    halfX: Math.abs(matrix[0] * cos - matrix[2] * sin) * halfX
      + Math.abs(matrix[4] * cos - matrix[6] * sin) * halfY
      + Math.abs(matrix[8] * cos - matrix[10] * sin) * halfZ,
    halfZ: Math.abs(matrix[0] * sin + matrix[2] * cos) * halfX
      + Math.abs(matrix[4] * sin + matrix[6] * cos) * halfY
      + Math.abs(matrix[8] * sin + matrix[10] * cos) * halfZ,
  }
}

const sightObstacleCache = new Map()

// 스튜디오 프랍 배치 오버라이드가 바뀌면 시야 장애물 캐시를 무효화한다.
if (typeof window !== 'undefined') {
  window.addEventListener(STAGE_PROP_PLACEMENTS_EVENT, () => sightObstacleCache.clear())
}

export function getStageObjectSightObstacles(stageId = 'stage1') {
  const cached = sightObstacleCache.get(stageId)
  if (cached) return cached

  const obstacles = getStageObjectPlacements(stageId)
    .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    .flatMap((placement) => {
      const rootPosition = new THREE.Vector3(...placement.position)
      const rootRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...normalizeRotation(placement.rotation)))
      return getStageObjectColliderParts(placement).map((part) => {
      const center = new THREE.Vector3(...part.position).applyQuaternion(rootRotation).add(rootPosition)
      const rotation = rootRotation.clone().multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation))
      )
      const matrix = new THREE.Matrix4().makeRotationFromQuaternion(rotation).elements
      const [halfX, halfY, halfZ] = part.args
      const obb = horizontalObb(matrix, halfX, halfY, halfZ)
      return Object.freeze({
        id: placement.id,
        type: placement.type,
        x: center.x,
        z: center.z,
        halfX: obb.halfX,
        halfZ: obb.halfZ,
        rotationY: obb.rotationY,
        // 핫 패스(collidesEnemyObstacle: 매 프레임 적 수백 × 장애물 수십)에서
        // Math.cos/Math.sin을 부르지 않도록 여기서 한 번만 계산해 얼린다.
        cosY: obb.cos,
        sinY: obb.sin,
      })
      })
    })
  const frozen = Object.freeze(obstacles)
  sightObstacleCache.set(stageId, frozen)
  return frozen
}
