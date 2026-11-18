// @vitest-environment jsdom
// Stage 6 운동회 순서표 줄·안내 배너·함성(Stage6Programme, 2026-11-19).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stage6Programme from './Stage6Programme.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { getLocale, setLocale } from '../lib/i18n.js'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { STAGE6_PROGRAMME_BANNER_MS } from '../lib/stage6Programme.js'

let root, container, originalLocale, originalState
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  originalLocale = getLocale()
  originalState = useGameStore.getState()
  setLocale('ko')
  useGameStore.setState({ runKills: 0, bossDefeated: false })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  useGameStore.setState(originalState, true)
  setLocale(originalLocale)
  resetRuntimeTime()
  vi.unstubAllGlobals()
})

function at(sec, props = {}) {
  setRuntimeElapsedMs(sec * 1000)
  act(() => root.render(<Stage6Programme stageId="stage6" phase="playing" gameKey={1} {...props} />))
}
const q = (id) => container.querySelector(`[data-testid="${id}"]`)

describe('Stage6Programme strip', () => {
  it('renders nothing outside stage 6', () => {
    at(20, { stageId: 'stage5' })
    expect(container.innerHTML).toBe('')
    at(20, { stageId: 'stage1' })
    expect(container.innerHTML).toBe('')
  })

  it('shows the current item and the next item with its countdown', () => {
    at(2)
    expect(q('stage6-programme-current').textContent).toBe('운동회 준비')
    at(10)
    expect(q('stage6-programme-strip').dataset.current).toBe('opening')
    expect(q('stage6-programme-current').textContent).toBe('개회식')
    expect(q('stage6-programme-next').textContent).toBe('▸내빈 입장6초')
    expect(q('stage6-programme-progress').style.width).toBe('45%')
  })

  it('hides on pause, level-up cards, results and when the HUD asks it to', () => {
    at(10)
    expect(q('stage6-programme-strip')).not.toBeNull()
    for (const phase of ['paused', 'levelup', 'cleared', 'gameover']) {
      at(10, { phase })
      expect(container.querySelector('[data-testid^="stage6-"]'), phase).toBeNull()
    }
    at(10, { hidden: true })
    expect(container.querySelector('[data-testid^="stage6-"]')).toBeNull()
  })

  it('switches to English through the locale dictionary', () => {
    act(() => setLocale('en'))
    at(100)
    expect(q('stage6-programme-current').textContent).toBe('Team March')
    expect(q('stage6-programme-next').textContent).toBe('▸Costume Parade8s')
  })
})

describe('Stage6Programme announcement banner', () => {
  it('announces an item when the game clock crosses its start, for 2 s of game time, in the strip slot', () => {
    at(15.9)
    expect(q('stage6-programme-banner')).toBeNull()
    at(16.05)
    expect(q('stage6-programme-banner').dataset.id).toBe('guests')
    expect(q('stage6-programme-banner').textContent).toBe('📢 다음 순서: 내빈 입장!')
    expect(q('stage6-programme-strip')).toBeNull()
    at(16.05 + (STAGE6_PROGRAMME_BANNER_MS - 100) / 1000)
    expect(q('stage6-programme-banner')).not.toBeNull()
    at(16.05 + (STAGE6_PROGRAMME_BANNER_MS + 50) / 1000)
    expect(q('stage6-programme-banner')).toBeNull()
    expect(q('stage6-programme-strip').dataset.current).toBe('guests')
  })

  it('does not fire while paused; the frozen game clock fires it after resume', () => {
    at(29.9)
    at(29.9, { phase: 'paused' })
    expect(q('stage6-programme-banner')).toBeNull()
    at(30.1, { phase: 'levelup' })
    expect(q('stage6-programme-banner')).toBeNull()
    at(30.2)
    expect(q('stage6-programme-banner').dataset.id).toBe('speech')
  })

  it('skips stale starts (mount mid-run) and resets on a new game key', () => {
    at(80)
    expect(q('stage6-programme-banner')).toBeNull()
    at(96.1, { gameKey: 2 })
    expect(q('stage6-programme-banner')).toBeNull() // 새 판 첫 렌더는 기준점만 잡는다
    at(108.1, { gameKey: 2 })
    expect(q('stage6-programme-banner').dataset.id).toBe('parade')
  })

  it('waits while the milestone toast holds the slot, then shows the banner', () => {
    at(191.9)
    at(192.1, { deferBanner: true })
    expect(q('stage6-programme-banner')).toBeNull()
    expect(q('stage6-programme-strip')).toBeNull()
    at(193, { deferBanner: false })
    expect(q('stage6-programme-banner').dataset.id).toBe('cavalry')
  })

  it('queues a celebration behind a programme banner instead of overlapping it', () => {
    at(63.9)
    at(64.1)
    expect(q('stage6-programme-banner').dataset.id).toBe('allSchool')
    act(() => useGameStore.setState({ bossDefeated: true }))
    at(64.3)
    expect(q('stage6-programme-banner').dataset.id).toBe('allSchool')
    expect(q('stage6-confetti').dataset.big).toBe('1')
    at(66.2)
    expect(q('stage6-programme-banner').dataset.kind).toBe('cheer')
    expect(q('stage6-programme-banner').textContent).toBe('와아아! 교장 선생님 퇴장!')
  })
})

describe('Stage6Programme cheers', () => {
  it('cheers a multi-kill burst once, then respects the cooldown', () => {
    at(20)
    act(() => useGameStore.setState({ runKills: 4 }))
    at(20.2)
    expect(q('stage6-programme-banner').dataset.id).toBe('multiKill')
    expect(q('stage6-confetti').dataset.big).toBe('0')
    at(22.5)
    act(() => useGameStore.setState({ runKills: 9 }))
    at(22.6)
    expect(q('stage6-programme-banner')).toBeNull()
  })

  it('does not cheer slow kills', () => {
    at(48)
    for (let i = 1; i <= 6; i += 1) {
      act(() => useGameStore.setState({ runKills: i }))
      at(48 + i * 0.7)
    }
    expect(q('stage6-programme-banner')).toBeNull()
  })
})
