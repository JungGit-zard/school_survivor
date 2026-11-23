// @vitest-environment jsdom
// Christmas Santa zombies (XSG gift sack, XSL Rudolph sleigh): both type ids resolve to their own
// merged-part toon meshes, through the ZombieMesh switch (special/preview path) and through the
// pooled SantaZombieLayer.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import ZombieMesh, { ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import SantaZombieMesh, {
  SANTA_SACK_RIG, SANTA_SLEIGH_RIG, SANTA_ZOMBIE_TYPES, getSantaZombieVisual, getSantaSackPose,
  getSantaSleighPose, resolveSantaSackFleeing, buildSantaPartGeometry, SANTA_FACE_FRAGMENT_SHADER,
} from './SantaZombieMeshes.jsx'
import SantaZombieLayer, { santaSackFleeHint, getSantaLayerTypeCodes } from './SantaZombieLayer.jsx'
import { getFlashMat } from '../lib/toon.js'
import { enemyPool } from '../lib/refs.js'
import { ENEMY_TYPE_NAMES, enemyTypeToCode } from '../lib/enemyEntityPool.js'
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

function drawn(root) {
  const meshes = []
  root.traverse((object) => { if (object.isMesh) meshes.push(object) })
  return {
    outlines: meshes.filter((mesh) => mesh.userData.studioRenderOutline),
    bodies: meshes.filter((mesh) => mesh.userData.santaBody),
    shaders: meshes.filter((mesh) => mesh.material?.isShaderMaterial),
    all: meshes,
  }
}

function clearPool() {
  for (let i = 0; i <= enemyPool.highestActive; i++) if (enemyPool.active[i]) enemyPool.despawnIndex(i, enemyPool.generation[i])
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillRect() {} }))
  commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {} }, { revision: 1 })
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  clearPool()
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('Santa zombie registry', () => {
  it('both fixed type ids resolve to their own visual and death-debris palette', () => {
    expect(SANTA_ZOMBIE_TYPES).toEqual(['XSG', 'XSL'])
    expect(getSantaZombieVisual('XSG')).toMatchObject({ component: 'SantaSackZombieMesh', rootName: 'santaSackZombie', drawCalls: 15 })
    expect(getSantaZombieVisual('XSL')).toMatchObject({ component: 'SantaSleighZombieMesh', rootName: 'santaSleighZombie', drawCalls: 24 })
    expect(getSantaZombieVisual('E01')).toBeNull()
    expect(ZOMBIE_PALETTE.XSG.body).toBe(0xc4202a)
    expect(ZOMBIE_PALETTE.XSL).toBeDefined()
  })

  it('the pool knows both ids, and the layer reads those same codes', () => {
    const codes = getSantaLayerTypeCodes()
    expect(codes.XSG).toBe(enemyTypeToCode('XSG'))
    expect(codes.XSL).toBe(enemyTypeToCode('XSL'))
    expect(ENEMY_TYPE_NAMES[codes.XSG]).toBe('XSG')
    expect(ENEMY_TYPE_NAMES[codes.XSL]).toBe('XSL')
  })

  it('merges every block of a part into one body + one outline geometry with per-vertex colour and glow', () => {
    const { body, outline, blockCount } = buildSantaPartGeometry(SANTA_SLEIGH_RIG.deerHead.blocks)
    expect(blockCount).toBe(SANTA_SLEIGH_RIG.deerHead.blocks.length)
    expect(body.attributes.color.itemSize).toBe(3)
    const glow = body.attributes.aGlow.array
    // Rudolph's nose is the brightest thing on the model (self-glow > 1, no light added).
    expect(Math.max(...glow)).toBeGreaterThan(1)
    expect(outline.attributes.position.count).toBe(body.attributes.position.count)
    expect(outline.attributes.normal).toBeUndefined()
  })
})

describe('Santa zombie poses', () => {
  it('the flee gait reads differently from the wander gait', () => {
    const wander = getSantaSackPose(0.29, false)
    const flee = getSantaSackPose(0.29 * 5.5 / 14, true) // same leg phase
    expect(Math.abs(flee.legL[0])).toBeGreaterThan(Math.abs(wander.legL[0]) * 2)
    expect(flee.body[0]).toBeGreaterThan(wander.body[0] + 0.3) // leaning forward
    expect(flee.armL[0]).toBeLessThan(-1.9) // free arm flailing overhead
    expect(Math.abs(flee.head[1])).toBeGreaterThan(0.6) // looking back over the shoulder
    expect(flee.panic).toBe(1)
    expect(wander.panic).toBe(0)
  })

  it('flee state: pool COIN states win, otherwise measured speed with hysteresis', () => {
    expect(santaSackFleeHint(6)).toBe(true)
    expect(santaSackFleeHint(5)).toBe(false)
    expect(santaSackFleeHint(1)).toBeUndefined()
    expect(resolveSantaSackFleeing(false, 2, false)).toBe(false)
    expect(resolveSantaSackFleeing(false, 0.1, true)).toBe(true)
    expect(resolveSantaSackFleeing(false, 0.8, undefined)).toBe(false)
    expect(resolveSantaSackFleeing(false, 1.19, undefined)).toBe(true)
    expect(resolveSantaSackFleeing(true, 0.8, undefined)).toBe(true)
    expect(resolveSantaSackFleeing(true, 0.5, undefined)).toBe(false)
  })

  it('Rudolph gallops (front and back leg pairs out of phase) and the nose pulses', () => {
    const a = getSantaSleighPose(0.1)
    expect(a.legFL).not.toBeCloseTo(a.legBL, 2)
    const glows = [0, 0.3, 0.6, 0.9].map((t) => getSantaSleighPose(t).noseGlow)
    expect(Math.max(...glows) - Math.min(...glows)).toBeGreaterThan(0.2)
  })
})

describe('Santa zombie meshes', () => {
  it('XSG through the ZombieMesh switch: 7 merged toon parts + 7 outlines + SDF face = 15 draw calls', async () => {
    const { state } = await mount(<ZombieMesh type="XSG" />)
    const root = state.scene.getObjectByName('santaSackZombie')
    expect(root).toBeDefined()
    const { bodies, outlines, shaders, all } = drawn(root)
    expect(bodies).toHaveLength(Object.keys(SANTA_SACK_RIG).length)
    expect(outlines).toHaveLength(bodies.length)
    expect(bodies.every((mesh) => mesh.material.isMeshToonMaterial && mesh.material.vertexColors)).toBe(true)
    expect(outlines.every((mesh) => mesh.material.side === THREE.BackSide)).toBe(true)
    expect(shaders).toHaveLength(1)
    expect(shaders[0].name).toBe('santa-procedural-face')
    expect(shaders[0].material.fragmentShader).not.toMatch(/texture2D|sampler2D/)
    expect(all).toHaveLength(getSantaZombieVisual('XSG').drawCalls)
    for (const key of ['head', 'body', 'sack', 'armL', 'armR', 'legL', 'legR']) expect(root.getObjectByName(`santa-${key}`), key).toBeDefined()
  })

  it('XSL through the ZombieMesh switch: one entity with sleigh, Santa, Rudolph and a glowing nose = 24 draw calls', async () => {
    const { state } = await mount(<ZombieMesh type="XSL" />)
    const root = state.scene.getObjectByName('santaSleighZombie')
    expect(root).toBeDefined()
    const { bodies, outlines, shaders, all } = drawn(root)
    expect(bodies).toHaveLength(Object.keys(SANTA_SLEIGH_RIG).length)
    expect(outlines).toHaveLength(bodies.length)
    expect(shaders.map((mesh) => mesh.name).sort()).toEqual(['rudolph-nose-halo', 'santa-procedural-face'])
    expect(all).toHaveLength(getSantaZombieVisual('XSL').drawCalls)
    // Built facing +Z: Rudolph's head is in front of the sleigh.
    root.updateMatrixWorld(true)
    const deer = new THREE.Vector3(); const sleigh = new THREE.Vector3()
    root.getObjectByName('santa-deerHead').getWorldPosition(deer)
    root.getObjectByName('santa-sleigh').getWorldPosition(sleigh)
    expect(deer.z).toBeGreaterThan(sleigh.z + 1.5)
    // Footprint is centred on the entity origin (one hit target).
    const box = new THREE.Box3().setFromObject(root)
    expect(Math.abs((box.max.z + box.min.z) / 2)).toBeLessThan(0.35)
    expect(box.max.z - box.min.z).toBeGreaterThan(3)
  })

  it('hit flash swaps the merged body meshes to the shared white flash material', async () => {
    const { state } = await mount(<SantaZombieMesh type="XSG" hitFlash />)
    const { bodies } = drawn(state.scene.getObjectByName('santaSackZombie'))
    expect(bodies.every((mesh) => mesh.material === getFlashMat())).toBe(true)
  })

  it('face shader has a panic uniform for the fleeing look', () => {
    expect(SANTA_FACE_FRAGMENT_SHADER).toMatch(/uniform float uPanic/)
  })
})

describe('SantaZombieLayer (pooled path)', () => {
  it('draws one body per live Santa from the pool, facing its travel direction, and hides free slots', async () => {
    clearPool()
    const { state } = await mount(<SantaZombieLayer />)
    enemyPool.spawnInto({}, { type: 'XSL', x: 1, y: 0.4, z: -2, hp: 60, maxHp: 60, visualScale: 1.733, runDirX: 0, runDirZ: 1 })
    const sleighIndex = enemyPool.highestActive
    enemyPool.spawnTimer[sleighIndex] = 5000
    enemyPool.spawnInto({}, { type: 'XSG', x: -1, y: 0.3, z: 0, hp: 16, maxHp: 16, visualScale: 1.333 })
    const sackIndex = enemyPool.highestActive
    enemyPool.spawnTimer[sackIndex] = 5000
    enemyPool.state[sackIndex] = 6
    await act(async () => { state.advance(1) })
    enemyPool.posZ[sleighIndex] += 0.2 // moving +Z
    await act(async () => { state.advance(1.016) })

    const sleighSlot = state.scene.getObjectByName('santa-layer-XSL-0')
    const sackSlot = state.scene.getObjectByName('santa-layer-XSG-0')
    expect(sleighSlot.visible).toBe(true)
    expect(sackSlot.visible).toBe(true)
    expect(state.scene.getObjectByName('santa-layer-XSL-1').visible).toBe(false)
    expect(sleighSlot.position.x).toBeCloseTo(1)
    expect(sleighSlot.scale.x).toBeCloseTo(1.733 * 0.333)
    expect(sleighSlot.getObjectByName('santaSleighZombie')).toBeDefined()
    expect(sackSlot.getObjectByName('santaSackZombie')).toBeDefined()
    // turn group yaw follows the +Z travel
    expect(Math.abs(sleighSlot.children[0].rotation.y)).toBeLessThan(0.2)

    clearPool()
    await act(async () => { state.advance(1.032) })
    expect(sleighSlot.visible).toBe(false)
    expect(sackSlot.visible).toBe(false)
  })
})
