// @vitest-environment jsdom
// KayKit Furniture Bits stage props (2026-11-14): asset contract, node-matrix baking, collider-footprint fit,
// and per-stage instancing (2 draws per part). GPU boundary stubbed; counts are scene objects.
import React, { act } from 'react'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'

vi.mock('../../lib/kaykitFurniture.js', async (importOriginal) => {
  const actual = await importOriginal()
  const { getKaykitTestScene } = await import('../../lib/kaykitFurniture.testUtil.js')
  return { ...actual, useKaykitFurniture: () => actual.getKaykitFurnitureAssets(getKaykitTestScene()) }
})

import {
  bakeKaykitNodeGeometry,
  getKaykitFurnitureAssets,
  KAYKIT_NODE_NAMES,
} from '../../lib/kaykitFurniture.js'
import { getKaykitTestScene } from '../../lib/kaykitFurniture.testUtil.js'
import { buildKaykitPropInstances, getKaykitPartFit, KAYKIT_PROP_RECIPES, KAYKIT_STAGE_OBJECT_TYPES } from './kaykitPropRecipes.js'
import StageObjectLayer, { KAYKIT_MIX_RATIO, splitKaykitMix, STAGE_OBJECT_BATCH_COMPONENTS } from './StageObjectLayer.jsx'
import { getStageObjectColliderParts } from './stageObjectColliders.js'
import { getStageObjectPlacements } from './stageObjectPlacements.js'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

extend(THREE)
const roots = []
const GLB = resolve(process.cwd(), 'src/assets/models/kaykit/furniture_kaykit.glb')

function readGlbJson(path) {
  const buffer = readFileSync(path)
  const length = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8'))
}

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
  return state
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

describe('KayKit furniture asset', () => {
  it('ships one meshopt GLB under the 150 KB budget with the 22 named nodes and a single atlas', () => {
    expect(statSync(GLB).size).toBeLessThanOrEqual(150 * 1024)
    const json = readGlbJson(GLB)
    expect(json.extensionsUsed).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']))
    expect(json.images).toHaveLength(1)
    expect(json.materials).toHaveLength(1)
    const roots = json.scenes[0].nodes.map((index) => json.nodes[index].name)
    expect(roots).toEqual([...KAYKIT_NODE_NAMES])
    for (const recipe of Object.values(KAYKIT_PROP_RECIPES)) {
      for (const part of recipe.parts) expect(KAYKIT_NODE_NAMES).toContain(part.node)
    }
  })

  it('records CC0 provenance next to the audio manifest', () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), '../agent_room/3d_asset_provenance_manifest_2026-11-14.json'), 'utf8'))
    const entry = manifest.assets.find(({ logicalId }) => logicalId === 'kaykitFurnitureBits')
    expect(entry.license).toContain('CC0')
    expect(entry.source).toContain('https://kaylousberg.itch.io/furniture-bits')
    expect(entry.paths[0].bytes).toBe(statSync(GLB).size)
  })

  it('bakes a quantized node (normalized int16 + node scale/offset) into plain float geometry', () => {
    const position = new THREE.BufferAttribute(new Int16Array([32767, 0, 0, 0, 32767, 0, 0, 0, -32767]), 3, true)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', position)
    const node = new THREE.Mesh(geometry)
    node.scale.setScalar(0.5)
    node.position.set(0, 0.5, 0)
    const baked = bakeKaykitNodeGeometry(node)
    expect(baked.attributes.position.array).toBeInstanceOf(Float32Array)
    expect(baked.attributes.position.getX(0)).toBeCloseTo(0.5, 4)
    expect(baked.attributes.position.getY(1)).toBeCloseTo(1, 4)
    expect(baked.attributes.position.getZ(2)).toBeCloseTo(-0.5, 4)
  })
})

describe('KayKit recipes keep the old collider footprints', () => {
  it.each(KAYKIT_STAGE_OBJECT_TYPES)('%s main part stays inside its unchanged collider footprint', (type) => {
    const assets = getKaykitFurnitureAssets(getKaykitTestScene())
    const recipe = KAYKIT_PROP_RECIPES[type]
    const part = recipe.parts[0]
    const variants = type === 'staffroomDeskIsland' ? ['long', 'short'] : [undefined]
    for (const variant of variants) {
      const colliders = getStageObjectColliderParts({ type, props: { variant: variant ?? 'upright' } })
      const entry = assets.get(part.node, getKaykitPartFit(part, variant))
      const box = entry.geometry.boundingBox
      expect(box.min.y).toBeCloseTo(0, 6)
      if (colliders.length === 0) continue // pass-through clutter
      const halfX = Math.max(...colliders.map(({ args, position }) => args[0] + Math.abs(position[0])))
      const halfZ = Math.max(...colliders.map(({ args, position }) => args[2] + Math.abs(position[2])))
      expect(box.max.x, `${type} ${variant}`).toBeLessThanOrEqual(halfX + 1e-6)
      expect(-box.min.x).toBeLessThanOrEqual(halfX + 1e-6)
      expect(box.max.z).toBeLessThanOrEqual(halfZ + 0.03)
      expect(-box.min.z).toBeLessThanOrEqual(halfZ + 0.03)
    }
  })

  it('uses the collider-stable desk/chair variant transforms (overturned desk keeps its model offset)', () => {
    const [part] = buildKaykitPropInstances('classroomDesk', [{ position: [1, 0, 2], rotation: [0, 0, 0], scale: 1, props: { variant: 'overturned' } }])
    const position = new THREE.Vector3().setFromMatrixPosition(part.matrices[0])
    expect(position.x).toBeCloseTo(1, 6)
    expect(position.y).toBeCloseTo(0.92, 6)
    expect(position.z).toBeCloseTo(2, 6)
  })

  it('gives every KayKit kind exactly one Studio catalog item and a preview branch', () => {
    const preview = readFileSync(resolve(process.cwd(), 'src/components/GraphicsStudioPreview.jsx'), 'utf8')
    expect(preview).toContain("item.previewKind === 'kaykitProp'")
    for (const [kind, recipe] of Object.entries(KAYKIT_PROP_RECIPES)) {
      const items = GRAPHICS_STUDIO_CATALOG.filter((item) => item.kaykitKind === kind)
      expect(items, kind).toHaveLength(1)
      expect(items[0]).toMatchObject({ id: recipe.itemId, category: 'stageObject', previewKind: 'kaykitProp' })
    }
  })
})

describe('KayKit stage layers', () => {
  it('routes every KayKit type through the batch path', () => {
    for (const type of KAYKIT_STAGE_OBJECT_TYPES) expect(STAGE_OBJECT_BATCH_COMPONENTS[type], type).toBeTypeOf('function')
  })

  it.each([
    ['stage1', { classroomDesk: 1, classroomChair: 1 }],
    ['stage2', { classroomDesk: 1 }],
    ['stage4', { kitchenPrepTable: 1, kitchenShelfCart: 1 }],
    // The single vice-principal desk stays ours (no KayKit batch); see the mix tests below.
    ['stage5', { staffroomDeskIsland: 3, staffroomClutter: 2 }],
  ])('%s draws each KayKit part as one fill + one outline InstancedMesh', async (stageId, partsPerType) => {
    const state = await mount(<StageObjectLayer stageId={stageId} />)
    const placements = getStageObjectPlacements(stageId)
    for (const [type, partCount] of Object.entries(partsPerType)) {
      const batch = state.scene.getObjectByName(`kaykit-batch-${type}`)
      expect(batch, type).toBeDefined()
      const instanced = []
      batch.traverse((object) => { if (object.isInstancedMesh && object.count > 0) instanced.push(object) })
      const expected = buildKaykitPropInstances(type, splitKaykitMix(placements.filter((placement) => placement.type === type)).kaykit)
      const drawnParts = expected.filter((part) => part.matrices.length > 0).length
      expect(drawnParts, type).toBeLessThanOrEqual(partCount)
      expect(instanced, type).toHaveLength(drawnParts * 2)
      expect(instanced.filter((mesh) => !mesh.material.isMeshToonMaterial)).toHaveLength(drawnParts)
      expect(instanced.reduce((sum, mesh) => sum + mesh.count, 0)).toBe(expected.reduce((sum, part) => sum + part.matrices.length, 0) * 2)
      for (const mesh of instanced.filter((candidate) => candidate.material.isMeshToonMaterial)) {
        expect(mesh.material.isMeshToonMaterial).toBe(true)
        expect(mesh.material.map).toBeTruthy()
      }
    }
  })
})

// 2026-11-15 Terry: "이미 만든 프랍, 에셋들 절대 지우지 마. 무료 에셋과 혼용해라."
describe('our props mixed with KayKit (Terry 11-15)', () => {
  const MIXED_STAGES = ['stage1', 'stage2', 'stage4', 'stage5']
  const samePosition = (a, b) => a.every((value, index) => Math.abs(value - b[index]) < 1e-9)

  it('splits deterministically by authored index, never by Math.random, at the KAYKIT_MIX_RATIO share', () => {
    const random = vi.spyOn(Math, 'random')
    for (const stageId of MIXED_STAGES) {
      const placements = getStageObjectPlacements(stageId)
      for (const type of KAYKIT_STAGE_OBJECT_TYPES) {
        const items = placements.filter((placement) => placement.type === type)
        if (items.length === 0) continue
        const first = splitKaykitMix(items)
        const second = splitKaykitMix([...items])
        expect(second.kaykit.map(({ id }) => id)).toEqual(first.kaykit.map(({ id }) => id))
        expect(second.ours.map(({ id }) => id)).toEqual(first.ours.map(({ id }) => id))
        expect(first.ours.length + first.kaykit.length).toBe(items.length)
        if (items.length === 1) {
          expect(first.ours).toHaveLength(1) // single placement keeps our original
          continue
        }
        expect(first.ours.length, `${stageId} ${type}`).toBeGreaterThan(0)
        expect(first.kaykit.length, `${stageId} ${type}`).toBeGreaterThan(0)
        expect(Math.abs(first.kaykit.length - items.length * KAYKIT_MIX_RATIO)).toBeLessThanOrEqual(1)
      }
    }
    expect(random).not.toHaveBeenCalled()
    expect(KAYKIT_MIX_RATIO).toBe(0.5)
  })

  it('keeps both kinds even when the ratio would round one of them away', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    for (const ratio of [0.05, 0.95]) {
      const { ours, kaykit } = splitKaykitMix(items, ratio)
      expect(ours).toHaveLength(1)
      expect(kaykit).toHaveLength(1)
    }
    expect(splitKaykitMix([{ id: 'solo' }], 0.95)).toEqual({ ours: [{ id: 'solo' }], kaykit: [] })
  })

  it.each(MIXED_STAGES)('%s renders BOTH our prop and the KayKit model for every mixed type, each placement once', async (stageId) => {
    const state = await mount(<StageObjectLayer stageId={stageId} />)
    const layer = state.scene.getObjectByName(`stage-object-layer-${stageId}`)
    const placements = getStageObjectPlacements(stageId)
    for (const type of KAYKIT_STAGE_OBJECT_TYPES) {
      const items = placements.filter((placement) => placement.type === type)
      if (items.length === 0) continue
      const { ours, kaykit } = splitKaykitMix(items)

      // KayKit share: instanced copies == KayKit placements' slots, and nothing for our share.
      const batch = state.scene.getObjectByName(`kaykit-batch-${type}`)
      const expectedCopies = buildKaykitPropInstances(type, kaykit).reduce((sum, part) => sum + part.matrices.length, 0)
      if (kaykit.length === 0) {
        expect(batch, `${stageId} ${type}`).toBeUndefined()
      } else {
        const fills = []
        batch.traverse((object) => { if (object.isInstancedMesh && object.material.isMeshToonMaterial) fills.push(object) })
        expect(fills.reduce((sum, mesh) => sum + mesh.count, 0), `${stageId} ${type}`).toBe(expectedCopies)
      }

      // Our share: the original renderer (island batch, or one top-level group per placement).
      if (type === 'staffroomDeskIsland') {
        expect(state.scene.getObjectByName('staffroom-desk-islands')).toBeDefined()
        continue
      }
      const topLevel = layer.children.filter((child) => !child.name.startsWith('kaykit-batch-'))
      for (const placement of ours) {
        expect(topLevel.some((child) => samePosition(child.position.toArray(), placement.position)), `${stageId} ${placement.id}`).toBe(true)
      }
      for (const placement of kaykit) {
        expect(topLevel.some((child) => samePosition(child.position.toArray(), placement.position)), `${stageId} ${placement.id} drawn twice`).toBe(false)
      }
    }
  })
})
