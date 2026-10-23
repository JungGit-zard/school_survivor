// @vitest-environment jsdom
import React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { saveStudioTunings } from '../lib/graphicsStudioConfig.js'
import { saveFirebaseStudio } from '../lib/firebaseStudio.js'
import { blockFirebaseStudioRuntime, getFirebaseStudioRuntimeState } from '../lib/studioRuntimeState.js'

// CPU SSR: actual Lobby, config, getter and write boundary. No browser, effects,
// Firebase SDK client, authored seed, or mocked Lobby/read getter.
// CPU layout API only; the real Canvas/Lobby are not replaced and SSR runs no effects.
beforeEach(() => vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
}))
afterEach(() => {
  blockFirebaseStudioRuntime()
  vi.unstubAllGlobals()
})
describe('B1 actual Lobby consumer with blocked Studio', () => {
  it('renders the ordinary Lobby without unblocking or mutating Studio', () => {
    blockFirebaseStudioRuntime()
    const before = getFirebaseStudioRuntimeState()
    const html = renderToString(<Lobby />)
    expect(html).toContain('button')
    expect(html.length).toBeGreaterThan(100)
    expect(getFirebaseStudioRuntimeState()).toBe(before)
    expect(before.status).toBe('blocked')
    expect(before.datasets).toBeNull()
  })

  it('still rejects blocked edits and unauthorized remote writes without invoking the client', async () => {
    blockFirebaseStudioRuntime()
    const before = getFirebaseStudioRuntimeState()
    const client = { transaction: vi.fn(), load: vi.fn() }
    expect(() => saveStudioTunings({})).toThrow(/hydrate is required before Studio write/i)
    await expect(saveFirebaseStudio({ user: { uid: 'non-admin-b1' }, client }))
      .resolves.toEqual({ status: 'forbidden' })
    expect(client.transaction).not.toHaveBeenCalled()
    expect(client.load).not.toHaveBeenCalled()
    expect(getFirebaseStudioRuntimeState()).toBe(before)
  })
})
