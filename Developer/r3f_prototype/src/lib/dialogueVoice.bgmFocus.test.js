// @vitest-environment jsdom
// Phone bug 2026-10-28: stage music always stopped in dialogue (not on level-up).
// The dialogue voice must share the one app AudioContext and never leave the BGM paused.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockHowler, makeContext } = vi.hoisted(() => {
  const param = () => ({ setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} })
  const makeContext = () => {
    const ctx = new EventTarget()
    Object.assign(ctx, {
      state: 'running',
      currentTime: 0,
      destination: {},
      oscillators: [],
      resume: () => Promise.resolve(),
      createGain: () => ({ connect() {}, disconnect() {}, gain: param() }),
      createBiquadFilter: () => ({ connect() {}, disconnect() {}, frequency: param(), Q: param() }),
      createOscillator: () => {
        const osc = { connect() {}, disconnect() {}, start() {}, stop() {}, frequency: param(), detune: param() }
        ctx.oscillators.push(osc)
        return osc
      },
    })
    return ctx
  }
  return { mockHowler: { usingWebAudio: true, autoSuspend: true, ctx: null, volume: () => 1 }, makeContext }
})
vi.mock('howler', () => ({ Howl: function Howl() {}, Howler: mockHowler }))

import { playDialogueVoice, stopDialogueVoice } from './dialogueVoice.js'
import { acquireStreamingBgm, BGM_WATCHDOG_MS, _streamingBgmPlayersForTests } from './streamingBgm.js'
import { AUDIO_SESSION_TYPE, getSharedAudioContext } from './sharedAudioContext.js'
import { installFakeAudio, setVisibility } from './fakeStreamingAudio.testUtil.js'

const STAGE_URL = 'https://music.escapezombie.com/zombie_3rd.mp3'
let fake
let contextCtor

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
  mockHowler.ctx = makeContext()
  mockHowler.autoSuspend = true
  contextCtor = vi.fn(function FakeAudioContext() { return makeContext() })
  vi.stubGlobal('AudioContext', contextCtor)
  vi.stubGlobal('webkitAudioContext', contextCtor)
})
afterEach(() => {
  stopDialogueVoice()
  for (const player of [..._streamingBgmPlayersForTests().values()]) {
    for (const h of [...player.holders]) player.drop(h)
  }
  vi.runOnlyPendingTimers()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete navigator.audioSession
})

describe('dialogue voice keeps the stage BGM (audio focus)', () => {
  it('plays the voice on the shared Howler context: no second AudioContext, BGM never paused', async () => {
    acquireStreamingBgm(STAGE_URL, { volume: 0.5 })
    const bgm = fake.instances[0]
    expect(bgm.paused).toBe(false)

    playDialogueVoice('어디로 빠져나가야겠어!', 'protagonistIntro')
    playDialogueVoice('호호호, 어서 와.', 'matilda', { delayMs: 180 })
    await vi.advanceTimersByTimeAsync(3000)

    expect(contextCtor).not.toHaveBeenCalled()
    expect(mockHowler.ctx.oscillators.length).toBeGreaterThan(0)
    expect(getSharedAudioContext()).toBe(mockHowler.ctx)
    expect(mockHowler.autoSuspend).toBe(false)
    expect(bgm.pause).not.toHaveBeenCalled()
    expect(bgm.paused).toBe(false)
  })

  it('falls back to exactly one private context when Howler has no WebAudio', async () => {
    mockHowler.usingWebAudio = false
    try {
      playDialogueVoice('가나다')
      await vi.advanceTimersByTimeAsync(1000)
      playDialogueVoice('라마바')
      await vi.advanceTimersByTimeAsync(1000)
      expect(contextCtor).toHaveBeenCalledTimes(1)
    } finally {
      mockHowler.usingWebAudio = true
    }
  })

  it('an OS pause during the voice is undone: the BGM plays again', async () => {
    acquireStreamingBgm(STAGE_URL)
    const bgm = fake.instances[0]
    playDialogueVoice('가나다라')
    bgm.pause() // iOS audio-session interruption pauses the element from outside
    expect(bgm.paused).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(bgm.paused).toBe(false)
  })
})

describe('streamingBgm self-heal', () => {
  it('an external pause of a wanted track calls play() again', () => {
    acquireStreamingBgm(STAGE_URL)
    const bgm = fake.instances[0]
    const before = bgm.play.mock.calls.length
    bgm.pause()
    vi.advanceTimersByTime(0)
    expect(bgm.play.mock.calls.length).toBe(before + 1)
    expect(bgm.paused).toBe(false)
  })

  it('keeps retrying a refused play() on the watchdog and on the next gesture', async () => {
    acquireStreamingBgm(STAGE_URL)
    const bgm = fake.instances[0]
    fake.setRejectPlay(true)
    bgm.pause()
    await vi.advanceTimersByTimeAsync(BGM_WATCHDOG_MS * 2)
    expect(bgm.paused).toBe(true)
    fake.setRejectPlay(false)
    await vi.advanceTimersByTimeAsync(BGM_WATCHDOG_MS)
    expect(bgm.paused).toBe(false)

    fake.setRejectPlay(true)
    bgm.pause()
    await vi.advanceTimersByTimeAsync(0)
    fake.setRejectPlay(false)
    window.dispatchEvent(new Event('touchstart'))
    expect(bgm.paused).toBe(false)
  })

  it('resumes when the shared context leaves the interrupted state', async () => {
    acquireStreamingBgm(STAGE_URL)
    const bgm = fake.instances[0]
    const ctx = getSharedAudioContext()
    fake.setRejectPlay(true)
    ctx.state = 'interrupted'
    bgm.pause()
    await vi.advanceTimersByTimeAsync(0)
    expect(bgm.paused).toBe(true)
    fake.setRejectPlay(false)
    ctx.state = 'running'
    ctx.dispatchEvent(new Event('statechange'))
    expect(bgm.paused).toBe(false)
  })

  it('never fights a hidden tab', async () => {
    acquireStreamingBgm(STAGE_URL)
    const bgm = fake.instances[0]
    setVisibility('hidden')
    expect(bgm.paused).toBe(true)
    const calls = bgm.play.mock.calls.length
    await vi.advanceTimersByTimeAsync(BGM_WATCHDOG_MS * 5)
    getSharedAudioContext().dispatchEvent(new Event('statechange'))
    expect(bgm.play.mock.calls.length).toBe(calls)
    expect(bgm.paused).toBe(true)
  })
})

describe('audio session type', () => {
  it('pins navigator.audioSession.type where the API exists', () => {
    navigator.audioSession = { type: 'auto' }
    acquireStreamingBgm(STAGE_URL)
    expect(navigator.audioSession.type).toBe(AUDIO_SESSION_TYPE)
    navigator.audioSession.type = 'auto'
    playDialogueVoice('가')
    expect(navigator.audioSession.type).toBe(AUDIO_SESSION_TYPE)
  })

  it('is a no-op where the API is missing', () => {
    expect('audioSession' in navigator).toBe(false)
    expect(() => acquireStreamingBgm(STAGE_URL)).not.toThrow()
    expect(() => playDialogueVoice('가')).not.toThrow()
  })
})
