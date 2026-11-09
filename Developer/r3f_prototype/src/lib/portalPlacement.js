import * as THREE from 'three'
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

// Player.jsx: axis-aligned, rotation-locked CuboidCollider [0.136, 0.32, 0.136].
// Expand actual transformed collider parts by this footprint, not prop origins.
const PLAYER_HALF_XZ = 0.136
const CONTACT_MARGIN = 0.02
const MAP_INSET = 3
const MIN_DIST_FROM_PLAYER = 5
const MIN_DIST_FROM_OBSTACLE = 2
// 앵커가 있는 스테이지(Stage 5 중앙 현관)의 좌우 대체 후보 간격(u). 2.5u = 0.625블록.
const ANCHOR_SIDE_OFFSET = 2.5

export function getPortalPlacementBounds(stageId) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const movement = getPlayerMovementBounds(stageId)
  return {
    minX: Math.max(-halfX + MAP_INSET, movement.minX + CONTACT_MARGIN),
    maxX: Math.min(halfX - MAP_INSET, movement.maxX - CONTACT_MARGIN),
    minZ: Math.max(-halfZ + MAP_INSET, movement.minZ + CONTACT_MARGIN),
    maxZ: Math.min(halfZ - MAP_INSET, movement.maxZ - CONTACT_MARGIN),
  }
}

export function getPortalBlockers(stageId) {
  return getStageObjectColliders(stageId).flatMap(({ position, rotation, parts }) => {
    const root = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    )
    return parts.map((part) => {
      const local = new THREE.Matrix4().compose(
        new THREE.Vector3(...part.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...part.rotation)),
        new THREE.Vector3(1, 1, 1),
      )
      const [x, y, z] = part.args
      const box = new THREE.Box3(new THREE.Vector3(-x, -y, -z), new THREE.Vector3(x, y, z))
        .applyMatrix4(root.clone().multiply(local))
      const padding = PLAYER_HALF_XZ + CONTACT_MARGIN
      return { minX: box.min.x - padding, maxX: box.max.x + padding,
        minZ: box.min.z - padding, maxZ: box.max.z + padding }
    })
  })
}

// A conservative swept square: rejects rotated-box AABB corners too, but can
// never accept a route through a real collider. All work happens once on spawn.
export function isPortalSegmentClear(from, to, blockers) {
  return !blockers.some((box) => {
    let enter = 0
    let exit = 1
    for (const [axis, lo, hi] of [['x', 'minX', 'maxX'], ['z', 'minZ', 'maxZ']]) {
      const delta = to[axis] - from[axis]
      if (Math.abs(delta) < 1e-9) {
        if (from[axis] < box[lo] || from[axis] > box[hi]) return false
      } else {
        const a = (box[lo] - from[axis]) / delta
        const b = (box[hi] - from[axis]) / delta
        enter = Math.max(enter, Math.min(a, b))
        exit = Math.min(exit, Math.max(a, b))
        if (enter > exit) return false
      }
    }
    return true
  })
}

export function getPortalApproachPath(from, to, blockers) {
  if (isPortalSegmentClear(from, to, blockers)) return [from, to]
  // Both bends remain inside the convex movement rectangle. Sweeping each leg
  // prevents corner cutting and isolated-but-empty target pockets.
  for (const bend of [{ x: from.x, z: to.z }, { x: to.x, z: from.z }]) {
    if (isPortalSegmentClear(from, bend, blockers) && isPortalSegmentClear(bend, to, blockers)) {
      return [from, bend, to]
    }
  }
  return null
}

// 고정 정문 전용 우회 경로: 플레이어와 정문이 장애물(골대)과 일직선이면 L자 두 갈래가 모두 막힌다.
// 그때 포탈 배치 범위의 좌우 끝 세로 통로(x = minX / maxX)로 내려가는 3구간 경로를 검사한다(각 구간 스윕 판정 그대로).
export function getPortalSideLaneDetour(from, to, blockers, bounds) {
  for (const laneX of [bounds.minX, bounds.maxX]) {
    const a = { x: laneX, z: from.z }
    const b = { x: laneX, z: to.z }
    if (isPortalSegmentClear(from, a, blockers) && isPortalSegmentClear(a, b, blockers) && isPortalSegmentClear(b, to, blockers)) return [from, a, b, to]
  }
  return null
}

export function pickPortalPosition(stageId, player, random = Math.random) {
  const bounds = getPortalPlacementBounds(stageId)
  const blockers = getPortalBlockers(stageId)
  const obstacles = getStageObjectPlacements(stageId)
  const from = { x: player.x, z: player.z }
  const acceptable = (to) => Math.hypot(to.x - from.x, to.z - from.z) >= MIN_DIST_FROM_PLAYER
    && !obstacles.some(({ position: [x, , z] }) => Math.hypot(to.x - x, to.z - z) < MIN_DIST_FROM_OBSTACLE)
    && getPortalApproachPath(from, to, blockers)

  // 고정 앵커 단계(Stage 5 「중앙 현관 문 앞」, 스펙 §3-6): 앵커 → 왼쪽 → 오른쪽 순서로 같은 acceptable()
  // (플레이어와 ≥5u, 프롭 원점과 ≥2u, 접근 경로 있음)을 검사해 첫 통과 후보를 쓴다. 셋 다 실패하면 아래
  // 기존 무작위 → 격자 → 플레이어 위치 폴백을 그대로 탄다. 앵커가 없는 스테이지는 동작이 바뀌지 않는다.
  const anchor = getStageConfig(stageId).portalAnchor
  // fixed 앵커(Stage 6 정문): 고정 출구라 플레이어 최소 거리·프롭 간격 규칙 없이 접근 경로만 본다. 경로가 없으면 아래 무작위로.
  if (anchor?.fixed && Number.isFinite(anchor.x) && Number.isFinite(anchor.z)) {
    const gate = { x: anchor.x, z: anchor.z }
    if (getPortalApproachPath(from, gate, blockers) || getPortalSideLaneDetour(from, gate, blockers, bounds)) return [gate.x, 0.05, gate.z]
  } else if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.z)) {
    for (const dx of [0, -ANCHOR_SIDE_OFFSET, ANCHOR_SIDE_OFFSET]) {
      const to = { x: anchor.x + dx, z: anchor.z }
      const inBounds = to.x >= bounds.minX && to.x <= bounds.maxX && to.z >= bounds.minZ && to.z <= bounds.maxZ
      if (inBounds && acceptable(to)) return [to.x, 0.05, to.z]
    }
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const to = { x: bounds.minX + random() * (bounds.maxX - bounds.minX),
      z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ) }
    if (acceptable(to)) return [to.x, 0.05, to.z]
  }
  // Bounded deterministic recovery, not the old unchecked origin (which may
  // contain a prop). Keep normal minimum distance/prop spacing when possible.
  for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (acceptable({ x, z })) return [x, 0.05, z]
    }
  }
  // A trapped player has no certified approach. Their current occupied position
  // is the only guaranteed reachable footprint; never fabricate a remote exit.
  return [from.x, 0.05, from.z]
}
