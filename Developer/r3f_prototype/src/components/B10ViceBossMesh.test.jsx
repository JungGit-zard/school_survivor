// @vitest-environment jsdom
// B10 교감 좀비 mesh: render smoke through ZombieMesh with real R3F host objects (GPU stubbed).
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import ZombieMesh, { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { B10_VICE_PALETTE, B10_VICE_POSES, getB10VicePose } from './B10ViceBossMesh.jsx'
import { GRAPHICS_STUDIO_CATALOG, getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'

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

describe('B10 Vice Principal zombie mesh (spec Part B §12-2)', () => {
  it('renders through the ZombieMesh boss branch with toon surfaces, outlines and an SDF face', async () => {
    const { state } = await mount(<ZombieMesh type="B10" />)
    const root = state.scene.getObjectByName('b10ViceRoot')
    expect(root).toBeDefined()
    const meshes = []
    root.traverse((object) => { if (object.isMesh) meshes.push(object) })
    const outlines = meshes.filter((mesh) => mesh.userData.studioRenderOutline)
    const surfaces = meshes.filter((mesh) => !mesh.userData.studioRenderOutline && mesh.name !== 'b10ViceProceduralFace')
    expect(surfaces.every((mesh) => mesh.material.isMeshToonMaterial)).toBe(true)
    expect(outlines.length).toBeGreaterThan(20)
    // Same order of magnitude as the B04 chef (~45 blocks): keep the block count bounded.
    expect(surfaces.length).toBeGreaterThanOrEqual(40)
    expect(surfaces.length).toBeLessThanOrEqual(60)
    const face = state.scene.getObjectByName('b10ViceProceduralFace')
    expect(face.material.isShaderMaterial).toBe(true)
    expect(face.material.uniforms.uWarn.value).toBe(0)
    expect(face.material.fragmentShader).not.toMatch(/texture2D|sampler2D/)
    // The three silhouette points exist: comb-over, thick glasses, stamp + attendance ledger.
    for (const name of ['b10ViceCombOver1', 'b10ViceGlasses', 'b10ViceStampInk', 'b10ViceLedgerCover', 'b10ViceIdCard']) {
      expect(state.scene.getObjectByName(name), name).toBeDefined()
    }
    // Desk bell is only shown in the summon/phase-change stun pose.
    expect(state.scene.getObjectByName('b10ViceDeskBell').visible).toBe(false)
  })

  it('declares normal (stamp on shoulder), warn (stamp overhead, ledger back) and stun (bell tap) poses', () => {
    const hand = (rx) => ({ y: -Math.cos(rx), z: -Math.sin(rx) })
    // normal: stamp hand is above and behind the shoulder.
    expect(hand(B10_VICE_POSES.normal.armRX).y).toBeGreaterThan(0.5)
    expect(hand(B10_VICE_POSES.normal.armRX).z).toBeLessThan(0)
    // warn (b10_p1 stamp wind-up): stamp straight overhead, ledger stays in front.
    expect(hand(B10_VICE_POSES.warn.armRX).y).toBeGreaterThan(0.95)
    expect(hand(B10_VICE_POSES.warn.armLX).z).toBeGreaterThan(0.5)
    // charge (b10_p2 ledger wind-up): ledger swung far behind, stamp back on the shoulder.
    expect(hand(B10_VICE_POSES.ledger.armLX).z).toBeLessThan(-0.8)
    expect(B10_VICE_POSES.ledger.armRX).toBe(B10_VICE_POSES.normal.armRX)
    expect(getB10VicePose('charge')).toBe(B10_VICE_POSES.ledger)
    // stun: both hands forward and low (tapping the desk bell).
    expect(hand(B10_VICE_POSES.stun.armRX).z).toBeGreaterThan(0.8)
    expect(hand(B10_VICE_POSES.stun.armLX).z).toBeGreaterThan(0.8)
    expect(getB10VicePose('warn')).toBe(B10_VICE_POSES.warn)
    expect(getB10VicePose('stun')).toBe(B10_VICE_POSES.stun)
    expect(getB10VicePose('normal')).toBe(B10_VICE_POSES.normal)
    expect(getB10VicePose('retreat')).toBe(B10_VICE_POSES.normal)
  })

  it('uses the spec palette and registers the zombie-b10 Studio item and death-collapse palette', () => {
    expect(B10_VICE_PALETTE).toMatchObject({ skin: 0x9dbf8a, vest: 0x4b5d7a, shirt: 0xedebe4, stampHandle: 0x7a4e2d, stampInk: 0xd7263d, ledgerCover: 0x2f4f7f })
    expect(ZOMBIE_PALETTE.B10).toEqual({ body: 0x4b5d7a, skin: 0x9dbf8a, eye: 0x101010 })
    expect(getStudioZombieItemId('B10')).toBe('zombie-b10')
    const item = GRAPHICS_STUDIO_CATALOG.find(({ id }) => id === 'zombie-b10')
    expect(item).toMatchObject({ category: 'enemy', label: 'Boss B10 · 교감 좀비', previewKind: 'zombie', zombieType: 'B10' })
    expect(item.applyTargets).toContain('components/B10ViceBossMesh.jsx')
    const source = readFileSync(resolve(process.cwd(), 'src/components/ZombieMesh.jsx'), 'utf8')
    expect(source).toContain("<StudioTunedGroup itemId={getStudioZombieItemId('B10')}>")
  })

  it('keeps the lobby static pose free of frame animation', async () => {
    const { state } = await mount(<ZombieMesh type="B10" staticPose animPhase="warn" />)
    const armR = state.scene.getObjectByName('b10ViceArmR')
    expect(armR.rotation.x).toBeCloseTo(B10_VICE_POSES.normal.armRX, 6)
  })
})
