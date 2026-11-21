// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MissionCenter from './MissionCenter.jsx'
import { createMissionProgressState, reconcileMissionProgress } from '../lib/missionProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { setLocale } from '../lib/i18n.js'
import { setScientificNotation } from '../lib/numberFormat.js'

vi.mock('./StageLock.jsx', () => ({
  StageLockPreview: ({ testId, ariaLabel }) => <div data-testid={testId} aria-label={ariaLabel} />,
}))

const SIGNED_IN = { uid: 'mission-user' }

function setProgress(value) {
  useGameStore.setState({ missionProgress: reconcileMissionProgress(createMissionProgressState(value)), missionSyncState: 'hydrated' })
}

describe('MissionCenter chain list (signed in)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: SIGNED_IN })
    setProgress({
      counters: {
        'pickup.xpTextbook.count': 1,
        'stage.stage1.bestSurvivalSec': 12,
      },
      claimed: {
        first_gold_coin: { claimedAt: '2026-09-25T00:00:00.000Z' },
      },
    })
  })

  afterEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('shows one list of visible missions with claimable first and no filter tabs or pin buttons', () => {
    const view = renderMissionCenter()
    expect(view.container.querySelector('nav')).toBeNull()
    expect(view.container.textContent).not.toContain('고정')
    const ids = Array.from(view.container.querySelectorAll('article[data-mission-id]')).map((card) => card.dataset.missionId)
    // 시작 미션 4개가 보이고, 받을 수 있는 교과서 미션이 맨 위에 온다. 받은 미션은 접혀 있다.
    expect(ids[0]).toBe('first_xp_textbook')
    expect(new Set(ids)).toEqual(new Set(['first_xp_textbook', 'first_levelup_choice', 'first_stage1_30_seconds', 'first_e01_kills']))
    expect(view.container.textContent).toContain('받은 미션 1개')
    view.unmount()
  })

  it('renders status chips with semantic data states and text glyph cues; claimed folds open', () => {
    const view = renderMissionCenter()
    expect(view.container.querySelector('[data-panel-state="completed_unclaimed"]').textContent).toContain('★ 완료')
    expect(view.container.querySelector('[data-panel-state="active"]').textContent).toContain('… 진행')
    expect(view.container.querySelector('[data-panel-state="claimed"]')).toBeNull()

    act(() => {
      view.container.querySelector('[data-testid="mission-claimed-toggle"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(view.container.querySelector('[data-panel-state="claimed"]').textContent).toContain('✓ 받음')
    view.unmount()
  })

  it('announces newly revealed missions after a successful claim', async () => {
    const claimMissionReward = vi.fn(async (missionId) => {
      const current = useGameStore.getState().missionProgress
      useGameStore.setState({ missionProgress: reconcileMissionProgress(createMissionProgressState({ ...current, claimed: { ...current.claimed, [missionId]: { claimedAt: '2026-11-21T00:00:00.000Z' } } })) })
      return { ok: true }
    })
    const original = useGameStore.getState().claimMissionReward
    useGameStore.setState({ claimMissionReward })
    try {
      const view = renderMissionCenter()
      const claim = Array.from(view.container.querySelectorAll('button')).find((button) => button.textContent === '받기')
      await act(async () => { claim.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      expect(claimMissionReward).toHaveBeenCalledWith('first_xp_textbook')
      expect(view.container.textContent).toContain('새 미션 2개가 열렸어요!')
      const ids = Array.from(view.container.querySelectorAll('article[data-mission-id]')).map((card) => card.dataset.missionId)
      expect(ids).toContain('e07_recognition')
      expect(ids).toContain('lunch_secured')
      view.unmount()
    } finally {
      useGameStore.setState({ claimMissionReward: original })
    }
  })

  it('keeps primary mission controls at least 44px tall', () => {
    const view = renderMissionCenter()
    for (const button of view.container.querySelectorAll('button')) {
      const minHeight = Number.parseInt(button.style.minHeight || button.style.height || '0', 10)
      expect(minHeight).toBeGreaterThanOrEqual(44)
    }
    view.unmount()
  })

  it('formats the mission reward through the scientific-notation setting', () => {
    setScientificNotation(true)
    try {
      const view = renderMissionCenter()
      expect(view.container.textContent).toContain('보상 5e0골드')
      expect(view.container.textContent).not.toContain('보상 5골드')
      view.unmount()
    } finally {
      setScientificNotation(false)
    }
  })

  it.each(['en', 'ja'])('renders no Korean text in %s', (locale) => {
    setLocale(locale)
    try {
      const view = renderMissionCenter()
      const hangul = /[가-힣]/
      const texts = [view.container.textContent]
      act(() => {
        view.container.querySelector('[data-testid="mission-claimed-toggle"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      texts.push(view.container.textContent)
      for (const el of view.container.querySelectorAll('[aria-label]')) texts.push(el.getAttribute('aria-label'))
      expect(texts.filter((text) => hangul.test(text))).toEqual([])
      view.unmount()
    } finally {
      setLocale('ko')
    }
  })
})

describe('MissionCenter guest lock', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'signedOut', signingIn: false })
    setProgress({ counters: { 'pickup.xpTextbook.count': 1 } })
  })

  it('dims the start missions behind a sign-in lock with the stage padlock and no claim', () => {
    const view = renderMissionCenter()
    const list = view.container.querySelector('[data-testid="mission-center-list"]')
    expect(list.dataset.locked).toBe('true')
    expect(list.getAttribute('aria-hidden')).toBe('true')
    expect(list.hasAttribute('inert')).toBe(true)
    const ids = Array.from(list.querySelectorAll('article[data-mission-id]')).map((card) => card.dataset.missionId)
    expect(new Set(ids)).toEqual(new Set(['first_xp_textbook', 'first_levelup_choice', 'first_stage1_30_seconds', 'first_e01_kills']))
    // 게스트에게는 진행·완료·받기가 없다.
    expect(list.querySelector('[data-panel-state="completed_unclaimed"]')).toBeNull()
    expect(Array.from(view.container.querySelectorAll('button')).some((button) => button.textContent === '받기')).toBe(false)

    const lock = view.container.querySelector('[data-testid="mission-guest-lock"]')
    expect(lock.textContent).toContain('미션을 수행하려면 로그인하세요')
    expect(lock.querySelector('[data-testid="mission-guest-lock-icon"]')).toBeTruthy()
    expect(lock.querySelector('[data-testid="mission-guest-signin"]').textContent).toBe('Google로 로그인')
    view.unmount()
  })

  it('calls the existing Google sign-in action and drops the lock once signed in', async () => {
    const signInWithGoogle = vi.fn(async () => SIGNED_IN)
    const original = useAuthStore.getState().signInWithGoogle
    useAuthStore.setState({ signInWithGoogle })
    try {
      const view = renderMissionCenter()
      await act(async () => {
        view.container.querySelector('[data-testid="mission-guest-signin"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(signInWithGoogle).toHaveBeenCalledTimes(1)
      act(() => { useAuthStore.setState({ user: SIGNED_IN }) })
      expect(view.container.querySelector('[data-testid="mission-guest-lock"]')).toBeNull()
      expect(view.container.querySelector('[data-testid="mission-center-list"]').dataset.locked).toBeUndefined()
      view.unmount()
    } finally {
      useAuthStore.setState({ signInWithGoogle: original, user: null })
    }
  })

  it.each([['en', 'Sign in to take on missions'], ['ja', 'ミッションに挑戦するにはログインしてください']])('localises the guest lock in %s', (locale, text) => {
    setLocale(locale)
    try {
      const view = renderMissionCenter()
      expect(view.container.querySelector('[data-testid="mission-guest-lock"]').textContent).toContain(text)
      view.unmount()
    } finally {
      setLocale('ko')
    }
  })
})

function renderMissionCenter(props = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<MissionCenter onBack={() => {}} {...props} />)
  })
  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}
