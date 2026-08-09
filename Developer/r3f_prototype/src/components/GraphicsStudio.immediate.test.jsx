// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import GraphicsStudio from './GraphicsStudio.jsx'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { DEFAULT_STAGE_BOSS_PREVIEW, loadStudioTunings } from '../lib/graphicsStudioConfig.js'
import {
  STUDIO_GAME_SYNC_ACK_MESSAGE,
  STUDIO_GAME_SYNC_MESSAGE,
  STUDIO_GAME_SYNC_READY_MESSAGE,
} from '../lib/studioGameBridge.js'

const cloud = vi.hoisted(() => ({ hydrate: vi.fn(), save: vi.fn(), mark: vi.fn(), flush: vi.fn(), setUser: vi.fn() }))
const auth = vi.hoisted(() => ({ state: { status: 'signedIn', user: { uid: 'master' } }, initialize: vi.fn() }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const flushPromises = async (count = 4) => {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve()
  }
}

vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ ...auth.state, initializeAuth: auth.initialize }) }))
vi.mock('../lib/firebaseStudio.js', async (original) => ({
  ...(await original()),
  hydrateFirebaseStudio: cloud.hydrate,
  saveFirebaseStudio: cloud.save,
  markFirebaseStudioLocalChange: cloud.mark,
  flushFirebaseStudioSave: cloud.flush,
  setFirebaseStudioUser: cloud.setUser,
}))
vi.mock('@react-three/fiber', () => ({ Canvas: () => <div /> }))
vi.mock('./GraphicsStudioPreview.jsx', () => ({ default: ({ selectedItem, tuning }) => <div>{selectedItem.id}:{tuning.scale}</div> }))

function bridgeEvent(data, source, origin = window.location.origin) {
  return new MessageEvent('message', { data, source, origin })
}

describe('Graphics Studio immediate Firebase contract', () => {
  let container
  let root

  beforeEach(() => {
    commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: DEFAULT_STAGE_BOSS_PREVIEW, decals: {}, propPlacements: {}, bossFaceRecipes: {} }, { revision: 1 })
    cloud.hydrate.mockReset().mockResolvedValue({ status: 'remote-applied', revision: 1 })
    cloud.save.mockReset().mockImplementation(async () => ({ status: 'saved', revision: 2 + cloud.save.mock.calls.length - 1 }))
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
    await flushPromises(2)
  })

  const change = async (name, value) => {
    const control = container.querySelector(`input[name="${name}"]`)
    expect(control).toBeTruthy()
    await act(async () => {
      control.value = value
      control.dispatchEvent(new Event('input', { bubbles: true }))
      await flushPromises(2)
    })
  }

  const clickButton = async (label) => {
    const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === label)
    expect(button).toBeTruthy()
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises(4)
    })
  }

  const pressUndo = async () => act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    await flushPromises(2)
  })

  it('does not save, open, sync, or mutate runtime before Apply', async () => {
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render()
    await change('scale', '1.45')

    expect(cloud.save).not.toHaveBeenCalled()
    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(window.open).not.toHaveBeenCalled()
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('applies to runtime and syncs the game only after Firebase returns the saved revision', async () => {
    let resolveSave
    cloud.save.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve }))
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render()
    await change('scale', '1.45')

    const seen = []
    const onTuningsChanged = () => seen.push(loadStudioTunings().player?.scale)
    window.addEventListener('escape-zombie-school.graphicsStudioTunings.changed', onTuningsChanged)
    try {
      const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === 'Apply')
      expect(button).toBeTruthy()
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises(2)

      expect(loadStudioTunings().player?.scale).not.toBe(1.45)
      expect(seen).toEqual([])
      expect(window.open).not.toHaveBeenCalled()
      expect(postMessage).not.toHaveBeenCalled()

      await act(async () => {
        resolveSave({ status: 'saved', revision: 7 })
        await flushPromises(6)
      })

      expect(loadStudioTunings().player.scale).toBe(1.45)
      expect(seen).toEqual([1.45])
      expect(window.open).toHaveBeenCalledTimes(1)
      expect(postMessage).toHaveBeenCalledTimes(1)
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: STUDIO_GAME_SYNC_MESSAGE,
          force: true,
          revision: 7,
          syncId: expect.any(String),
          datasets: expect.objectContaining({ tunings: expect.objectContaining({ player: expect.objectContaining({ scale: 1.45 }) }) }),
        }),
        window.location.origin,
      )
      await pressUndo()
      expect(container.querySelector('input[name="scale"]').value).toBe('1.45')
      expect(loadStudioTunings().player.scale).toBe(1.45)
      expect(container.textContent).toContain('Game applied')
    } finally {
      window.removeEventListener('escape-zombie-school.graphicsStudioTunings.changed', onTuningsChanged)
    }
  })

  it('does not apply or sync an Apply draft when Firebase save fails', async () => {
    cloud.save.mockResolvedValueOnce({ status: 'write-failed' })
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render()
    await change('scale', '1.45')
    await clickButton('Apply')

    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(window.open).not.toHaveBeenCalled()
    expect(postMessage).not.toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Firebase 저장 불가'))
    expect(window.alert.mock.calls[0][0]).not.toContain('현재 세션/열린 게임에는 적용')
  })

  it('rejects a saved response without a positive canonical revision', async () => {
    cloud.save.mockResolvedValueOnce({ status: 'saved', revision: 0 })
    const postMessage = vi.fn()
    window.open.mockReturnValue({ closed: false, postMessage })
    await render()
    await change('scale', '1.45')
    await clickButton('Apply')

    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(window.open).not.toHaveBeenCalled()
    expect(postMessage).not.toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Firebase 저장 불가'))
  })

  it('keeps only the newest saved payload pending until the game ACKs it', async () => {
    const gameWindow = { closed: false, postMessage: vi.fn() }
    window.open.mockReturnValue(gameWindow)
    await render()

    await change('scale', '1.2')
    await clickButton('Apply')
    const firstPayload = gameWindow.postMessage.mock.calls.at(-1)[0]

    await change('scale', '1.6')
    await clickButton('Apply')
    const newestPayload = gameWindow.postMessage.mock.calls.at(-1)[0]
    expect(newestPayload.revision).toBe(3)
    expect(newestPayload.datasets.tunings.player.scale).toBe(1.6)
    expect(newestPayload.syncId).not.toBe(firstPayload.syncId)

    window.dispatchEvent(bridgeEvent({ type: STUDIO_GAME_SYNC_READY_MESSAGE }, gameWindow))
    expect(gameWindow.postMessage.mock.calls.at(-1)[0]).toMatchObject({
      type: STUDIO_GAME_SYNC_MESSAGE,
      syncId: newestPayload.syncId,
      revision: 3,
      datasets: expect.objectContaining({ tunings: expect.objectContaining({ player: expect.objectContaining({ scale: 1.6 }) }) }),
    })
    expect(gameWindow.postMessage.mock.calls.at(-1)[0].syncId).not.toBe(firstPayload.syncId)

    const callsBeforeAck = gameWindow.postMessage.mock.calls.length
    window.dispatchEvent(bridgeEvent({ type: STUDIO_GAME_SYNC_ACK_MESSAGE, syncId: newestPayload.syncId }, gameWindow))
    window.dispatchEvent(bridgeEvent({ type: STUDIO_GAME_SYNC_READY_MESSAGE }, gameWindow))
    expect(gameWindow.postMessage).toHaveBeenCalledTimes(callsBeforeAck)
  })
})
