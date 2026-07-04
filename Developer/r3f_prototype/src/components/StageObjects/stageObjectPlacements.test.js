import { describe, expect, it } from 'vitest'
import { CLASSROOM_CHAIR_VARIANTS } from './ClassroomChair.jsx'
import { CLASSROOM_DESK_VARIANTS } from './ClassroomDesk.jsx'
import { UNCONSCIOUS_STUDENT_VARIANTS } from './UnconsciousStudent.jsx'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import {
  PLAYER_MESH_WORLD_HEIGHT,
  UNCONSCIOUS_STUDENT_PLAYER_SCALE,
  UNCONSCIOUS_STUDENT_RAW_LENGTH,
} from '../../lib/characterVisualScale.js'

describe('stage object placements', () => {
  it('provides supported stage object props for both playable stages', () => {
    const supportedTypes = new Set(['classroomChair', 'classroomDesk', 'unconsciousStudent'])

    expect(getStageObjectPlacements('stage1').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage2').length).toBeGreaterThan(0)
    expect(getStageObjectPlacements('stage1').every((item) => supportedTypes.has(item.type))).toBe(true)
    expect(getStageObjectPlacements('stage2').every((item) => supportedTypes.has(item.type))).toBe(true)
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

  it('increases Stage 1 unconscious student placement density fivefold', () => {
    const stage1Students = getStageObjectPlacements('stage1')
      .filter(({ type }) => type === 'unconsciousStudent')

    expect(stage1Students).toHaveLength(30)
  })

  it('keeps classroom desks and chairs compact after the prop scale reduction', () => {
    const deskAndChairScales = ['stage1', 'stage2'].flatMap((stageId) => (
      getStageObjectPlacements(stageId)
        .filter(({ type }) => ['classroomChair', 'classroomDesk'].includes(type))
        .map(({ scale = 1 }) => scale)
    ))

    expect(Math.max(...deskAndChairScales)).toBeLessThanOrEqual(0.832)
    expect(Math.min(...deskAndChairScales)).toBeGreaterThanOrEqual(0.672)
  })

  it('keeps unconscious students at a 1:1 visual scale with the player character', () => {
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

  it('keeps Stage 2 desks near corridor edges instead of the center lane', () => {
    expect(
      getStageObjectPlacements('stage2').every(({ position: [x] }) => Math.abs(x) >= 9.5)
    ).toBe(true)
  })
})
