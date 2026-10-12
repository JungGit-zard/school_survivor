// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn() }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))
vi.mock('./StudioTunedGroup.jsx', () => ({ default: () => null }))

import EscapePortal from './EscapePortal.jsx'
import { useFrame } from '@react-three/fiber'
import { clearPortalTarget, portalTarget, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'

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
