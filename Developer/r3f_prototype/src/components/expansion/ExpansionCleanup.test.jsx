// @vitest-environment jsdom
// Actual Three/R3F reconciler; only GPU rendering and canvas drawing are offline.
import React, { act } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { applyProps, createRoot, extend, useThree } from '@react-three/fiber'
import ExpansionZombieInstanceLayer from './ExpansionZombieInstanceLayer.jsx'
import { blockFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

extend(THREE)
let root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  blockFirebaseStudioRuntime()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect() {} })
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  await new Promise(resolve => setTimeout(resolve, 550))
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

it('proves actual R3F applyProps null overwrites the real InstancedMesh disposal method', () => {
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial()
  const mesh = new THREE.InstancedMesh(geometry, material, 1)
  const dispose = mesh.dispose
  expect(dispose).toBe(THREE.InstancedMesh.prototype.dispose)
  applyProps(mesh, { dispose: null })
  expect(mesh.dispose).toBeNull()
  expect(() => mesh.dispose()).toThrow(TypeError)
  dispose.call(mesh); geometry.dispose(); material.dispose()
})

it('retains real primitive disposal methods and cleans each owned resource exactly once across remounts', async () => {
  root = createRoot(document.createElement('canvas'))
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  let scene
  function Probe() { scene = useThree(state => state.scene); return null }
  const render = async node => {
    await act(async () => { root.render(<><Probe />{node}</>); await new Promise(resolve => setTimeout(resolve, 0)) })
  }
  for (let cycle = 0; cycle < 2; cycle++) {
    await render(<ExpansionZombieInstanceLayer resetKey={cycle} />)
    const layer = scene.getObjectByName('expansion-normal-instance-layer')
    expect(layer.dispose).toBeNull() // Parent still opts out of R3F automatic disposal.
    const meshes = layer.children.filter(child => child.isInstancedMesh)
    expect(meshes).toHaveLength(4)
    const resources = [...meshes, ...meshes.flatMap(mesh => [mesh.geometry, mesh.material])]
    const disposed = resources.map(resource => { const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener })
    // Capture and assert methods before unmount, but always exercise cleanup even on RED.
    const methods = meshes.map(mesh => mesh.dispose)
    await render(null)
    expect(methods.every(method => method === THREE.InstancedMesh.prototype.dispose)).toBe(true)
    expect(scene.getObjectByName('expansion-normal-instance-layer')).toBeUndefined()
    await new Promise(resolve => setTimeout(resolve, 0))
    for (const listener of disposed) expect(listener).toHaveBeenCalledTimes(1)
  }
})
