// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import TitleScreen from './TitleScreen.jsx'
import { _resetAuthStoreForTests, useAuthStore } from '../store/useAuthStore.js'
import { installFakeAudio, setVisibility } from '../lib/fakeStreamingAudio.testUtil.js'

vi.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div>{children}</div> }))
vi.mock('./TitleScene3D.jsx', () => ({ default: () => null }))
vi.mock('./GoogleAccountPanel.jsx', () => ({ default: () => null }))

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('TitleScreen BGM', () => {
  let fake, root, container

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    fake = installFakeAudio()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    if (root) act(() => root.unmount())
    root = null
    container.remove()
    await tick()
    _resetAuthStoreForTests()
    vi.unstubAllGlobals()
  })

  const mount = async () => {
    await act(async () => { root.render(<TitleScreen onEnterLobby={() => {}} />) })
    return fake.instances[0]
  }

  it('starts the looping title song on mount and releases it when leaving', async () => {
    const audio = await mount()
    expect(fake.instances).toHaveLength(1)
    expect(audio).toMatchObject({ src: 'https://music.escapezombie.com/zombie_openning.mp3', loop: true, volume: 0.5 })
    expect(window.__titleBgm).toBe(audio)
    expect(audio.play).toHaveBeenCalledOnce()
    expect(audio.paused).toBe(false)

    act(() => root.unmount())
    root = null
    await tick()
    expect(audio.pause).toHaveBeenCalledOnce()
  })

  it('falls back to the first user gesture when autoplay is rejected', async () => {
    fake.setRejectPlay(true)
    const audio = await mount()
    expect(audio.paused).toBe(true)
    fake.setRejectPlay(false)
    await act(async () => { window.dispatchEvent(new Event('pointerdown')) })
    expect(audio.paused).toBe(false)
    const calls = audio.play.mock.calls.length
    await act(async () => { window.dispatchEvent(new Event('keydown')) })
    expect(audio.play).toHaveBeenCalledTimes(calls)
  })

  it('retries on tab visibility when autoplay was rejected', async () => {
    fake.setRejectPlay(true)
    const audio = await mount()
    fake.setRejectPlay(false)
    await act(async () => { setVisibility('visible') })
    expect(audio.paused).toBe(false)
  })

  it('keeps the title BGM playing while sign-in state changes', async () => {
    const audio = await mount()
    await act(async () => { useAuthStore.setState({ signingIn: true }) })
    await act(async () => { useAuthStore.setState({ signingIn: false }) })
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalledOnce()
  })
})
