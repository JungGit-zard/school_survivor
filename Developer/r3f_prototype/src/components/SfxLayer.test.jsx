// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { emitSfx } from '../lib/sfxEvents.js'
import SfxLayer from './SfxLayer.jsx'

const { playSfx, applySfxMasterVolume, getAuthState } = vi.hoisted(() => ({
  playSfx: vi.fn(),
  applySfxMasterVolume: vi.fn(),
  getAuthState: vi.fn(() => ({ signingIn: true })),
}))

vi.mock('../lib/sfxRegistry.js', () => ({ playSfx, applySfxMasterVolume }))
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: { getState: getAuthState },
}))

afterEach(() => {
  vi.restoreAllMocks()
  playSfx.mockClear()
  applySfxMasterVolume.mockClear()
  getAuthState.mockClear()
})

describe('SfxLayer', () => {
  it('forwards event id, volume, and rate with the current auth-overlay state', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<SfxLayer />))
    act(() => emitSfx({ id: 'pencilHit', volume: 0.42, rate: 1.17 }))

    expect(playSfx).toHaveBeenCalledWith(
      'pencilHit',
      0.42,
      { rate: 1.17, authOverlayActive: true },
    )

    act(() => root.unmount())
  })

  it('applies the master headroom once on mount', () => {
    // 이게 없으면 Howler 마스터가 1.0으로 남고, 거의 풀스케일인 음원들이
    // 겹치는 순간 destination에서 하드 클리핑한다.
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => root.render(<SfxLayer />))

    expect(applySfxMasterVolume).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
  })
})
