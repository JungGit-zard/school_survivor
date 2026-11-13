import { describe, expect, it } from 'vitest'
import {
  ROSARI_MAX_FRAME_DELTA,
  ROSARI_ROOM_BOUNDS,
  ROSARI_ROOM_COLLIDERS,
  WARDROBE_OPEN_MIN_Z,
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

  it('does not open the wardrobe from the walkable strip behind it or beside its back half', () => {
    const wardrobe = ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === 'wardrobe')
    // Behind: between the wardrobe back (collider edge -2.03 + radius) and the movement limit -2.8.
    for (const z of [-2.32, -2.4, -2.53]) {
      for (const x of [wardrobe.x, wardrobe.x - 0.5, wardrobe.x + 0.5]) {
        const behind = { x, z }
        expect(isRosariRoomPositionBlocked(behind), `${x},${z} walkable`).toBe(false)
        expect(getRosariWardrobeProximity(behind)).toBeLessThanOrEqual(0.5)
        expect(isRosariNearWardrobe(behind), `${x},${z}`).toBe(false)
      }
    }
    // Beside the back half (right side, z behind the box centre): also refused.
    const besideBack = { x: wardrobe.x + wardrobe.halfX + 0.3, z: -1.8 }
    expect(isRosariRoomPositionBlocked(besideBack)).toBe(false)
    expect(isRosariNearWardrobe(besideBack)).toBe(false)
    // Beside the front half still opens it.
    const besideFront = { x: wardrobe.x + wardrobe.halfX + 0.3, z: -1.1 }
    expect(isRosariRoomPositionBlocked(besideFront)).toBe(false)
    expect(isRosariNearWardrobe(besideFront)).toBe(true)
    expect(WARDROBE_OPEN_MIN_Z).toBeCloseTo(-1.35)
  })

  it('cannot reach the wardrobe-open state by walking around to its back', () => {
    // Walk from the room centre round the right side of the wardrobe into the back strip.
    let position = { x: 0, z: 0.65 }
    position = moveRosariRoomPosition(position, { x: -1.6, z: 0 })
    position = moveRosariRoomPosition(position, { x: 0, z: -3.05 })
    position = moveRosariRoomPosition(position, { x: -1.3, z: 0 })
    expect(position.z).toBeCloseTo(-2.4)
    expect(getRosariWardrobeProximity(position)).toBeLessThanOrEqual(0.5)
    expect(position.x).toBeLessThan(-2.07)
    expect(isRosariNearWardrobe(position)).toBe(false)
  })
})
