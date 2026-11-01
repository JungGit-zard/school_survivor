// @vitest-environment jsdom
// P4: Stage 4 kitchen props share cached geometry and freeze their matrices after Studio apply.
// Real R3F host objects; the GPU boundary is a stub (counts are scene objects, not render.calls).
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import * as Kitchen from './KitchenProps.jsx'
import { STAGE_OBJECT_PLACEMENTS } from './stageObjectPlacements.js'
import { saveStudioTunings } from '../../lib/graphicsStudioConfig.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'
import { getCachedCylinderGeo } from '../../lib/toon.js'

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

function renderStage4Kitchen() {
  return (
    <group name="kitchen">
      {STAGE_OBJECT_PLACEMENTS.stage4.filter(({ type }) => type.startsWith('kitchen')).map(({ id, type, position, rotation = [0, 0, 0], scale = 1, props = {} }) => {
        const Component = Kitchen[type[0].toUpperCase() + type.slice(1)]
        return (
          <Component key={id} position={position} rotation={Array.isArray(rotation) ? rotation : [0, rotation, 0]}
            scale={Array.isArray(scale) ? scale : [scale, scale, scale]} {...props} />
        )
      })}
    </group>
  )
}

// What an unfrozen scene would compute: compose every ancestor from its live position/rotation/scale.
function expectedWorld(object) {
  const m = new THREE.Matrix4().compose(object.position, object.quaternion, object.scale)
  return object.parent ? expectedWorld(object.parent).multiply(m) : m
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

describe('Stage 4 kitchen props static freeze (P4)', () => {
  it('keeps all 532 meshes, shares geometry, and freezes every Studio subtree object', async () => {
    const { state } = await mount(renderStage4Kitchen())
    const kitchen = state.scene.getObjectByName('kitchen')
    let objects = 0, meshes = 0, draws = 0, frozen = 0
    const geometries = new Set(), materials = new Set()
    kitchen.traverse((o) => {
      objects += 1
      if (!o.matrixAutoUpdate) frozen += 1
      if (!o.isMesh) return
      meshes += 1
      const list = Array.isArray(o.material) ? o.material : [o.material]
      draws += list.length
      list.forEach((m) => materials.add(m))
      geometries.add(o.geometry)
    })
    const counts = { placements: 31, objects, meshes, draws, distinctGeometries: geometries.size, distinctMaterials: materials.size, frozenObjects: frozen }
    if (process.env.KC_OUT) (await import('node:fs')).writeFileSync(process.env.KC_OUT, JSON.stringify(counts))

    // Pre-P4 baseline (8769f71d): 1048 objects, 532 meshes, 144 geometries, 22 materials, 0 frozen.
    expect(meshes).toBe(532)
    expect(objects).toBe(1048)
    expect(materials.size).toBe(22)
    expect(geometries.size).toBeLessThan(144)
    // Only the layer group and the 31 placement roots (outside StudioTunedGroup) stay auto-updating.
    expect(objects - frozen).toBe(1 + 31)
  })

  it('re-bakes frozen matrices when a Studio root and part transform is applied after the freeze', async () => {
    const { state } = await mount(<Kitchen.KitchenPrepTable variant="side" position={[3, 0, -2]} rotation={[0, 0.4, 0]} />)
    state.scene.updateMatrixWorld(true)
    const meshes = []
    state.scene.traverse((o) => { if (o.isMesh) meshes.push(o) })
    expect(meshes.length).toBeGreaterThan(0)
    expect(meshes.every((m) => m.matrixAutoUpdate === false)).toBe(true)
    const probe = meshes[meshes.length - 1]
    const before = probe.matrixWorld.clone()

    await act(async () => {
      saveStudioTunings({
        'stage-object-kitchen-prep-table': { positionX: 1.5, rotationY: 90, scale: 1.2 },
        'stage-object-kitchen-prep-table::part::0': { positionY: 0.4 },
      })
    })
    state.scene.updateMatrixWorld(true)

    expect(probe.matrixAutoUpdate).toBe(false)
    expect(probe.matrixWorld.equals(before)).toBe(false)
    const expected = expectedWorld(probe).elements
    probe.matrixWorld.elements.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6))
  })

  it('never disposes the shared cached geometry when kitchen props unmount', async () => {
    const shared = getCachedCylinderGeo(0.055, 0.055, 0.045, 6)
    const dispose = vi.spyOn(shared, 'dispose')
    const { state, root } = await mount(<Kitchen.KitchenTrayRack />)
    let users = 0
    state.scene.traverse((o) => { if (o.geometry === shared) users += 1 })
    expect(users).toBeGreaterThan(1)
    await act(async () => root.unmount())
    roots.splice(roots.indexOf(root), 1)
    expect(dispose).not.toHaveBeenCalled()
  })
})
