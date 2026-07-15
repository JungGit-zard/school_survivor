import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_CHAIR_VARIANTS,
  CLASSROOM_DESK_VARIANTS,
  ClassroomChair,
  CorridorJanitorCart,
  CorridorLockerBank,
  CorridorLostFoundBoard,
  BallCart,
  BasketballCluster,
  BasketballHoop,
  GymBanner,
  GymBench,
  GymEquipmentSpill,
  GymExitDoor,
  GymMats,
  GymScoreboard,
  TrainingCones,
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
      'faceUpFlipped',
      'sideLeft',
      'sideLeftFlipped',
      'sideRight',
      'sideRightFlipped',
    ])
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUp.modelRotation[0]).toBeCloseTo(Math.PI / 2)
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUpFlipped.modelRotation[0]).toBeCloseTo(-Math.PI / 2)
  })

  it('exports the three Stage 2 corridor prop models and the matching concept sheet', () => {
    expect(CorridorLockerBank).toBeTypeOf('function')
    expect(CorridorJanitorCart).toBeTypeOf('function')
    expect(CorridorLostFoundBoard).toBeTypeOf('function')
    expect(readFileSync(new URL('../../assets/concept/stage2_corridor_props_concept.png', import.meta.url)).subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('keeps Stage 2 corridor props to Roblox-style block primitives and six-sided cylinders', () => {
    const source = readFileSync(new URL('./CorridorProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<boxGeometry')
    expect(source).toContain('<cylinderGeometry')
    expect(source).not.toContain('dodecahedronGeometry')
    expect(source).not.toContain('material={outline}')
    expect(source).not.toContain(', 8]')
    expect(source).not.toContain(', 10]')
  })

  it('exports Stage 3 voxel gym prop models and the matching concept sheet', () => {
    const gymProps = [
      BasketballHoop,
      BallCart,
      BasketballCluster,
      GymBench,
      TrainingCones,
      GymMats,
      GymScoreboard,
      GymBanner,
      GymExitDoor,
      GymEquipmentSpill,
    ]

    for (const Component of gymProps) {
      expect(Component).toBeTypeOf('function')
    }

    expect(readFileSync(new URL('../../assets/concept/stage3_basketball_court_voxel_lowpoly_props.png', import.meta.url)).subarray(1, 4).toString('ascii')).toBe('PNG')
  })

  it('keeps Stage 3 gym props mostly voxel/block modeled with explicitly low-poly balls', () => {
    const source = readFileSync(new URL('./GymProps.jsx', import.meta.url), 'utf8')

    expect(source).toContain('<boxGeometry')
    expect(source).toContain('<cylinderGeometry')
    expect(source).toContain('<icosahedronGeometry')
    expect(source).not.toContain('sphereGeometry')
    expect(source).not.toContain('torusGeometry')
  })
})
