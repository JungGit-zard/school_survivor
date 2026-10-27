// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stage1Bgm, { getStageBgmUrl, STAGE1_BGM_URL, STAGE2_BGM_URL } from './Stage1Bgm.jsx'
import { STAGE_CONFIGS } from '../lib/stageConfig.js'
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

  it('never leaves a stage silent: stages 3-10 fall back to zombie_3rd (odd) / zombie_2nd (even)', () => {
    for (let n = 1; n <= 10; n += 1) {
      expect(getStageBgmUrl(`stage${n}`)).toBe(n % 2 ? STAGE1_BGM_URL : STAGE2_BGM_URL)
    }
    expect(getStageBgmUrl('unknown')).toBeUndefined()
    expect(render({ stageId: 'stage3' })).toMatchObject({ src: STAGE1_BGM_URL, paused: false })
    expect(render({ stageId: 'stage4' })).toMatchObject({ src: STAGE2_BGM_URL, paused: false })
  })

  it('every stage in the stage config has a track', () => {
    for (const stageId of Object.keys(STAGE_CONFIGS)) expect(getStageBgmUrl(stageId)).toMatch(/^https:\/\/music\.escapezombie\.com\//)
  })

  it('keeps playing through level-up card picks', () => {
    const audio = render()
    render({ phase: 'levelup' })
    render({ phase: 'playing' })
    expect(audio.pause).not.toHaveBeenCalled()
    expect(fake.instances).toHaveLength(1)
  })

  it('keeps the same stream playing through every paused phase (menu, dialogue, story)', () => {
    const audio = render()
    audio.currentTime = 20
    render({ phase: 'paused' })
    render({ phase: 'playing' })
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(20)
    expect(fake.instances).toHaveLength(1)
  })

  it('starts immediately when mounted paused (first-play story intro)', () => {
    const audio = render({ phase: 'paused' })
    expect(audio.play).toHaveBeenCalled()
    expect(audio.paused).toBe(false)
  })

  it('pauses when the tab is hidden and resumes when visible', () => {
    const audio = render()
    setVisibility('hidden')
    expect(audio.paused).toBe(true)
    setVisibility('visible')
    expect(audio.paused).toBe(false)
  })

  it('keeps playing through game over and continues the same stream on retry', () => {
    const audio = render()
    audio.currentTime = 50
    render({ phase: 'gameover' })
    vi.runOnlyPendingTimers()
    expect(audio.pause).not.toHaveBeenCalled()
    const next = render({ phase: 'playing', gameKey: 2 })
    vi.runOnlyPendingTimers()
    expect(next).toBe(audio)
    expect(audio.paused).toBe(false)
    expect(audio.currentTime).toBe(50)
  })
})
