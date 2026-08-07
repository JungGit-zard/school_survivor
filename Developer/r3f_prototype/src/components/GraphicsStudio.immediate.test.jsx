// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import GraphicsStudio from './GraphicsStudio.jsx'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { loadStudioTunings } from '../lib/graphicsStudioConfig.js'

const cloud = vi.hoisted(() => ({ hydrate: vi.fn(), save: vi.fn(), mark: vi.fn(), flush: vi.fn(), setUser: vi.fn() }))
const auth = vi.hoisted(() => ({ state: { status: 'signedIn', user: { uid: 'master' } }, initialize: vi.fn() }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ ...auth.state, initializeAuth: auth.initialize }) }))
vi.mock('../lib/firebaseStudio.js', async (original) => ({ ...(await original()), hydrateFirebaseStudio: cloud.hydrate, saveFirebaseStudio: cloud.save, markFirebaseStudioLocalChange: cloud.mark, flushFirebaseStudioSave: cloud.flush, setFirebaseStudioUser: cloud.setUser }))
vi.mock('@react-three/fiber', () => ({ Canvas: () => <div /> }))
vi.mock('./GraphicsStudioPreview.jsx', () => ({ default: ({ selectedItem, tuning }) => <div>{selectedItem.id}:{tuning.scale}</div> }))

describe('Graphics Studio immediate Firebase contract', () => {
  let container
  let root
  beforeEach(() => {
    commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {}, bossFaceRecipes: {} }, { revision: 1 })
    cloud.hydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 1 })
    cloud.save.mockReset().mockImplementation(async () => ({ status: 'saved', revision: 2 + cloud.save.mock.calls.length - 1 }))
    cloud.mark.mockReset(); cloud.flush.mockReset().mockResolvedValue({ status: 'no-pending' }); cloud.setUser.mockReset(); auth.initialize.mockReset()
    vi.spyOn(window, 'open').mockReturnValue(null); window.alert = vi.fn()
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })
  const render = async () => act(async () => { root.render(<GraphicsStudio />); await Promise.resolve() })
  const change = async (name, value) => {
    const control = container.querySelector(`input[name="${name}"]`)
    await act(async () => { control.value = value; control.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); await Promise.resolve() })
  }
  it('saves one graphics input without opening a game that Apply has not opened', async () => {
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render(); await change('scale', '1.45')
    expect(cloud.save).toHaveBeenCalledWith(expect.objectContaining({ datasets: expect.objectContaining({ tunings: expect.objectContaining({ player: expect.objectContaining({ scale: 1.45 }) }) }) }))
    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(window.open).not.toHaveBeenCalled()
    expect(postMessage).not.toHaveBeenCalled()
    const apply = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Apply')
    expect(apply.style.minHeight).toBe('64px'); expect(apply.style.fontSize).toBe('28px')
  })
  it('does not sync an existing game before Apply', async () => {
    vi.useFakeTimers()
    try {
      const postMessage = vi.fn()
      window.open.mockReturnValue({ closed: false, postMessage })
      await render()
      const apply = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Apply')
      await act(async () => {
        apply.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve(); await Promise.resolve()
        await vi.runAllTimersAsync()
      })
      window.open.mockClear(); postMessage.mockClear()

      await change('scale', '1.45')
      expect(window.open).not.toHaveBeenCalled()
      expect(postMessage).not.toHaveBeenCalled()
      await act(async () => { await vi.runAllTimersAsync() })
      expect(postMessage).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
  it('saves the current Graphics value and opens then retries the game sync on Apply', async () => {
    vi.useFakeTimers()
    try {
      const postMessage = vi.fn()
      window.open.mockReturnValue({ closed: false, postMessage })
      await render()
      const apply = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Apply')
      await act(async () => {
        apply.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve(); await Promise.resolve(); await vi.runAllTimersAsync()
      })
      expect(cloud.save).toHaveBeenCalled()
      expect(cloud.flush).toHaveBeenCalled()
      expect(window.open).toHaveBeenCalled()
      expect(postMessage).toHaveBeenCalledTimes(3)
      expect(postMessage).toHaveBeenLastCalledWith(
        { type: 'escape-zombie-school.studioGameSync.v1' },
        window.location.origin,
      )
      expect(container.textContent).toContain('Game applied')
    } finally {
      vi.useRealTimers()
    }
  })
  it('immediately syncs Face, Audio, and Props when each section applies', async () => {
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render()
    const click = async (label) => {
      const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === label)
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await Promise.resolve(); await Promise.resolve()
      })
    }

    await click('Faces'); await click('Apply')
    expect(container.textContent).toContain('Face parts applied')
    await click('Audio'); await click('Apply')
    expect(container.textContent).toContain('Audio applied')
    await click('Props')
    const propsApply = container.querySelector('[data-testid="prop-apply"]')
    const syncCountBeforePropsApply = postMessage.mock.calls.length
    await act(async () => {
      propsApply.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(postMessage.mock.calls.length).toBeGreaterThan(syncCountBeforePropsApply)
  })
  it('serializes rapid changes and fail-closes a rejected write', async () => {
    await render(); await change('scale', '1.4'); await change('scaleX', '1.2')
    expect(loadStudioTunings().player).toMatchObject({ scale: 1.4, scaleX: 1.2 })
    window.open.mockClear()
    cloud.save.mockResolvedValueOnce({ status: 'write-failed' }); await change('scale', '1.7')
    expect(loadStudioTunings().player.scale).toBe(1.4)
    expect(window.open).not.toHaveBeenCalled(); expect(window.alert).toHaveBeenCalled()
  })

  it('restores the initial numeric state and applies it 1,000 consecutive times', async () => {
    vi.useFakeTimers()
    try {
      const postMessage = vi.fn()
      window.open.mockReturnValue({ closed: false, postMessage })
      await render()
      const apply = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Apply')
      const reset = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Reset')

      for (let iteration = 0; iteration < 1000; iteration += 1) {
        await change('scale', iteration % 2 === 0 ? '1.45' : '0.75')
        await act(async () => {
          reset.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await Promise.resolve()
          await Promise.resolve()
        })
        if (loadStudioTunings().player.scale !== 1) {
          throw new Error(`Reset mismatch at iteration ${iteration + 1}`)
        }
        await act(async () => {
          apply.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          await Promise.resolve()
          await Promise.resolve()
        })
      }

      await act(async () => { await vi.runAllTimersAsync() })
      expect(loadStudioTunings().player.scale).toBe(1)
      expect(cloud.flush.mock.calls.length).toBeGreaterThanOrEqual(1000)
      expect(postMessage.mock.calls.length).toBeGreaterThanOrEqual(3000)
      expect(container.textContent).toContain('Game applied')
    } finally {
      vi.useRealTimers()
    }
  }, 120_000)
})
