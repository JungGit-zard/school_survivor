// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import GameplayBgm from './GameplayBgm.jsx'

describe('GameplayBgm', () => {
  let audio

  beforeEach(() => {
    audio = { loop: false, volume: 1, src: '', load: vi.fn(), play: vi.fn(() => Promise.resolve()), pause: vi.fn() }
    vi.stubGlobal('Audio', vi.fn(function AudioMock() { return audio }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('owns one voice, pauses for pause and level-up, and releases on a terminal phase', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(<GameplayBgm phase="playing" userStarted />))
    expect(Audio).toHaveBeenCalledTimes(1)
    expect(audio.loop).toBe(true)
    expect(audio.volume).toBe(0.18)
    expect(audio.play).toHaveBeenCalledTimes(1)

    await act(async () => root.render(<GameplayBgm phase="paused" userStarted />))
    await act(async () => root.render(<GameplayBgm phase="levelup" userStarted />))
    expect(audio.pause).toHaveBeenCalledTimes(2)

    await act(async () => root.render(<GameplayBgm phase="playing" userStarted />))
    expect(audio.play).toHaveBeenCalledTimes(2)
    await act(async () => root.render(<GameplayBgm phase="gameover" userStarted />))
    expect(audio.pause).toHaveBeenCalledTimes(3)
    expect(audio.src).toBe('')
    act(() => root.unmount())
    expect(Audio).toHaveBeenCalledTimes(1)
  })

  it('does not autoplay before a game-start gesture and retries a rejected play only on later playing transitions', async () => {
    audio.play.mockRejectedValueOnce(new Error('blocked')).mockResolvedValueOnce()
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(<GameplayBgm phase="playing" userStarted={false} />))
    expect(audio.play).not.toHaveBeenCalled()
    await act(async () => root.render(<GameplayBgm phase="playing" userStarted />))
    expect(audio.play).toHaveBeenCalledTimes(1)
    await act(async () => root.render(<GameplayBgm phase="paused" userStarted />))
    await act(async () => root.render(<GameplayBgm phase="playing" userStarted />))
    expect(audio.play).toHaveBeenCalledTimes(2)
    act(() => root.unmount())
  })
})
