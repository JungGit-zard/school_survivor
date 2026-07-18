import { describe, expect, it } from 'vitest'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { UNCONSCIOUS_STUDENT_VARIANTS } from './UnconsciousStudent.jsx'
import { getStageObjectPlacements, STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import {
  PLAYER_MESH_WORLD_HEIGHT,
  UNCONSCIOUS_STUDENT_PLAYER_SCALE,
  UNCONSCIOUS_STUDENT_RAW_LENGTH,
} from '../../lib/characterVisualScale.js'
import { getStageBounds } from '../../lib/stageConfig.js'

describe('stage object placements', () => {
  it('provides supported stage object props for both playable stages', () => {
    const supportedTypes = new Set([
      'classroomChair',
      'classroomDesk',
      'unconsciousStudent',
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
  it('returns stage1 authored placements as-is (no copies, no rescale, no redistribution)', () => {
    const placements = getStageObjectPlacements('stage1')

    expect(placements).toHaveLength(STAGE_OBJECT_PLACEMENTS.stage1.length)
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

  it('keeps mixed Stage 1 clutter close enough to read from the starting classroom view', () => {
    const readableProps = getStageObjectPlacements('stage1').filter(({ type, position: [x, , z] }) => (
      ['classroomChair', 'classroomDesk', 'unconsciousStudent'].includes(type) &&
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
    ]))
  })

  it('keeps Stage 3 authored props inside the gym bounds while preserving the center combat lane', () => {
    const { halfX, halfZ } = getStageBounds('stage3')
    const placements = getStageObjectPlacements('stage3')

    expect(placements.every(({ position: [x, , z] }) => Math.abs(x) <= halfX - 0.8 && Math.abs(z) <= halfZ - 0.8)).toBe(true)
    expect(placements.every(({ position: [x, , z] }) => Math.abs(x) >= 6.5 || Math.abs(z) >= 6.0)).toBe(true)
  })
})
