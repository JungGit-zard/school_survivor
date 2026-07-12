import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BLOCKING_STAGE_OBJECT_TYPES,
  getStageObjectColliderParts,
  getStageObjectColliders,
  getStageObjectSightObstacles,
  isStageObjectSightBlocked,
} from './stageObjectColliders.js'
import { getStageObjectPlacements, STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'

const PLAYER_TOP_Y = 0.64
const ENEMY_MIN_TOP_Y = 0.34

describe('stage object blocking colliders', () => {
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

  it('keeps one physical blocker per prepared desk and chair while visual copies remain decorative', () => {
    const blockingPlacements = ['stage1', 'stage2'].flatMap((stageId) => (
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
