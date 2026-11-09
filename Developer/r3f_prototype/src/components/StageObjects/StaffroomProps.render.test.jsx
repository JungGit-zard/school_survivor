// @vitest-environment jsdom
// Stage 5 staff room props: render smoke with real R3F host objects (GPU boundary stubbed —
// counts are scene objects, not render.calls).
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import {
  buildStaffroomDeskIslandInstances,
  buildStaffroomDeskIslandParts,
  StaffroomClutter,
  StaffroomCopier,
  StaffroomDeskIsland,
  StaffroomEntranceDoor,
  StaffroomSpeaker,
  StaffroomViceDesk,
  stepStaffroomDoorOpenness,
  STAFFROOM_DOOR_OPEN_MS,
  STAFFROOM_STUDIO_ITEM_IDS,
} from './StaffroomProps.jsx'
import { GRAPHICS_STUDIO_CATALOG, saveStudioTunings } from '../../lib/graphicsStudioConfig.js'
import StageObjectLayer from './StageObjectLayer.jsx'
import Stage5StaffroomDecor from '../Stage5StaffroomDecor.jsx'
import { STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'
import { STAGE_PROP_UNIT_BOX_GEOMETRY } from './propRendering.js'

extend(THREE)
const roots = []

async function mount(element) {
  const root = createRoot(document.createElement('canvas'))
  roots.push(root)
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  let state
  function Probe() { state = useThree(); return null }
  await act(async () => { root.render(<><Probe />{element}</>); await new Promise((r) => setTimeout(r, 0)) })
  return { state, root }
}

function collect(scene) {
  const meshes = []
  scene.traverse((object) => { if (object.isMesh) meshes.push(object) })
  return meshes
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillRect() {} }))
  commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {} }, { revision: 1 })
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('Stage 5 staff room prop rendering', () => {
  it.each([
    ['StaffroomDeskIsland long', <StaffroomDeskIsland variant="long" />],
    ['StaffroomDeskIsland short', <StaffroomDeskIsland variant="short" />],
    ['StaffroomViceDesk', <StaffroomViceDesk />],
    ['StaffroomCopier normal', <StaffroomCopier variant="normal" />],
    ['StaffroomCopier jammed', <StaffroomCopier variant="jammed" />],
    ['StaffroomEntranceDoor', <StaffroomEntranceDoor />],
    ['StaffroomSpeaker wall', <StaffroomSpeaker lane="L2" />],
    ['StaffroomSpeaker stand', <StaffroomSpeaker lane="L3" mount="stand" />],
    ['StaffroomClutter papers', <StaffroomClutter variant="papers" />],
    ['StaffroomClutter binders', <StaffroomClutter variant="binders" />],
  ])('renders %s with toon surfaces and inverted-hull outlines', async (_, element) => {
    const { state } = await mount(element)
    const meshes = collect(state.scene)
    expect(meshes.length).toBeGreaterThan(0)
    const surfaces = meshes.filter((mesh) => !mesh.userData.stagePropOutline)
    expect(surfaces.length).toBeGreaterThan(0)
    // Everything except the glass door leaves uses the cached toon material.
    expect(surfaces.every((mesh) => mesh.material.isMeshToonMaterial)).toBe(true)
  })

  it('draws all 12 islands of the Stage 5 layer with six instanced draws (5 materials + 1 outline)', async () => {
    const { state } = await mount(<StageObjectLayer stageId="stage5" />)
    const islands = state.scene.getObjectByName('staffroom-desk-islands')
    expect(islands).toBeDefined()
    const instanced = []
    islands.traverse((object) => { if (object.isInstancedMesh) instanced.push(object) })
    expect(instanced).toHaveLength(6)
    expect(instanced.every((mesh) => mesh.geometry === STAGE_PROP_UNIT_BOX_GEOMETRY)).toBe(true)
    const expected = buildStaffroomDeskIslandInstances(STAGE_OBJECT_PLACEMENTS.stage5.filter(({ type }) => type === 'staffroomDeskIsland'))
    const total = Object.values(expected.surface).reduce((sum, list) => sum + list.length, 0)
    expect(instanced.filter((mesh) => !mesh.userData.stagePropOutline).reduce((sum, mesh) => sum + mesh.count, 0)).toBe(total)
    expect(instanced.find((mesh) => mesh.userData.stagePropOutline).count).toBe(expected.outline.length)
    // Island geometry is never rendered a second time through the per-placement path.
    expect(state.scene.getObjectByName('stage-object-layer-stage5').children.filter((child) => child.name === 'staffroom-desk-islands')).toHaveLength(1)
  })

  it('places island instances at their authored placement (long 3.4u / short 2.2u footprint)', () => {
    const long = buildStaffroomDeskIslandParts('long')
    const short = buildStaffroomDeskIslandParts('short')
    const extentZ = (parts) => Math.max(...parts.map(({ position, size }) => position[2] + size[2] / 2))
    expect(extentZ(long)).toBeLessThanOrEqual(1.7)
    expect(extentZ(short)).toBeLessThanOrEqual(1.1)
    const { surface } = buildStaffroomDeskIslandInstances([{ position: [4.2, 0, 9.5], rotation: [0, 0, 0], scale: 1, props: { variant: 'long' } }])
    const partition = new THREE.Vector3().setFromMatrixPosition(surface.partition[0])
    expect(partition.x).toBeCloseTo(4.2, 6)
    expect(partition.z).toBeCloseTo(9.5, 6)
  })

  it('freezes static prop matrices but keeps the entrance door leaves animatable', async () => {
    const { state } = await mount(<><StaffroomCopier /><StaffroomEntranceDoor /><Stage5StaffroomDecor /></>)
    expect(state.scene.getObjectByName('staffroom-copier-normal').matrixAutoUpdate).toBe(false)
    expect(state.scene.getObjectByName('stage5-staffroom-decor').matrixAutoUpdate).toBe(false)
    expect(state.scene.getObjectByName('door-leaf-left').matrixAutoUpdate).toBe(true)
    expect(state.scene.getObjectByName('door-leaf-right').matrixAutoUpdate).toBe(true)
  })

  it('opens the entrance door over 600ms and closes it again on reset', () => {
    let openness = 0
    openness = stepStaffroomDoorOpenness(openness, true, STAFFROOM_DOOR_OPEN_MS / 2000)
    expect(openness).toBeCloseTo(0.5, 6)
    openness = stepStaffroomDoorOpenness(openness, true, 1)
    expect(openness).toBe(1)
    expect(stepStaffroomDoorOpenness(1, false, 0.3)).toBeCloseTo(0.5, 6)
    expect(stepStaffroomDoorOpenness(0, false, 1)).toBe(0)
  })

  it('tags each speaker lamp with its call lane for the wave-2 lane warning', async () => {
    const { state } = await mount(<StageObjectLayer stageId="stage5" />)
    const lamps = []
    state.scene.traverse((object) => { if (object.userData.stage5CallLaneLamp) lamps.push(object.userData.stage5CallLaneLamp) })
    expect(lamps.sort()).toEqual(['L1', 'L1', 'L2', 'L2', 'L3', 'L3', 'L4', 'L4'])
  })

  it('bakes the Studio root tuning into every island instance, inside each placement', () => {
    const placements = [{ position: [4.2, 0, 9.5], rotation: [0, 0, 0], scale: 1, props: { variant: 'long' } }]
    const plain = buildStaffroomDeskIslandInstances(placements)
    const tuned = buildStaffroomDeskIslandInstances(placements, { positionX: 0.5, scale: 1.2 })
    const at = (result) => new THREE.Vector3().setFromMatrixPosition(result.surface.partition[0])
    expect(at(plain).x).toBeCloseTo(4.2, 6)
    expect(at(tuned).x).toBeCloseTo(4.7, 6)
    expect(at(tuned).z).toBeCloseTo(9.5, 6)
    expect(new THREE.Vector3().setFromMatrixScale(tuned.surface.partition[0]).z)
      .toBeCloseTo(new THREE.Vector3().setFromMatrixScale(plain.surface.partition[0]).z * 1.2, 6)
  })

  it('re-bakes island instances when a Studio Apply changes the desk island tuning', async () => {
    const { state } = await mount(<StageObjectLayer stageId="stage5" />)
    const partition = () => state.scene.getObjectByName('staffroom-desk-island-partition')
    const before = new THREE.Matrix4()
    partition().getMatrixAt(0, before)
    await act(async () => {
      saveStudioTunings({ 'stage-object-staffroom-desk-island': { positionY: 0.3 } })
    })
    const after = new THREE.Matrix4()
    partition().getMatrixAt(0, after)
    expect(new THREE.Vector3().setFromMatrixPosition(after).y - new THREE.Vector3().setFromMatrixPosition(before).y).toBeCloseTo(0.3, 6)
  })

  it('wires every staff room prop to exactly one Graphics Studio catalog item with a matching StudioTunedGroup itemId', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/StageObjects/StaffroomProps.jsx'), 'utf8')
    for (const [objectType, itemId] of Object.entries(STAFFROOM_STUDIO_ITEM_IDS)) {
      const items = GRAPHICS_STUDIO_CATALOG.filter((item) => item.objectType === objectType)
      expect(items, objectType).toHaveLength(1)
      expect(items[0]).toMatchObject({ id: itemId, category: 'stageObject', previewKind: 'stageObject' })
      expect(source, itemId).toContain(`<StudioTunedGroup itemId="${itemId}"`)
    }
    const preview = readFileSync(resolve(process.cwd(), 'src/components/GraphicsStudioPreview.jsx'), 'utf8')
    for (const objectType of Object.keys(STAFFROOM_STUDIO_ITEM_IDS)) {
      expect(preview, objectType).toContain(`item.objectType === '${objectType}'`)
    }
  })
})
