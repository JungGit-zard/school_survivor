import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  FLOOR_BACKDROP,
  FloorBackdrop,
  STAGE_FLOOR_TILES,
  buildFloorBackdropGeometry,
  createFloorBackdropMaterial,
  getFloorBackdropSpec,
  getFloorPlaneSize,
  getStageFloorOcclusion,
} from './ClassroomFloor.jsx'
import Floor, { FloorVisual } from './Floor.jsx'
import { getStageBounds } from '../lib/stageConfig.js'
import { stageFloorOcclusionAt } from '../lib/stageFloorLightBake.js'
import { GAME_CAMERA_BACK, GAME_CAMERA_HEIGHT, clampGameplayCameraFocus, getGameplayGroundReach, keepPlayerInsideCameraX } from '../lib/gameCameraFraming.js'
import { PLAYER_MESH_WORLD_HALF_WIDTH, PLAYER_MESH_WORLD_HEIGHT } from '../lib/characterVisualScale.js'

const FOV = 30 // GameCanvas.jsx
const PLAYER_BODY_Y = 0.32 // Player.jsx CuboidCollider half height
// 세로 휴대폰 화면(390×844)과 가로 화면의 9:16 게임 프레임(ReadyGameApp phoneFrame).
const ASPECTS = [390 / 844, 9 / 16]
// 정지 자세 밖의 카메라 follow 지연·흔들림 몫으로 남겨 둘 여유(units).
const SLACK = 8

// Game.jsx useFrame의 정지 상태 카메라 자세를 같은 함수로 재구성한다.
function gameplayCamera(stageId, aspect, playerX, playerZ) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const base = getGameplayGroundReach(FOV, aspect)
  const fitZoom = base.reachSideNear > halfX ? base.reachSideNear / halfX : 1
  const reachSide = base.reachSideFar / fitZoom
  const fz = clampGameplayCameraFocus(playerZ, base.reachUp / fitZoom, base.reachDown / fitZoom, halfZ)
  const fx = keepPlayerInsideCameraX({
    focusX: clampGameplayCameraFocus(playerX, reachSide, reachSide, halfX),
    focusZ: fz,
    playerX,
    playerY: PLAYER_BODY_Y + PLAYER_MESH_WORLD_HEIGHT,
    playerZ,
    playerHalfWidth: PLAYER_MESH_WORLD_HALF_WIDTH,
    fov: FOV,
    aspect,
    zoom: fitZoom,
  })
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 500)
  camera.zoom = fitZoom
  camera.updateProjectionMatrix()
  camera.position.set(fx, GAME_CAMERA_HEIGHT, fz + GAME_CAMERA_BACK)
  camera.lookAt(fx, 0, fz)
  camera.updateMatrixWorld()
  return camera
}

// Stage5Environment.test.jsx와 같은 JSX 요소 트리 순회(함수 컴포넌트는 펼치지 않는다).
function children(element) {
  const value = element?.props?.children
  return (Array.isArray(value) ? value.flat(Infinity) : [value]).filter(Boolean)
}
function descendants(element) {
  return [element, ...children(element).flatMap(descendants)]
}

// 화면 네 모서리가 바닥 높이(y=0)에서 닿는 월드 좌표.
function screenCornersOnGround(camera) {
  const raycaster = new THREE.Raycaster()
  return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => {
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    const { origin, direction } = raycaster.ray
    return origin.clone().addScaledVector(direction, -origin.y / direction.y)
  })
}

describe('Floor backdrop past the arena edge', () => {
  it('fills only the floors cut to the combat bounds (Stages 1 and 4)', () => {
    for (const stageId of ['stage1', 'stage4']) {
      const { halfX, halfZ } = getStageBounds(stageId)
      expect(getFloorBackdropSpec(stageId)).toMatchObject({ width: halfX * 2, depth: halfZ * 2 })
    }
    for (const stageId of ['stage2', 'stage3', 'stage5', 'stage6', 'stage10']) expect(getFloorBackdropSpec(stageId)).toBeNull()
  })

  it('is one upward ring that tucks under the floor edge and continues the floor UVs', () => {
    const { width, depth } = getFloorBackdropSpec('stage1')
    const geometry = buildFloorBackdropGeometry(width, depth)
    const position = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    const index = geometry.getIndex().array
    expect(position.count).toBe(8)
    expect(index).toHaveLength(24)

    // FloorPlane과 같은 월드→UV 식이고, 안쪽 4점은 바닥 아래(UV 0~1 안)에 있다.
    for (let i = 0; i < 8; i += 1) {
      expect(uv.getX(i)).toBeCloseTo((position.getX(i) + width / 2) / width)
      expect(uv.getY(i)).toBeCloseTo((depth / 2 - position.getZ(i)) / depth)
      const inner = i >= 4
      expect(Math.abs(position.getX(i))).toBeCloseTo(width / 2 + (inner ? -FLOOR_BACKDROP.overlap : FLOOR_BACKDROP.margin))
    }

    // 모든 삼각형이 위를 향하고, 면적 합이 바깥 사각형 - 구멍이다(겹침·빈틈 없음).
    const a = new THREE.Vector3(); const b = new THREE.Vector3(); const c = new THREE.Vector3()
    let area = 0
    for (let t = 0; t < index.length; t += 3) {
      a.fromBufferAttribute(position, index[t]); b.fromBufferAttribute(position, index[t + 1]); c.fromBufferAttribute(position, index[t + 2])
      const normal = b.clone().sub(a).cross(c.clone().sub(a))
      expect(normal.y).toBeGreaterThan(0)
      area += normal.length() / 2
    }
    const outer = (width + FLOOR_BACKDROP.margin * 2) * (depth + FLOOR_BACKDROP.margin * 2)
    const hole = (width - FLOOR_BACKDROP.overlap * 2) * (depth - FLOOR_BACKDROP.overlap * 2)
    expect(area).toBeCloseTo(outer - hole, 3)
    expect(FLOOR_BACKDROP.y).toBeLessThan(0)
  })

  it('leaves no empty background at any player position in Stages 1-4, portrait and landscape', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const { halfX, halfZ } = getStageBounds(stageId)
      const floor = getFloorPlaneSize(stageId)
      const spec = getFloorBackdropSpec(stageId)
      const coverX = floor.width / 2 + (spec ? FLOOR_BACKDROP.margin : 0)
      const coverZ = floor.depth / 2 + (spec ? FLOOR_BACKDROP.margin : 0)
      let floorOvershoot = 0
      for (const aspect of ASPECTS) {
        for (let ix = 0; ix <= 10; ix += 1) {
          for (let iz = 0; iz <= 10; iz += 1) {
            const camera = gameplayCamera(stageId, aspect, -halfX + (2 * halfX * ix) / 10, -halfZ + (2 * halfZ * iz) / 10)
            for (const corner of screenCornersOnGround(camera)) {
              floorOvershoot = Math.max(floorOvershoot, Math.abs(corner.x) - floor.width / 2, Math.abs(corner.z) - floor.depth / 2)
              expect(Math.abs(corner.x)).toBeLessThan(coverX - SLACK)
              expect(Math.abs(corner.z)).toBeLessThan(coverZ - SLACK)
            }
          }
        }
      }
      // 경계 크기 바닥만으로는 실제로 모서리가 비었다(이 테스트가 잡는 원래 증상).
      if (spec) expect(floorOvershoot).toBeGreaterThan(0.5)
    }
  })

  it('mounts the band in the gameplay Floor for Stages 1 and 4, never in the Studio preview path', () => {
    for (const stageId of ['stage1', 'stage4']) {
      const bands = descendants(Floor({ stageId })).filter((node) => node.type === FloorBackdrop)
      expect(bands).toHaveLength(1)
      expect(bands[0].props.stageId).toBe(stageId)
      expect(FloorBackdrop({ stageId }).props.floorTile).toBe(STAGE_FLOOR_TILES[stageId])
    }
    // FloorVisual은 Graphics Studio 바닥 미리보기와 같은 경로다(StudioTunedGroup 안).
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(descendants(FloorVisual({ stageId })).some((node) => node.type === FloorBackdrop)).toBe(false)
    }
    for (const stageId of ['stage2', 'stage3']) expect(FloorBackdrop({ stageId })).toBeNull()
  })

  it('dims the band with one fixed linear tint equal to the Stage 4 baked wall-edge level', () => {
    const material = createFloorBackdropMaterial(null)
    const { halfX, halfZ } = getStageBounds('stage4')
    // 가구 음영을 뺀 맨 벽선 값(경계 띠만)과 비교한다.
    const bareEdge = { ...getStageFloorOcclusion('stage4'), boxes: [], circles: [] }
    expect(material.color.r).toBeCloseTo(0.55)
    expect([material.color.g, material.color.b]).toEqual([material.color.r, material.color.r])
    expect(material.color.r).toBeCloseTo(stageFloorOcclusionAt(bareEdge, halfX, 0))
    expect(material.color.r).toBeCloseTo(stageFloorOcclusionAt(bareEdge, 0, -halfZ))
    expect(material.lightMap).toBeNull()
    material.dispose()
  })
})
