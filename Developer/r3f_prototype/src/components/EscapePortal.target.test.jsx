// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn() }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))
vi.mock('./StudioTunedGroup.jsx', () => ({ default: () => null }))

import EscapePortal, {
  EscapePortalSceneLight,
  getEscapePortalSceneLightIntensity,
  getEscapePortalSceneLightState,
} from './EscapePortal.jsx'
import { PORTAL_VISUAL_STATE } from '../lib/portalVisualState.js'
import { useFrame } from '@react-three/fiber'
import { clearPortalTarget, portalTarget, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { clampPlayerPosition } from '../lib/playerMovementBounds.js'

it.each(['stage1', 'stage2', 'stage3'])('north-edge portal must be activatable by a legal player: %s', (stageId) => {
  useGameStore.getState().resetGame(stageId)
  playerPos.set(0, 0.32, 0)
  let index = 0
  const random = vi.spyOn(Math, 'random').mockImplementation(() => [0.5, 0][index++ % 2])
  const root = createRoot(document.createElement('div'))
  try {
    act(() => root.render(<EscapePortal stageId={stageId} />))
    const closest = clampPlayerPosition(stageId, portalTarget)
    expect(Math.hypot(closest.x - portalTarget.x, closest.z - portalTarget.z)).toBeLessThan(0.6)
    playerPos.set(closest.x, 0.32, closest.z)
    const frame = useFrame.mock.calls.at(-1)[0]
    act(() => {
      frame({}, 1 / 60)
      for (let i = 0; i < 65; i++) frame({}, 1 / 60)
    })
    expect(useGameStore.getState().phase).toBe('cleared')
  } finally {
    act(() => root.unmount())
    random.mockRestore()
  }
})

afterEach(() => {
  clearPortalTarget()
  useGameStore.getState().resetGame('stage1')
})

describe('EscapePortal target publishing', () => {
  it('suction finishes at the cleared decision point without advancing the stage or remounting the game', () => {
    useGameStore.getState().resetGame('stage1')
    const gameKey = useGameStore.getState().gameKey
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<EscapePortal stageId="stage1" />))
    const frame = useFrame.mock.calls.at(-1)[0]
    playerPos.set(portalTarget.x, 0, portalTarget.z)
    act(() => {
      frame({}, 1 / 60)
      for (let i = 0; i < 65; i += 1) frame({}, 1 / 60)
    })
    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', currentStageId: 'stage1', gameKey })
    act(() => root.unmount())
  })

  it('publishes its selected target on mount and clears it on unmount', () => {
    useGameStore.getState().resetGame('stage1')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(<EscapePortal stageId="stage1" />)
    })
    expect(portalTarget.active).toBe(true)
    expect(Number.isFinite(portalTarget.x)).toBe(true)
    expect(Number.isFinite(portalTarget.z)).toBe(true)

    act(() => {
      root.unmount()
    })
    expect(portalTarget).toEqual({ active: false, x: 0, z: 0 })
  })
})

describe('EscapePortal scene light', () => {
  it('borrows the always-mounted scene light instead of mounting its own point light mid-run', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    useGameStore.getState().resetGame('stage1')
    const state = getEscapePortalSceneLightState()
    const hostRoot = createRoot(document.createElement('div'))
    const portalRoot = createRoot(document.createElement('div'))
    try {
      act(() => hostRoot.render(<EscapePortalSceneLight />))
      expect(state.hosts).toBe(1)
      expect(getEscapePortalSceneLightIntensity()).toBe(0)

      act(() => portalRoot.render(<EscapePortal stageId="stage1" />))
      expect(state.visual).toBe(PORTAL_VISUAL_STATE.idle)
      // The anchor lives inside StudioTunedGroup (mocked out here).
      state.anchor = {}
      expect(getEscapePortalSceneLightIntensity()).toBe(PORTAL_VISUAL_STATE.idle.lightIntensity)

      const frame = useFrame.mock.calls.filter(([fn]) => fn.length === 2).at(-1)[0]
      playerPos.set(portalTarget.x, 0, portalTarget.z)
      act(() => frame({}, 1 / 60))
      expect(getEscapePortalSceneLightIntensity()).toBe(PORTAL_VISUAL_STATE.sucking.lightIntensity)

      act(() => portalRoot.unmount())
      expect(state.visual).toBe(null)
      state.anchor = null
      expect(getEscapePortalSceneLightIntensity()).toBe(0)
    } finally {
      state.anchor = null
      act(() => hostRoot.unmount())
      consoleError.mockRestore()
    }
    expect(state.hosts).toBe(0)
  })

  it('keeps its own light when no scene light host is mounted (Studio preview)', () => {
    useGameStore.getState().resetGame('stage1')
    const root = createRoot(document.createElement('div'))
    act(() => root.render(<EscapePortal stageId="stage1" />))
    expect(getEscapePortalSceneLightState().visual).toBe(null)
    act(() => root.unmount())
  })
})
