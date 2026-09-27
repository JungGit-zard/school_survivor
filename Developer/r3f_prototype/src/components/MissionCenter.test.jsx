// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import MissionCenter from './MissionCenter.jsx'
import { createMissionProgressState, reconcileMissionProgress } from '../lib/missionProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

describe('MissionCenter colorful panel contracts', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
    const missionProgress = reconcileMissionProgress(createMissionProgressState({
      counters: {
        'pickup.xpTextbook.count': 1,
        'stage.stage1.bestSurvivalSec': 12,
      },
      claimed: {
        first_gold_coin: { claimedAt: '2026-09-25T00:00:00.000Z' },
      },
      pinnedMissionIds: ['first_xp_textbook'],
    }))
    useGameStore.setState({ missionProgress, missionSyncState: 'memory' })
  })

  it('marks filter tabs with aria-pressed and non-colour selected symbols', () => {
    const view = renderMissionCenter()
    const recommended = view.button('● 추천')
    const progress = view.button('○ 진행')

    expect(recommended.getAttribute('aria-pressed')).toBe('true')
    expect(recommended.getAttribute('data-panel-state')).toBe('selected')
    expect(progress.getAttribute('aria-pressed')).toBe('false')

    view.unmount()
  })

  it('renders mission status chips with semantic data states and text glyph cues', () => {
    const view = renderMissionCenter()

    expect(view.container.querySelector('[data-panel-state="completed_unclaimed"]').textContent).toContain('★ 완료')
    expect(view.container.querySelector('[data-panel-state="active"]').textContent).toContain('… 진행')

    act(() => {
      view.button('○ 완료').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(view.container.querySelector('[data-panel-state="claimed"]').textContent).toContain('✓ 받음')

    view.unmount()
  })

  it('keeps primary mission controls at least 44px tall', () => {
    const view = renderMissionCenter()
    for (const button of view.container.querySelectorAll('button')) {
      const minHeight = Number.parseInt(button.style.minHeight || button.style.height || '0', 10)
      expect(minHeight).toBeGreaterThanOrEqual(44)
    }
    view.unmount()
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
    button(label) {
      const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label)
      if (!button) throw new Error(`Missing button: ${label}`)
      return button
    },
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}
