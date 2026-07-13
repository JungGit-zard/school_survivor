// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import TitleScreen from './TitleScreen.jsx'
import { _resetAuthStoreForTests, useAuthStore } from '../store/useAuthStore.js'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div>{children}</div>,
}))

vi.mock('./TitleScene3D.jsx', () => ({
  default: () => null,
}))

vi.mock('./GoogleAccountPanel.jsx', () => ({
  default: () => null,
}))

describe('TitleScreen BGM', () => {
  let audio

  beforeEach(() => {
    audio = {
      loop: false,
      volume: 1,
      src: 'title-bgm',
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    }
    vi.stubGlobal('Audio', vi.fn(function AudioMock() {
      return audio
    }))
  })

  afterEach(() => {
    _resetAuthStoreForTests()
    vi.unstubAllGlobals()
  })

  it('loops the title song after the first input and releases it when leaving the title', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })

    expect(Audio).toHaveBeenCalledTimes(1)
    expect(audio.loop).toBe(true)
    expect(audio.volume).toBe(0.5)
    expect(audio.play).not.toHaveBeenCalled()

    await act(async () => {
      window.dispatchEvent(new PointerEvent('pointerdown'))
    })

    expect(audio.play).toHaveBeenCalledOnce()

    act(() => root.unmount())

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.src).toBe('')
    container.remove()
  })

  it('stops the title song while Google authentication is active', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(audio.play).toHaveBeenCalledOnce()

    act(() => {
      useAuthStore.setState({ signingIn: true })
    })

    expect(audio.pause).toHaveBeenCalled()

    act(() => root.unmount())
    container.remove()
  })

  it('keeps the input fallback armed when the browser rejects playback', async () => {
    audio.play
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(audio.play).toHaveBeenCalledTimes(2)

    act(() => root.unmount())
    container.remove()
  })
})
