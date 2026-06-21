// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import AdminPage from './AdminPage.jsx'
import { loadAdminConfig } from '../lib/adminConfig.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { useGameStore } from '../store/useGameStore.js'

describe('AdminPage', () => {
  let container
  let root

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the balance and ranking season tabs', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    expect(container.textContent).toContain('운영 콘솔')
    expect(container.textContent).toContain('게임 밸런스')
    expect(container.textContent).toContain('랭킹/시즌')
    expect(container.textContent).toContain('Stage 1 생존 시간')
  })

  it('saves balance changes to the admin config store', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    const stage1Input = container.querySelector('input[name="stage1DurationSec"]')
    act(() => {
      stage1Input.value = '180'
      stage1Input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const saveButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('저장'))
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadAdminConfig().balance.stageDurationSec.stage1).toBe(180)
  })

  it('applies saved admin balance inputs to game stage and player startup config', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    const updateNumberInput = (name, value) => {
      const input = container.querySelector(`input[name="${name}"]`)
      act(() => {
        input.value = String(value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    updateNumberInput('stage1DurationSec', 180)
    updateNumberInput('maxHpBonus', 40)
    updateNumberInput('speedMultiplier', 1.2)
    updateNumberInput('goldMultiplier', 2)

    const saveButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('저장'))
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getStageConfig('stage1').durationSec).toBe(180)
    expect(getStageConfig('stage1').survivalMilestones.map((milestone) => milestone.gold)).toEqual([2, 6, 8, 16])

    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().player.maxHp).toBe(140)
    expect(useGameStore.getState().player.speed).toBeCloseTo(3.6)
  })
})
