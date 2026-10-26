// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stage1Bgm from './Stage1Bgm.jsx'
import { installFakeAudio, setVisibility } from '../lib/fakeStreamingAudio.testUtil.js'

let fake, root, container, props
function render(next = {}) {
  props = { ...props, ...next }
  if (!root) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  act(() => root.render(<Stage1Bgm {...props} />))
  return fake.instances.at(-1)
}
beforeEach(() => {
  vi.useFakeTimers()
  props = { stageId: 'stage1', phase: 'playing', gameKey: 1 }
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

describe('stage gameplay CDN BGM', () => {
  it('streams zombie_3rd for Stage1 and zombie_2nd for Stage2 as native loops', () => {
    expect(render()).toMatchObject({ src: 'https://music.escapezombie.com/zombie_3rd.mp3', loop: true, volume: 0.5, paused: false })
    const second = render({ stageId: 'stage2' })
    vi.runOnlyPendingTimers()
    expect(second).toMatchObject({ src: 'https://music.escapezombie.com/zombie_2nd.mp3', paused: false })
    expect(fake.instances[0].paused).toBe(true)
  })

  it('has no music for stages without an owner track', () => {
    render({ stageId: 'stage3' })
    expect(fake.instances).toHaveLength(0)
  })

  it('keeps playing through level-up card picks', () => {
    const audio = render()
    render({ phase: 'levelup' })
    render({ phase: 'playing' })
    expect(audio.pause).not.toHaveBeenCalled()
    expect(fake.instances).toHaveLength(1)
  })

  it('pauses for the pause menu and resumes the same stream', () => {
    const audio = render()
    audio.currentTime = 20
    render({ phase: 'paused' })
    expect(audio.paused).toBe(true)
    render({ phase: 'playing' })
    expect(audio.paused).toBe(false)
    expect(audio.currentTime).toBe(20)
    expect(fake.instances).toHaveLength(1)
  })

  it('does not start while paused, even on gestures or tab return', () => {
    const audio = render({ phase: 'paused' })
    window.dispatchEvent(new Event('pointerdown'))
    setVisibility('visible')
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('pauses when the tab is hidden and resumes when visible', () => {
    const audio = render()
    setVisibility('hidden')
    expect(audio.paused).toBe(true)
    setVisibility('visible')
    expect(audio.paused).toBe(false)
  })

  it('releases the stream on game over and starts fresh on retry', () => {
    const audio = render()
    render({ phase: 'gameover' })
    vi.runOnlyPendingTimers()
    expect(audio.paused).toBe(true)
    const next = render({ phase: 'playing', gameKey: 2 })
    expect(next).not.toBe(audio)
    expect(next.paused).toBe(false)
  })
})
