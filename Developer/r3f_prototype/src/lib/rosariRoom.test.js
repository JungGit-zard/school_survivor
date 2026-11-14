import { describe, expect, it } from 'vitest'
import {
  RADIO_INTERACT_MARGIN,
  ROSARI_MAX_FRAME_DELTA,
  ROSARI_RADIO_POSITION,
  ROSARI_RADIUS,
  ROSARI_ROOM_BOUNDS,
  ROSARI_ROOM_COLLIDERS,
  ROSARI_ROOM_FURNITURE,
  ROSARI_ROOM_SHELL,
  WARDROBE_FRONT_FACE_Z,
  WARDROBE_OPEN_MIN_Z,
  capRosariFrameDelta,
  clampRosariRoomPosition,
  getRosariRadioProximity,
  getRosariWardrobeProximity,
  isNearRosariRadio,
  isRosariNearWardrobe,
  isRosariRoomPositionBlocked,
  moveRosariRoomPosition,
} from './rosariRoom.js'
import { measureRosariBedroomParts } from './rosariBedroomMesh.js'

const ROSARI_HEIGHT = 1.32
const collider = (id) => ROSARI_ROOM_COLLIDERS.find((candidate) => candidate.id === id)
// Which drawn props each collider stands for.
const COLLIDER_PROPS = {
  wardrobe: ['wardrobe'],
  bed: ['bed'],
  'bed-headboard': ['bed'],
  nightstand: ['nightstand', 'radio'],
  vanity: ['vanity'],
  plush: ['plush'],
  pouf: ['pouf'],
}
const FLOOR_PROPS = ['wardrobe', 'bed', 'nightstand', 'radio', 'vanity', 'plush', 'pouf']
const parts = measureRosariBedroomParts()
// Visible footprint pieces: every drawn part of a floor prop that reaches below Rosari's head.
const footprints = parts
  .filter((part) => FLOOR_PROPS.includes(part.prop) && part.layer !== 'shadow' && part.bounds.min.y < ROSARI_HEIGHT)
  .map((part) => ({ prop: part.prop, minX: part.bounds.min.x, maxX: part.bounds.max.x, minZ: part.bounds.min.z, maxZ: part.bounds.max.z }))
const propBox = (props) => {
  const pieces = footprints.filter((piece) => props.includes(piece.prop))
  return {
    minX: Math.min(...pieces.map((p) => p.minX)), maxX: Math.max(...pieces.map((p) => p.maxX)),
    minZ: Math.min(...pieces.map((p) => p.minZ)), maxZ: Math.max(...pieces.map((p) => p.maxZ)),
  }
}
const colliderBox = (c) => ({ minX: c.x - c.halfX, maxX: c.x + c.halfX, minZ: c.z - c.halfZ, maxZ: c.z + c.halfZ })
const distanceToBox = (p, b) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ))

// Same per-frame stepping as the room's useFrame (MOVE_SPEED 1.85, 60 fps).
function walkToward(start, goal, frames = 240) {
  let position = start
  for (let i = 0; i < frames; i += 1) {
    const dx = goal.x - position.x
    const dz = goal.z - position.z
    const length = Math.hypot(dx, dz)
    if (length < 1e-6) break
    const step = Math.min(length, 1.85 / 60)
    position = moveRosariRoomPosition(position, { x: dx / length * step, z: dz / length * step })
  }
  return position
}

function expectOutsideAllFootprints(position, label) {
  for (const piece of footprints) {
    expect(distanceToBox(position, piece), `${label}: inside ${piece.prop} footprint at ${position.x.toFixed(3)},${position.z.toFixed(3)}`).toBeGreaterThanOrEqual(ROSARI_RADIUS - 1e-9)
  }
}

describe('rosari room movement helpers', () => {
  it('keeps Rosari inside the bedroom bounds', () => {
    expect(clampRosariRoomPosition({ x: -99, z: 99 })).toEqual({
      x: ROSARI_ROOM_BOUNDS.minX,
      z: ROSARI_ROOM_BOUNDS.maxZ,
    })
  })

  it('blocks furniture but leaves the room centre walkable', () => {
    for (const c of ROSARI_ROOM_COLLIDERS) expect(isRosariRoomPositionBlocked({ x: c.x, z: c.z }), c.id).toBe(true)
    expect(isRosariRoomPositionBlocked({ x: 0, z: 0 })).toBe(false)
    expect(isRosariRoomPositionBlocked({ x: 0, z: 0.65 })).toBe(false)
  })

  it('caps large frame deltas before movement uses them', () => {
    expect(capRosariFrameDelta(1)).toBe(ROSARI_MAX_FRAME_DELTA)
    expect(capRosariFrameDelta(0.01)).toBe(0.01)
    expect(capRosariFrameDelta(Number.NaN)).toBe(0)
  })

  it('splits long movement so Rosari cannot tunnel through the wardrobe collider', () => {
    const wardrobe = collider('wardrobe')
    const start = { x: wardrobe.x, z: -0.2 }
    const moved = moveRosariRoomPosition(start, { x: 0, z: -3 })
    expect(moved.z).toBeGreaterThanOrEqual(wardrobe.z + wardrobe.halfZ + ROSARI_RADIUS - 1e-9)
    expect(isRosariRoomPositionBlocked(moved)).toBe(false)
  })
})

describe('rosari room colliders match the drawn furniture', () => {
  it('has a collider for every prop that stands on the floor', () => {
    for (const prop of FLOOR_PROPS) {
      expect(Object.values(COLLIDER_PROPS).some((props) => props.includes(prop)), prop).toBe(true)
    }
    // Flat wall decor and the rug never block: no invisible walls in front of the window or picture.
    expect(ROSARI_ROOM_COLLIDERS.map((c) => c.id)).not.toContain('curtain-window')
    for (const c of ROSARI_ROOM_COLLIDERS) expect(c.z - c.halfZ).toBeLessThan(ROSARI_ROOM_SHELL.frontZ)
  })

  it.each(Object.entries(COLLIDER_PROPS))('%s collider covers its visible footprint and is not oversized', (id, props) => {
    const c = collider(id)
    const box = colliderBox(c)
    const all = propBox(props)
    // Not oversized: at most 5 cm past the drawn footprint on any side.
    expect(box.minX).toBeGreaterThanOrEqual(all.minX - 0.05)
    expect(box.maxX).toBeLessThanOrEqual(all.maxX + 0.05)
    expect(box.minZ).toBeGreaterThanOrEqual(all.minZ - 0.05)
    expect(box.maxZ).toBeLessThanOrEqual(all.maxZ + 0.05)
  })

  it('covers every drawn floor-prop piece with some collider', () => {
    for (const piece of footprints) {
      const corners = [[piece.minX, piece.minZ], [piece.minX, piece.maxZ], [piece.maxX, piece.minZ], [piece.maxX, piece.maxZ]]
      for (const [x, z] of corners) {
        const covered = ROSARI_ROOM_COLLIDERS.some((c) => Math.abs(x - c.x) <= c.halfX + 0.005 && Math.abs(z - c.z) <= c.halfZ + 0.005)
        expect(covered, `${piece.prop} corner ${x.toFixed(3)},${z.toFixed(3)}`).toBe(true)
      }
    }
  })

  it.each(ROSARI_ROOM_COLLIDERS.map((c) => [c.id, c]))('Rosari cannot walk into the %s from any side', (id, c) => {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    let approaches = 0
    for (const [dx, dz] of directions) {
      for (const offset of [-0.6, 0, 0.6]) {
        // start outside the collider on that side (sliding along the face by `offset`)
        const start = {
          x: c.x + dx * (c.halfX + ROSARI_RADIUS + 0.7) + (dz !== 0 && dx === 0 ? offset * c.halfX : 0),
          z: c.z + dz * (c.halfZ + ROSARI_RADIUS + 0.7) + (dx !== 0 && dz === 0 ? offset * c.halfZ : 0),
        }
        const clamped = clampRosariRoomPosition(start)
        if (clamped.x !== start.x || clamped.z !== start.z || isRosariRoomPositionBlocked(start)) continue
        approaches += 1
        const end = walkToward(start, { x: c.x, z: c.z })
        expect(isRosariRoomPositionBlocked(end)).toBe(false)
        expectOutsideAllFootprints(end, `${id} from ${dx},${dz}`)
      }
    }
    expect(approaches, `${id} has at least one open side`).toBeGreaterThan(0)
  })

  it('never ends a long random walk inside any piece of furniture', () => {
    let seed = 7
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
    let position = { x: 0, z: 0.65 }
    for (let i = 0; i < 4000; i += 1) {
      const angle = random() * Math.PI * 2
      position = moveRosariRoomPosition(position, { x: Math.cos(angle) * 0.05, z: Math.sin(angle) * 0.05 })
      if (i % 10 === 0) expectOutsideAllFootprints(position, `step ${i}`)
    }
  })

  it('leaves no hide-behind pocket behind the wardrobe or the bed', () => {
    const wardrobe = collider('wardrobe')
    const bed = collider('bed')
    // Their backs touch the wall (<= 3 cm gap), far too thin for Rosari.
    expect(propBox(['wardrobe']).minZ - ROSARI_ROOM_SHELL.backZ).toBeLessThan(0.03)
    expect(propBox(['bed']).minZ - ROSARI_ROOM_SHELL.backZ).toBeLessThan(0.03)
    for (let x = wardrobe.x - wardrobe.halfX; x <= wardrobe.x + wardrobe.halfX; x += 0.1) {
      for (const z of [-2.8, -2.7, -2.6]) expect(isRosariRoomPositionBlocked(clampRosariRoomPosition({ x, z })), `${x},${z}`).toBe(true)
    }
    for (let x = bed.x - bed.halfX; x <= Math.min(bed.x + bed.halfX, ROSARI_ROOM_BOUNDS.maxX); x += 0.1) {
      for (const z of [-2.8, -2.4, -2.0]) expect(isRosariRoomPositionBlocked({ x, z }), `${x},${z}`).toBe(true)
    }
    // no strip between the bed and the right wall
    expect(bed.x + bed.halfX + ROSARI_RADIUS).toBeGreaterThan(ROSARI_ROOM_BOUNDS.maxX)
  })
})

describe('rosari wardrobe opening side', () => {
  it('keeps the wardrobe reachable and openable from the front', () => {
    const wardrobe = collider('wardrobe')
    const walkableFront = { x: wardrobe.x, z: wardrobe.z + wardrobe.halfZ + 0.32 }
    expect(isRosariRoomPositionBlocked(walkableFront)).toBe(false)
    expect(getRosariWardrobeProximity(walkableFront)).toBeLessThanOrEqual(0.32)
    expect(isRosariNearWardrobe(walkableFront)).toBe(true)
    // walking up to it from the room centre ends near enough to open it
    const end = walkToward({ x: 0, z: 0.65 }, { x: wardrobe.x, z: wardrobe.z })
    expect(isRosariNearWardrobe(end)).toBe(true)
    expect(WARDROBE_FRONT_FACE_Z).toBeCloseTo(ROSARI_ROOM_FURNITURE.wardrobe.z + 0.35)
    expect(WARDROBE_OPEN_MIN_Z).toBeCloseTo(WARDROBE_FRONT_FACE_Z - 0.35)
  })

  it('refuses to open from beside its back half', () => {
    const wardrobe = collider('wardrobe')
    const besideBack = { x: wardrobe.x + wardrobe.halfX + 0.3, z: WARDROBE_OPEN_MIN_Z - 0.1 }
    expect(isRosariRoomPositionBlocked(besideBack)).toBe(false)
    expect(getRosariWardrobeProximity(besideBack)).toBeLessThanOrEqual(0.5)
    expect(isRosariNearWardrobe(besideBack)).toBe(false)
    const besideFront = { x: wardrobe.x + wardrobe.halfX + 0.3, z: WARDROBE_OPEN_MIN_Z + 0.2 }
    expect(isRosariRoomPositionBlocked(besideFront)).toBe(false)
    expect(isRosariNearWardrobe(besideFront)).toBe(true)
  })
})

describe('rosari room radio spot', () => {
  it('places the radio on top of the nightstand', () => {
    const radio = parts.filter((part) => part.prop === 'radio')
    const stand = parts.filter((part) => part.prop === 'nightstand' && part.layer === 'toon')
    const standTop = Math.max(...stand.map((part) => part.bounds.max.y))
    const radioBottom = Math.min(...radio.map((part) => part.bounds.min.y))
    expect(Math.abs(radioBottom - standTop)).toBeLessThan(0.01)
    const minX = Math.min(...radio.map((p) => p.bounds.min.x))
    const maxX = Math.max(...radio.map((p) => p.bounds.max.x))
    expect(ROSARI_RADIO_POSITION.x).toBeGreaterThan(minX)
    expect(ROSARI_RADIO_POSITION.x).toBeLessThan(maxX)
    expect(ROSARI_RADIO_POSITION.y).toBeGreaterThan(radioBottom)
    expect(ROSARI_RADIO_POSITION.y).toBeLessThan(radioBottom + 0.25)
    expect(Object.isFrozen(ROSARI_RADIO_POSITION)).toBe(true)
  })

  it('is near the radio only when standing next to the nightstand', () => {
    const stand = collider('nightstand')
    const end = walkToward({ x: 0, z: 0.65 }, { x: stand.x, z: stand.z })
    expect(isRosariRoomPositionBlocked(end)).toBe(false)
    expect(isNearRosariRadio(end)).toBe(true)
    expect(getRosariRadioProximity(end)).toBeLessThanOrEqual(RADIO_INTERACT_MARGIN)
    expect(isNearRosariRadio({ x: 0, z: 0.65 })).toBe(false)
    expect(isNearRosariRadio({ x: -3, z: 2 })).toBe(false)
  })
})
