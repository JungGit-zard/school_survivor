// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  computeDefaultStageObjectPlacements,
  getStageObjectPlacements,
} from './stageObjectPlacements.js'
import {
  saveStagePropPlacements,
  resetStagePropPlacementsCache,
} from '../../lib/stagePropPlacements.js'

beforeEach(() => {
  resetStagePropPlacementsCache()
  window.localStorage.clear()
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

  it('reverts to defaults after the override is cleared to null', () => {
    saveStagePropPlacements({ stage2: [{ id: 'x', type: 'classroomDesk', position: [0, 0, 0] }] })
    expect(getStageObjectPlacements('stage2')).toHaveLength(1)
    saveStagePropPlacements({ stage2: null })
    expect(getStageObjectPlacements('stage2').length).toBe(computeDefaultStageObjectPlacements('stage2').length)
  })
})
