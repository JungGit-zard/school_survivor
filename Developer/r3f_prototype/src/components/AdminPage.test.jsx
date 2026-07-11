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

  it('saves cheat menu button visibility from the operations controls', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    const visibilityInput = container.querySelector('input[name="cheatMenuButtonVisible"]')
    expect(visibilityInput.checked).toBe(true)

    act(() => {
      visibilityInput.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const saveButton = Array.from(container.querySelectorAll('button'))
      .at(-2)
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadAdminConfig().operations.cheatMenuButtonVisible).toBe(false)
  })

  it('mirrors code burst spawn events in the wave control tab, sorted by time with boss highlighted', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    const clickButton = (label) => {
      const button = Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.includes(label))
      act(() => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }

    // 웨이브 컨트롤 탭 → Stage 2 로 전환
    clickButton('스테이지별 웨이브 컨트롤')
    clickButton('Stage 2')

    // 읽기전용 미러 안내 문구
    expect(container.textContent).toContain('버스트 스폰(일회성)')
    expect(container.textContent).toContain('게임 코드에서 자동 반영')

    const rows = Array.from(container.querySelectorAll('[data-testid="burst-row"]'))
    expect(rows).toHaveLength(1)

    // 시각 오름차순 정렬 검증
    const secs = rows.map((row) => Number(row.getAttribute('data-sec')))
    const sortedSecs = [...secs].sort((a, b) => a - b)
    expect(secs).toEqual(sortedSecs)

    // stage2 보스(B02)는 sec 120(2:00)에 '보스 등장'으로 강조 표기
    const bossRow = rows.find((row) => row.textContent.includes('보스 등장'))
    expect(bossRow).toBeTruthy()
    expect(bossRow.getAttribute('data-sec')).toBe('120')
    expect(bossRow.textContent).toContain('2:00')
    expect(bossRow.textContent).toContain('보스')
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
