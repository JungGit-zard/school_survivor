import { describe, expect, it } from 'vitest'
import {
  ROSARI_MAX_FRAME_DELTA,
  ROSARI_ROOM_BOUNDS,
  ROSARI_ROOM_COLLIDERS,
  capRosariFrameDelta,
  clampRosariRoomPosition,
  getRosariWardrobeProximity,
  isRosariNearWardrobe,
  isRosariRoomPositionBlocked,
  moveRosariRoomPosition,
} from './rosariRoom.js'

describe('rosari room movement helpers', () => {
  it('keeps Rosari inside the bedroom bounds', () => {
    expect(clampRosariRoomPosition({ x: -99, z: 99 })).toEqual({
      x: ROSARI_ROOM_BOUNDS.minX,
      z: ROSARI_ROOM_BOUNDS.maxZ,
    })
  })

  it('blocks the wardrobe and bed collision zones but leaves the center walkable', () => {
    const wardrobe = ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === 'wardrobe')
    expect(wardrobe).toBeTruthy()
    expect(isRosariRoomPositionBlocked({ x: wardrobe.x, z: wardrobe.z })).toBe(true)
    expect(isRosariRoomPositionBlocked({ x: 0, z: 0 })).toBe(false)
  })

  it('caps large frame deltas before movement uses them', () => {
    expect(capRosariFrameDelta(1)).toBe(ROSARI_MAX_FRAME_DELTA)
    expect(capRosariFrameDelta(0.01)).toBe(0.01)
    expect(capRosariFrameDelta(Number.NaN)).toBe(0)
  })

  it('splits long movement so Rosari cannot tunnel through the wardrobe collider', () => {
    const start = { x: -2.85, z: -0.2 }
    const moved = moveRosariRoomPosition(start, { x: 0, z: -2.2 })
    expect(moved.z).toBeGreaterThan(-0.4)
    expect(isRosariRoomPositionBlocked(moved)).toBe(false)
  })

  it('keeps the wardrobe reachable from the walkable front side', () => {
    const wardrobe = ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === 'wardrobe')
    const walkableFront = { x: wardrobe.x, z: wardrobe.z + wardrobe.halfZ + 0.32 }
    expect(isRosariRoomPositionBlocked(walkableFront)).toBe(false)
    expect(getRosariWardrobeProximity(walkableFront)).toBeLessThanOrEqual(0.32)
    expect(isRosariNearWardrobe(walkableFront)).toBe(true)
  })
})
