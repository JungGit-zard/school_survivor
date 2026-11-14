// Room camera framing: the whole-room overview and the follow camera that stays inside the room.
import * as THREE from 'three'
import { ROSARI_ROOM_BOUNDS as BOUNDS, ROSARI_ROOM_SHELL as SHELL } from './rosariRoom.js'

export const ROSARI_FOLLOW_FOV = 48
export const ROSARI_FOLLOW_TARGET_Y = 0.66
export const ROSARI_OVERVIEW_FOV = 34
// Every corner the overview must show: the floor slab (with its front lip) and the wall tops.
export const ROSARI_ROOM_FRAME_CORNERS = Object.freeze((() => {
  const corners = []
  for (const x of [-4.15, 4.15]) for (const y of [-0.07, SHELL.floorTop]) for (const z of [-3.15, SHELL.frontZ]) corners.push([x, y, z])
  for (const x of [-(SHELL.sideX + 0.12), SHELL.sideX + 0.12]) for (const z of [SHELL.backZ - 0.12, 3.15]) corners.push([x, SHELL.wallTop, z])
  return corners
})())

// Rosari's body box around her floor position, for keep-in-view checks.
const ROSARI_VIEW_POINTS = [[-0.34, 0, 0.25], [0.34, 0, 0.25], [-0.34, 0, -0.25], [0.34, 0, -0.25], [-0.34, 1.45, 0], [0.34, 1.45, 0]]
export const ROSARI_FOLLOW_KEEP_IN_VIEW = 0.95

function cameraBasis(backward) {
  const forward = backward.clone().negate()
  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3().crossVectors(right, forward)
  return { forward, right, up }
}

const pitchedBackward = (degrees) => new THREE.Vector3(0, Math.sin(degrees * Math.PI / 180), Math.cos(degrees * Math.PI / 180))

// First surface a view ray meets must be the floor, the back wall or a side wall inside its bounds.
function rayStaysInRoom(origin, direction) {
  let best = Infinity
  let hit = null
  const test = (t, kind) => { if (t > 1e-6 && t < best) { best = t; hit = kind } }
  if (direction.y < 0) test((SHELL.floorTop - origin.y) / direction.y, 'floor')
  if (direction.z < 0) test((SHELL.backZ - origin.z) / direction.z, 'back')
  if (direction.x > 0) test((SHELL.sideX - origin.x) / direction.x, 'side')
  if (direction.x < 0) test((-SHELL.sideX - origin.x) / direction.x, 'side')
  if (!hit) return false
  const x = origin.x + direction.x * best
  const y = origin.y + direction.y * best
  const z = origin.z + direction.z * best
  const e = 1e-6
  if (hit === 'floor') return Math.abs(x) <= SHELL.sideX + e && z >= SHELL.backZ - e && z <= SHELL.frontZ + e
  if (hit === 'back') return Math.abs(x) <= SHELL.sideX + e && y <= SHELL.wallTop + e
  return z >= SHELL.backZ - e && z <= SHELL.frontZ + e && y <= SHELL.wallTop + e
}

// True when nothing outside the room (void) is visible from a follow camera aimed at `target`.
export function isRosariFollowViewInsideRoom(follow, target) {
  const { basis, tanX, tanY, offset } = follow
  const origin = new THREE.Vector3(target.x, ROSARI_FOLLOW_TARGET_Y, target.z).add(offset)
  const direction = new THREE.Vector3()
  for (const sx of [-1, 0, 1]) for (const sy of [-1, 0, 1]) {
    if (!sx && !sy) continue
    direction.copy(basis.forward).addScaledVector(basis.right, sx * tanX).addScaledVector(basis.up, sy * tanY)
    if (!rayStaysInRoom(origin, direction)) return false
  }
  return true
}

// Largest NDC coordinate of Rosari's body box (<1 means fully on screen).
export function getRosariFollowScreenExtent(follow, target, position) {
  const { basis, tanX, tanY, offset } = follow
  const camera = new THREE.Vector3(target.x, ROSARI_FOLLOW_TARGET_Y, target.z).add(offset)
  const v = new THREE.Vector3()
  let extent = 0
  for (const [dx, y, dz] of ROSARI_VIEW_POINTS) {
    v.set(position.x + dx, y, position.z + dz).sub(camera)
    const depth = v.dot(basis.forward)
    extent = Math.max(extent, Math.abs(v.dot(basis.right) / depth / tanX), Math.abs(v.dot(basis.up) / depth / tanY))
  }
  return extent
}

function bisect(ok, lo, hi) {
  if (!ok(lo)) return lo
  if (ok(hi)) return hi
  for (let i = 0; i < 22; i += 1) {
    const mid = (lo + hi) / 2
    if (ok(mid)) lo = mid
    else hi = mid
  }
  return lo
}

const FOLLOW_Z_SAMPLES = 8

function makeFollow(width, height) {
  const aspect = width / height
  const tanY = Math.tan(THREE.MathUtils.degToRad(ROSARI_FOLLOW_FOV / 2))
  const tanX = tanY * aspect
  // ~3.4 units across the narrow side, closer than the overview; a very wide short canvas comes in
  // closer still so its sides stay inside the walls.
  const upper = Math.min(5.8, 6.4 / (2 * tanX))
  // Tiny canvases come closer still so Rosari stays ~60+ px tall.
  const lower = Math.min(4.2, upper, height / 58)
  const distance = Math.min(upper, Math.max(lower, 3.4 / (2 * tanY * Math.min(aspect, 1))))
  const backward = pitchedBackward(41.2)
  const follow = { distance, tanX, tanY, basis: cameraBasis(backward), offset: backward.clone().multiplyScalar(distance) }
  const inside = (x, z) => isRosariFollowViewInsideRoom(follow, { x, z })
  follow.maxZ = bisect((z) => inside(0, z), 0, BOUNDS.maxZ)
  follow.minZ = bisect((z) => inside(0, z), 0, BOUNDS.minZ)
  follow.zSamples = Array.from({ length: FOLLOW_Z_SAMPLES }, (_, i) => follow.minZ + (follow.maxZ - follow.minZ) * i / (FOLLOW_Z_SAMPLES - 1))
  follow.xLimits = follow.zSamples.map((z) => bisect((x) => inside(x, z), 0, BOUNDS.maxX))
  return follow
}

function followXLimit(follow, z) {
  const span = follow.maxZ - follow.minZ
  if (span <= 0) return follow.xLimits[0]
  const f = (z - follow.minZ) / span * (FOLLOW_Z_SAMPLES - 1)
  const i = Math.max(0, Math.min(FOLLOW_Z_SAMPLES - 2, Math.floor(f)))
  return Math.min(follow.xLimits[i], follow.xLimits[i + 1])
}

// Camera aim for Rosari at `position`: clamped so the view never leaves the room, then eased back
// toward her only if the clamp would push her off screen (her visibility wins over the clamp).
export function clampRosariFollowTarget(follow, position, out = { x: 0, z: 0 }) {
  const z = Math.min(follow.maxZ, Math.max(follow.minZ, position.z))
  const limit = followXLimit(follow, z)
  out.x = Math.min(limit, Math.max(-limit, position.x))
  out.z = z
  if (getRosariFollowScreenExtent(follow, out, position) <= ROSARI_FOLLOW_KEEP_IN_VIEW) return out
  const baseX = out.x
  const baseZ = z
  let lo = 0
  let hi = 1
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2
    out.x = baseX + (position.x - baseX) * mid
    out.z = baseZ + (position.z - baseZ) * mid
    if (getRosariFollowScreenExtent(follow, out, position) <= ROSARI_FOLLOW_KEEP_IN_VIEW) hi = mid
    else lo = mid
  }
  out.x = baseX + (position.x - baseX) * hi
  out.z = baseZ + (position.z - baseZ) * hi
  return out
}

function viewportOf(size) {
  return {
    width: Number.isFinite(size?.width) && size.width > 0 ? size.width : 1,
    height: Number.isFinite(size?.height) && size.height > 0 ? size.height : 1,
  }
}

// Fit the authored floor and wall bounds, not guessed camera distances.
export function getRosariCameraLayout(size, { overview = true, position = { x: 0, z: 0.65 } } = {}) {
  const { width, height } = viewportOf(size)
  if (!overview) {
    const follow = makeFollow(width, height)
    const aim = clampRosariFollowTarget(follow, position)
    const target = new THREE.Vector3(aim.x, ROSARI_FOLLOW_TARGET_Y, aim.z)
    return { position: target.clone().add(follow.offset).toArray(), target: target.toArray(), fov: ROSARI_FOLLOW_FOV, follow }
  }
  // Narrow overview lens (less perspective bulge) and a steeper look in portrait so the floor's depth,
  // not empty background, fills the tall canvas.
  const fov = ROSARI_OVERVIEW_FOV
  const backward = pitchedBackward(height > width ? 60 : 44)
  const { right, up } = cameraBasis(backward)
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanY * width / height
  const corners = ROSARI_ROOM_FRAME_CORNERS.map((corner) => new THREE.Vector3(...corner))
  // Centre the aim on the room's projected middle, then back off until every corner fits.
  const target = new THREE.Vector3(0, 0.9, 0.3)
  let distance = 0
  for (const corner of corners) {
    const c = corner.clone().sub(target)
    distance = Math.max(distance, c.dot(backward) + Math.max(Math.abs(c.dot(right)) / tanX, Math.abs(c.dot(up)) / tanY) / 0.94)
  }
  return { position: target.clone().addScaledVector(backward, distance).toArray(), target: target.toArray(), fov }
}
