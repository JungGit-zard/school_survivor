// @vitest-environment jsdom
// Stage 5 call-lane floor warning: real R3F host objects, GPU stubbed, frames driven by advance().
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import Stage5CallLaneGroundWarning, {
  getStage5CallLaneQuads,
  getStage5CallLaneWarningIntensity,
  STAGE5_CALL_LANE_WARNING,
} from './Stage5CallLaneGroundWarning.jsx'
import StageObjectLayer from './StageObjectLayer.jsx'
import { STAGE5_CALL_LANES } from '../../lib/stage5CallLane.js'
import { publishStage5CallLaneState, resetStage5CallLaneState } from '../../lib/stage5CallLaneRuntime.js'
import { useGameStore } from '../../store/useGameStore.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

extend(THREE)
const roots = []
let initialStore

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
  initialStore = useGameStore.getState()
  useGameStore.setState({ currentStageId: 'stage5', phase: 'playing', gameKey: 7 })
  resetStage5CallLaneState()
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  useGameStore.setState({ currentStageId: initialStore.currentStageId, phase: initialStore.phase, gameKey: initialStore.gameKey })
  resetStage5CallLaneState()
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

const lampHexes = (scene) => {
  const lamps = {}
  scene.traverse((object) => {
    const lane = object.userData.stage5CallLaneLamp
    if (lane) (lamps[lane] ??= []).push(object.material)
  })
  return lamps
}

describe('Stage 5 call-lane ground warning (spec Part B §7-2 · §12-3)', () => {
  it('covers each lane rectangle over the full map depth, with 0.08u edges kept inside the lane', () => {
    for (const lane of STAGE5_CALL_LANES) {
      const quads = getStage5CallLaneQuads(lane, 16)
      expect(quads.fill).toEqual([[(lane.minX + lane.maxX) / 2, 0, lane.maxX - lane.minX, 32]])
      expect(quads.solid).toHaveLength(4)
      for (const [cx, cz, w, d] of [...quads.solid, ...quads.dashed]) {
        expect(cx - w / 2).toBeGreaterThanOrEqual(lane.minX - 1e-9)
        expect(cx + w / 2).toBeLessThanOrEqual(lane.maxX + 1e-9)
        expect(Math.abs(cz) + d / 2).toBeLessThanOrEqual(16 + 1e-9)
        expect(Math.min(w, d)).toBeCloseTo(STAGE5_CALL_LANE_WARNING.edgeWidth, 9)
      }
      expect(quads.dashed.length).toBeGreaterThan(40)
    }
  })

  it('blinks at 2Hz while chiming, pulses at 1Hz while calling and fades out after the stream', () => {
    expect(getStage5CallLaneWarningIntensity('chiming', 0.1)).toBe(1)
    expect(getStage5CallLaneWarningIntensity('chiming', 0.3)).toBe(0.25)
    expect(getStage5CallLaneWarningIntensity('calling', 0.25)).toBeCloseTo(1, 6)
    expect(getStage5CallLaneWarningIntensity('calling', 0.75)).toBeCloseTo(0.5, 6)
    expect(getStage5CallLaneWarningIntensity('fading', 0, 0.5)).toBeCloseTo(0.5, 6)
    expect(getStage5CallLaneWarningIntensity('idle', 0)).toBe(0)
    // Lane tint is the inflow blue, never the damage telegraph yellow/red.
    expect(STAGE5_CALL_LANE_WARNING.fill).toBe('#5B8CFF')
    expect(STAGE5_CALL_LANE_WARNING.edge).toBe('#CFE0FF')
  })

  it('shows only the called lane (dashed while chiming, solid while calling) and lights only its two speakers', async () => {
    const state = await mount(<><StageObjectLayer stageId="stage5" /><Stage5CallLaneGroundWarning /></>)
    const warning = state.scene.getObjectByName('stage5-call-lane-ground-warning')
    const before = lampHexes(state.scene)
    await act(async () => state.advance(0.1))
    expect(warning.visible).toBe(false)

    publishStage5CallLaneState(7, 0, 1, 'chiming')
    await act(async () => state.advance(0.2))
    expect(warning.visible).toBe(true)
    const visibleLanes = STAGE5_CALL_LANES.filter(({ id }) => state.scene.getObjectByName(`stage5-call-lane-${id}`).visible).map(({ id }) => id)
    expect(visibleLanes).toEqual(['L2'])
    const l2 = state.scene.getObjectByName('stage5-call-lane-L2')
    expect(l2.getObjectByName('lane-edge-dashed').visible).toBe(true)
    expect(l2.getObjectByName('lane-edge-solid').visible).toBe(false)
    const lit = lampHexes(state.scene)
    expect(lit.L2).toHaveLength(2)
    expect(lit.L2.every((material) => material.isMeshBasicMaterial)).toBe(true)
    expect(lit.L1).toEqual(before.L1)

    publishStage5CallLaneState(7, 0, 1, 'calling')
    await act(async () => state.advance(0.4))
    expect(l2.getObjectByName('lane-edge-solid').visible).toBe(true)
    expect(l2.getObjectByName('lane-edge-dashed').visible).toBe(false)

    // Stream end: 300ms fade, then hidden and the speaker lamps restored.
    publishStage5CallLaneState(7, 0, 1, 'idle')
    await act(async () => state.advance(0.5))
    expect(warning.visible).toBe(true)
    await act(async () => state.advance(0.9))
    expect(warning.visible).toBe(false)
    expect(lampHexes(state.scene)).toEqual(before)
  })

  it('hides immediately for a stale run, another stage or a finished game', async () => {
    const state = await mount(<Stage5CallLaneGroundWarning />)
    const warning = state.scene.getObjectByName('stage5-call-lane-ground-warning')
    publishStage5CallLaneState(6, 0, 2, 'calling')
    await act(async () => state.advance(0.1))
    expect(warning.visible).toBe(false)
    publishStage5CallLaneState(7, 0, 2, 'calling')
    await act(async () => state.advance(0.2))
    expect(warning.visible).toBe(true)
    useGameStore.setState({ phase: 'gameover' })
    await act(async () => state.advance(0.3))
    expect(warning.visible).toBe(false)
    useGameStore.setState({ phase: 'playing', currentStageId: 'stage4' })
    await act(async () => state.advance(0.4))
    expect(warning.visible).toBe(false)
  })
})
