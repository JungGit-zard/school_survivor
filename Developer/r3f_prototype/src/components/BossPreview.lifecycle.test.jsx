// @vitest-environment jsdom
// Real R3F reconciler + authored meshes, NOT a DOM Canvas/model mock.
// Only the GPU driver and offline image/2D-canvas boundaries are substitutes.
import React, { StrictMode, Suspense, useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import { EnemyVisual } from './Enemy.jsx'
import { resolveBossPreviewBaseY } from './StageBossPreview.jsx'
import { StudioTuningSnapshotProvider } from './StudioTunedGroup.jsx'
import { getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'

extend(THREE)
const roots = []
const textures = new Map()
let effectTrace

function Probe() {
  useEffect(() => {
    effectTrace.push('setup')
    return () => { effectTrace.push('cleanup') }
  }, [])
  return null
}

async function mountBoss(type, { tuned = true } = {}) {
  const canvas = document.createElement('canvas')
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  const root = createRoot(canvas)
  roots.push(root)
  root.configure({ gl, frameloop: 'never', orthographic: true, camera: { position: [0, 2.2, 5.5], zoom: 80 }, size: { width: 300, height: 160, top: 0, left: 0 }, dpr: 1 })
  let state
  function StateProbe() { state = useThree(); return null }
  const itemId = getStudioZombieItemId(type)
  // In-memory test input only; no Studio/storage/Firebase writes.
  const datasets = { tunings: tuned ? { [itemId]: { color: '#889977', colorStrength: 0.15 } } : {}, decals: {} }
  function Gate({ pending }) { if (pending) throw pending; return null }
  const render = (pending = null) => root.render(<StrictMode><StateProbe /><Probe /><Suspense fallback={null}>
    <StudioTuningSnapshotProvider datasets={datasets}>
      <Gate pending={pending} />
      <group rotation={[0.08, -0.5, 0]} position={[0, resolveBossPreviewBaseY(type), 0]}>
        <EnemyVisual type={type} animPhase="normal" showHealthBar={false} staticPose={false} />
      </group>
    </StudioTuningSnapshotProvider>
  </Suspense></StrictMode>)
  await act(async () => {
    render()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  return { root, state, render }
}

function meshesIn(scene) {
  const meshes = []
  scene.traverse((object) => { if (object.isMesh) meshes.push(object) })
  return meshes
}

function assertLiveModel(state, type) {
  state.advance(0.25)
  state.scene.updateMatrixWorld(true)
  const meshes = meshesIn(state.scene)
  expect(meshes.length).toBeGreaterThan(40)
  const face = state.scene.getObjectByName(type === 'B01' ? 'b01MathTeacherFaceTexture' : 'b02Stage2BossFaceTexture')
  expect(face).toBeTruthy()
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse))
  expect(frustum.intersectsObject(face), 'approved face is in the preview camera frustum').toBe(true)
  expect(face.visible).toBe(true)
  for (const mesh of meshes) {
    expect(mesh.matrixWorld.elements.every(Number.isFinite)).toBe(true)
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(0)
    expect(mesh.material.userData.studioMaterialDisposed, `${type} live material ${mesh.name || mesh.uuid}`).not.toBe(true)
  }
  return meshes
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  effectTrace = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillStyle: '', fillRect() {} }))
  // Preserve real useLoader/Suspense/cache. Fulfil only the external image read offline.
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(function (url, onLoad) {
    let texture = textures.get(url)
    if (!texture) { texture = new THREE.Texture(); texture.name = url; textures.set(url, texture) }
    queueMicrotask(() => onLoad?.(texture))
    return texture
  })
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  // Exercise R3F's real delayed root teardown, not just update(null).
  await new Promise((resolve) => setTimeout(resolve, 550))
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('Stage1/2 authored model lifecycle (CPU reconciler, not rendered-device acceptance)', () => {
  it.each(['B01', 'B02'])('%s has live owned materials after real StrictMode setup-cleanup-setup', async (type) => {
    const { state } = await mountBoss(type)
    expect(effectTrace.slice(0, 3)).toEqual(['setup', 'cleanup', 'setup'])
    assertLiveModel(state, type)
  })

  it.each(['B01', 'B02'])('%s releases every mounted owned material exactly once on real R3F unmount', async (type) => {
    const { root, state } = await mountBoss(type)
    const materials = [...new Set(meshesIn(state.scene).map((mesh) => mesh.material))]
      .filter((material) => material.userData.studioMaterialOwner)
    expect(materials.length).toBeGreaterThan(40)
    const disposals = materials.map((material) => vi.spyOn(material, 'dispose'))
    await act(async () => root.unmount())
    roots.splice(roots.indexOf(root), 1)
    await new Promise((resolve) => setTimeout(resolve, 550))
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1)
  })

  it.each(['B01', 'B02'])('%s reacquires live resources after real Suspense hide/reveal', async (type) => {
    const { state, render } = await mountBoss(type)
    assertLiveModel(state, type)
    let release
    const pending = new Promise((resolve) => { release = resolve })
    await act(async () => { render(pending) })
    const hiddenFace = state.scene.getObjectByName(type === 'B01' ? 'b01MathTeacherFaceTexture' : 'b02Stage2BossFaceTexture')
    let node = hiddenFace
    let hidden = false
    while (node) { hidden ||= !node.visible; node = node.parent }
    expect(hidden, 'real reconciler committed the hidden subtree').toBe(true)
    await act(async () => { release(); render() })
    assertLiveModel(state, type)
  })

  it.each([['B01', false], ['B02', false], ['B01', true], ['B02', true]])('%s survives repeated lobby/game/lobby roots (tuned=%s) with shared cache intact', async (type, tuned) => {
    const sharedResources = new Set()
    const sharedDisposals = []
    for (let cycle = 0; cycle < 3; cycle += 1) {
      for (const screen of ['lobby', 'game', 'lobby-return']) {
        const { root, state } = await mountBoss(type, { tuned })
        const meshes = assertLiveModel(state, type)
        for (const mesh of meshes) {
          // Cached props differ from locally attached planeGeometry/material nodes.
          for (const resource of [mesh.geometry, mesh.material]) {
            if (resource.__r3f?.parent || resource.userData?.studioMaterialOwner || sharedResources.has(resource)) continue
            sharedResources.add(resource)
            resource.addEventListener('dispose', () => sharedDisposals.push(resource.uuid))
          }
        }
        await act(async () => root.unmount())
        roots.splice(roots.indexOf(root), 1)
        await new Promise((resolve) => setTimeout(resolve, 550))
        expect(sharedDisposals, `${screen} cycle ${cycle}`).toEqual([])
      }
    }
  }, 20000)
})
