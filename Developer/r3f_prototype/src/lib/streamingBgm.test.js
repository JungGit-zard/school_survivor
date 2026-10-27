// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acquireStreamingBgm, BRIDGE_MAX_MS, STALL_RECOVERY_MS, _streamingBgmPlayersForTests } from './streamingBgm.js'
import { installFakeAudio, setVisibility } from './fakeStreamingAudio.testUtil.js'

const URL_A = 'https://music.escapezombie.com/a.mp3'
const URL_B = 'https://music.escapezombie.com/b.mp3'
let fake

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
})
afterEach(() => {
  for (const player of [..._streamingBgmPlayersForTests().values()]) {
    for (const h of [...player.holders]) player.drop(h)
  }
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('streamingBgm', () => {
  it('uses a native looping stream (no duration timer) and plays immediately', () => {
    const handle = acquireStreamingBgm(URL_A, { volume: 0.5 })
    const audio = fake.instances[0]
    expect(handle.audio).toBe(audio)
    expect(audio).toMatchObject({ src: URL_A, loop: true, preload: 'auto', volume: 0.5 })
    expect(audio.play).toHaveBeenCalledOnce()
    expect(audio.paused).toBe(false)
  })

  it('keeps the same stream playing when a holder hands off in the same tick', () => {
    const first = acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    audio.currentTime = 42
    first.release()
    const second = acquireStreamingBgm(URL_A)
    vi.runOnlyPendingTimers()
    expect(fake.instances).toHaveLength(1)
    expect(second.audio).toBe(audio)
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(42)
  })

  it('frees a silent stream a tick after the last holder leaves', () => {
    const handle = acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    handle.setActive(false)
    handle.release()
    vi.advanceTimersByTime(0)
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(_streamingBgmPlayersForTests().size).toBe(0)
  })

  it('bridges an audible track until the next track actually sounds', () => {
    fake.setDeferPlaying(true)
    const lobby = acquireStreamingBgm(URL_A)
    const oldAudio = fake.instances[0]
    oldAudio.dispatchEvent(new Event('playing'))
    lobby.release()
    acquireStreamingBgm(URL_B) // next screen: stream still buffering
    const newAudio = fake.instances[1]
    vi.advanceTimersByTime(BRIDGE_MAX_MS - 1)
    expect(oldAudio.pause).not.toHaveBeenCalled()
    newAudio.dispatchEvent(new Event('playing'))
    expect(oldAudio.paused).toBe(true)
    expect(_streamingBgmPlayersForTests().has(URL_A)).toBe(false)
    expect(newAudio.paused).toBe(false)
  })

  it('caps a bridge into a screen without music', () => {
    acquireStreamingBgm(URL_A).release()
    const audio = fake.instances[0]
    vi.advanceTimersByTime(BRIDGE_MAX_MS - 1)
    expect(audio.paused).toBe(false)
    vi.advanceTimersByTime(1)
    expect(audio.paused).toBe(true)
    expect(audio.removeAttribute).toHaveBeenCalledWith('src')
    expect(_streamingBgmPlayersForTests().size).toBe(0)
  })

  it('a same-URL holder picks a bridged track back up without restarting it', () => {
    acquireStreamingBgm(URL_A).release()
    const audio = fake.instances[0]
    audio.currentTime = 30
    vi.advanceTimersByTime(1000)
    acquireStreamingBgm(URL_A)
    vi.advanceTimersByTime(BRIDGE_MAX_MS * 2)
    expect(fake.instances).toHaveLength(1)
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(30)
  })

  it('switching tracks stops the old one and starts the new one', () => {
    acquireStreamingBgm(URL_A).release()
    acquireStreamingBgm(URL_B)
    vi.runOnlyPendingTimers()
    expect(fake.instances[0].paused).toBe(true)
    expect(fake.instances[1].paused).toBe(false)
  })

  it('pauses while inactive or hidden and resumes on return', () => {
    const handle = acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    handle.setActive(false)
    expect(audio.paused).toBe(true)
    handle.setActive(true)
    expect(audio.paused).toBe(false)
    setVisibility('hidden')
    expect(audio.paused).toBe(true)
    setVisibility('visible')
    expect(audio.paused).toBe(false)
    expect(audio.play).toHaveBeenCalledTimes(3)
  })

  it('retries a blocked autoplay on the next user gesture and on pageshow', async () => {
    fake.setRejectPlay(true)
    acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    await Promise.resolve()
    expect(audio.paused).toBe(true)
    fake.setRejectPlay(false)
    window.dispatchEvent(new Event('pointerdown'))
    expect(audio.paused).toBe(false)
    audio.pause()
    vi.runOnlyPendingTimers() // OS interruption: resumes while still wanted
    expect(audio.paused).toBe(false)
    expect(audio.play).toHaveBeenCalledTimes(3)
  })

  it('reloads a stalled stream and resumes at the same position', () => {
    acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    audio.currentTime = 61
    audio.dispatchEvent(new Event('stalled'))
    vi.advanceTimersByTime(STALL_RECOVERY_MS - 1)
    expect(audio.load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(audio.load).toHaveBeenCalledOnce()
    audio.currentTime = 0
    audio.dispatchEvent(new Event('loadedmetadata'))
    expect(audio.currentTime).toBe(61)
  })

  it('does not reload when playback recovers on its own', () => {
    acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    audio.dispatchEvent(new Event('waiting'))
    audio.currentTime = 3
    audio.dispatchEvent(new Event('timeupdate'))
    vi.advanceTimersByTime(STALL_RECOVERY_MS * 2)
    expect(audio.load).not.toHaveBeenCalled()
  })

  it('retries network errors with backoff', () => {
    acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    audio.dispatchEvent(new Event('error'))
    vi.advanceTimersByTime(1000)
    expect(audio.load).toHaveBeenCalledTimes(1)
    audio.dispatchEvent(new Event('error'))
    vi.advanceTimersByTime(1999)
    expect(audio.load).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(audio.load).toHaveBeenCalledTimes(2)
  })

  it('restarts from the top if an engine fires ended despite loop', () => {
    acquireStreamingBgm(URL_A)
    const audio = fake.instances[0]
    audio.currentTime = 120
    audio.paused = true
    audio.dispatchEvent(new Event('ended'))
    expect(audio.currentTime).toBe(0)
    expect(audio.paused).toBe(false)
  })
})
