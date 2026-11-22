// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WaveDebutToast from './WaveDebutToast.jsx'
import { announceWaveSpecialSpawn } from '../lib/waveDebutNotice.js'
import { useGameStore } from '../store/useGameStore.js'

let root
let host
const render = (props) => act(() => root.render(<WaveDebutToast gameKey={1} hidden={false} {...props} />))
const toast = () => host.querySelector('[data-testid="wave-debut-toast"]')
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms) })

beforeEach(() => {
  vi.useFakeTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useGameStore.setState({ phase: 'playing', currentStageId: 'stage1', elapsedMs: 1000 })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.querySelectorAll('[data-testid="stage4-hazard-guide"]').forEach((el) => el.remove())
  vi.useRealTimers()
})

describe('WaveDebutToast', () => {
  it('shows the role dot, the in-game name and the role line once per species', () => {
    render()
    act(() => announceWaveSpecialSpawn('E02', '탱크'))
    const el = toast()
    expect(el).not.toBeNull()
    expect(el.dataset.role).toBe('tank')
    expect(el.textContent).toContain('덩치 좀비')
    expect(el.textContent).toContain('탱크 · 단단함')
    expect(host.querySelector('[data-testid="wave-debut-dot"]').style.background).toBe('rgb(224, 69, 58)')
    expect(el.style.pointerEvents).toBe('none')
    expect(el.querySelector('button')).toBeNull()
    advance(2600)
    expect(toast()).toBeNull()
    act(() => announceWaveSpecialSpawn('E02', '탱크'))
    advance(200)
    expect(toast()).toBeNull()
  })

  it('queues simultaneous debuts and never shows two at once', () => {
    render()
    act(() => {
      announceWaveSpecialSpawn('E35', '근접기술')
      announceWaveSpecialSpawn('E66', '분열')
    })
    expect(host.querySelectorAll('[data-testid="wave-debut-toast"]').length).toBe(1)
    expect(toast().dataset.type).toBe('E35')
    advance(2600)
    expect(host.querySelectorAll('[data-testid="wave-debut-toast"]').length).toBe(1)
    expect(toast().dataset.type).toBe('E66')
    expect(toast().textContent).toContain('플라나리아 좀비')
    advance(2600)
    expect(toast()).toBeNull()
  })

  it('stays silent for fodder and stages 7-10', () => {
    render()
    act(() => announceWaveSpecialSpawn('E01', null))
    expect(toast()).toBeNull()
    act(() => useGameStore.setState({ currentStageId: 'stage7' }))
    act(() => announceWaveSpecialSpawn('E02', '탱크'))
    advance(200)
    expect(toast()).toBeNull()
  })

  it('waits while hidden or while a stage guide holds the same band', () => {
    render({ hidden: true })
    act(() => announceWaveSpecialSpawn('E05', '돌진'))
    advance(5000)
    expect(toast()).toBeNull()
    render({ hidden: false })
    advance(100)
    expect(toast().dataset.type).toBe('E05')

    const guide = document.createElement('div')
    guide.dataset.testid = 'stage4-hazard-guide'
    document.body.append(guide)
    advance(200)
    expect(toast()).toBeNull()
    guide.remove()
    advance(100)
    expect(toast().dataset.type).toBe('E05')
  })

  it('a new run (gameKey) forgets the species seen last run', () => {
    render()
    act(() => announceWaveSpecialSpawn('E06', '탱크'))
    advance(2600)
    render({ gameKey: 2 })
    act(() => announceWaveSpecialSpawn('E06', '탱크'))
    expect(toast().dataset.type).toBe('E06')
  })
})
