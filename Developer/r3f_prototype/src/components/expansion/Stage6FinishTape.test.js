// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getStageBounds, getStageConfig } from '../../lib/stageConfig.js'
import { pickPortalPosition } from '../../lib/portalPlacement.js'
import { STAGE6_CELEBRATION_SFX } from '../../lib/stage6ProgrammeSfx.js'
import {
  STAGE6_FINISH_TAPE_HULL_COUNT,
  STAGE6_FINISH_TAPE_MODES as M,
  STAGE6_FINISH_TAPE_MOMENT,
  STAGE6_FINISH_TAPE_PORTAL_RING_RADIUS,
  STAGE6_FINISH_TAPE_SNAP_SECONDS,
  STAGE6_FINISH_TAPE_SOLID_COUNT,
  createStage6FinishTapeLedger,
  createStage6FinishTapeMeshes,
  createStage6FinishTapeState,
  disposeStage6FinishTapeMeshes,
  getStage6FinishTapeLayout,
  getStage6FinishTapeSnapProgress,
  stepStage6FinishTape,
  writeStage6FinishTapePose,
} from './stage6FinishTape.js'

// The exit's real Stage 6 spot: the same pick EscapePortal makes (portalAnchor, fixed on Stage 6).
const PORTAL = (() => { const [x, , z] = pickPortalPosition('stage6', { x: 0, z: 0 }); return { x, z } })()
// Rosari approaches from the north (the start side) unless a test says otherwise. portalKnown follows portalActive
// (EscapePortal publishes portalTarget when it mounts) unless a test overrides it.
const run = (overrides = {}) => ({
  stageId: 'stage6', gameKey: 1, portalActive: false, phase: 'playing', deltaSec: 1 / 60, reducedMotion: false,
  portalX: PORTAL.x, portalZ: PORTAL.z, playerX: PORTAL.x, playerZ: PORTAL.z - 5,
  ...overrides,
  portalKnown: overrides.portalKnown ?? overrides.portalActive === true,
})

function harness() {
  const state = createStage6FinishTapeState()
  const ledger = createStage6FinishTapeLedger()
  const cue = vi.fn()
  const step = (input) => stepStage6FinishTape(state, run(input), cue, ledger)
  return { state, ledger, cue, step }
}

describe('stage6 finish tape state', () => {
  it('is hidden before the gate opens, intact after, snaps once on clear and cues the celebration once', () => {
    const { state, cue, step } = harness()
    step({})
    expect(state.mode).toBe(M.hidden)
    step({ portalActive: true })
    expect(state.mode).toBe(M.intact)
    step({ portalActive: true }) // still intact while playing toward the exit
    expect(state.mode).toBe(M.intact)
    step({ portalActive: true, phase: 'cleared' })
    expect(state.mode).toBe(M.snapping)
    expect(cue).toHaveBeenCalledTimes(1)
    expect(cue).toHaveBeenCalledWith(STAGE6_FINISH_TAPE_MOMENT)
    expect(STAGE6_CELEBRATION_SFX[STAGE6_FINISH_TAPE_MOMENT]).toBeDefined()
    // ~0.6 s of frames: falls, then stays down; no second cue.
    for (let i = 0; i < 30; i += 1) step({ portalActive: true, phase: 'cleared', deltaSec: 0.01 })
    expect(state.mode).toBe(M.snapping)
    for (let i = 0; i < 60; i += 1) step({ portalActive: true, phase: 'cleared', deltaSec: 0.01 })
    expect(state.mode).toBe(M.down)
    expect(getStage6FinishTapeSnapProgress(state)).toBe(1)
    for (let i = 0; i < 10; i += 1) step({ portalActive: true, phase: 'cleared' })
    expect(state.mode).toBe(M.down)
    expect(cue).toHaveBeenCalledTimes(1)
    expect(STAGE6_FINISH_TAPE_SNAP_SECONDS).toBeCloseTo(0.6)
  })

  it('resets on restart (new gameKey) and cues again for the new run only', () => {
    const { state, cue, step } = harness()
    step({ portalActive: true })
    step({ portalActive: true, phase: 'cleared' })
    expect(cue).toHaveBeenCalledTimes(1)
    step({ gameKey: 2, portalActive: false, phase: 'playing' })
    expect(state.mode).toBe(M.hidden)
    expect(getStage6FinishTapeSnapProgress(state)).toBe(0)
    step({ gameKey: 2, portalActive: true })
    expect(state.mode).toBe(M.intact)
    step({ gameKey: 2, portalActive: true, phase: 'cleared' })
    expect(state.mode).toBe(M.snapping)
    expect(cue).toHaveBeenCalledTimes(2)
  })

  it('a remount in the same cleared run does not cue again and lands straight in the fallen pose', () => {
    const { ledger, cue } = harness()
    const first = createStage6FinishTapeState()
    stepStage6FinishTape(first, run({ portalActive: true }), cue, ledger)
    stepStage6FinishTape(first, run({ portalActive: true, phase: 'cleared' }), cue, ledger)
    const remounted = createStage6FinishTapeState()
    stepStage6FinishTape(remounted, run({ portalActive: true, phase: 'cleared' }), cue, ledger)
    expect(remounted.mode).toBe(M.down)
    expect(cue).toHaveBeenCalledTimes(1)
  })

  it('reduced motion hides the tape instantly instead of the flutter (cue still once)', () => {
    const { state, cue, step } = harness()
    step({ portalActive: true, reducedMotion: true })
    expect(state.mode).toBe(M.intact)
    step({ portalActive: true, phase: 'cleared', reducedMotion: true })
    expect(state.mode).toBe(M.gone)
    expect(cue).toHaveBeenCalledTimes(1)
    // Turning reduced motion on mid-snap also hides it.
    const other = harness()
    other.step({ portalActive: true })
    other.step({ portalActive: true, phase: 'cleared' })
    other.step({ portalActive: true, phase: 'cleared', reducedMotion: true })
    expect(other.state.mode).toBe(M.gone)
  })

  it('never shows or cues on any other stage, and gameover with the gate open does not snap it', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage7', 'stage8', 'stage9', 'stage10']) {
      const { state, cue, step } = harness()
      step({ stageId, portalActive: true })
      step({ stageId, portalActive: true, phase: 'cleared' })
      expect(state.mode, stageId).toBe(M.hidden)
      expect(cue, stageId).not.toHaveBeenCalled()
    }
    const { state, cue, step } = harness()
    step({ portalActive: true })
    step({ portalActive: true, phase: 'gameover' })
    expect(state.mode).toBe(M.intact)
    expect(cue).not.toHaveBeenCalled()
    // A clear without the gate open (not an exit) leaves it hidden.
    const noGate = harness()
    noGate.step({ phase: 'cleared' })
    expect(noGate.state.mode).toBe(M.hidden)
    expect(noGate.cue).not.toHaveBeenCalled()
  })
})


describe('stage6 finish tape at the exit portal', () => {
  beforeAll(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect() {} }) })
  const layout = getStage6FinishTapeLayout()
  const corners = (mesh, count) => {
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), out = []
    for (let i = 0; i < count; i += 1) {
      mesh.getMatrixAt(i, m)
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) out.push(v.set(x, y, z).applyMatrix4(m).clone())
    }
    return out
  }
  const centre = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixPosition(m) }

  it('Stage 6 exit spot comes from the stage data anchor (what EscapePortal picks), inside the arena', () => {
    const anchor = getStageConfig('stage6').portalAnchor
    expect(anchor?.fixed).toBe(true)
    expect(PORTAL).toEqual({ x: anchor.x, z: anchor.z })
    const { halfX, halfZ } = getStageBounds('stage6')
    expect(Math.abs(PORTAL.x)).toBeLessThan(halfX)
    expect(Math.abs(PORTAL.z)).toBeLessThan(halfZ)
  })

  it('waits for the published portal spot, then hangs posts outside the ring and the ribbon across the centre along screen X', () => {
    const meshes = createStage6FinishTapeMeshes(layout)
    const state = createStage6FinishTapeState()
    const ledger = createStage6FinishTapeLedger()
    const cue = vi.fn()
    expect([meshes.solid, meshes.hull].every((m) => m.isInstancedMesh)).toBe(true)
    // Prewarm frames: visible with zero instances (compileAsync sees it, nothing is drawn).
    writeStage6FinishTapePose(state, layout, meshes, true)
    expect(meshes.solid.visible).toBe(true)
    expect(meshes.solid.count + meshes.hull.count).toBe(0)
    // Before the exit: hidden, zero draws.
    stepStage6FinishTape(state, run(), cue, ledger)
    writeStage6FinishTapePose(state, layout, meshes)
    expect(meshes.solid.visible || meshes.hull.visible).toBe(false)
    expect(meshes.solid.count + meshes.hull.count).toBe(0)
    // Exit active but EscapePortal has not published its spot yet: still hidden.
    stepStage6FinishTape(state, run({ portalActive: true, portalKnown: false }), cue, ledger)
    expect(state.mode).toBe(M.hidden)
    // Follows wherever the exit really is (moved spot = fallback placement).
    const spot = { x: PORTAL.x + 1.25, z: PORTAL.z - 2 }
    stepStage6FinishTape(state, run({ portalActive: true, portalX: spot.x, portalZ: spot.z, playerX: spot.x, playerZ: spot.z - 5 }), cue, ledger)
    expect(state.mode).toBe(M.intact)
    expect(writeStage6FinishTapePose(state, layout, meshes)).toBe(true)
    expect(meshes.solid.count).toBe(STAGE6_FINISH_TAPE_SOLID_COUNT)
    expect(meshes.hull.count).toBe(STAGE6_FINISH_TAPE_HULL_COUNT)
    expect(writeStage6FinishTapePose(state, layout, meshes)).toBe(false) // static while intact

    // Short posts, fully outside the portal ring (never cover the portal or Rosari standing in it).
    for (const i of [0, 1]) {
      const c = centre(meshes.solid, i)
      expect(Math.abs(c.z - spot.z)).toBeLessThan(1e-6)
      expect(Math.abs(c.x - spot.x) - layout.postW / 2 - layout.outline).toBeGreaterThan(STAGE6_FINISH_TAPE_PORTAL_RING_RADIUS)
    }
    for (const p of corners(meshes.solid, 2)) expect(p.y).toBeLessThanOrEqual(0.7)
    // Ribbon: two halves meeting over the portal centre, along world X (screen-horizontal for the fixed camera).
    const left = centre(meshes.solid, 2), right = centre(meshes.solid, 3)
    expect(left.x).toBeCloseTo(spot.x - layout.postX / 2)
    expect(right.x).toBeCloseTo(spot.x + layout.postX / 2)
    expect(left.z).toBeCloseTo(spot.z)
    expect(left.y).toBeCloseTo(layout.ribbonY)
    for (const p of [...corners(meshes.solid, 6), ...corners(meshes.hull, 4)]) expect(p.y).toBeGreaterThanOrEqual(-1e-6)
    disposeStage6FinishTapeMeshes(meshes)
  })

  it('on the exit clear the halves fall away from the side Rosari came from and settle on the ground', () => {
    for (const [fromZ, sign] of [[PORTAL.z - 5, 1], [PORTAL.z + 3, -1]]) {
      const meshes = createStage6FinishTapeMeshes(layout)
      const state = createStage6FinishTapeState()
      const ledger = createStage6FinishTapeLedger()
      const cue = vi.fn()
      stepStage6FinishTape(state, run({ portalActive: true, playerZ: fromZ }), cue, ledger)
      // Standing inside the ring (suction) does not change the remembered approach side.
      stepStage6FinishTape(state, run({ portalActive: true, playerX: PORTAL.x, playerZ: PORTAL.z }), cue, ledger)
      stepStage6FinishTape(state, run({ portalActive: true, phase: 'cleared', playerX: PORTAL.x, playerZ: PORTAL.z }), cue, ledger)
      expect(state.mode).toBe(M.snapping)
      for (let i = 0; i < 80; i += 1) {
        stepStage6FinishTape(state, run({ portalActive: true, phase: 'cleared', deltaSec: 0.01, playerX: PORTAL.x, playerZ: PORTAL.z }), cue, ledger)
        writeStage6FinishTapePose(state, layout, meshes)
        for (const p of [...corners(meshes.solid, meshes.solid.count), ...corners(meshes.hull, meshes.hull.count)]) {
          expect(p.y).toBeGreaterThanOrEqual(-1e-6)
          expect(meshes.solid.boundingSphere.containsPoint(p)).toBe(true) // culling sphere covers every pose
        }
      }
      expect(state.mode).toBe(M.down)
      expect(cue).toHaveBeenCalledTimes(1)
      for (const i of [2, 3]) {
        const c = centre(meshes.solid, i)
        expect(c.y).toBeCloseTo(layout.restY)
        expect(Math.sign(c.z - PORTAL.z)).toBe(sign)
      }
      expect(writeStage6FinishTapePose(state, layout, meshes)).toBe(false)
      disposeStage6FinishTapeMeshes(meshes)
    }
  })

  it('is decoration only: no collider, no damage, no Studio tuning group; reads the portal spot; mounted for stage 6 only', () => {
    const src = resolve(process.cwd(), 'src') // vitest runs from Developer/r3f_prototype
    const tape = readFileSync(resolve(src, 'components/expansion/stage6FinishTape.js'), 'utf8') + readFileSync(resolve(src, 'components/expansion/Stage6FinishTape.jsx'), 'utf8')
    expect(tape).not.toMatch(/Collider|RigidBody|rapier|damagePlayer|damageEnemy|StudioTunedGroup/)
    // R3F writes a primitive's dispose prop onto the object (dispose={null} broke unmount cleanup in the browser).
    expect(tape).not.toMatch(/<primitive[^>]*dispose=/)
    expect(tape).toContain('portalTarget.x')
    // The ring radius the posts clear is EscapePortal's own.
    expect(readFileSync(resolve(src, 'components/EscapePortal.jsx'), 'utf8')).toContain(`const PORTAL_RADIUS = ${STAGE6_FINISH_TAPE_PORTAL_RING_RADIUS}`)
    const env = readFileSync(resolve(src, 'components/expansion/ExpansionStageEnvironment.jsx'), 'utf8')
    expect(env).toContain("stageId==='stage6'&&!staticPose&&<Stage6FinishTape stageId={stageId}/>")
  })
})
