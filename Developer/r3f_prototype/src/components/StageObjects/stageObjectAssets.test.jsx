import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_CHAIR_VARIANTS,
  CLASSROOM_DESK_VARIANTS,
  ClassroomChair,
  UNCONSCIOUS_STUDENT_VARIANTS,
  UnconsciousStudent,
} from './index.js'
import { getPropOutlineScale, STAGE_PROP_MESH_RENDERING } from './propRendering.js'

const STAGE_OBJECT_COMPONENT_FILES = [
  'ClassroomChair.jsx',
  'ClassroomDesk.jsx',
  'UnconsciousStudent.jsx',
]

describe('stage object asset catalog', () => {
  it('exports classroom chair and unconscious student assets from the StageObjects repository', () => {
    expect(ClassroomChair).toBeTypeOf('function')
    expect(UnconsciousStudent).toBeTypeOf('function')
  })

  it('defines reusable low-poly variants for the classroom chair', () => {
    expect(Object.keys(CLASSROOM_CHAIR_VARIANTS).sort()).toEqual([
      'abandoned',
      'overturned',
      'tilted',
      'upright',
    ])
    expect(CLASSROOM_CHAIR_VARIANTS.overturned.modelRotation[2]).toBeCloseTo(Math.PI)
  })

  it('does not use dark blob shadow fields on prop variants', () => {
    const variantSets = [
      CLASSROOM_CHAIR_VARIANTS,
      CLASSROOM_DESK_VARIANTS,
      UNCONSCIOUS_STUDENT_VARIANTS,
    ]

    for (const variants of variantSets) {
      for (const variant of Object.values(variants)) {
        expect(variant.shadowOpacity).toBeUndefined()
        expect(variant.shadowScale).toBeUndefined()
      }
    }
  })

  it('keeps classroom prop mesh shadows disabled', () => {
    expect(STAGE_PROP_MESH_RENDERING).toMatchObject({
      castShadow: false,
      receiveShadow: false,
    })
  })

  it('does not reintroduce direct shadow props in classroom prop components', () => {
    for (const file of STAGE_OBJECT_COMPONENT_FILES) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')

      expect(source).not.toContain('castShadow')
      expect(source).not.toContain('receiveShadow')
    }
  })

  it('keeps classroom prop outline scales positive for thin boards and legs', () => {
    const thinPropScales = [
      [1.76, 0.12, 1.04],
      [1.56, 0.03, 0.86],
      [0.08, 0.72, 0.08],
      [1.02, 0.11, 0.9],
      [0.84, 0.025, 0.74],
      [0.08, 0.56, 0.08],
    ]

    for (const scale of thinPropScales) {
      const outlineScale = getPropOutlineScale(scale)

      expect(outlineScale.every((value) => value > 0)).toBe(true)
      expect(outlineScale.every((value, index) => value - scale[index] <= 0.0450001)).toBe(true)
    }
  })

  it('defines reusable low-poly lying variants for unconscious students', () => {
    expect(Object.keys(UNCONSCIOUS_STUDENT_VARIANTS).sort()).toEqual([
      'faceUp',
      'sideLeft',
      'sideRight',
    ])
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUp.modelRotation[0]).toBeCloseTo(Math.PI / 2)
  })
})
