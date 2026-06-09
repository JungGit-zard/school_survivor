import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BLOCKING_STAGE_OBJECT_TYPES,
  getStageObjectColliderParts,
  getStageObjectColliders,
} from './stageObjectColliders.js'
import { getStageObjectPlacements } from './stageObjectPlacements.js'

const PLAYER_TOP_Y = 0.64
const ENEMY_MIN_TOP_Y = 0.34

describe('stage object blocking colliders', () => {
  it('provides blocking collider parts for every classroom desk and chair placement', () => {
    const blockingPlacements = ['stage1', 'stage2'].flatMap((stageId) => (
      getStageObjectPlacements(stageId).filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    ))

    expect(blockingPlacements.length).toBeGreaterThan(0)
    expect(getStageObjectColliders('stage1').length).toBe(
      getStageObjectPlacements('stage1').filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type)).length
    )

    blockingPlacements.forEach((placement) => {
      const parts = getStageObjectColliderParts(placement)

      expect(parts.length).toBeGreaterThan(0)
      parts.forEach(({ args, position }) => {
        expect(args.every((value) => value > 0)).toBe(true)
        expect(position[1] - args[1]).toBeLessThanOrEqual(0.08)
        expect(position[1] + args[1]).toBeGreaterThanOrEqual(PLAYER_TOP_Y)
        expect(position[1] + args[1]).toBeGreaterThanOrEqual(ENEMY_MIN_TOP_Y)
      })
    })
  })

  it('does not block unconscious student props as hard obstacles', () => {
    const studentPlacement = getStageObjectPlacements('stage1').find(({ type }) => type === 'unconsciousStudent')

    expect(getStageObjectColliderParts(studentPlacement)).toEqual([])
  })

  it('mounts the stage object collider layer beside the visual prop layer', () => {
    const source = readFileSync(new URL('../Floor.jsx', import.meta.url), 'utf8')

    expect(source).toContain('StageObjectColliderLayer')
    expect(source).toContain('<StageObjectColliderLayer stageId={stageId} />')
  })
})
