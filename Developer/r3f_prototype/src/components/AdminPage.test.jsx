// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act, Simulate } from 'react-dom/test-utils'
import AdminPage from './AdminPage.jsx'
import { loadAdminConfig, resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { STAGE2_BURST_EVENTS } from '../lib/burstEvents.js'
import { useGameStore } from '../store/useGameStore.js'

const inspectionMocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('../lib/firebaseInspectionMode.js', () => ({
  startInspection: inspectionMocks.start,
  stopInspection: inspectionMocks.stop,
  subscribeInspectionMode: inspectionMocks.subscribe,
  getInspectionPhase: (state, nowMs) => {
    if (!state?.enabled) return 'inactive'
    if (nowMs < state.startsAt) return 'scheduled'
    return nowMs < state.endsAt ? 'active' : 'inactive'
  },
}))

describe('AdminPage', () => {
  let container
  let root

  beforeEach(() => {
    _resetFirebaseProgressForTests()
    _seedHydratedFirebaseProgressForTests()
    resetAdminConfig()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    inspectionMocks.start.mockReset()
    inspectionMocks.stop.mockReset()
    inspectionMocks.subscribe.mockReset().mockReturnValue(vi.fn())
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
    // 스폰 표가 정본이므로 행 수는 리터럴이 아니라 표 길이에서 파생한다
    // (2026-08-17 1.3배 사다리 재설계로 29 → 19가 됐고, 앞으로도 표가 정본이다).
    expect(rows).toHaveLength(STAGE2_BURST_EVENTS.length)

    // 시각 오름차순 정렬 검증
    const secs = rows.map((row) => Number(row.getAttribute('data-sec')))
    const sortedSecs = [...secs].sort((a, b) => a - b)
    expect(secs).toEqual(sortedSecs)

    // stage2 보스(B02)는 sec 150(2:30)에 '보스 등장'으로 강조 표기
    const bossRow = rows.find((row) => row.textContent.includes('보스 등장'))
    expect(bossRow).toBeTruthy()
    expect(bossRow.getAttribute('data-sec')).toBe('150')
    expect(bossRow.textContent).toContain('2:30')
    expect(bossRow.textContent).toContain('보스')
  })

  it('marks a Stage 1 wave after the fixed B01 spawn as a boss phase', () => {
    saveAdminConfig({
      waveControl: {
        stage1: [{ start: 180, end: 200, counts: { E01: 10 } }],
      },
    })
    act(() => {
      root.render(<AdminPage />)
    })
    const wavesTab = container.querySelectorAll('nav button')[2]
    act(() => wavesTab.click())

    const bossPhase = container.querySelector('[data-boss-phase="after"]')
    expect(bossPhase).not.toBeNull()
    expect(bossPhase.checked).toBe(true)
    expect(bossPhase.getAttribute('aria-checked')).toBe('true')
    expect(bossPhase.dataset.bossPhase).toBe('after')
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

  it('starts inspection with the configured period and message', async () => {
    const user = { uid: 'master' }
    inspectionMocks.start.mockResolvedValue({
      enabled: true, startsAt: Date.parse('2026-08-08T10:00'), endsAt: Date.parse('2026-08-08T11:00'), message: '점검 안내',
    })
    act(() => root.render(<AdminPage user={user} />))

    const tab = [...container.querySelectorAll('button')].find((button) => button.textContent === '점검 모드')
    act(() => tab.click())
    const setValue = (name, value) => {
      const input = container.querySelector(`[name="${name}"]`)
      act(() => {
        Simulate.change(input, { target: { value } })
      })
    }
    setValue('inspectionStartsAt', '2026-08-08T10:00')
    setValue('inspectionEndsAt', '2026-08-08T11:00')
    setValue('inspectionMessage', '점검 안내')

    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent === '점검 시작').click()
      await Promise.resolve()
    })

    expect(inspectionMocks.start).toHaveBeenCalledWith({
      user,
      startsAt: Date.parse('2026-08-08T10:00'),
      endsAt: Date.parse('2026-08-08T11:00'),
      message: '점검 안내',
    })
    expect(container.textContent).toContain('점검 기간을 저장했습니다.')
  })

  it('stops inspection immediately for the current verified user', async () => {
    const user = { uid: 'master' }
    inspectionMocks.stop.mockResolvedValue({ enabled: false, startsAt: 0, endsAt: 1, message: '' })
    act(() => root.render(<AdminPage user={user} />))
    act(() => [...container.querySelectorAll('button')].find((button) => button.textContent === '점검 모드').click())

    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent === '즉시 종료').click()
      await Promise.resolve()
    })

    expect(inspectionMocks.stop).toHaveBeenCalledWith({ user })
    expect(container.textContent).toContain('점검을 즉시 종료했습니다.')
  })
})
