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
    const unconsciousStudents = stage3Props.filter(({ type }) => type === 'unconsciousStudent')

    expect(gymProps.length + unconsciousStudents.length).toBe(stage3Props.length)
    expect(unconsciousStudents.every((placement) => getStageObjectColliderParts(placement).length === 0)).toBe(true)
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

  // stage4 급식실: 대형 가구 8종만 solid, 바닥 잡동사니(kitchenClutter)는 콜라이더/시야 모두 제외.
  it('gives every solid Stage 4 kitchen furniture placement a collider and skips floor clutter', () => {
    const stage4Props = getStageObjectPlacements('stage4')
    const solidTypes = new Set([
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
    const solidProps = stage4Props.filter(({ type }) => solidTypes.has(type))
    const clutterProps = stage4Props.filter(({ type }) => type === 'kitchenClutter')
    const colliders = getStageObjectColliders('stage4')
    const sightObstacles = getStageObjectSightObstacles('stage4')
    const expectedSightParts = solidProps.reduce(
      (total, placement) => total + getStageObjectColliderParts(placement).length,
      0,
    )

    const unconsciousStudents = stage4Props.filter(({ type }) => type === 'unconsciousStudent')
    expect(solidProps.length + clutterProps.length + unconsciousStudents.length).toBe(stage4Props.length)
    expect(unconsciousStudents.every((placement) => getStageObjectColliderParts(placement).length === 0)).toBe(true)
    expect(new Set(solidProps.map(({ type }) => type))).toEqual(solidTypes)
    expect(clutterProps.length).toBeGreaterThan(0)
    expect(colliders).toHaveLength(solidProps.length)
    expect(solidProps.every((placement) => getStageObjectColliderParts(placement).length > 0)).toBe(true)
    expect(clutterProps.every((placement) => getStageObjectColliderParts(placement).length === 0)).toBe(true)
    expect(colliders.every(({ id }) => !id.includes('clutter'))).toBe(true)
    expect(sightObstacles).toHaveLength(expectedSightParts)
    expect(sightObstacles.every(({ halfX, halfZ }) => halfX > 0 && halfZ > 0)).toBe(true)

    // 바닥 잡동사니는 E04 원거리 투사체 시야도 끊으면 안 된다.
    const clutterIsSightBlocking = clutterProps.some(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    expect(clutterIsSightBlocking).toBe(false)
  })

  it('sizes Stage 4 kitchen colliders from the measured KitchenProps model bounds', () => {
    // KitchenProps.jsx THREE.Box3.setFromObject 실측값에서 소폭 안쪽으로 깎은 치수(scale 1 기준).
    // 값이 바뀌면 시각 모델과 물리 장애물이 어긋난다.
    const expectedSizes = {
      kitchenPrepTable: [2.16, 0.94, 1.02],
      kitchenCookLine: [2.66, 0.92, 1.12],
      kitchenSinkCounter: [2.26, 0.88, 0.94],
      kitchenRefrigerator: [1.20, 1.92, 0.92],
      kitchenTrayRack: [0.72, 1.68, 0.78],
      kitchenShelfCart: [1.04, 1.20, 0.52],
      kitchenTrashBins: [0.68, 1.02, 0.68],
      kitchenCrateStack: [0.72, 0.98, 0.60],
    }

    for (const [type, size] of Object.entries(expectedSizes)) {
      const parts = getStageObjectColliderParts({ type, scale: 1 })

      expect(parts, type).toHaveLength(1)
      expect(parts[0].args, type).toEqual(size.map((value, index) => (
        index === 1 ? Math.max(0.44, value / 2) : value / 2
      )))
      // 전 항목 바닥에서 시작(minY = 0) — 바닥 관통도, 공중에 뜬 콜라이더도 없다.
      expect(parts[0].position[1] - parts[0].args[1], type).toBeCloseTo(0, 2)
    }

    // 쿡라인 후드(실측 전체 높이 2.23)는 머리 위라 콜라이더에서 제외한다.
    expect(getStageObjectColliderParts({ type: 'kitchenCookLine', scale: 1 })[0].args[1]).toBeLessThan(1.0)

    const cauldronParts = getStageObjectColliderParts({ type: 'pressureCauldron', scale: 1 })
    expect(cauldronParts).toHaveLength(5)
    expect(cauldronParts.map(({ key }) => key).sort()).toEqual([
      'pressure-cauldron-front-twin-steps',
      'pressure-cauldron-handwheel',
      'pressure-cauldron-left-cabinet',
      'pressure-cauldron-right-auxiliary',
      'pressure-cauldron-vessel',
    ])
    expect(cauldronParts.every(({ args }) => args.every((value) => value > 0))).toBe(true)
    expect(cauldronParts.map(({ key, position, args }) => ({ key, position, args }))).toEqual([
      { key: 'pressure-cauldron-vessel', position: [0, 0.36, 0], args: [0.688, 0.296, 0.688] },
      { key: 'pressure-cauldron-front-twin-steps', position: [0, 0.056, 0.676], args: [0.296, 0.056, 0.084] },
      { key: 'pressure-cauldron-left-cabinet', position: [-0.692, 0.29, 0.036], args: [0.086, 0.218, 0.126] },
      { key: 'pressure-cauldron-right-auxiliary', position: [0.676, 0.184, -0.032], args: [0.124, 0.138, 0.158] },
      { key: 'pressure-cauldron-handwheel', position: [0.636, 0.236, 0.408], args: [0.084, 0.118, 0.092] },
    ])
  })

  it('keeps Stage 4 kitchen colliders inside the cafeteria walls without overlapping each other', () => {
    const { halfX, halfZ } = getStageBounds('stage4')
    const rootAabbs = getStageObjectColliders('stage4').map((collider) => ({
      id: collider.id,
      ...getWorldAabb(collider),
    }))

    expect(rootAabbs.length).toBeGreaterThan(0)
    rootAabbs.forEach(({ id, minX, maxX, minZ, maxZ }) => {
      expect(minX, id).toBeGreaterThanOrEqual(-halfX)
      expect(maxX, id).toBeLessThanOrEqual(halfX)
      expect(minZ, id).toBeGreaterThanOrEqual(-halfZ)
      expect(maxZ, id).toBeLessThanOrEqual(halfZ)
    })

    for (let first = 0; first < rootAabbs.length; first += 1) {
      for (let second = first + 1; second < rootAabbs.length; second += 1) {
        expect(aabbsOverlap(rootAabbs[first], rootAabbs[second]), `${rootAabbs[first].id} / ${rootAabbs[second].id}`).toBe(false)
      }
    }
  })

  // ── stage4 벽면 비대칭 포켓 회귀(balanceqa R4, 2026-07-26) ───────────────────
  // 플레이어 전폭(0.272, Player.jsx:162)보다 넓고 최소 좀비 E01 직경(0.747,
  // enemySimulation.js:10,51 — B04 반경도 0.747)보다 좁은 틈은 플레이어만 숨을 수 있는
  // 비대칭 포켓이 된다. 근접 좀비는 진입 못 하고 플레이어 무기는 프랍에 시야가 막혀
  // 반격도 안 되는 무적 지대라 어느 쪽이든 금지다.
  // 허용은 둘 중 하나뿐 — 밀폐(플레이어도 못 들어감) 또는 개방(B04까지 들어옴).
  const PLAYER_PASSABLE_WIDTH = 0.272
  const SMALLEST_ZOMBIE_DIAMETER = 0.747
  const OPEN_GAP_MIN = SMALLEST_ZOMBIE_DIAMETER + 0.1 // 0.847 → 0.85로 올려 잡는다
  const SEALED_GAP_MAX = PLAYER_PASSABLE_WIDTH

  function isAsymmetricPocket(gap) {
    return gap >= SEALED_GAP_MAX && gap < OPEN_GAP_MIN
  }

  // 좌표를 하드코딩하지 않는다. stage4 solid 프랍이 늘거나 움직이면 자동으로 걸린다.
  it('leaves no player-only pocket between Stage 4 props and the cafeteria walls', () => {
    const { halfX, halfZ } = getStageBounds('stage4')
    const violations = []

    getStageObjectColliders('stage4').forEach((collider) => {
      const { minX, maxX, minZ, maxZ } = getWorldAabb(collider)
      const gaps = {
        '-X': minX - -halfX,
        '+X': halfX - maxX,
        '-Z': minZ - -halfZ,
        '+Z': halfZ - maxZ,
      }

      Object.entries(gaps).forEach(([direction, gap]) => {
        if (isAsymmetricPocket(gap)) {
          violations.push(`${collider.id} ${direction} gap=${gap.toFixed(3)}`)
        }
      })
    })

    expect(violations.join('\n')).toBe('')
  })

  it('leaves no player-only pocket between neighbouring Stage 4 props', () => {
    const boxes = getStageObjectColliders('stage4').map((collider) => ({
      id: collider.id,
      ...getWorldAabb(collider),
    }))
    const violations = []

    for (let first = 0; first < boxes.length; first += 1) {
      for (let second = first + 1; second < boxes.length; second += 1) {
        const a = boxes[first]
        const b = boxes[second]
        const gapX = Math.max(a.minX - b.maxX, b.minX - a.maxX)
        const gapZ = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ)

        // 두 축 모두 겹치면 프랍끼리 관통이다(별도 non-overlap 테스트가 잡는다).
        if (gapX < 0 && gapZ < 0) continue

        // 분리축의 틈이 실제 통로 폭이다. 다른 축이 전혀 겹치지 않으면 대각선으로
        // 비켜 갈 수 있으므로 통로로 치지 않는다.
        const separatingGap = gapX > gapZ ? gapX : gapZ
        const overlapsOtherAxis = gapX > gapZ ? gapZ < 0 : gapX < 0
        if (!overlapsOtherAxis) continue

        if (isAsymmetricPocket(separatingGap)) {
          violations.push(`${a.id} | ${b.id} gap=${separatingGap.toFixed(3)}`)
        }
      }
    }

    expect(violations.join('\n')).toBe('')
  })

  it('mounts the stage object collider layer beside the visual prop layer', () => {
    const source = readFileSync(new URL('../Floor.jsx', import.meta.url), 'utf8')

    expect(source).toContain('StageObjectColliderLayer')
    expect(source).toContain('<StageObjectColliderLayer stageId={stageId} />')
  })
})
