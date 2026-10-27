// @vitest-environment jsdom
import React, { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import LobbyBgm, { LOBBY_BGM_URL, LOBBY_BGM_VOLUME } from './LobbyBgm.jsx'
import { installFakeAudio } from '../lib/fakeStreamingAudio.testUtil.js'

let fake, root, container
function mount(node) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(node))
}
beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  container?.remove()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('LobbyBgm', () => {
  it('streams the owner-selected lobby track as a native loop', () => {
    expect(LOBBY_BGM_URL).toBe('https://music.escapezombie.com/zombie_soft1.mp3')
    mount(<LobbyBgm />)
    expect(fake.instances).toHaveLength(1)
    expect(fake.instances[0]).toMatchObject({ src: LOBBY_BGM_URL, loop: true, volume: LOBBY_BGM_VOLUME, paused: false })
  })

  it('keeps one stream under StrictMode remounts', () => {
    mount(<StrictMode><LobbyBgm /></StrictMode>)
    vi.runOnlyPendingTimers()
    expect(fake.instances).toHaveLength(1)
    expect(fake.instances[0].paused).toBe(false)
  })

  it('does not restart when the lobby hands off to a lobby sub screen', () => {
    const Screen = ({ name }) => (name === 'lobby' ? <div><LobbyBgm /></div> : <section><LobbyBgm /></section>)
    mount(<Screen name="lobby" />)
    const audio = fake.instances[0]
    audio.currentTime = 33
    act(() => root.render(<Screen name="coinShop" />))
    vi.runOnlyPendingTimers()
    expect(fake.instances).toHaveLength(1)
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(33)
  })

  it('stops a tick after the lobby is left for good', () => {
    mount(<LobbyBgm />)
    act(() => root.unmount())
    root = null
    vi.runOnlyPendingTimers()
    expect(fake.instances[0].paused).toBe(true)
  })

  it('is mounted by the lobby and kept on lobby-side sub screens', () => {
    const lobby = readFileSync(new NodeURL('./Lobby.jsx', import.meta.url), 'utf8')
    expect(lobby).toContain("import LobbyBgm from './LobbyBgm.jsx'")
    expect(lobby).toContain('<LobbyBgm />')
    const app = readFileSync(new NodeURL('./ReadyGameApp.jsx', import.meta.url), 'utf8')
    expect(app).toContain("new Set(['coinShop', 'ranking', 'missionCenter'])")
    expect(app).toContain('{LOBBY_MUSIC_SUB_SCREENS.has(screen) && <LobbyBgm />}')
  })
})
