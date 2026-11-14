import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ROSARI_ROOM_BOUNDS, isRosariRoomPositionBlocked } from './rosariRoom.js'
import {
  ROSARI_FOLLOW_KEEP_IN_VIEW,
  ROSARI_ROOM_FRAME_CORNERS,
  clampRosariFollowTarget,
  getRosariCameraLayout,
  getRosariFollowScreenExtent,
  isRosariFollowViewInsideRoom,
} from './rosariRoomCamera.js'

const SIZES = [[219, 220], [320, 569], [360, 457], [390, 557], [390, 700], [640, 280], [844, 292], [1094, 709], [1280, 800]]
const reachable = []
for (let x = ROSARI_ROOM_BOUNDS.minX; x <= ROSARI_ROOM_BOUNDS.maxX + 1e-9; x += 0.2) {
  for (let z = ROSARI_ROOM_BOUNDS.minZ; z <= ROSARI_ROOM_BOUNDS.maxZ + 1e-9; z += 0.2) {
    if (!isRosariRoomPositionBlocked({ x, z })) reachable.push({ x, z })
  }
}

describe('rosari follow camera', () => {
  it.each(SIZES)('never shows the void outside the room and keeps Rosari on screen at %sx%s', (width, height) => {
    const { follow } = getRosariCameraLayout({ width, height }, { overview: false })
    const voids = []
    for (const position of reachable) {
      const aim = clampRosariFollowTarget(follow, position, { x: 0, z: 0 })
      expect(getRosariFollowScreenExtent(follow, aim, position)).toBeLessThanOrEqual(ROSARI_FOLLOW_KEEP_IN_VIEW + 1e-6)
      if (!isRosariFollowViewInsideRoom(follow, aim)) voids.push(`${position.x.toFixed(1)},${position.z.toFixed(1)}`)
    }
    expect(voids).toEqual([])
  })

  it('follows closer than the whole-room overview on a desktop canvas', () => {
    const size = { width: 1094, height: 709 }
    const follow = getRosariCameraLayout(size, { overview: false })
    const overview = getRosariCameraLayout(size)
    const dist = (layout) => new THREE.Vector3(...layout.position).distanceTo(new THREE.Vector3(...layout.target))
    expect(follow.follow.distance).toBeGreaterThanOrEqual(3.5)
    expect(follow.follow.distance).toBeLessThanOrEqual(5)
    expect(dist(follow)).toBeLessThan(dist(overview) * 0.6)
  })

  it('moves the aim smoothly as Rosari walks (no jumps between neighbouring steps)', () => {
    const { follow } = getRosariCameraLayout({ width: 390, height: 557 }, { overview: false })
    let previous = null
    for (let x = -3.6; x <= 3.6; x += 0.02) {
      const aim = { ...clampRosariFollowTarget(follow, { x, z: 1.2 }, { x: 0, z: 0 }) }
      if (previous) expect(Math.hypot(aim.x - previous.x, aim.z - previous.z)).toBeLessThan(0.08)
      previous = aim
    }
  })
})

describe('rosari overview camera', () => {
  it('fills more of a phone portrait canvas than the old 41 degree / 48 degree framing', () => {
    const [width, height] = [390, 557]
    const layout = getRosariCameraLayout({ width, height })
    const camera = new THREE.PerspectiveCamera(layout.fov, width / height, 0.1, 1000)
    camera.position.set(...layout.position); camera.lookAt(...layout.target); camera.updateMatrixWorld()
    const ys = ROSARI_ROOM_FRAME_CORNERS.map((corner) => new THREE.Vector3(...corner).project(camera).y)
    expect((Math.max(...ys) - Math.min(...ys)) / 2).toBeGreaterThan(0.5)
  })
})
