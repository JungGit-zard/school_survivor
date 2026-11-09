// @vitest-environment jsdom
// Real R3F reconciler + authored boss meshes. Only the GPU driver / 2D canvas boundary is stubbed.
import React from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import zombieMeshSource from './ZombieMesh.jsx?raw'
import faceSource from './BossProceduralFace.jsx?raw'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import ZombieMesh from './ZombieMesh.jsx'
import {
  BOSS_FACE_FRAGMENT_SHADERS,
  BOSS_PROCEDURAL_FACE_SPECS,
  getBossFaceChamferRadius,
  getBossFaceLayout,
  resolveBossFaceRecipe,
} from './BossProceduralFace.jsx'
import { StudioTuningSnapshotProvider } from './StudioTunedGroup.jsx'
import { FROZEN_STUDIO_SNAPSHOT } from '../title/frozenStudio.js'
import { BOSS_FACE_RECIPES_EVENT, getBossFacePartIndex } from '../lib/bossFaceParts.js'
import { GRAPHICS_STUDIO_TUNING_EVENT, getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'
import {
  FIREBASE_STUDIO_RUNTIME_EVENT,
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
} from '../lib/studioRuntimeState.js'

extend(THREE)

const BOSSES = ['B01', 'B02', 'B03', 'B04']
const PINNED_B01 = FROZEN_STUDIO_SNAPSHOT.datasets.bossFaceRecipes.B01
const WRONG_B01 = { brow: 'brow-angry-slash', eye: 'eye-x-dizzy', nose: 'nose-piggy', mouth: 'mouth-zigzag' }

describe('boss procedural face stays inside the head', () => {
  it.each(BOSSES)('%s face plane fits the flat (un-chamfered) front of its head block and hugs the surface', (type) => {
    const { headSize } = BOSS_PROCEDURAL_FACE_SPECS[type]
    const layout = getBossFaceLayout(type)
    const r = getBossFaceChamferRadius(headSize)
    expect(r).toBeCloseTo(Math.min(...headSize) * 0.14, 9)
    // The plane is centered on the head block, so its half extents must not pass the flat front.
    expect(layout.position[0]).toBe(0)
    expect(layout.position[1]).toBe(0)
    expect(layout.size[0] / 2).toBeLessThanOrEqual(headSize[0] / 2 - r + 1e-9)
    expect(layout.size[1] / 2).toBeLessThanOrEqual(headSize[1] / 2 - r + 1e-9)
    // Sits on the front surface (no floating decal in front of the head).
    expect(layout.position[2]).toBeGreaterThan(headSize[2] / 2)
    expect(layout.position[2] - headSize[2] / 2).toBeLessThanOrEqual(0.002)
  })

  it.each(BOSSES)('%s head block in ZombieMesh matches the face spec size and owns the face as a child', (type) => {
    const [w, h, d] = BOSS_PROCEDURAL_FACE_SPECS[type].headSize
    const sizeLiteral = `size={[${w.toFixed(2)}, ${h.toFixed(2)}, ${d.toFixed(2)}]}`
    const block = new RegExp(`<ZBlock[^>]*${sizeLiteral.replace(/[[\]{}.]/g, '\\$&')}[^>]*>\\s*<BossProceduralFace bossType="${type}"`)
    expect(zombieMeshSource).toMatch(block)
  })

  it.each(BOSSES)('%s shader is depth-tested, feature-only and masked to an inset of the flat front', (type) => {
    const shader = BOSS_FACE_FRAGMENT_SHADERS[type]
    expect(shader).toContain('float inside = cov(sdBox(p, vec2(0.0), uSize * 0.5 - vec2(0.004)));')
    expect(shader).toContain('gl_FragColor = vec4(col, alpha * inside);')
    expect(shader).not.toMatch(/texture2D|sampler2D/)
    expect(faceSource).not.toContain('depthTest={false}')
    expect(zombieMeshSource).not.toContain('depthTest={false} depthWrite={false}')
  })
})

describe('boss face recipe source order', () => {
  const snapshot = { bossFaceRecipes: { B01: PINNED_B01 } }

  it('explicit Studio preview recipe wins over everything', () => {
    expect(resolveBossFaceRecipe({ bossType: 'B01', recipeOverride: WRONG_B01, snapshot, runtimeRecipe: PINNED_B01 })).toEqual(WRONG_B01)
  })

  it('a snapshot provider pins the recipe and never falls back to runtime Firebase', () => {
    expect(resolveBossFaceRecipe({ bossType: 'B01', recipeOverride: undefined, snapshot, runtimeRecipe: WRONG_B01 })).toEqual(PINNED_B01)
    expect(resolveBossFaceRecipe({ bossType: 'B01', recipeOverride: undefined, snapshot, runtimeRecipe: null })).toEqual(PINNED_B01)
    // Pinned snapshot without a recipe for this boss = identity face, even if runtime has one.
    expect(resolveBossFaceRecipe({ bossType: 'B02', recipeOverride: undefined, snapshot, runtimeRecipe: WRONG_B01 })).toBeNull()
  })

  it('outside any snapshot the runtime Firebase recipe drives the face (game / Studio)', () => {
    expect(resolveBossFaceRecipe({ bossType: 'B01', recipeOverride: undefined, snapshot: null, runtimeRecipe: WRONG_B01 })).toEqual(WRONG_B01)
    expect(resolveBossFaceRecipe({ bossType: 'B01', recipeOverride: undefined, snapshot: null, runtimeRecipe: null })).toBeNull()
  })

  it('the title snapshot actually pins a B01 recipe', () => {
    expect(PINNED_B01).toEqual(expect.objectContaining({ brow: expect.any(String), eye: expect.any(String), nose: expect.any(String), mouth: expect.any(String) }))
  })
})

// ---- real reconciler mounts ----
const roots = []

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
}

async function mountB01({ snapshot }) {
  const canvas = document.createElement('canvas')
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  const root = createRoot(canvas)
  roots.push(root)
  root.configure({ gl, frameloop: 'never', camera: { position: [0, 2.2, 5.5] }, size: { width: 200, height: 200, top: 0, left: 0 }, dpr: 1 })
  let state
  function StateProbe() { state = useThree(); return null }
  // Same subtree the title uses: TitleScene3D wraps TitleBossZombie(<ZombieMesh type="B01" animPhase="charge" />)
  // in <StudioTuningSnapshotProvider datasets={FROZEN_STUDIO_SNAPSHOT.datasets}>.
  const boss = <ZombieMesh type="B01" animPhase="charge" />
  await act(async () => {
    root.render(<><StateProbe />{snapshot
      ? <StudioTuningSnapshotProvider datasets={FROZEN_STUDIO_SNAPSHOT.datasets}>{boss}</StudioTuningSnapshotProvider>
      : boss}</>)
  })
  await flush()
  return () => state
}

function faceUniforms(state) {
  const face = state.scene.getObjectByName('b01MathTeacherProceduralFace')
  expect(face, 'B01 procedural face mounted').toBeTruthy()
  const u = face.material.uniforms
  return { on: u.uRecipeOn.value, brow: u.uBrow.value, eye: u.uEye.value, nose: u.uNose.value, mouth: u.uMouth.value }
}

function recipeUniforms(recipe) {
  return {
    on: 1,
    brow: getBossFacePartIndex(recipe.brow),
    eye: getBossFacePartIndex(recipe.eye),
    nose: getBossFacePartIndex(recipe.nose),
    mouth: getBossFacePartIndex(recipe.mouth),
  }
}

// Whole-render fingerprint: every mesh's world transform, visibility, material color/opacity and face uniforms.
function fingerprint(state) {
  state.advance(0.5)
  state.scene.updateMatrixWorld(true)
  const rows = []
  state.scene.traverse((object) => {
    if (!object.isMesh) return
    let visible = true
    for (let node = object; node; node = node.parent) visible &&= node.visible
    const m = object.material
    const uniforms = m.uniforms
      ? Object.fromEntries(Object.entries(m.uniforms).filter(([key]) => key !== 'uTime').map(([key, value]) => [key, JSON.stringify(value.value)]))
      : null
    rows.push({
      name: object.name,
      visible,
      matrix: object.matrixWorld.elements.map((value) => Number(value.toFixed(5))),
      color: m.color ? m.color.getHexString() : null,
      opacity: m.opacity,
      uniforms,
    })
  })
  return rows
}

async function setRuntime(datasets) {
  await act(async () => {
    if (datasets === null) blockFirebaseStudioRuntime()
    else commitFirebaseStudioRuntime(datasets, { revision: 999999 })
    window.dispatchEvent(new CustomEvent(FIREBASE_STUDIO_RUNTIME_EVENT))
    window.dispatchEvent(new CustomEvent(GRAPHICS_STUDIO_TUNING_EVENT))
    window.dispatchEvent(new CustomEvent(BOSS_FACE_RECIPES_EVENT))
  })
  await flush()
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillStyle: '', fillRect() {} }))
  blockFirebaseStudioRuntime()
})

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  await new Promise((resolve) => setTimeout(resolve, 50))
  blockFirebaseStudioRuntime()
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('title B01 face comes only from the pinned snapshot', () => {
  it('matches the pinned recipe with an empty Firebase recipe and with a deliberately wrong one', async () => {
    await setRuntime({ bossFaceRecipes: {} })
    const getState = await mountB01({ snapshot: true })
    expect(faceUniforms(getState())).toEqual(recipeUniforms(PINNED_B01))

    await setRuntime({ bossFaceRecipes: { B01: WRONG_B01 } })
    expect(faceUniforms(getState())).toEqual(recipeUniforms(PINNED_B01))

    await setRuntime(null)
    expect(faceUniforms(getState())).toEqual(recipeUniforms(PINNED_B01))
  })

  it('also mounts fresh with the pinned recipe while Firebase holds a wrong recipe', async () => {
    await setRuntime({ bossFaceRecipes: { B01: WRONG_B01 } })
    const getState = await mountB01({ snapshot: true })
    expect(faceUniforms(getState())).toEqual(recipeUniforms(PINNED_B01))
  })

  it('control: outside the snapshot the same mesh follows the runtime recipe (the test can see a change)', async () => {
    await setRuntime({ bossFaceRecipes: { B01: WRONG_B01 } })
    const getState = await mountB01({ snapshot: false })
    expect(faceUniforms(getState())).toEqual(recipeUniforms(WRONG_B01))
    await setRuntime({ bossFaceRecipes: {} })
    expect(faceUniforms(getState()).on).toBe(0)
  })
})

describe('regression: blank or altered Firebase studio state does not change the title render', () => {
  it('B01 title subtree fingerprint is identical across blocked, blank and altered runtime state', async () => {
    const itemId = getStudioZombieItemId('B01')
    const getState = await mountB01({ snapshot: true })
    const baseline = fingerprint(getState())
    expect(baseline.length).toBeGreaterThan(40)

    await setRuntime({})
    expect(fingerprint(getState())).toEqual(baseline)

    await setRuntime({
      tunings: {
        [itemId]: { scale: 2.5, color: '#ff00ff', colorStrength: 0.9, positionY: 1.2 },
        [`${itemId}::part::0.0`]: { scale: 3, positionZ: 0.4 },
      },
      bossFaceRecipes: { B01: WRONG_B01 },
    })
    expect(fingerprint(getState())).toEqual(baseline)

    await setRuntime(null)
    expect(fingerprint(getState())).toEqual(baseline)
  })

  it('control: the same altered runtime state does change the fingerprint outside the snapshot', async () => {
    const itemId = getStudioZombieItemId('B01')
    await setRuntime({})
    const getState = await mountB01({ snapshot: false })
    const baseline = fingerprint(getState())
    await setRuntime({
      tunings: { [itemId]: { scale: 2.5, color: '#ff00ff', colorStrength: 0.9, positionY: 1.2 } },
      bossFaceRecipes: { B01: WRONG_B01 },
    })
    expect(fingerprint(getState())).not.toEqual(baseline)
  })
})
