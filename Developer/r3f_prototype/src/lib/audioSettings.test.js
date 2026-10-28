// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const howlerMasterVolume = vi.hoisted(() => vi.fn())
vi.mock('howler', () => ({
  Howler: { volume: howlerMasterVolume },
  Howl: vi.fn(function HowlMock() { return { play: vi.fn(), volume: vi.fn(), rate: vi.fn(), unload: vi.fn() } }),
}))

import {
  _resetAudioSettingsForTests, getAudioVolumes, getMusicVolumeScale, getSfxVolumeScale,
  normalizeAudioVolume, setMusicVolume, setSfxVolume,
} from './audioSettings.js'
import { acquireStreamingBgm, BGM_WATCHDOG_MS, _streamingBgmPlayersForTests } from './streamingBgm.js'
import { applySfxMasterVolume, SFX_MASTER_VOLUME } from './sfxRegistry.js'
import { installFakeAudio } from './fakeStreamingAudio.testUtil.js'

const URL_A = 'https://music.escapezombie.com/a.mp3'
let fake

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
  _resetAudioSettingsForTests()
  howlerMasterVolume.mockClear()
})
afterEach(() => {
  for (const player of [..._streamingBgmPlayersForTests().values()]) {
    for (const h of [...player.holders]) player.drop(h)
  }
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  _resetAudioSettingsForTests()
})

describe('audioSettings', () => {
  it('keeps separate 0-100 music and SFX volumes, clamped and rounded', () => {
    expect(getAudioVolumes()).toEqual({ musicVolume: 100, sfxVolume: 100 })
    setMusicVolume(35)
    setSfxVolume(140)
    expect(getAudioVolumes()).toEqual({ musicVolume: 35, sfxVolume: 100 })
    setSfxVolume(-5)
    expect(getSfxVolumeScale()).toBe(0)
    expect(getMusicVolumeScale()).toBeCloseTo(0.35)
    expect(normalizeAudioVolume('abc', 70)).toBe(70)
    expect(normalizeAudioVolume(42.6)).toBe(43)
  })

  it('changes BGM volume in place without pausing, reloading or seeking the track', () => {
    acquireStreamingBgm(URL_A, { volume: 0.5 })
    const audio = fake.instances[0]
    audio.currentTime = 37
    const plays = audio.play.mock.calls.length
    setMusicVolume(40)
    expect(audio.volume).toBeCloseTo(0.2)
    expect(audio.muted).toBe(false)
    expect(audio.paused).toBe(false)
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.load).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(37)
    expect(audio.play.mock.calls.length).toBe(plays)
  })

  it('music 0 mutes the still-playing track; the watchdog neither pauses it nor unmutes it', () => {
    acquireStreamingBgm(URL_A, { volume: 0.5 })
    const audio = fake.instances[0]
    setMusicVolume(0)
    expect(audio.volume).toBe(0)
    expect(audio.muted).toBe(true)
    vi.advanceTimersByTime(BGM_WATCHDOG_MS * 5)
    expect(audio.paused).toBe(false)
    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.volume).toBe(0)
    expect(audio.muted).toBe(true)
    // An OS pause is still healed (music never stops), and it comes back muted.
    audio.pause()
    vi.advanceTimersByTime(BGM_WATCHDOG_MS)
    expect(audio.paused).toBe(false)
    expect(audio.muted).toBe(true)
    setMusicVolume(100)
    expect(audio.muted).toBe(false)
    expect(audio.volume).toBeCloseTo(0.5)
  })

  it('a track that starts after the change already uses the music volume', () => {
    setMusicVolume(50)
    acquireStreamingBgm(URL_A, { volume: 0.5 })
    expect(fake.instances[0].volume).toBeCloseTo(0.25)
  })

  it('SFX volume scales the Howler master headroom and leaves BGM alone', () => {
    acquireStreamingBgm(URL_A, { volume: 0.5 })
    applySfxMasterVolume()
    expect(howlerMasterVolume).toHaveBeenLastCalledWith(SFX_MASTER_VOLUME)
    setSfxVolume(50)
    expect(howlerMasterVolume).toHaveBeenLastCalledWith(SFX_MASTER_VOLUME * 0.5)
    setSfxVolume(0)
    expect(howlerMasterVolume).toHaveBeenLastCalledWith(0)
    expect(fake.instances[0].volume).toBeCloseTo(0.5)
    expect(fake.instances[0].muted).toBe(false)
  })
})
