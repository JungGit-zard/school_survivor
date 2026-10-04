import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const runtime = vi.hoisted(() => ({ scene: null, frame: null }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal(),
  useMemo: (factory) => factory(),
  useRef: (current) => ({ current }),
  useEffect: (effect) => effect(),
}))
vi.mock('@react-three/fiber', () => ({ useFrame: (frame) => { runtime.frame = frame }, useThree: () => ({}) }))
vi.mock('@react-three/drei', () => ({ useGLTF: Object.assign(() => ({ scene: runtime.scene }), { preload: () => {} }) }))

import PlayerV9Model from './PlayerV9Model.jsx'
import StudioTunedGroup, { applySavedStudioPartTunings, applyStudioTuning, findStudioPartByKey } from './StudioTunedGroup.jsx'
import { GRAPHICS_STUDIO_CATALOG } from '../lib/graphicsStudioConfig.js'

// Mount the component's returned group hierarchy with actual Three objects,
// then run its registered animation callback. No WebGL or Firebase writes.
function mountGroups(element) {
  if (!element) return null
  if (element.type === 'primitive') return element.props.object
  if (typeof element.type === 'function' && element.type !== StudioTunedGroup) return mountGroups(element.type(element.props))
  if (element.type !== 'group' && element.type !== 'mesh' && element.type !== StudioTunedGroup) {
    return element.props?.children ? mountGroups(element.props.children) : null
  }
  const group = element.type === 'mesh' ? new THREE.Mesh(undefined, element.props.material) : new THREE.Group()
  group.name = element.props.name ?? ''
  group.userData = { ...element.props.userData }
  if (element.props.position) group.position.fromArray(element.props.position)
  if (element.props.scale) group.scale.fromArray(element.props.scale)
  if (element.props.rotation) group.rotation.fromArray(element.props.rotation)
  if (typeof element.ref === 'function') element.ref(group)
  else if (element.ref) element.ref.current = group
  for (const child of [element.props.children].flat()) {
    const object = mountGroups(child)
    if (object) group.add(object)
  }
  return group
}

function renderPlayer() {
  const groupRef = { current: null }
  const root = mountGroups(PlayerV9Model({ groupRef, movingRef: { current: true } }))
  return { root, groupRef, model: root.getObjectByName('player-v9-model'), studio: root.children[0] }
}

beforeEach(() => {
  // Supply only the canvas API needed by the real toonMat gradient factory.
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) })
  runtime.scene = new THREE.Group()
  const body = new THREE.Group()
  body.name = 'grp_body'
  runtime.scene.add(body)
  for (const name of ['grp_head', 'grp_armL', 'grp_armR', 'grp_legL', 'grp_legR', 'grp_pack']) {
    const part = new THREE.Group()
    part.name = name
    body.add(part)
  }
  for (const name of ['Fringe_01', 'Fringe_02', 'Fringe_03', 'Hair_crown_flat_round_skull', 'Head_skin_broad_short_chin']) {
    const surface = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial())
    surface.name = name
    body.getObjectByName('grp_head').add(surface)
  }
})
afterEach(() => vi.unstubAllGlobals())

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(componentsDir, '../..')
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('Player v9 gameplay and Studio runtime model contract', () => {
  it('draws hulls only outside the surface stencil and preserves source geometry and face material', () => {
    const original = runtime.scene.getObjectByName('Head_skin_broad_short_chin')
    const originalPositions = Array.from(original.geometry.attributes.position.array)
    const { model } = renderPlayer()
    const face = model.getObjectByName('Head_skin_broad_short_chin')
    const hull = face.children.find((child) => child.userData.studioRenderOutline)
    expect(hull.geometry).not.toBe(face.geometry)
    expect(Array.from(face.geometry.attributes.position.array)).toEqual(originalPositions)
    expect(face.material.color.equals(original.material.color)).toBe(true)
    expect(face.material.stencilRef).toBe(3)
    expect(face.material.stencilZPass).toBe(THREE.ReplaceStencilOp)
    expect(hull.material.side).toBe(THREE.BackSide)
    expect(hull.material.stencilRef).toBe(3)
    expect(hull.material.stencilFunc).toBe(THREE.NotEqualStencilFunc)
    expect(hull.material.depthTest).toBe(true)
    expect(hull.material.depthWrite).toBe(false)
    const before = hull.scale.x
    applyStudioTuning(face, { outlineThickness: 1.5, outlineColor: '#112233', outlineOpacity: 0.7 })
    expect(hull.scale.x).toBeCloseTo(before * 1.06)
    expect(hull.material.color.getHexString()).toBe('112233')
    expect(hull.material.opacity).toBe(0.7)
  })

  it('keeps the exact copied v9 GLB as the only runtime player asset', () => {
    const assetPath = path.join(packageRoot, 'src/assets/models/PLAYER_v9_final.glb')
    const sourcePath = path.resolve(packageRoot, '../../Graphic_designer/game_resource_library/player_r3f_blender_20261003/10_v9_backpack_viewer/final/PLAYER_v9_final.glb')

    expect(statSync(assetPath).size).toBe(statSync(sourcePath).size)
    expect(read('./PlayerV9Model.jsx')).toContain("import playerV9Url from '../assets/models/PLAYER_v9_final.glb?url'")
    expect(read('./PlayerV9Model.jsx')).not.toContain('player-image2-2026-08-29.glb')
  })

  it('preserves Studio/game tuning wrapper and maps v9 pivots used by existing actions', () => {
    const source = read('./PlayerV9Model.jsx')

    expect(source).toContain('<StudioTunedGroup itemId="player-v9">')
    expect(source).not.toContain('stablePartKeysOnly')
    expect(source).toContain("head: 'grp_head'")
    expect(source).toContain("slvL: 'grp_armL'")
    expect(source).toContain("slvR: 'grp_armR'")
    expect(source).toContain("legL: 'grp_legL'")
    expect(source).toContain("legR: 'grp_legR'")
    expect(source).toContain("bag: 'grp_pack'")
    expect(source).toContain('getActivePlayerArmAction(playerArmActionState')
    expect(source).toContain('getPlayerArmPose({ action: armAction, walkSwing: sw })')
    expect(source).toContain('bagSwingState.active')
  })

  it('keeps existing lantern action graphics and floor-visible shadow on v9 without title-source imports', () => {
    const source = read('./PlayerV9Model.jsx')

    expect(source).not.toContain("from './PlayerMesh.jsx'")
    expect(source).toContain('function PlayerV9LanternModel()')
    expect(source).toContain('PLAYER_V9_LANTERN_OFFSET')
    expect(source).toContain('p.slvR.updateWorldMatrix(true, false)')
    expect(source).toContain('modelRef.current.updateWorldMatrix(true, false)')
    expect(source).toContain('lanternRef.current.matrix.copy(modelRef.current.matrixWorld).invert().multiply(p.slvR.matrixWorld).multiply(PLAYER_V9_LANTERN_OFFSET)')
    expect(source).toContain("armAction?.type === 'lanternAim' || armAction?.type === 'lanternFlashlight'")
    expect(source).toContain('<PlayerV9LanternModel />')
    expect(source).toContain('PLAYER_V9_RAW_MIN_Y + 0.01')
  })

  it('keeps the old and v9 model identities separate in Studio', () => {
    const source = read('./PlayerV9Model.jsx')

    expect(source).toContain('<StudioTunedGroup itemId="player-v9">')
    expect(source).not.toContain('toneMapped = false')
    expect(source).not.toContain('studioPartId')
    const oldItem = GRAPHICS_STUDIO_CATALOG.find((item) => item.id === 'player')
    const v9Item = GRAPHICS_STUDIO_CATALOG.find((item) => item.id === 'player-v9')
    expect(oldItem.runtimePreviewComponent).toBe('PlayerMesh')
    expect(v9Item.runtimePreviewComponent).toBe('PlayerVisual')
    expect(v9Item.previewKind).toBe(oldItem.previewKind)
    expect(read('./GraphicsStudioPreview.jsx')).toContain("if (item.id === 'player') return <PlayerMesh")
  })

  it('documents verified v9 bounds and floor alignment for the existing gameplay collider', () => {
    const source = read('./PlayerV9Model.jsx')

    expect(source).toContain('PLAYER_V9_RAW_HEIGHT = 3.0900000194087625')
    expect(source).toContain('PLAYER_V9_RAW_MIN_Y = 0.014999999664723873')
    expect(source).toContain('PLAYER_V9_WORLD_HEIGHT = 3.35 * 0.2664')
    expect(source).toContain('PLAYER_V9_FLOOR_Y = -0.32 - PLAYER_V9_RAW_MIN_Y * PLAYER_V9_SCALE')
  })

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('follows gameplay yaw %s while keeping world up vertical after animation', (yaw) => {
    const { root, groupRef, model } = renderPlayer()
    groupRef.current.rotation.y = yaw
    runtime.frame({ clock: { elapsedTime: 1 } }, 1 / 60)
    root.updateMatrixWorld(true)
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(model.matrixWorld)
    const up = new THREE.Vector3(0, 1, 0).transformDirection(model.matrixWorld)
    expect(forward.x).toBeCloseTo(Math.sin(yaw), 10)
    expect(forward.y).toBeCloseTo(0, 10)
    expect(forward.z).toBeCloseTo(Math.cos(yaw), 10)
    expect(up.distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-10)
  })

  it.each(['#fca8bc', '#f0606d', '#355ead', '#3258a6'])('preserves source linear color and sRGB face map for %s', (hex) => {
    const map = new THREE.Texture()
    map.colorSpace = THREE.SRGBColorSpace
    const sourceMaterial = new THREE.MeshStandardMaterial({ color: hex, map, alphaTest: 0.4, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), sourceMaterial)
    mesh.name = 'palette-probe'
    runtime.scene.add(mesh)
    const { root } = renderPlayer()
    const cloned = root.getObjectByName('palette-probe').material
    expect(cloned).not.toBe(sourceMaterial)
    expect(cloned.isMeshToonMaterial).toBe(true)
    expect(cloned.color.toArray()).toEqual(sourceMaterial.color.toArray())
    expect(cloned.color.getHexString()).toBe(hex.slice(1))
    expect(cloned.map).toBe(map)
    expect(cloned.emissiveMap).toBe(map)
    expect(cloned.map.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(cloned.alphaTest).toBe(0.4)
    expect(cloned.side).toBe(THREE.DoubleSide)
    expect(cloned.toneMapped).toBe(true)
    expect(cloned.emissive.toArray()).toEqual(sourceMaterial.emissive.toArray())
    cloned.color.set('#000000')
    expect(sourceMaterial.color.getHexString()).toBe(hex.slice(1))
  })

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('does not apply another model version\'s saved transforms at yaw %s', (yaw) => {
    const { root, studio, groupRef } = renderPlayer()
    const saved = {
      'player::part::0.0.19.2.0.1.0': { rotationX: -48 },
      'player::group::0.0.19.0.0+0.0.19.2.0.1.0': { rotationY: 12 },
      'player::part::0.0.8.0.0': { positionZ: -0.59, scaleY: 1.72 },
      'player::part::0.0.11.0.0': { rotationX: 90 },
    }
    const before = JSON.stringify(saved)
    applySavedStudioPartTunings(studio, 'player-v9', saved, { materialTuning: false })
    groupRef.current.rotation.y = yaw
    runtime.frame({ clock: { elapsedTime: 1 } }, 1 / 60)
    root.updateMatrixWorld(true)
    const body = root.getObjectByName('grp_body')
    const up = new THREE.Vector3(0, 1, 0).transformDirection(body.matrixWorld)
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(body.matrixWorld)
    expect(up.distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-10)
    expect(forward.x).toBeCloseTo(Math.sin(yaw), 10)
    expect(forward.z).toBeCloseTo(Math.cos(yaw), 10)
    const lantern = root.getObjectByName('player-v9-lantern-0')
    expect(lantern.rotation.x).toBe(0)
    const fringe = root.getObjectByName('Fringe_01')
    expect(fringe.position.z).toBe(0)
    expect(fringe.scale.y).toBe(1)
    expect(JSON.stringify(saved)).toBe(before)
  })

  it('applies v9 numerical part and group tunings exactly to their selected surfaces', () => {
    const { root, studio } = renderPlayer()
    const lantern = root.getObjectByName('player-v9-lantern-0')
    const key = '0.2.0.0'
    expect(findStudioPartByKey(studio, key)).toBe(lantern)
    const saved = {
      [`player-v9::part::${key}`]: { rotationX: -48, scaleY: 1.72 },
      [`player-v9::group::${key}`]: { rotationY: 12, positionZ: -0.59 },
    }
    const before = JSON.stringify(saved)
    const baseZ = lantern.position.z
    applySavedStudioPartTunings(studio, 'player-v9', saved, { materialTuning: false })
    expect(lantern.rotation.x).toBeCloseTo(THREE.MathUtils.degToRad(-48), 10)
    expect(lantern.rotation.y).toBeCloseTo(THREE.MathUtils.degToRad(12), 10)
    expect(lantern.scale.y).toBe(1.72)
    expect(lantern.position.z).toBeCloseTo(baseZ - 0.59, 10)
    for (const axis of ['x', 'y', 'z']) expect(root.getObjectByName('grp_body').rotation[axis]).toBeCloseTo(0, 10)
    expect(JSON.stringify(saved)).toBe(before)
  })
})
