import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { UNCONSCIOUS_STUDENT_VARIANTS } from './UnconsciousStudent.jsx'
import {
  computeDefaultStageObjectPlacements,
  getStageObjectPlacements,
  isStage1VisiblePropPlacement,
  STAGE_OBJECT_PLACEMENTS,
  STAGE1_VISIBLE_PROP_PADDING,
} from './stageObjectPlacements.js'
import { STAGE_PROP_TYPES } from '../../lib/stagePropPlacements.js'
import {
  PLAYER_MESH_WORLD_HEIGHT,
  UNCONSCIOUS_STUDENT_PLAYER_SCALE,
  UNCONSCIOUS_STUDENT_RAW_LENGTH,
} from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import {
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
  getFirebaseStudioRuntimeDataset,
} from '../../lib/studioRuntimeState.js'

describe('stage object placements', () => {
  it('provides supported stage object props for both playable stages', () => {
    const supportedTypes = new Set([
      'classroomChair',
      'classroomDesk',
      'unconsciousStudent',
      'classPresidentStudent',
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
    ])

    expect(getStageObjectPlacements('stage1').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage2').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage3').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage1').every((item) => supportedTypes.has(item.type))).toBe(true)
    expect(getStageObjectPlacements('stage2').every((item) => supportedTypes.has(item.type))).toBe(true)
    expect(getStageObjectPlacements('stage3').every((item) => supportedTypes.has(item.type))).toBe(true)
  })

  it('keeps Stage 1 desks away from the central spawn/play zone', () => {
    expect(
      getStageObjectPlacements('stage1').every(({ position: [x, , z] }) => Math.abs(x) >= 6 || Math.abs(z) >= 12)
    ).toBe(true)
  })

  it('uses disrupted Stage 1 desk variants for a zombie-scattered classroom feel', () => {
    const variants = new Set(
      getStageObjectPlacements('stage1')
        .filter(({ type }) => type === 'classroomDesk')
        .map(({ props }) => props?.variant ?? 'upright')
    )

    expect(variants).toContain('overturned')
    expect(variants).toContain('tilted')
    expect(variants).toContain('abandoned')
    expect([...variants].every((variant) => CLASSROOM_DESK_VARIANTS[variant])).toBe(true)
    expect(CLASSROOM_DESK_VARIANTS.overturned.modelRotation[2]).toBeCloseTo(Math.PI)
  })

  it('mixes desks, chairs, and unconscious students in Stage 1 classroom clutter', () => {
    const stage1Types = new Set(getStageObjectPlacements('stage1').map(({ type }) => type))

    expect(stage1Types).toContain('classroomDesk')
    expect(stage1Types).toContain('classroomChair')
    expect(stage1Types).toContain('unconsciousStudent')
    expect(stage1Types).toContain('classPresidentStudent')
  })

  it('uses zombie-disrupted chair and unconscious student variants in Stage 1', () => {
    const stage1 = getStageObjectPlacements('stage1')
    const chairVariants = new Set(
      stage1
        .filter(({ type }) => type === 'classroomChair')
        .map(({ props }) => props?.variant ?? 'upright')
    )
    const studentVariants = new Set(
      stage1
        .filter(({ type }) => type === 'unconsciousStudent')
        .map(({ props }) => props?.variant ?? 'faceUp')
    )

    expect(chairVariants).toContain('overturned')
    expect(chairVariants).toContain('tilted')
    expect([...chairVariants].every((variant) => CLASSROOM_CHAIR_VARIANTS[variant])).toBe(true)
    expect(studentVariants.size).toBeGreaterThanOrEqual(2)
    expect([...studentVariants].some((variant) => variant.endsWith('Flipped'))).toBe(true)
    expect([...studentVariants].some((variant) => !variant.endsWith('Flipped'))).toBe(true)
    expect([...studentVariants].every((variant) => UNCONSCIOUS_STUDENT_VARIANTS[variant])).toBe(true)
  })

  // stage1은 수제 배치 정본 그대로(2026-07-12 복원) — 복제/분산/확대 파이프라인은 stage2 전용.
  it('keeps exactly the 31 authored Stage 1 props that can enter the visible envelope', () => {
    const placements = getStageObjectPlacements('stage1')
    const { halfX, halfZ } = getStageBounds('stage1')

    expect(STAGE_OBJECT_PLACEMENTS.stage1).toHaveLength(31)
    expect(placements).toHaveLength(31)
    expect(60 - STAGE_OBJECT_PLACEMENTS.stage1.length).toBe(29)
    expect(STAGE_OBJECT_PLACEMENTS.stage1.every(isStage1VisiblePropPlacement)).toBe(true)
    expect(placements.every(isStage1VisiblePropPlacement)).toBe(true)
    expect(halfX + STAGE1_VISIBLE_PROP_PADDING).toBe(13)
    expect(halfZ + STAGE1_VISIBLE_PROP_PADDING).toBe(17.4)
    expect(placements.filter(({ type }) => type === 'classroomDesk')).toHaveLength(9)
    expect(placements.filter(({ type }) => type === 'classroomChair')).toHaveLength(6)
    expect(placements.filter(({ type }) => type === 'unconsciousStudent')).toHaveLength(14)
    // 반장 둘 = 비상 출석부 제공자 + 말빨기술책 제공자.
    expect(placements.filter(({ type }) => type === 'classPresidentStudent')).toHaveLength(2)
    placements.forEach((item, index) => {
      const authored = STAGE_OBJECT_PLACEMENTS.stage1[index]
      expect(item.id).toBe(authored.id)
      expect(item.position).toEqual(authored.position)
      expect(item.scale).toEqual(authored.scale)
    })
  })

  it('keeps exactly two desks and three fallen students while halving scattered corridor props', () => {
    const first = getStageObjectPlacements('stage2')
    const second = getStageObjectPlacements('stage2')
    const deskCount = STAGE_OBJECT_PLACEMENTS.stage2.filter(({ type }) => type === 'classroomDesk').length
    const studentCount = STAGE_OBJECT_PLACEMENTS.stage2.filter(({ type }) => type === 'unconsciousStudent').length
    const corridorProps = first.filter(({ type }) => type.startsWith('corridor'))

    expect(deskCount).toBe(2)
    expect(studentCount).toBe(3)
    expect(first).toHaveLength(13)
    expect(first.filter(({ type }) => type === 'classroomDesk')).toHaveLength(2)
    expect(first.filter(({ type }) => type === 'unconsciousStudent')).toHaveLength(3)
    expect(corridorProps.filter(({ type }) => type === 'corridorLockerBank')).toHaveLength(3)
    expect(corridorProps.filter(({ type }) => type === 'corridorJanitorCart')).toHaveLength(2)
    expect(corridorProps.filter(({ type }) => type === 'corridorLostFoundBoard')).toHaveLength(3)
    expect(second).toEqual(first)
    expect(new Set(first.map(({ id }) => id)).size).toBe(first.length)
  })

  it('keeps Stage 2 locker doors facing the camera with only a slight tilt', () => {
    const lockerRotations = getStageObjectPlacements('stage2')
      .filter(({ type }) => type === 'corridorLockerBank')
      .map(({ rotation }) => rotation[1])

    expect(lockerRotations.length).toBeGreaterThan(0)
    expect(lockerRotations.every((rotation) => Math.abs(rotation) <= 0.16)).toBe(true)
  })

  it('turns Stage 2 lost-and-found boards 45 degrees toward the gameplay camera', () => {
    const boardRotations = getStageObjectPlacements('stage2')
      .filter(({ type }) => type === 'corridorLostFoundBoard')
      .map(({ rotation }) => rotation[1])

    expect(boardRotations).toHaveLength(3)
    expect(boardRotations.every((rotation) => Math.abs(rotation - Math.PI / 4) <= 0.14)).toBe(true)
  })

  it('renders every prepared stage2 prop at 110 percent of its authored scale', () => {
    const placements = getStageObjectPlacements('stage2')

    placements.forEach(({ id, scale }) => {
      const authored = STAGE_OBJECT_PLACEMENTS.stage2.find((item) => id.startsWith(`${item.id}-copy-`))
      const authoredScale = authored.scale ?? 1
      const expected = Array.isArray(authoredScale)
        ? authoredScale.map((value) => value * 1.1)
        : authoredScale * 1.1

      expect(scale).toEqual(expected)
    })
  })

  it('keeps stage1 unconscious students at the authored player-matched scale', () => {
    const stage1StudentScales = getStageObjectPlacements('stage1')
      .filter(({ type }) => type === 'unconsciousStudent')
      .map(({ scale = 1 }) => scale)

    expect(stage1StudentScales.every((scale) => scale === UNCONSCIOUS_STUDENT_PLAYER_SCALE)).toBe(true)

    for (const scale of stage1StudentScales) {
      expect(scale * UNCONSCIOUS_STUDENT_RAW_LENGTH).toBeCloseTo(PLAYER_MESH_WORLD_HEIGHT, 3)
    }
  })

  it('uses the dedicated red class-president student model without changing its authored placement', () => {
    const placements = getStageObjectPlacements('stage1')
    const classPresident = placements.find(({ id }) => id === 'stage1-student-south-01')
    const otherStudents = placements.filter(({ type, id }) => (
      type === 'unconsciousStudent' && id !== 'stage1-student-south-01'
    ))

    expect(classPresident).toMatchObject({
      type: 'classPresidentStudent',
      position: [-3.7, 0, 17.2],
      rotation: [0, 1.42, 0],
      scale: UNCONSCIOUS_STUDENT_PLAYER_SCALE,
    })
    expect(classPresident?.props?.uniformColor).toBeUndefined()
    expect(otherStudents.every(({ props }) => props?.uniformColor === undefined)).toBe(true)
  })

  it('keeps mixed Stage 1 clutter close enough to read from the starting classroom view', () => {
    const readableProps = getStageObjectPlacements('stage1').filter(({ type, position: [x, , z] }) => (
      ['classroomChair', 'classroomDesk', 'unconsciousStudent', 'classPresidentStudent'].includes(type) &&
      Math.max(Math.abs(x), Math.abs(z)) <= 18
    ))

    expect(readableProps.length).toBeGreaterThanOrEqual(8)
  })

  it('scatters Stage 2 props across the whole stage, never pinned to the edges', () => {
    // 사용자 지시(2026-07-12): 테두리 배치 절대 금지 — 전역 시드 랜덤 균등 산포.
    const { halfX } = getStageBounds('stage2')
    const positions = getStageObjectPlacements('stage2').map(({ position: [x] }) => x)

    // 모든 프랍이 벽에서 최소 1.2 안쪽(테두리 아님).
    expect(positions.every((x) => Math.abs(x) <= halfX - 1.2)).toBe(true)
    // 중앙 레인에도 실제로 뿌려진다(가장자리 전용이 아님).
    expect(positions.some((x) => Math.abs(x) < halfX * 0.5)).toBe(true)
  })

  it('moves every Stage 2 prop into the interior blocker field', () => {
    const positions = getStageObjectPlacements('stage2').map(({ position: [x, , z] }) => [x, z])

    expect(positions.every(([x, z]) => Math.abs(x) <= 4.8 && Math.abs(z) <= 14.5)).toBe(true)
    expect(positions.some(([x, z]) => Math.max(Math.abs(x), Math.abs(z)) < 4.5)).toBe(true)
  })

  it('keeps scattered Stage 2 props separated enough for solid desk collisions', () => {
    const positions = getStageObjectPlacements('stage2').map(({ position }) => position)
    let nearestDistance = Infinity

    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const dx = positions[first][0] - positions[second][0]
        const dz = positions[first][2] - positions[second][2]
        nearestDistance = Math.min(nearestDistance, Math.hypot(dx, dz))
      }
    }

    expect(nearestDistance).toBeGreaterThanOrEqual(2)
  })

  it('distributes props across each stage without occupying its central spawn lane', () => {
    for (const stageId of ['stage2']) {
      const placements = getStageObjectPlacements(stageId)
      const { halfX, halfZ } = getStageBounds(stageId)
      const positions = placements.map(({ position: [x, , z] }) => [x, z])

      expect(new Set(positions.map(([x, z]) => `${x}:${z}`)).size).toBe(placements.length)
      expect(positions.every(([x, z]) => Math.abs(x) <= halfX - 0.6 && Math.abs(z) <= halfZ - 0.6)).toBe(true)
      expect(positions.every(([x, z]) => Math.abs(x) <= 4.8 && Math.abs(z) <= 14.5)).toBe(true)

      if (stageId === 'stage1') {
        expect(positions.every(([x, z]) => Math.abs(x) >= 6 || Math.abs(z) >= 12)).toBe(true)
      } else {
        // stage2: 테두리 금지(벽에서 1.2 이상 안쪽) — 전역 산포는 위 span 검증이 보장.
        expect(positions.every(([x]) => Math.abs(x) <= halfX - 1.2)).toBe(true)
      }
    }
  })

  it('breaks up the Stage 2 corridor with lockers, a cleaning cart, and a lost-and-found board', () => {
    const stage2Types = new Set(getStageObjectPlacements('stage2').map(({ type }) => type))

    expect(stage2Types).toContain('corridorLockerBank')
    expect(stage2Types).toContain('corridorJanitorCart')
    expect(stage2Types).toContain('corridorLostFoundBoard')
  })

  it('authors Stage 3 as a curated basketball gym prop set without scatter-copy suffixes', () => {
    const placements = getStageObjectPlacements('stage3')
    const stage3Types = new Set(placements.map(({ type }) => type))

    expect(placements).toHaveLength(STAGE_OBJECT_PLACEMENTS.stage3.length)
    expect(placements.every(({ id }) => !id.includes('-copy-'))).toBe(true)
    expect(stage3Types).toEqual(new Set([
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
      'unconsciousStudent',
    ]))
    expect(placements.filter(({ type }) => type === 'unconsciousStudent').map(({ id }) => id)).toEqual([
      'stage3-student-captain-west',
      'stage3-student-facilities-east',
    ])
  })

  it('keeps Stage 3 authored props inside the gym bounds while preserving the center combat lane', () => {
    const { halfX, halfZ } = getStageBounds('stage3')
    const placements = getStageObjectPlacements('stage3')
    const coreHalfX = 3.6
    const coreHalfZ = 5.5

    // 루트 중심점은 맵 안에만 두고, 실제 모델 폭을 포함한 벽 여유는 collider AABB 회귀에서 검증한다.
    expect(placements.every(({ position: [x, , z] }) => Math.abs(x) <= halfX && Math.abs(z) <= halfZ)).toBe(true)
    expect(placements.every(({ position: [x, , z] }) => Math.abs(x) >= coreHalfX || Math.abs(z) >= coreHalfZ)).toBe(true)

    const rootPositions = placements.map(({ position: [x, , z] }) => [x, z])
    expect(new Set(rootPositions.map(([x, z]) => `${x}:${z}`)).size).toBe(placements.length)

    for (let first = 0; first < rootPositions.length; first += 1) {
      for (let second = first + 1; second < rootPositions.length; second += 1) {
        const [firstX, firstZ] = rootPositions[first]
        const [secondX, secondZ] = rootPositions[second]
        expect(Math.hypot(firstX - secondX, firstZ - secondZ)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('keeps the authored Stage 3 front-facing prop rotations', () => {
    const byId = new Map(getStageObjectPlacements('stage3').map((placement) => [placement.id, placement]))

    expect(byId.get('stage3-hoop-north-normal').rotation).toEqual([0, 0, 0])
    expect(byId.get('stage3-hoop-south-playful')).toMatchObject({
      position: [0, 0, 16.0],
      rotation: [0, Math.PI, 0],
      props: { playful: true },
    })
    expect(byId.get('stage3-hoop-south-playful')?.props?.damaged).toBeUndefined()
    expect(byId.get('stage3-scoreboard-north-wall').rotation).toEqual([0, 0.08, 0])
    expect(byId.get('stage3-banner-south-wall').rotation).toEqual([0, Math.PI + 0.08, 0])
    expect(byId.get('stage3-exit-door-east-wall').rotation).toEqual([0, -Math.PI / 2, 0])
  })
})

// stage4(급식실/주방)는 원화 st4_concept.png 기반 수제 배치 정본이다.
// 대형 가구는 콜라이더가 붙는 solid 장애물이고, 중앙에는 압력 가마솥 1기만 두고,
// 나머지 프랍은 벽면에 밀착시킨다.
describe('stage 4 cafeteria kitchen placements', () => {
  const PRE_EXPANSION_STAGE4_X_BY_ID = new Map([
    ['stage4-cookline-north-center', -0.3],
    ['stage4-refrigerator-north-west-closed', -6.3],
    ['stage4-refrigerator-north-west-open', -4.8],
    ['stage4-crates-north-west-corner', -6.525],
    ['stage4-clutter-north-cookline-spill', 1.8],
    ['stage4-sink-north-east', 3.7],
    ['stage4-crates-north-east-corner', 5.4],
    ['stage4-trayrack-north-east-inner', 4.6],
    ['stage4-shelfcart-east-north', 6.647],
    ['stage4-shelfcart-east-upper', 6.68],
    ['stage4-preptable-east-side-counter', 6.348],
    ['stage4-trash-east-wheelie', 6.55],
    ['stage4-trayrack-east-mid', 6.498],
    ['stage4-crates-east-mid', 6.525],
    ['stage4-clutter-east-trays', 6.1],
    ['stage4-preptable-east-south-counter', 6.4],
    ['stage4-shelfcart-west-north', -6.63],
    ['stage4-clutter-west-pots', -6.6],
    ['stage4-trash-west-wheelie', -6.55],
    ['stage4-sink-west-mid', -6.575],
    ['stage4-trash-west-round', -6.587],
    ['stage4-clutter-west-bags', -6.2],
    ['stage4-shelfcart-west-south', -6.625],
    ['stage4-crates-south-west-corner', -6.525],
    ['stage4-preptable-south-serving-left', -1.7],
    ['stage4-preptable-south-serving-right', 0.9],
    ['stage4-crates-south-west-stack', -5.4],
    ['stage4-crates-south-center-stack', -3.6],
    ['stage4-clutter-south-trays', 2.9],
    ['stage4-trash-south-round', 4.1],
    ['stage4-trayrack-south-east', 5.8],
    ['stage4-pressure-cauldron-center', 0],
    ['stage4-student-serving-south', 2.1],
    ['stage4-student-kitchen-northeast', 4.55],
  ])
  const PRE_EXPANSION_STAGE4_Z_BY_ID = new Map([
    ['stage4-cookline-north-center', -15.15],
    ['stage4-refrigerator-north-west-closed', -15.2],
    ['stage4-refrigerator-north-west-open', -15.2],
    ['stage4-crates-north-west-corner', -11.6],
    ['stage4-clutter-north-cookline-spill', -14.2],
    ['stage4-sink-north-east', -14.5],
    ['stage4-crates-north-east-corner', -12.6],
    ['stage4-trayrack-north-east-inner', -9.4],
    ['stage4-shelfcart-east-north', -10.4],
    ['stage4-shelfcart-east-upper', -7.2],
    ['stage4-preptable-east-side-counter', -4],
    ['stage4-trash-east-wheelie', -0.8],
    ['stage4-trayrack-east-mid', 2.6],
    ['stage4-crates-east-mid', 5.8],
    ['stage4-clutter-east-trays', 8.8],
    ['stage4-preptable-east-south-counter', 11.6],
    ['stage4-shelfcart-west-north', -8.8],
    ['stage4-clutter-west-pots', -5.6],
    ['stage4-trash-west-wheelie', -3.2],
    ['stage4-sink-west-mid', 1],
    ['stage4-trash-west-round', 4.8],
    ['stage4-clutter-west-bags', 7.4],
    ['stage4-shelfcart-west-south', 10.6],
    ['stage4-crates-south-west-corner', 13.2],
    ['stage4-preptable-south-serving-left', 15.15],
    ['stage4-preptable-south-serving-right', 15.1],
    ['stage4-crates-south-west-stack', 14.6],
    ['stage4-crates-south-center-stack', 14.72],
    ['stage4-clutter-south-trays', 14.9],
    ['stage4-trash-south-round', 14.6],
    ['stage4-trayrack-south-east', 14.4],
    ['stage4-pressure-cauldron-center', 0],
    ['stage4-student-serving-south', 12.5],
    ['stage4-student-kitchen-northeast', -6.4],
  ])
  const PRE_EXPANSION_STAGE4_SHA256 = 'c00b8cecab51e63d2d5ba9fc42c8ff04d53e38329c8b19edcdcf72e8e8781bb2'
  const FINAL_SAFE_STAGE4_X_BY_ID = new Map([
    ['stage4-cookline-north-center', -0.39],
    ['stage4-refrigerator-north-west-closed', -7.35],
    ['stage4-refrigerator-north-west-open', -5.85],
    ['stage4-crates-north-west-corner', -7.12],
    ['stage4-clutter-north-cookline-spill', 2.15],
    ['stage4-sink-north-east', 4.45],
    ['stage4-crates-north-east-corner', 6.45],
    ['stage4-trayrack-north-east-inner', 5.3],
    ['stage4-shelfcart-east-north', 7.08],
    ['stage4-shelfcart-east-upper', 7.08],
    ['stage4-preptable-east-side-counter', 6.96],
    ['stage4-trash-east-wheelie', 7.04],
    ['stage4-trayrack-east-mid', 7.02],
    ['stage4-crates-east-mid', 7.06],
    ['stage4-clutter-east-trays', 6.86],
    ['stage4-preptable-east-south-counter', 6.94],
    ['stage4-shelfcart-west-north', -7.08],
    ['stage4-clutter-west-pots', -6.92],
    ['stage4-trash-west-wheelie', -7.05],
    ['stage4-sink-west-mid', -6.98],
    ['stage4-trash-west-round', -7.04],
    ['stage4-clutter-west-bags', -6.92],
    ['stage4-shelfcart-west-south', -7.08],
    ['stage4-crates-south-west-corner', -7.10],
    ['stage4-preptable-south-serving-left', -2.02],
    ['stage4-preptable-south-serving-right', 1.3],
    ['stage4-crates-south-west-stack', -6.45],
    ['stage4-crates-south-center-stack', -4.52],
    ['stage4-clutter-south-trays', 3.42],
    ['stage4-trash-south-round', 4.92],
    ['stage4-trayrack-south-east', 6.72],
    ['stage4-pressure-cauldron-center', 0],
    ['stage4-student-serving-south', 2.28],
    ['stage4-student-kitchen-northeast', 4.95],
  ])
  const SAFE_NUDGED_STAGE4_Z_BY_ID = new Map([
    ['stage4-cookline-north-center', -13.75],
    ['stage4-refrigerator-north-west-closed', -13.72],
    ['stage4-refrigerator-north-west-open', -13.72],
    ['stage4-crates-north-west-corner', -11.45],
    ['stage4-clutter-north-cookline-spill', -13.42],
    ['stage4-sink-north-east', -13.72],
    ['stage4-crates-north-east-corner', -12.25],
    ['stage4-trayrack-north-east-inner', -9.2],
    ['stage4-shelfcart-east-north', -10.15],
    ['stage4-shelfcart-east-upper', -7.0],
    ['stage4-preptable-east-side-counter', -3.9],
    ['stage4-trash-east-wheelie', -0.72],
    ['stage4-trayrack-east-mid', 2.52],
    ['stage4-crates-east-mid', 5.62],
    ['stage4-clutter-east-trays', 8.52],
    ['stage4-preptable-east-south-counter', 11.2],
    ['stage4-shelfcart-west-north', -8.58],
    ['stage4-clutter-west-pots', -5.45],
    ['stage4-trash-west-wheelie', -3.08],
    ['stage4-sink-west-mid', 0.95],
    ['stage4-trash-west-round', 4.62],
    ['stage4-clutter-west-bags', 7.18],
    ['stage4-shelfcart-west-south', 10.25],
    ['stage4-crates-south-west-corner', 12.85],
    ['stage4-preptable-south-serving-left', 13.72],
    ['stage4-preptable-south-serving-right', 13.72],
    ['stage4-crates-south-west-stack', 13.78],
    ['stage4-crates-south-center-stack', 13.82],
    ['stage4-clutter-south-trays', 13.68],
    ['stage4-trash-south-round', 13.78],
    ['stage4-trayrack-south-east', 13.7],
    ['stage4-pressure-cauldron-center', 0],
    ['stage4-student-serving-south', 11.65],
    ['stage4-student-kitchen-northeast', -6.2],
  ])
  const STAGE4_KITCHEN_TYPES = [
    'kitchenPrepTable',
    'kitchenCookLine',
    'kitchenSinkCounter',
    'kitchenRefrigerator',
    'kitchenTrayRack',
    'kitchenShelfCart',
    'kitchenTrashBins',
    'kitchenCrateStack',
    'kitchenClutter',
    'pressureCauldron',
  ]
  const MAX_ABS_X = 9.36
  const MAX_ABS_Z = 15.5

  it('returns stage4 authored placements as-is (never the stage2 copy/scatter pipeline)', () => {
    const authored = STAGE_OBJECT_PLACEMENTS.stage4
    const placements = computeDefaultStageObjectPlacements('stage4')

    expect(authored.length).toBeGreaterThanOrEqual(28)
    expect(authored.length).toBeLessThanOrEqual(38)
    expect(placements).toHaveLength(authored.length)
    expect(placements.every(({ id }) => !id.includes('-copy-'))).toBe(true)
    placements.forEach((item, index) => {
      expect(item.id).toBe(authored[index].id)
      expect(item.position).toEqual(authored[index].position)
      expect(item.scale).toEqual(authored[index].scale)
    })
  })

  it('keeps the mobile-safe Stage 4 layout pulled inward from phone screen edges', () => {
    const authored = STAGE_OBJECT_PLACEMENTS.stage4
    expect(authored).toHaveLength(34)
    expect(PRE_EXPANSION_STAGE4_X_BY_ID.size).toBe(34)
    expect(PRE_EXPANSION_STAGE4_Z_BY_ID.size).toBe(34)
    expect(FINAL_SAFE_STAGE4_X_BY_ID.size).toBe(34)
    expect(SAFE_NUDGED_STAGE4_Z_BY_ID.size).toBe(34)

    authored.forEach((placement) => {
      expect(placement.position[0], placement.id).toBe(FINAL_SAFE_STAGE4_X_BY_ID.get(placement.id))
      expect(placement.position[2], placement.id).toBe(SAFE_NUDGED_STAGE4_Z_BY_ID.get(placement.id))
    })

    const restoredPreExpansionSnapshot = authored.map((placement) => ({
      ...placement,
      position: [
        PRE_EXPANSION_STAGE4_X_BY_ID.get(placement.id),
        placement.position[1],
        PRE_EXPANSION_STAGE4_Z_BY_ID.get(placement.id),
      ],
    }))
    const restoredHash = createHash('sha256').update(JSON.stringify(restoredPreExpansionSnapshot)).digest('hex')
    expect(restoredHash).toBe(PRE_EXPANSION_STAGE4_SHA256)
  })

  it('keeps every stage4 prop inside the kitchen bounds', () => {
    const positions = computeDefaultStageObjectPlacements('stage4').map(({ position: [x, , z] }) => [x, z])

    expect(positions.length).toBeGreaterThan(0)
    expect(positions.every(([x, z]) => Math.abs(x) <= MAX_ABS_X && Math.abs(z) <= MAX_ABS_Z)).toBe(true)
  })

  it('uses the pressure cauldron as the only center landmark', () => {
    const center = computeDefaultStageObjectPlacements('stage4').filter(
      ({ position: [x, , z] }) => Math.abs(x) <= 3 && Math.abs(z) <= 4
    )

    expect(center).toHaveLength(1)
    expect(center[0].id).toBe('stage4-pressure-cauldron-center')
  })

  it('puts the definitive pressure cauldron landmark at the exact Stage 4 center', () => {
    const cauldron = computeDefaultStageObjectPlacements('stage4').find(
      ({ id }) => id === 'stage4-pressure-cauldron-center'
    )

    expect(cauldron).toMatchObject({
      type: 'pressureCauldron',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      blocking: true,
    })
  })

  it('keeps exactly one canonical cauldron on the default Stage 4 runtime path', () => {
    const cauldrons = getStageObjectPlacements('stage4').filter(
      ({ id }) => id === 'stage4-pressure-cauldron-center'
    )

    expect(cauldrons).toEqual([{
      id: 'stage4-pressure-cauldron-center',
      type: 'pressureCauldron',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      blocking: true,
    }])
  })

  it('replaces legacy Stage 4 center prep tables in Firebase runtime overrides without writing a migration', () => {
    commitFirebaseStudioRuntime({
      propPlacements: {
        stage4: [
          { id: 'stage4-preptable-center-north', type: 'kitchenPrepTable', position: [-0.3, 0, -5.5], rotation: [0, 0, 0], scale: 1.12 },
          { id: 'stage4-preptable-center-mid-west', type: 'kitchenPrepTable', position: [-5.9, 0, 1.1], rotation: [0, Math.PI / 2, 0], scale: 1.12 },
          { id: 'stage4-preptable-center-mid-east', type: 'kitchenPrepTable', position: [5.6, 0, 0.7], rotation: [0, Math.PI / 2, 0], scale: 1.12 },
          { id: 'stage4-preptable-center-south', type: 'kitchenPrepTable', position: [0, 0, 7.4], rotation: [0, 0, 0], scale: 1.12 },
        ],
      },
    }, { revision: 1 })

    try {
      const placements = getStageObjectPlacements('stage4')
      expect(placements.map(({ id }) => id)).not.toEqual(expect.arrayContaining([
        'stage4-preptable-center-north',
        'stage4-preptable-center-mid-west',
        'stage4-preptable-center-mid-east',
        'stage4-preptable-center-south',
      ]))
      expect(placements.filter(({ id }) => id === 'stage4-pressure-cauldron-center')).toHaveLength(1)
      expect(placements.at(-1)).toMatchObject({
        id: 'stage4-pressure-cauldron-center',
        position: [0, 0, 0],
        scale: 1,
        blocking: true,
      })
      expect(getFirebaseStudioRuntimeDataset('propPlacements').stage4).toHaveLength(4)
    } finally {
      blockFirebaseStudioRuntime()
    }
  })

  it('interprets a full-width Stage 4 Firebase override once in memory and leaves Firebase unchanged', () => {
    const remoteStage4 = [
      { id: 'legacy-east', type: 'kitchenPrepTable', position: [10, 0, -4], rotation: [0, 0.4, 0], scale: 1.1 },
      { id: 'legacy-inner', type: 'kitchenClutter', position: [2, 0, 5], rotation: [0, -0.2, 0], scale: 0.9, blocking: false },
      { id: 'legacy-west', type: 'kitchenSinkCounter', position: [-6, 0, 1], rotation: [0, 1.2, 0], scale: 1 },
    ]
    commitFirebaseStudioRuntime({ propPlacements: { stage4: remoteStage4 } }, { revision: 12 })
    const remoteBefore = structuredClone(getFirebaseStudioRuntimeDataset('propPlacements'))

    try {
      const runtime = getStageObjectPlacements('stage4').filter(({ id }) => id !== 'stage4-pressure-cauldron-center')
      const runtimeX = runtime.map(({ position: [x] }) => x)
      expect(runtimeX[0]).toBeCloseTo(6.5, 12)
      expect(runtimeX[1]).toBeCloseTo(1.3, 12)
      expect(runtimeX[2]).toBeCloseTo(-3.9, 12)
      expect(getStageObjectPlacements('stage4').filter(({ id }) => id === 'stage4-pressure-cauldron-center')).toHaveLength(1)
      expect(getFirebaseStudioRuntimeDataset('propPlacements')).toEqual(remoteBefore)
    } finally {
      blockFirebaseStudioRuntime()
    }
  })

  it('does not re-scale an already current-width Stage 4 Firebase override', () => {
    const remoteStage4 = [
      { id: 'new-east', type: 'kitchenPrepTable', position: [8.8, 0, -4], rotation: [0, 0.4, 0], scale: 1.1 },
      { id: 'new-west', type: 'kitchenSinkCounter', position: [-9.2, 0, 1], rotation: [0, 1.2, 0], scale: 1 },
    ]
    commitFirebaseStudioRuntime({ propPlacements: { stage4: remoteStage4 } }, { revision: 13 })
    const remoteBefore = structuredClone(getFirebaseStudioRuntimeDataset('propPlacements'))

    try {
      const runtime = getStageObjectPlacements('stage4').filter(({ id }) => id !== 'stage4-pressure-cauldron-center')
      expect(runtime.map(({ position: [x] }) => x)).toEqual([8.8, -9.2])
      expect(getFirebaseStudioRuntimeDataset('propPlacements')).toEqual(remoteBefore)
    } finally {
      blockFirebaseStudioRuntime()
    }
  })

  it('removes the former four center prep tables for the single landmark', () => {
    // Stage 4 starts south of the center landmark at [0, 0, 7].
    const centerTables = computeDefaultStageObjectPlacements('stage4').filter(
      ({ id }) => id.startsWith('stage4-preptable-center-')
    )

    expect(centerTables).toHaveLength(0)
  })

  it('marks every solid stage4 furniture placement as blocking and leaves only floor clutter passable', () => {
    const placements = computeDefaultStageObjectPlacements('stage4')
    const clutter = placements.filter(({ type }) => type === 'kitchenClutter')
    const furniture = placements.filter(({ type }) => type !== 'kitchenClutter')

    expect(clutter.length).toBeGreaterThan(0)
    expect(furniture.every(({ blocking }) => blocking !== false)).toBe(true)
    expect(clutter.every(({ blocking }) => blocking === false)).toBe(true)
  })

  it('gives every stage4 prop a unique id', () => {
    const ids = computeDefaultStageObjectPlacements('stage4').map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses only the agreed stage4 kitchen prop type contract, covering all nine types', () => {
    const usedTypes = new Set(computeDefaultStageObjectPlacements('stage4').map(({ type }) => type))

    expect([...usedTypes].every((type) => STAGE4_KITCHEN_TYPES.includes(type) || type === 'unconsciousStudent')).toBe(true)
    expect(usedTypes).toEqual(new Set([...STAGE4_KITCHEN_TYPES, 'unconsciousStudent']))
    expect(computeDefaultStageObjectPlacements('stage4')
      .filter(({ type }) => type === 'unconsciousStudent')
      .map(({ id }) => id)).toEqual([
      'stage4-student-serving-south',
      'stage4-student-kitchen-northeast',
    ])
  })

  it('registers the stage4 kitchen types in STAGE_PROP_TYPES all-or-nothing (no partial editor support)', () => {
    // 프랍 모델/타입 등록은 병렬 작업이라 아직 0종일 수 있다.
    // 다만 한 종이라도 등록되면 9종 전체가 등록돼야 그래픽 스튜디오 오버라이드가 일부만 살아남는 사고를 막는다.
    const registered = STAGE4_KITCHEN_TYPES.filter((type) => STAGE_PROP_TYPES.includes(type))

    expect([0, STAGE4_KITCHEN_TYPES.length]).toContain(registered.length)
  })
})
