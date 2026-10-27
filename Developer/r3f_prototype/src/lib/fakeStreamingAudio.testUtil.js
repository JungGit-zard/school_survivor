import { vi } from 'vitest'

// Minimal HTMLAudioElement stand-in for streamingBgm tests.
export function installFakeAudio() {
  const instances = []
  let rejectPlay = false
  // deferPlaying: play() starts but 'playing' (audio actually sounding) waits for
  // the test to dispatch it, like a CDN stream that is still buffering.
  let deferPlaying = false
  class FakeAudio extends EventTarget {
    constructor() {
      super()
      this.paused = true
      this.loop = false
      this.preload = ''
      this.volume = 1
      this.currentTime = 0
      this.duration = 120
      this.readyState = 4
      this.src = ''
      this.play = vi.fn(() => {
        if (rejectPlay) return Promise.reject(new Error('NotAllowedError'))
        this.paused = false
        if (!deferPlaying) this.dispatchEvent(new Event('playing'))
        return Promise.resolve()
      })
      this.pause = vi.fn(() => {
        if (this.paused) return
        this.paused = true
        this.dispatchEvent(new Event('pause'))
      })
      this.load = vi.fn()
      this.removeAttribute = vi.fn((name) => { if (name === 'src') this.src = '' })
      instances.push(this)
    }
  }
  vi.stubGlobal('Audio', FakeAudio)
  return {
    instances,
    setRejectPlay(value) { rejectPlay = value },
    setDeferPlaying(value) { deferPlaying = value },
  }
}

export function setVisibility(value) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  document.dispatchEvent(new Event('visibilitychange'))
}
