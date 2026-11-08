// @vitest-environment jsdom
// Music room (lobby menu): tapping a song plays it. Owner rule: BGM never stops, and two
// songs never sound together. Drives the real LobbyBgm and the real streamingBgm player.
import React, { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MusicRoomBgm from './MusicRoomBgm.jsx'
import LobbyBgm, { LOBBY_BGM_URL } from './LobbyBgm.jsx'
import { setLobbyBgmYielded } from '../lib/lobbyBgm.js'
import Stage1Bgm, { STAGE1_BGM_URL, STAGE2_BGM_URL } from './Stage1Bgm.jsx'
import { TITLE_BGM_URL } from '../lib/titleBgm.js'
import { BRIDGE_MAX_MS, _resetStreamingBgmForTests, _streamingBgmPlayersForTests } from '../lib/streamingBgm.js'
import { _resetAudioSettingsForTests, setMusicVolume } from '../lib/audioSettings.js'
import { installFakeAudio, setVisibility } from '../lib/fakeStreamingAudio.testUtil.js'

let fake, root, container

// "Sounding" = fired 'playing' and not paused since. A deferred stream that is still
// buffering has paused === false but is not audible yet. `cuts` counts real pauses (the
// mock also records pause() calls on an element that was already paused).
function installSoundingAudio() {
  const installed = installFakeAudio()
  const Base = globalThis.Audio
  vi.stubGlobal('Audio', class SoundingAudio extends Base {
    constructor() {
      super()
      this.sounding = false
      this.cuts = 0
      this.addEventListener('playing', () => { this.sounding = !this.paused })
      this.addEventListener('pause', () => { this.sounding = false; this.cuts += 1 })
    }
  })
  return installed
}

function LobbyScreen({ open = false, trackId = null, roomFirst = false }) {
  const room = open ? <MusicRoomBgm trackId={trackId} /> : null
  return roomFirst ? <div>{room}<LobbyBgm /></div> : <div><LobbyBgm />{room}</div>
}

const show = (props = {}) => act(() => root.render(<LobbyScreen {...props} />))
const audioFor = (url) => fake.instances.find((audio) => audio.src === url)
const songs = () => fake.instances.filter((audio) => audio.sounding).map((audio) => audio.src)
const sound = (audio) => act(() => { audio.dispatchEvent(new Event('playing')) })
const tick = (ms = 0) => act(() => { vi.advanceTimersByTime(ms) })
const playersHas = (url) => _streamingBgmPlayersForTests().has(url)

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installSoundingAudio()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  setLobbyBgmYielded(false)
  _resetStreamingBgmForTests()
  _resetAudioSettingsForTests()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('MusicRoomBgm', () => {
  it('opening the room without a pick leaves the lobby music alone', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: null })
    show({ open: true, trackId: undefined })
    tick(BRIDGE_MAX_MS * 2)
    expect(fake.instances).toHaveLength(1)
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(lobby.pause).not.toHaveBeenCalled()
  })

  it('a picked song plays looped at the music volume; the lobby steps back only once it sounds', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    lobby.currentTime = 37
    fake.setDeferPlaying(true) // the CDN stream is still buffering
    show({ open: true, trackId: 'opening' })
    const opening = audioFor(TITLE_BGM_URL)
    expect(opening).toMatchObject({ loop: true, volume: 0.5, paused: false })
    tick(BRIDGE_MAX_MS * 2)
    expect(songs()).toEqual([LOBBY_BGM_URL]) // no gap however long the stream buffers
    expect(lobby.pause).not.toHaveBeenCalled()

    sound(opening)
    expect(songs()).toEqual([TITLE_BGM_URL])
    expect(lobby.paused).toBe(true)
    expect(playersHas(LOBBY_BGM_URL)).toBe(true) // still held: yielded, not dropped
    expect(lobby.currentTime).toBe(37)

    setMusicVolume(40)
    expect(opening.volume).toBeCloseTo(0.2)
    setMusicVolume(0)
    expect(opening).toMatchObject({ muted: true, paused: false })
  })

  it('switching songs hands over without a gap and never stacks two songs', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: 'opening' })
    const opening = audioFor(TITLE_BGM_URL)
    expect(songs()).toEqual([TITLE_BGM_URL])
    const lobbyPlays = lobby.play.mock.calls.length

    fake.setDeferPlaying(true)
    show({ open: true, trackId: 'stageOdd' })
    const stageOdd = audioFor(STAGE1_BGM_URL)
    tick(1000)
    expect(songs()).toEqual([TITLE_BGM_URL]) // the old song plays on while the new one loads
    sound(stageOdd)
    expect(songs()).toEqual([STAGE1_BGM_URL])
    tick()
    expect(opening.removeAttribute).toHaveBeenCalledWith('src') // freed, not left bridging
    expect(playersHas(TITLE_BGM_URL)).toBe(false)

    show({ open: true, trackId: 'stageEven' })
    expect(songs()).toEqual([STAGE1_BGM_URL])
    sound(audioFor(STAGE2_BGM_URL))
    expect(songs()).toEqual([STAGE2_BGM_URL])
    expect(stageOdd.paused).toBe(true)
    expect(lobby.play.mock.calls.length).toBe(lobbyPlays) // the lobby never cut in between
  })

  it('a song skipped before it sounds is silenced and never stacks on later', () => {
    show()
    show({ open: true, trackId: 'opening' })

    fake.setDeferPlaying(true)
    show({ open: true, trackId: 'stageOdd' })
    const stageOdd = audioFor(STAGE1_BGM_URL)
    show({ open: true, trackId: 'stageEven' })
    expect(stageOdd.paused).toBe(true)
    sound(stageOdd) // a late network 'playing' for the skipped song
    expect(songs()).toEqual([TITLE_BGM_URL])
    sound(audioFor(STAGE2_BGM_URL))
    expect(songs()).toEqual([STAGE2_BGM_URL])

    // Picking the song that is playing again drops the one still loading.
    const stageEven = audioFor(STAGE2_BGM_URL)
    show({ open: true, trackId: 'opening' })
    const reopening = audioFor(TITLE_BGM_URL)
    show({ open: true, trackId: 'stageEven' })
    expect(reopening.paused).toBe(true)
    expect(stageEven.cuts).toBe(0)
    tick(BRIDGE_MAX_MS * 2)
    expect(songs()).toEqual([STAGE2_BGM_URL])
  })

  it('closing the room brings the lobby music back at the same spot with no gap', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    lobby.currentTime = 37
    show({ open: true, trackId: 'stageOdd' })
    const stageOdd = audioFor(STAGE1_BGM_URL)
    expect(songs()).toEqual([STAGE1_BGM_URL])

    fake.setDeferPlaying(true)
    show({ open: false })
    expect(songs()).toEqual([STAGE1_BGM_URL]) // the room song bridges
    tick()
    expect(lobby.paused).toBe(false) // resuming
    tick(1000)
    expect(songs()).toEqual([STAGE1_BGM_URL]) // until the lobby really sounds

    sound(lobby)
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(stageOdd.paused).toBe(true)
    expect(playersHas(STAGE1_BGM_URL)).toBe(false)
    expect(fake.instances.filter((audio) => audio.src === LOBBY_BGM_URL)).toHaveLength(1)
    expect(lobby.currentTime).toBe(37) // resumed, not restarted
  })

  it('trackId back to null returns to the lobby, and re-picking a song still bridging continues it', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: 'opening' })
    const opening = audioFor(TITLE_BGM_URL)
    opening.currentTime = 12

    fake.setDeferPlaying(true)
    show({ open: true, trackId: null })
    tick()
    expect(songs()).toEqual([TITLE_BGM_URL]) // bridging while the lobby resumes
    expect(lobby.paused).toBe(false)

    show({ open: true, trackId: 'opening' })
    expect(lobby.paused).toBe(true)
    sound(lobby) // the lobby's late 'playing' from its resume
    tick(BRIDGE_MAX_MS * 2) // held again, so no bridge cap
    expect(songs()).toEqual([TITLE_BGM_URL])
    expect(fake.instances.filter((audio) => audio.src === TITLE_BGM_URL)).toHaveLength(1)
    expect(opening.cuts).toBe(0)
    expect(opening.currentTime).toBe(12)
  })

  it('picking the lobby song resumes the lobby stream; closing afterwards never pauses it', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: 'lobby' }) // already the background: nothing changes
    expect(fake.instances).toHaveLength(1)
    expect(lobby.pause).not.toHaveBeenCalled()

    lobby.currentTime = 21
    show({ open: true, trackId: 'opening' })
    expect(songs()).toEqual([TITLE_BGM_URL])
    show({ open: true, trackId: 'lobby' })
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(fake.instances.filter((audio) => audio.src === LOBBY_BGM_URL)).toHaveLength(1)
    expect(lobby.currentTime).toBe(21)

    const cuts = lobby.cuts
    show({ open: false }) // closed in the same tick
    tick(BRIDGE_MAX_MS * 2)
    expect(lobby.cuts).toBe(cuts)
    expect(songs()).toEqual([LOBBY_BGM_URL])
    expect(playersHas(TITLE_BGM_URL)).toBe(false) // the opening song was stopped and freed
  })

  it.each([false, true])('the lobby leaving with the room open never restarts the lobby over the room song (room first: %s)', (roomFirst) => {
    show({ roomFirst })
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: 'stageOdd', roomFirst })
    const stageOdd = audioFor(STAGE1_BGM_URL)
    const lobbyPlays = lobby.play.mock.calls.length

    fake.setDeferPlaying(true)
    act(() => root.render(<div />)) // lobby and room unmount in one commit
    tick()
    expect(lobby.play.mock.calls.length).toBe(lobbyPlays)
    expect(lobby.paused).toBe(true)
    expect(songs()).toEqual([STAGE1_BGM_URL]) // bridges into the next screen

    act(() => root.render(<Stage1Bgm stageId="stage2" gameKey={1} />))
    sound(audioFor(STAGE2_BGM_URL))
    expect(songs()).toEqual([STAGE2_BGM_URL])
    expect(stageOdd.paused).toBe(true)
    expect(playersHas(LOBBY_BGM_URL)).toBe(false)
  })

  it('a hidden tab silences the room song; on return the lobby stays yielded', () => {
    show()
    const lobby = audioFor(LOBBY_BGM_URL)
    show({ open: true, trackId: 'opening' })
    act(() => setVisibility('hidden'))
    expect(songs()).toEqual([])
    act(() => setVisibility('visible'))
    tick(1000)
    expect(songs()).toEqual([TITLE_BGM_URL])
    expect(lobby.paused).toBe(true)
  })

  it('keeps one stream for the picked song under StrictMode remounts', () => {
    act(() => root.render(<StrictMode><LobbyScreen /></StrictMode>))
    fake.setDeferPlaying(true)
    act(() => root.render(<StrictMode><LobbyScreen open trackId="opening" /></StrictMode>))
    expect(fake.instances).toHaveLength(2)
    const opening = audioFor(TITLE_BGM_URL)
    expect(opening.paused).toBe(false)
    sound(opening)
    expect(songs()).toEqual([TITLE_BGM_URL])
  })
})
