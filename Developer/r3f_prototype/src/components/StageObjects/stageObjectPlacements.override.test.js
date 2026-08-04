// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computeDefaultStageObjectPlacements,
  getStageObjectPlacements,
} from './stageObjectPlacements.js'
import {
  saveStagePropPlacements,
  resetStagePropPlacementsCache,
} from '../../lib/stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

const FIREBASE_RUNTIME_BASELINE = Object.freeze({ propPlacements: Object.freeze({}) })
const FIREBASE_RUNTIME_BASELINE_REVISION = 0

function restoreFirebaseRuntimeBaseline() {
  resetStagePropPlacementsCache()
  commitFirebaseStudioRuntime(FIREBASE_RUNTIME_BASELINE, { revision: FIREBASE_RUNTIME_BASELINE_REVISION })
}

beforeEach(() => {
  restoreFirebaseRuntimeBaseline()
})

afterEach(() => {
  restoreFirebaseRuntimeBaseline()
})

describe('getStageObjectPlacements override priority', () => {
  it('returns the default pipeline when no override exists', () => {
    const def = computeDefaultStageObjectPlacements('stage1')
    const live = getStageObjectPlacements('stage1')
    expect(live).toHaveLength(def.length)
    expect(live.length).toBeGreaterThan(0)
  })

  it('returns the user override as the source of truth when present', () => {
    saveStagePropPlacements({
      stage2: [
        { id: 'user-desk', type: 'classroomDesk', position: [1, 0, 2], rotation: [0, 0.3, 0], scale: 0.9 },
      ],
    })
    const live = getStageObjectPlacements('stage2')
    expect(live).toHaveLength(1)
    expect(live[0].id).toBe('user-desk')
    expect(live[0].position).toEqual([1, 0, 2])
  })

  it('filters only out-of-envelope Stage 1 Firebase runtime overrides', () => {
    saveStagePropPlacements({
      stage1: [
        { id: 'inside-desk', type: 'classroomDesk', position: [12.9, 0, 17.4], rotation: [0, 0.3, 0], scale: 0.9 },
        { id: 'boundary-desk', type: 'classroomDesk', position: [13, 0, 17.4], rotation: [0, 0.1, 0], scale: 1 },
        { id: 'outside-desk', type: 'classroomDesk', position: [13.1, 0, 0], rotation: [0, 0.2, 0], scale: 1 },
        { id: 'outside-z-desk', type: 'classroomDesk', position: [0, 0, 17.5], rotation: [0, -0.2, 0], scale: 1 },
      ],
    })

    const live = getStageObjectPlacements('stage1')
    expect(live).toHaveLength(2)
    expect(live[0]).toMatchObject({
      id: 'inside-desk',
      position: [12.9, 0, 17.4],
      rotation: [0, 0.3, 0],
      scale: 0.9,
    })
    expect(live[1]).toMatchObject({
      id: 'boundary-desk',
      position: [13, 0, 17.4],
    })
    expect(live.map(({ id }) => id)).not.toContain('outside-desk')
    expect(live.map(({ id }) => id)).not.toContain('outside-z-desk')
  })

  it('still applies mixed unconscious-student facing to override items', () => {
    // The facing flip is derived from the id hash; assert the pipeline runs
    // (variant stays a known student variant, possibly flipped).
    saveStagePropPlacements({
      stage3: [
        { id: 'user-student-1', type: 'unconsciousStudent', position: [0, 0, 0], scale: 1, props: { variant: 'faceUp' } },
      ],
    })
    const [student] = getStageObjectPlacements('stage3')
    expect(['faceUp', 'faceUpFlipped']).toContain(student.props.variant)
  })

  it('preserves the class president red uniform in a Firebase runtime override', () => {
    saveStagePropPlacements({
      stage1: [{
        id: 'stage1-student-south-01',
        type: 'unconsciousStudent',
        position: [-3.7, 0, 17.2],
        rotation: [0, 1.42, 0],
        scale: 1,
        props: { variant: 'sideLeft', uniformColor: 0xc23535 },
      }],
    })

    const [classPresident] = getStageObjectPlacements('stage1')
    expect(classPresident.props.uniformColor).toBe(0xc23535)
  })

  it('reverts to defaults after the override is cleared to null', () => {
    saveStagePropPlacements({ stage2: [{ id: 'x', type: 'classroomDesk', position: [0, 0, 0] }] })
    expect(getStageObjectPlacements('stage2')).toHaveLength(1)
    saveStagePropPlacements({ stage2: null })
    expect(getStageObjectPlacements('stage2').length).toBe(computeDefaultStageObjectPlacements('stage2').length)
  })
})
