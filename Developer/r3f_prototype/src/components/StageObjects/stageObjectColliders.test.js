import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BLOCKING_STAGE_OBJECT_TYPES,
  getStageObjectColliderParts,
  getStageObjectColliders,
  getStageObjectSightObstacles,
  isStageObjectSightBlocked,
} from './stageObjectColliders.js'
import { getStageObjectPlacements, STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

const ENEMY_MIN_TOP_Y = 0.34

function getWorldAabb(collider) {
  const rootPosition = new THREE.Vector3(...collider.position)
  const rootRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...collider.rotation))
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }

  collider.parts.forEach((part) => {
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
  })

  return bounds
}

function aabbsOverlap(first, second) {
  return (
    first.minX < second.maxX && first.maxX > second.minX &&
    first.minZ < second.maxZ && first.maxZ > second.minZ
  )
}
describe('stage object blocking colliders', () => {
  beforeEach(() => {
    // Graphics Studio 데이터는 Firebase hydrate 이후에만 읽는다. 테스트도 같은
    // 런타임 계약의 빈 Firebase 스냅샷을 명시적으로 커밋한다.
    commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
  })
  it('blocks a zombie sight segment that crosses a prop footprint without blocking a clear segment', () => {
    const obstacle = { x: 0, z: 0, halfX: 1, halfZ: 0.5, rotationY: 0 }

    expect(isStageObjectSightBlocked(
      { x: -3, z: 0 },
      { x: 3, z: 0 },
      [obstacle]
    )).toBe(true)
    expect(isStageObjectSightBlocked(
      { x: -3, z: 2 },
      { x: 3, z: 2 },
      [obstacle]
    )).toBe(false)
  })

  it('projects every visible desk and chair into a reusable world-space sight footprint', () => {
    const colliders = getStageObjectColliders('stage1')
    const obstacles = getStageObjectSightObstacles('stage1')
    const visualDeskAndChairs = getStageObjectPlacements('stage1')
      .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))

    // stage1 수제 배치 복원(2026-07-12) 후엔 시각 사본이 없어 obstacles == collider parts.
    expect(obstacles.length).toBeGreaterThanOrEqual(colliders.reduce((total, collider) => total + collider.parts.length, 0))
    expect(obstacles).toHaveLength(visualDeskAndChairs.reduce(
      (total, placement) => total + getStageObjectColliderParts(placement).length,
      0,
    ))
    expect(getStageObjectSightObstacles('stage1')).toBe(obstacles)
    obstacles.forEach((obstacle) => {
      expect(Number.isFinite(obstacle.x)).toBe(true)
      expect(Number.isFinite(obstacle.z)).toBe(true)
      expect(obstacle.halfX).toBeGreaterThan(0)
      expect(obstacle.halfZ).toBeGreaterThan(0)
    })
  })

  it('keeps gameplay props physically solid', () => {
    const blockingPlacements = ['stage1', 'stage2', 'stage3'].flatMap((stageId) => (
      getStageObjectPlacements(stageId).filter(({ type, blocking }) => (
        BLOCKING_STAGE_OBJECT_TYPES.has(type) && blocking !== false
      ))
    ))

    expect(blockingPlacements.length).toBeGreaterThan(0)
    expect(getStageObjectColliders('stage1').length).toBe(
      STAGE_OBJECT_PLACEMENTS.stage1.filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type)).length
    )

    blockingPlacements.forEach((placement) => {
      const parts = getStageObjectColliderParts(placement)

      expect(parts.length).toBeGreaterThan(0)
      parts.forEach(({ args, position }) => {
        expect(args.every((value) => value > 0)).toBe(true)
      })
      // 작은 공·낮은 골대 받침처럼 시각적으로 낮은 파츠도 플레이어의 세로
      // 콜라이더(발 y=0~머리 y=0.64)와 실제로 겹치면 물리 장애물이다. 모든
      // 파츠가 머리 높이까지 닿아야 한다는 이전 계약은 시각과 무관한 높은 벽을
      // 강제했으므로, 루트당 실제 접촉 가능 파츠 하나를 요구한다.
      expect(parts.some(({ args, position }) => (
        position[1] - args[1] <= 0.08
        && position[1] + args[1] >= 0
        && position[1] + args[1] >= ENEMY_MIN_TOP_Y
      )), placement.id).toBe(true)
    })
  })

  it('does not block unconscious student props as hard obstacles', () => {
    const studentPlacement = getStageObjectPlacements('stage1').find(({ type }) => type === 'unconsciousStudent')

    expect(getStageObjectColliderParts(studentPlacement)).toEqual([])
  })

  it('uses every Stage 2 desk and corridor prop as a raycast and movement obstacle', () => {
    const stage2Props = getStageObjectPlacements('stage2')
    const corridorTypes = new Set(['corridorLockerBank', 'corridorJanitorCart', 'corridorLostFoundBoard'])
    const corridorProps = stage2Props.filter(({ type }) => corridorTypes.has(type))
    const physicalCorridorProps = stage2Props.filter(({ type, blocking }) => corridorTypes.has(type) && blocking !== false)
    const physicalStage2Props = stage2Props.filter(({ type, blocking }) => (
      BLOCKING_STAGE_OBJECT_TYPES.has(type) && blocking !== false
    ))

    expect(corridorProps.length).toBeGreaterThan(0)
    expect(physicalCorridorProps).toHaveLength(corridorProps.length)
    expect(physicalCorridorProps.every((placement) => getStageObjectColliderParts(placement).length > 0)).toBe(true)
    expect(getStageObjectColliders('stage2')).toHaveLength(physicalStage2Props.length)
    const expectedSightParts = stage2Props
      .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
      .reduce((total, placement) => total + getStageObjectColliderParts(placement).length, 0)
    expect(getStageObjectSightObstacles('stage2')).toHaveLength(expectedSightParts)
  })

  it('uses solid close-fit colliders for every Stage 3 gym prop', () => {
    const stage3Props = getStageObjectPlacements('stage3')
    const gymTypes = new Set([
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
    ])
    const gymProps = stage3Props.filter(({ type }) => gymTypes.has(type))

    expect(gymProps).toHaveLength(stage3Props.length)
    expect(gymProps.every(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))).toBe(true)
    expect(getStageObjectColliders('stage3')).toHaveLength(gymProps.length)
    expect(gymProps.every((placement) => getStageObjectColliderParts(placement).length > 0)).toBe(true)
    expect(getStageObjectColliderParts(gymProps.find(({ type }) => type === 'basketballHoop')).length).toBeGreaterThanOrEqual(6)
    expect(getStageObjectColliderParts(gymProps.find(({ type }) => type === 'basketballCluster')).length).toBe(6)
    expect(getStageObjectColliderParts(gymProps.find(({ type }) => type === 'gymTrainingCones')).length).toBe(4)
    expect(getStageObjectColliderParts(gymProps.find(({ type }) => type === 'gymEquipmentSpill')).length).toBeGreaterThanOrEqual(4)
  })

  it('keeps every Stage 3 world-space sight AABB inside the gym walls and out of the central combat core', () => {
    const { halfX, halfZ } = getStageBounds('stage3')
    const wallInset = 0.4
    const coreHalfX = 3.6
    const coreHalfZ = 5.5
    const obstacles = getStageObjectSightObstacles('stage3')

    expect(obstacles.length).toBeGreaterThan(0)
    obstacles.forEach(({ x, z, halfX: obstacleHalfX, halfZ: obstacleHalfZ }) => {
      expect(x - obstacleHalfX).toBeGreaterThanOrEqual(-halfX + wallInset)
      expect(x + obstacleHalfX).toBeLessThanOrEqual(halfX - wallInset)
      expect(z - obstacleHalfZ).toBeGreaterThanOrEqual(-halfZ + wallInset)
      expect(z + obstacleHalfZ).toBeLessThanOrEqual(halfZ - wallInset)

      const overlapsCore = (
        x - obstacleHalfX < coreHalfX &&
        x + obstacleHalfX > -coreHalfX &&
        z - obstacleHalfZ < coreHalfZ &&
        z + obstacleHalfZ > -coreHalfZ
      )
      expect(overlapsCore).toBe(false)
    })
  })

  it('keeps the separated Stage 3 prop roots from producing overlapping collider footprints', () => {
    const rootAabbs = getStageObjectColliders('stage3').map((collider) => ({
      id: collider.id,
      ...getWorldAabb(collider),
    }))

    for (let first = 0; first < rootAabbs.length; first += 1) {
      for (let second = first + 1; second < rootAabbs.length; second += 1) {
        expect(aabbsOverlap(rootAabbs[first], rootAabbs[second]), `${rootAabbs[first].id} / ${rootAabbs[second].id}`).toBe(false)
      }
    }
  })

  it('mounts the stage object collider layer beside the visual prop layer', () => {
    const source = readFileSync(new URL('../Floor.jsx', import.meta.url), 'utf8')

    expect(source).toContain('StageObjectColliderLayer')
    expect(source).toContain('<StageObjectColliderLayer stageId={stageId} />')
  })
})
