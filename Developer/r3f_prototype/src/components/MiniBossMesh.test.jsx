// @vitest-environment jsdom
// Stage 5 B10 · Stage 6 B05 Kenney Mini 보스 메시(Terry 2026-11-21 "둘 다 안 A"). 실제 GLB를 node에서 읽어 빌드·렌더한다.
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import ZombieMesh from './ZombieMesh.jsx'
import { MiniBossModel, MINI_BOSS_FACE_PLANE } from './MiniBossMesh.jsx'
import { buildMiniBoss } from '../lib/miniBossGeometry.js'
import { B05_CHANT_STRIKE, MINI_BOSS_POSES, MINI_BOSS_TYPES, MINI_BOSS_VISUALS, getMiniBossVisual } from '../lib/miniBossRoster.js'
import MINI_BOSS_PROPS from '../lib/miniBossProps.data.js'
import { MINI_BODY_IDS, MINI_PALETTE_SLOT_INDEX, miniPaletteKeyAt } from '../lib/miniZombieRoster.js'
import { readMiniZombieScene } from '../lib/miniZombieGeometry.js'
import { createOutlineGeometry } from '../lib/projectileZombieShotGeometry.js'
import { AUTHORED_ATTACK_BOSSES, STAGE5_BOSS_STATS } from '../lib/stage5ViceBoss.js'
import { EXPANSION_BOSSES } from '../lib/expansionContent.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'

extend(THREE)
const GLB_URL = resolve(process.cwd(), 'src/assets/models/kenney_mini/mini_zombies_kenney.glb')
let gltf = null
let raw = null
beforeAll(async () => {
  const bytes = readFileSync(GLB_URL)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  loader.register(() => ({ name: 'test_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }))
  await MeshoptDecoder.ready
  // jsdom 환경: Buffer의 ArrayBuffer를 그대로 넘기면 GLTFLoader가 GLB로 알아보지 못한다 → 이 환경의 ArrayBuffer로 복사.
  const ab = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(ab).set(bytes)
  gltf = await new Promise((done, fail) => loader.parse(ab, '', done, fail))
  raw = readMiniZombieScene(gltf.scene)
})

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

describe('Mini boss data (B10 male-a, B05 male-d)', () => {
  it('uses bodies and palette slots that are already baked into mini_zombies_kenney.glb (no rebake)', () => {
    expect(MINI_BOSS_TYPES).toEqual(['B10', 'B05'])
    expect(MINI_BOSS_VISUALS.B10.body).toBe('male-a')
    expect(MINI_BOSS_VISUALS.B05.body).toBe('male-d')
    const slots = new Set()
    for (const v of Object.values(MINI_BOSS_VISUALS)) {
      expect(MINI_BODY_IDS).toContain(v.body)
      slots.add(v.skin); slots.add(v.eye)
      Object.values(v.recolor).forEach((s) => slots.add(s))
      Object.values(v.partRecolor).forEach((m) => Object.values(m).forEach((s) => slots.add(s)))
      v.splits.forEach((s) => { slots.add(s.then); slots.add(s.otherwise) })
    }
    for (const type of MINI_BOSS_TYPES) for (const p of [...MINI_BOSS_PROPS[type].props, ...MINI_BOSS_PROPS[type].stunProps]) slots.add(p.slot)
    for (const slot of slots) expect(MINI_PALETTE_SLOT_INDEX[slot], slot).toBeTypeOf('number')
  })

  it('keeps every gameplay value of both bosses (visual-only change)', () => {
    expect(STAGE5_BOSS_STATS.B10).toMatchObject({ hp: 1563, speed: 0.5225, damage: 22, scale: 2.0, contactDist: 0.36 })
    const b10 = AUTHORED_ATTACK_BOSSES.B10
    expect(b10.patterns.map((p) => [p.id, p.windupMs, p.activeMs, p.recoveryMs, p.cooldownMs, p.rangeUnits, p.damage])).toEqual([
      ['b10_p1', 1300, 300, 900, 5000, 1.6, 18], ['b10_p2', 1000, 250, 900, 5000, 3.2, 20]])
    const b05 = EXPANSION_BOSSES.B05
    expect(b05).toMatchObject({ hp: 4050, speedUnitsPerSec: 0.5, contactDamage: 22, scale: 2.2, contactDistUnits: 0.4 })
    expect(b05.patterns.map((p) => [p.id, p.windupMs, p.activeMs, p.recoveryMs, p.cooldownMs, p.rangeUnits, p.widthUnits, p.damage])).toEqual([
      ['b05_p1', 1600, 350, 1000, 9000, 6, 1.2, 9], ['b05_p2', 1400, 350, 1000, 9000, 7, 0.8, 9]])
  })

  it('maps the game anim phases onto the existing attack poses', () => {
    const b10 = getMiniBossVisual('B10'); const b05 = getMiniBossVisual('B05')
    expect(b10.poseFor('normal')).toBe(MINI_BOSS_POSES.B10.normal)
    expect(b10.poseFor('warn')).toBe(MINI_BOSS_POSES.B10.warn) // b10_p1 결재 도장
    expect(b10.poseFor('charge')).toBe(MINI_BOSS_POSES.B10.ledger) // b10_p2 출석부
    expect(b10.poseFor('stun')).toBe(MINI_BOSS_POSES.B10.stun) // 소집·격노 정지
    expect(b10.poseFor('retreat')).toBe(MINI_BOSS_POSES.B10.normal)
    expect(b05.poseFor('warn')).toBe(MINI_BOSS_POSES.B05.warn)
    expect(b05.poseFor('stun')).toBe(MINI_BOSS_POSES.B05.stun)
    // 도장은 warn에서 머리 위로(오른팔이 위로 돌아간다), 출석부는 charge에서 뒤로 젖힌다.
    expect(MINI_BOSS_POSES.B10.warn.armR[0]).toBeGreaterThan(2.5)
    expect(MINI_BOSS_POSES.B10.ledger.armL[0]).toBeGreaterThan(1)
  })
})

describe('Mini boss geometry from the real GLB', () => {
  it.each(MINI_BOSS_TYPES)('%s builds 6 parts with merged props, single-cell triangles and outlines', (type) => {
    const built = buildMiniBoss(raw, type, createOutlineGeometry)
    expect(built.parts.map((p) => p.key)).toEqual(['legL', 'legR', 'torso', 'armL', 'armR', 'head'])
    for (const p of built.parts) {
      expect(p.outlineGeometry).toBeTruthy()
      const uv = p.geometry.attributes.uv
      for (let t = 0; t < uv.count; t += 3) {
        const k = miniPaletteKeyAt(uv.getX(t), uv.getY(t))
        expect(miniPaletteKeyAt(uv.getX(t + 1), uv.getY(t + 1))).toBe(k)
        expect(miniPaletteKeyAt(uv.getX(t + 2), uv.getY(t + 2))).toBe(k)
      }
      // 피부·눈·입: Kenney 원래 피부 칸과 눈·입 조각이 남지 않는다(SDF 얼굴이 그린다).
      const keys = new Set(); for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
      expect(keys.has('eye')).toBe(false)
      expect(keys.has('mouth')).toBe(false)
    }
    const head = built.parts.find((p) => p.key === 'head')
    const keys = new Set(); const uv = head.geometry.attributes.uv
    for (let i = 0; i < uv.count; i += 1) keys.add(miniPaletteKeyAt(uv.getX(i), uv.getY(i)))
    expect(keys.has('zPale')).toBe(true)
    if (type === 'B05') expect(keys.has('white')).toBe(true) // 대머리 정수리 + 흰 옆머리
    expect(built.stunProps.length).toBeGreaterThan(0)
    expect(built.footY).toBeLessThan(0.02)
  })
})

describe('Mini boss mesh render', () => {
  it.each(MINI_BOSS_TYPES)('%s renders toon parts, outlines, an SDF face and hides stun-only props until stun', async (type) => {
    const { state } = await mount(<MiniBossModel type={type} scene={gltf.scene} />)
    const root = state.scene.getObjectByName(`miniBoss${type}Root`)
    expect(root).toBeDefined()
    const meshes = []
    root.traverse((o) => { if (o.isMesh) meshes.push(o) })
    const outlines = meshes.filter((m) => m.userData.studioRenderOutline)
    const face = state.scene.getObjectByName(`miniBoss${type}ProceduralFace`)
    const surfaces = meshes.filter((m) => !m.userData.studioRenderOutline && m !== face)
    expect(surfaces.every((m) => m.material.isMeshToonMaterial)).toBe(true)
    expect(outlines.length).toBe(surfaces.length)
    expect(face.material.isShaderMaterial).toBe(true)
    expect(face.material.fragmentShader).not.toMatch(/texture2D|sampler2D/)
    expect(face.material.uniforms.uWarn.value).toBe(0)
    // 몸 6파트 + 정지 소품. 보이는 그리기 호출 = 6×2 + 얼굴 1.
    const visibleSurfaces = surfaces.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent } return true })
    expect(visibleSurfaces).toHaveLength(6)
    const stunGroups = []
    root.traverse((o) => { if (o.name.startsWith(`miniBoss${type}Stun_`)) stunGroups.push(o) })
    expect(stunGroups.length).toBeGreaterThan(0)
    expect(stunGroups.every((g) => g.visible === false)).toBe(true)
    // 발바닥이 예전 모델 발바닥 높이에 온다(땅 접지 그대로).
    root.updateWorldMatrix(true, true)
    const box = new THREE.Box3()
    for (const m of visibleSurfaces) box.expandByObject(m, true)
    const legs = new THREE.Box3()
    for (const m of visibleSurfaces.filter((m) => /_leg[LR]$/.test(m.name))) legs.expandByObject(m, true)
    expect(legs.min.y).toBeCloseTo(getMiniBossVisual(type).legacyFootY, 2)
    // 들고 있는 소품(도장·마이크)이 땅 밑으로 들어가지 않는다.
    expect(box.min.y).toBeGreaterThan(getMiniBossVisual(type).legacyFootY - 0.02)
    // 키는 예전 보스와 같은 1.9~2.2(예전 메시 단위; EnemyVisual 그룹이 0.888/0.977을 곱한다).
    expect(box.max.y - box.min.y).toBeGreaterThan(1.8)
    expect(box.max.y - box.min.y).toBeLessThan(2.3)
  })

  it('shows the stun-only prop in the stun pose', async () => {
    const { state } = await mount(<MiniBossModel type="B10" scene={gltf.scene} animPhase="stun" />)
    const groups = []
    state.scene.traverse((o) => { if (o.name.startsWith('miniBossB10Stun_')) groups.push(o) })
    expect(groups.every((g) => g.visible)).toBe(true)
  })

  it('places the face plane on the Kenney eye pieces of both heads', () => {
    expect(MINI_BOSS_FACE_PLANE.width).toBeGreaterThan(0.5)
    expect(MINI_BOSS_FACE_PLANE.position[2]).toBeGreaterThan(0.17)
  })

  it('ZombieMesh keeps drawing the legacy model while the Mini GLB is not loaded (never blank)', async () => {
    const b10 = await mount(<ZombieMesh type="B10" />)
    expect(b10.state.scene.getObjectByName('b10ViceRoot')).toBeDefined()
    const b05 = await mount(<ZombieMesh type="B05" />)
    expect(b05.state.scene.getObjectByName('expansion-B05-rig')).toBeDefined()
  })
})

// Stage 6 B05 교가 제창(b05_p2) 타격 몸 연출(Terry 2026-11-22). Enemy.jsx의 공격 상태 ref를 그대로 읽는다(읽기 전용).
describe('B05 chant strike body motion', () => {
  const W = EXPANSION_BOSSES.B05.patterns[1].windupMs
  async function posedAt(elapsedMs, patternId = 'b05_p2') {
    const attackStateRef = { current: { snapshot: { patternId, elapsedMs, windupMs: W, activeMs: 350, recoveryMs: 1000, phase: elapsedMs < W ? 'windup' : 'active' } } }
    const { state } = await mount(<MiniBossModel type="B05" scene={gltf.scene} animPhase={elapsedMs < W ? 'warn' : 'normal'} attackStateRef={attackStateRef} />)
    await act(async () => { state.advance(1000); state.advance(1016) })
    const root = state.scene.getObjectByName('miniBossB05Root')
    root.updateWorldMatrix(true, true)
    const legs = new THREE.Box3()
    root.traverse((m) => { if (m.isMesh && /_leg[LR]$/.test(m.name)) legs.expandByObject(m, true) })
    return { root, legs, torso: state.scene.getObjectByName('miniBossB05_torsoRig'), armL: state.scene.getObjectByName('miniBossB05_armLRig') }
  }
  const fit = getMiniBossVisual('B05').fit

  it('squashes and bows at the impact time, feet stay on the ground', async () => {
    const hit = await posedAt(W)
    expect(hit.root.scale.y).toBeCloseTo(fit * (1 + B05_CHANT_STRIKE.squashY), 6)
    expect(hit.root.scale.x).toBeCloseTo(fit * (1 + B05_CHANT_STRIKE.squashXZ), 6)
    expect(hit.torso.rotation.x).toBeGreaterThan(0.3)
    expect(hit.armL.rotation.x).toBeCloseTo(MINI_BOSS_POSES.B05.chantStrike.armL[0], 1)
    expect(hit.legs.min.y).toBeCloseTo(getMiniBossVisual('B05').legacyFootY, 2)
  })

  it('stretches and leans back just before the strike, feet stay on the ground', async () => {
    const ready = await posedAt(W - B05_CHANT_STRIKE.strikeLeadMs)
    expect(ready.root.scale.y).toBeGreaterThan(fit)
    expect(ready.torso.rotation.x).toBeLessThan(-0.15)
    expect(ready.legs.min.y).toBeCloseTo(getMiniBossVisual('B05').legacyFootY, 2)
  })

  it('leaves the ring attack (b05_p1) and previews without a snapshot untouched', async () => {
    const ring = await posedAt(W, 'b05_p1')
    expect(ring.root.scale.y).toBeCloseTo(fit, 9)
    const { state } = await mount(<MiniBossModel type="B05" scene={gltf.scene} />)
    await act(async () => { state.advance(1000) })
    expect(state.scene.getObjectByName('miniBossB05Root').scale.y).toBeCloseTo(fit, 9)
  })
})
