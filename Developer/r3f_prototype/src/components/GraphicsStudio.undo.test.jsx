// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import GraphicsStudio from './GraphicsStudio.jsx'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { DEFAULT_STAGE_BOSS_PREVIEW } from '../lib/graphicsStudioConfig.js'

const cloud = vi.hoisted(() => ({ hydrate: vi.fn(), save: vi.fn(), mark: vi.fn(), flush: vi.fn(), setUser: vi.fn() }))
const auth = vi.hoisted(() => ({ state: { status: 'signedIn', user: { uid: 'master' } }, initialize: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ ...auth.state, initializeAuth: auth.initialize }) }))
vi.mock('../lib/firebaseStudio.js', async (original) => ({ ...(await original()), hydrateFirebaseStudio: cloud.hydrate, saveFirebaseStudio: cloud.save, markFirebaseStudioLocalChange: cloud.mark, flushFirebaseStudioSave: cloud.flush, setFirebaseStudioUser: cloud.setUser }))
vi.mock('@react-three/fiber', () => ({ Canvas: () => <div /> }))
vi.mock('./GraphicsStudioPreview.jsx', () => ({ default: ({ selectedItem, tuning }) => <div>{selectedItem.id}:{tuning.scale}</div> }))

describe('Graphics Studio draft undo', () => {
  let container
  let root

  beforeEach(() => {
    commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: DEFAULT_STAGE_BOSS_PREVIEW, decals: {}, propPlacements: {}, bossFaceRecipes: {} }, { revision: 1 })
    cloud.hydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 1 })
    cloud.save.mockReset().mockResolvedValue({ status: 'saved', revision: 2 })
    cloud.mark.mockReset()
    cloud.flush.mockReset().mockResolvedValue({ status: 'no-pending' })
    cloud.setUser.mockReset()
    auth.initialize.mockReset()
    vi.spyOn(window, 'open').mockReturnValue(null)
    window.alert = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  const render = async () => act(async () => {
    root.render(<GraphicsStudio />)
    await Promise.resolve()
  })

  const setScale = async (value) => {
    await act(async () => {
      const scale = container.querySelector('input[name="scale"]')
      scale.value = String(value)
      scale.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
    })
  }

  const pressUndo = async () => {
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      await Promise.resolve()
    })
  }

  it('recovers all 50 previous draft steps with Ctrl+Z', async () => {
    await render()

    for (let step = 1; step <= 50; step += 1) {
      await setScale(1 + step / 100)
    }
    expect(container.querySelector('input[name="scale"]').value).toBe('1.5')

    for (let step = 0; step < 50; step += 1) {
      await pressUndo()
    }
    expect(container.querySelector('input[name="scale"]').value).toBe('1')
  })

  it('keeps exactly 50 Ctrl+Z undo snapshots inside the draft editor', async () => {
    await render()

    for (let step = 1; step <= 51; step += 1) {
      await setScale(1 + step / 100)
    }
    expect(container.querySelector('input[name="scale"]').value).toBe('1.51')

    for (let step = 0; step < 50; step += 1) {
      await pressUndo()
    }
    expect(container.querySelector('input[name="scale"]').value).toBe('1.01')

    await pressUndo()
    expect(container.querySelector('input[name="scale"]').value).toBe('1.01')
  })
})
