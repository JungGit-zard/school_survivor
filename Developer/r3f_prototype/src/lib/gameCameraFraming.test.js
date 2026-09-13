import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { PLAYER_MESH_WORLD_HALF_WIDTH, PLAYER_MESH_WORLD_HEIGHT } from './characterVisualScale.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'
import { getStageBounds } from './stageConfig.js'
import {
  GAME_CAMERA_EDGE_INSET_FRACTION,
  GAME_CAMERA_BACK,
  GAME_CAMERA_HEIGHT,
  clampGameplayCameraFocus,
  getGameplayGroundReach,
  keepPlayerInsideCameraX,
} from './gameCameraFraming.js'

function projectPlayerEdge(width, height, stageId, player, side, priorCameraPosition) {
  const aspect = width / height
  const { halfX, halfZ } = getStageBounds(stageId)
  const base = getGameplayGroundReach(30, aspect)
  const zoom = base.reachSideNear > halfX ? base.reachSideNear / halfX : 1
  const fz = clampGameplayCameraFocus(player.z, base.reachUp / zoom, base.reachDown / zoom, halfZ)
  const mapFocusX = clampGameplayCameraFocus(player.x, base.reachSideFar / zoom, base.reachSideFar / zoom, halfX)
  const fx = keepPlayerInsideCameraX({
    focusX: mapFocusX, focusZ: fz, playerX: player.x, playerY: player.y + PLAYER_MESH_WORLD_HEIGHT,
    playerZ: player.z, playerHalfWidth: PLAYER_MESH_WORLD_HALF_WIDTH, fov: 30, aspect, zoom,
  })
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 500)
  camera.zoom = zoom
  camera.updateProjectionMatrix()
  camera.position.copy(priorCameraPosition ?? new THREE.Vector3(fx, GAME_CAMERA_HEIGHT, fz + GAME_CAMERA_BACK))
  camera.position.lerp(new THREE.Vector3(fx, GAME_CAMERA_HEIGHT, fz + GAME_CAMERA_BACK), 0.08)
  camera.lookAt(fx, 0, fz)
  camera.updateMatrixWorld()
  let edge = new THREE.Vector3(player.x + side * PLAYER_MESH_WORLD_HALF_WIDTH, player.y + PLAYER_MESH_WORLD_HEIGHT, player.z).project(camera).x
  if (Math.abs(edge) > 1 - GAME_CAMERA_EDGE_INSET_FRACTION * 2) {
    camera.position.set(fx, GAME_CAMERA_HEIGHT, fz + GAME_CAMERA_BACK)
    camera.lookAt(fx, 0, fz)
    camera.updateMatrixWorld()
    edge = new THREE.Vector3(player.x + side * PLAYER_MESH_WORLD_HALF_WIDTH, player.y + PLAYER_MESH_WORLD_HEIGHT, player.z).project(camera).x
  }
  return edge
}

describe('game camera player framing', () => {
  it.each([
    ['375×667 portrait', 375, 667],
    ['360×800 portrait', 360, 800],
    ['800×360 landscape', 800, 360],
  ])('keeps both PlayerVisual edges inside the 8% screen safe area at every stage corner: %s', (_label, width, height) => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const bounds = getPlayerMovementBounds(stageId)
      for (const x of [bounds.minX, bounds.maxX]) {
        for (const z of [bounds.minZ, bounds.maxZ]) {
          const side = x < 0 ? -1 : 1
          const ndcX = projectPlayerEdge(width, height, stageId, { x, y: 0.32, z }, side)
          expect(Math.abs(ndcX)).toBeLessThanOrEqual(1 - GAME_CAMERA_EDGE_INSET_FRACTION * 2 + 1e-9)
        }
      }
    }
  })

  it('uses the near-ground reach for landscape zoom instead of clipping the player at the focused row', () => {
    const base = getGameplayGroundReach(30, 800 / 360)
    expect(base.reachSideFar).toBeGreaterThan(10)
    expect(base.reachSideNear).toBeGreaterThan(10)
    const bounds = getPlayerMovementBounds('stage1')
    expect(projectPlayerEdge(800, 360, 'stage1', { x: bounds.maxX, y: 0.32, z: bounds.maxZ }, 1)).toBeLessThanOrEqual(1 - GAME_CAMERA_EDGE_INSET_FRACTION * 2 + 1e-9)
  })

  it('snaps to the safe target after a boundary move or resize, instead of retaining a lerped angle', () => {
    const bounds = getPlayerMovementBounds('stage1')
    const previousCamera = new THREE.Vector3(-7, GAME_CAMERA_HEIGHT, -6)
    const ndcX = projectPlayerEdge(375, 667, 'stage1', {
      x: bounds.maxX, y: 0.32, z: bounds.maxZ,
    }, 1, previousCamera)
    expect(ndcX).toBeLessThanOrEqual(1 - GAME_CAMERA_EDGE_INSET_FRACTION * 2 + 1e-9)
  })

  it('updates the camera world matrix after lookAt before projecting the live PlayerVisual', () => {
    const source = readFileSync(new URL('../components/Game.jsx', import.meta.url), 'utf8')
    const lookAt = source.indexOf('camera.lookAt(fx, 0, fz)')
    const update = source.indexOf('camera.updateMatrixWorld()', lookAt)
    const project = source.indexOf('_cameraPlayerVisualLeft.set', update)
    expect(lookAt).toBeGreaterThan(-1)
    expect(update).toBeGreaterThan(lookAt)
    expect(project).toBeGreaterThan(update)
  })
})
