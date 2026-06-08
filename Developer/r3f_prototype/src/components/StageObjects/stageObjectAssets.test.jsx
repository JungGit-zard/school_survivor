import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_CHAIR_VARIANTS,
  ClassroomChair,
  UNCONSCIOUS_STUDENT_VARIANTS,
  UnconsciousStudent,
} from './index.js'

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

  it('defines reusable low-poly lying variants for unconscious students', () => {
    expect(Object.keys(UNCONSCIOUS_STUDENT_VARIANTS).sort()).toEqual([
      'faceUp',
      'sideLeft',
      'sideRight',
    ])
    expect(UNCONSCIOUS_STUDENT_VARIANTS.faceUp.modelRotation[0]).toBeCloseTo(Math.PI / 2)
  })
})
