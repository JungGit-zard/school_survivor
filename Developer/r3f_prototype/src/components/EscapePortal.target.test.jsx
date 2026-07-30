// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({ useFrame: vi.fn() }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))

import EscapePortal from './EscapePortal.jsx'
import { clearPortalTarget, portalTarget } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'

afterEach(() => {
  clearPortalTarget()
  useGameStore.getState().resetGame('stage1')
})

describe('EscapePortal target publishing', () => {
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
