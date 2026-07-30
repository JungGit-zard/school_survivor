// @vitest-environment jsdom
import React, { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import AudioDiagnostics from './AudioDiagnostics.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function waitFor(check) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 2000
    const timer = () => {
      if (check()) return resolve()
      if (Date.now() > deadline) return reject(new Error('Timed out waiting for diagnostics.'))
      setTimeout(timer, 0)
    }
    timer()
  })
}

function makeBuffer() {
  return {
    numberOfChannels: 1,
    sampleRate: 22050,
    duration: 1,
    length: 2,
    getChannelData: () => Float32Array.from([0, 0.25]),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('AudioDiagnostics', () => {
  it('does not create Web Audio or fetch unless the strict E2E gate enabled it', async () => {
    const fetchMock = vi.fn()
    const AudioContextMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('AudioContext', AudioContextMock)
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => root.render(<AudioDiagnostics enabled={false} />))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(AudioContextMock).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="audio-diagnostics-status"]').textContent).toBe('disabled')
    act(() => root.unmount())
  })

  it('renders 77 decoded logical-ID rows and closes the context after completion', async () => {
    const close = vi.fn(async () => {})
    const decodeAudioData = vi.fn(async () => makeBuffer())
    vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return { decodeAudioData, close } }))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => root.render(<AudioDiagnostics enabled />))
    await waitFor(() => container.querySelector('[data-testid="audio-diagnostics-status"]')?.textContent === 'complete')
    const payload = JSON.parse(container.querySelector('[data-testid="audio-diagnostics-json"]').textContent)
    expect(payload).toMatchObject({ completed: 77, okCount: 77, errorCount: 0 })
    expect(payload.rows).toHaveLength(77)
    expect(close).toHaveBeenCalledTimes(1)
    act(() => root.unmount())
  })

  it('aborts in-flight fetches and closes the context when unmounted', async () => {
    const close = vi.fn(async () => {})
    let signal
    vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return { decodeAudioData: vi.fn(), close } }))
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      signal = options.signal
      return new Promise(() => {})
    }))
    const container = document.createElement('div')
    const root = createRoot(container)

    await act(async () => root.render(<AudioDiagnostics enabled />))
    await waitFor(() => signal)
    act(() => root.unmount())
    expect(signal.aborted).toBe(true)
    expect(close).toHaveBeenCalled()
  })
})
