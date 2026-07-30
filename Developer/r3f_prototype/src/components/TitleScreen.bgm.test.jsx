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
      load: vi.fn(),
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

  it('starts the looping title song on mount and releases it when leaving', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })

    expect(Audio).toHaveBeenCalledTimes(1)
    expect(audio.loop).toBe(true)
    expect(audio.preload).toBe('auto')
    expect(audio.volume).toBe(0.5)
    expect(audio.load).toHaveBeenCalledOnce()
    // 자동재생: 타이틀 진입 즉시 재생을 시도한다(사용자 제스처를 기다리지 않는다).
    expect(audio.play).toHaveBeenCalledOnce()

    act(() => root.unmount())

    expect(audio.pause).toHaveBeenCalledOnce()
    expect(audio.src).toBe('')
    container.remove()
  })

  it('falls back to the first user gesture when autoplay is rejected', async () => {
    audio.play
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })
    expect(audio.play).toHaveBeenCalledOnce()

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(audio.play).toHaveBeenCalledTimes(2)

    // 재생에 성공했으면 리스너를 풀어 중복 재생을 만들지 않는다.
    await act(async () => {
      window.dispatchEvent(new Event('keydown'))
    })
    expect(audio.play).toHaveBeenCalledTimes(2)

    act(() => root.unmount())
    container.remove()
  })

  it('retries on tab visibility when autoplay was rejected', async () => {
    audio.play
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })
    expect(audio.play).toHaveBeenCalledOnce()

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(audio.play).toHaveBeenCalledTimes(2)

    act(() => root.unmount())
    container.remove()
  })

  it('pauses immediately on sign-in and never retries title BGM on that mount', async () => {
    audio.play.mockRejectedValueOnce(new Error('autoplay blocked'))
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<TitleScreen onEnterLobby={() => {}} />)
    })
    expect(audio.play).toHaveBeenCalledOnce()

    await act(async () => {
      useAuthStore.setState({ signingIn: true })
    })
    expect(audio.pause).toHaveBeenCalledOnce()

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(audio.play).toHaveBeenCalledOnce()

    act(() => root.unmount())
    container.remove()
  })
})
