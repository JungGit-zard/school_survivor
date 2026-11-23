// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real Canvas needs WebGL; capture only the frameloop prop it receives.
vi.mock('@react-three/fiber', async (importOriginal) => ({
  ...(await importOriginal()),
  Canvas: ({ frameloop }) => <div data-testid="game-canvas" data-frameloop={frameloop} />,
}))
// Shader warm-up never runs without a real Canvas; treat it as done so only the racer flag matters.
vi.mock('./StageEntryRuntimeDiagnostics.jsx', () => ({
  default: () => null,
  isStageEntryWarmupPending: () => false,
  subscribeStageEntryWarmup: () => () => {},
}))

import GameCanvas from './GameCanvas.jsx'
import { setRacerOverlayOpen } from '../lib/racerOverlayState.js'

let root, container
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => setRacerOverlayOpen(false))
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('GameCanvas pauses while the Sltera racer overlay is open', () => {
  it("renders frameloop 'never' while the racer flag is set and resumes 'always' when it clears", () => {
    act(() => root.render(<GameCanvas gameKey={1} phase="cleared" />))
    const frameloop = () => container.querySelector('[data-testid="game-canvas"]').dataset.frameloop
    expect(frameloop()).toBe('always')

    act(() => setRacerOverlayOpen(true))
    expect(frameloop()).toBe('never')

    act(() => setRacerOverlayOpen(false))
    expect(frameloop()).toBe('always')
  })
})
