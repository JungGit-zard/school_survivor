// @vitest-environment jsdom
import React, { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import LobbyBgm, { LOBBY_BGM_URL, LOBBY_BGM_VOLUME } from './LobbyBgm.jsx'

const mocks = vi.hoisted(() => ({ Howl: vi.fn(), instances: [] }))
vi.mock('howler', () => ({ Howl: mocks.Howl }))
let root, container
function mount(strict = false) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(strict ? <StrictMode><LobbyBgm /></StrictMode> : <LobbyBgm />))
  return mocks.instances.at(-1)
}
function gesture(type = 'pointerdown') { act(() => window.dispatchEvent(new Event(type))) }
function visibility(value) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}
beforeEach(() => {
  mocks.instances.length = 0
  mocks.Howl.mockReset()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  mocks.Howl.mockImplementation(function (config) {
    const audio = { config, play: vi.fn(() => 1), pause: vi.fn(), stop: vi.fn(), unload: vi.fn() }
    mocks.instances.push(audio)
    return audio
  })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  container?.remove()
  vi.restoreAllMocks()
})
describe('stage selection lobby CDN BGM', () => {
  it('streams the approved CDN song in a loop at the existing title volume', () => {
    const audio = mount()
    expect(audio.config).toMatchObject({ src: [LOBBY_BGM_URL], format: ['mp3'], html5: true, loop: true, volume: LOBBY_BGM_VOLUME })
    expect(LOBBY_BGM_URL).toBe('https://music.escapezombie.com/zombie_soft1.mp3')
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('does not create duplicate voices while initial playback is pending or successful', () => {
    const audio = mount()
    gesture(); gesture('touchstart')
    expect(audio.play).toHaveBeenCalledOnce()
    act(() => audio.config.onplay())
    gesture('keydown')
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('retries autoplay rejection on the next user gesture', () => {
    const audio = mount()
    act(() => audio.config.onplayerror())
    gesture()
    expect(audio.play).toHaveBeenCalledTimes(2)
    act(() => audio.config.onplay())
    gesture()
    expect(audio.play).toHaveBeenCalledTimes(2)
  })
  it('keeps navigation available and allows retry after a CDN load error', () => {
    const audio = mount()
    act(() => audio.config.onloaderror())
    gesture('keydown')
    expect(audio.play).toHaveBeenCalledTimes(2)
  })
  it('pauses in the background and resumes in the foreground', () => {
    const audio = mount()
    act(() => audio.config.onplay())
    visibility('hidden')
    expect(audio.pause).toHaveBeenCalledOnce()
    gesture()
    expect(audio.play).toHaveBeenCalledOnce()
    visibility('visible')
    expect(audio.play).toHaveBeenCalledTimes(2)
  })
  it('stops, unloads and removes retry handlers when leaving for gameplay or another screen', () => {
    const audio = mount()
    act(() => root.unmount()); root = null
    expect(audio.stop).toHaveBeenCalledOnce()
    expect(audio.unload).toHaveBeenCalledOnce()
    gesture(); visibility('visible')
    audio.config.onplayerror()
    gesture()
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('releases the StrictMode rehearsal instance and retains one current instance', () => {
    mount(true)
    expect(mocks.instances).toHaveLength(2)
    expect(mocks.instances[0].stop).toHaveBeenCalledOnce()
    expect(mocks.instances[0].unload).toHaveBeenCalledOnce()
    expect(mocks.instances[1].stop).not.toHaveBeenCalled()
  })
  it('is mounted by the actual stage-selection lobby', () => {
    const source = readFileSync(new NodeURL('./Lobby.jsx', import.meta.url), 'utf8')
    expect(source).toContain("import LobbyBgm from './LobbyBgm.jsx'")
    expect(source).toContain('<LobbyBgm />')
  })
})
