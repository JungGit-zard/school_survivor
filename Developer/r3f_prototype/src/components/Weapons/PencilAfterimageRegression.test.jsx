// @vitest-environment jsdom
// 2026-11-13 Terry: "연필로 계속 진행하다 보면 화면에 잔상이 연필 남는다".
// R3F 8 requests its next loop frame *before* running useFrame callbacks, so a
// deferred-list flush queued in frame N runs only after frame N+1's callbacks.
// A pencil that spent its last pierce hit in frame N was removed only from the
// pending list; when PencilThrow fired in frame N+1 it rebuilt the list from the
// stale committed list and resurrected that pencil. Its hitsLeft was already 0,
// so its frame returned early forever and it stayed frozen on screen.
import React, { act, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = vi.hoisted(() => new Set())
const animationFrames = vi.hoisted(() => [])

// Mirrors useFrame subscription: one live entry per mounted component, in mount
// order, removed on unmount.
vi.mock('../../lib/usePlayingFrame.js', () => ({
  usePlayingFrame: (callback) => {
    const callbackRef = useRef(callback)
    callbackRef.current = callback
    useEffect(() => {
      const entry = (state, delta) => callbackRef.current(state, delta)
      frameCallbacks.add(entry)
      return () => { frameCallbacks.delete(entry) }
    }, [])
  },
}))

vi.mock('../../lib/sfxEvents.js', () => ({
  emitSfx: vi.fn(),
}))

vi.mock('../../lib/toon.js', async (importOriginal) => ({
  ...(await importOriginal()),
  outlineMat: vi.fn(() => ({})),
  toonMat: vi.fn(() => ({})),
  inflateScale: (scale) => scale,
}))

vi.mock('../StudioTunedGroup.jsx', () => ({
  default: ({ children }) => <div data-testid="pencil-projectile-model">{children}</div>,
}))

import { PencilThrow } from './Pencil.jsx'
import { enemyBodies, enemyPool, enemySimulationRuntime, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'

const FRAME_DELTA = 1 / 60

describe('Pencil afterimage regression', () => {
  let container
  let root
  let elapsed

  // One browser frame in R3F 8 order: the loop (all useFrame callbacks) runs
  // first, then the rAF callbacks that were queued during the previous frame.
  async function browserFrame() {
    const due = animationFrames.splice(0)
    elapsed += FRAME_DELTA
    await act(async () => {
      for (const callback of [...frameCallbacks]) callback({ clock: { elapsedTime: elapsed } }, FRAME_DELTA)
    })
    await act(async () => {
      for (const callback of due) callback(0)
    })
  }

  const mountedPencils = () => container.querySelectorAll('[data-testid="pencil-projectile-model"]').length

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    Object.defineProperty(HTMLElement.prototype, 'position', {
      configurable: true,
      value: { set: vi.fn() },
    })
    Object.defineProperty(HTMLElement.prototype, 'rotation', {
      configurable: true,
      value: { y: 0 },
    })
    frameCallbacks.clear()
    animationFrames.length = 0
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    useGameStore.getState().resetGame()
    enemyBodies.clear()
    enemyPool.reset()
    enemySimulationRuntime.reset()
    playerPos.set(0, 0, 0)
    elapsed = 0

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<PencilThrow />)
    })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
    }
    container?.remove()
    vi.unstubAllGlobals()
    delete HTMLElement.prototype.position
    delete HTMLElement.prototype.rotation
    frameCallbacks.clear()
    animationFrames.length = 0
    enemyBodies.clear()
    enemyPool.reset()
    enemySimulationRuntime.reset()
    playerPos.set(0, 0, 0)
  })

  it('never leaves a spent pencil mounted after many fire/expire cycles at max pierce', async () => {
    // Max pierce through the real level-up transition (cap reached when it stops growing).
    for (let guard = 0; guard < 10; guard += 1) {
      const before = useGameStore.getState().weapons.pencilThrow.pierce
      await act(async () => { useGameStore.getState().applyUpgrade('pencilPierce') })
      if (useGameStore.getState().weapons.pencilThrow.pierce === before) break
    }
    const pierce = useGameStore.getState().weapons.pencilThrow.pierce
    expect(pierce).toBeGreaterThanOrEqual(3)
    // Fire every frame so a fire always lands in the frame after a hit-expire,
    // the window that happens by chance in a long real run.
    useGameStore.setState((state) => ({
      weapons: { ...state.weapons, pencilThrow: { ...state.weapons.pencilThrow, cooldown: 1 } },
    }))
    expect(useGameStore.getState().phase).toBe('playing')

    // A tanky line of enemies straight ahead: every pencil homes on the nearest,
    // then pierces down the line and spends its last hit (hit-expire path).
    const line = []
    for (let i = 0; i < pierce + 2; i += 1) {
      const handle = enemyPool.spawn({ type: 'E01', x: 0, y: 0, z: 0.9 + i * 0.3, hp: 1e9, maxHp: 1e9 })
      enemyPool.setHitHandler(handle, vi.fn())
      line.push(handle)
    }

    let peakMounted = 0
    for (let frame = 0; frame < 240; frame += 1) {
      await browserFrame()
      peakMounted = Math.max(peakMounted, mountedPencils())
    }
    expect(peakMounted).toBeGreaterThan(0)

    // Stop firing (no targets) and let every in-flight pencil reach its 3.5s lifetime.
    useGameStore.setState((state) => ({
      weapons: { ...state.weapons, pencilThrow: { ...state.weapons.pencilThrow, active: false } },
    }))
    for (let frame = 0; frame < 300; frame += 1) await browserFrame()

    // Every expired pencil must be gone from the scene — no frozen afterimage.
    expect(mountedPencils()).toBe(0)
  })
})
