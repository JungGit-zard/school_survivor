// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Lobby, { BOSS_SHOWTIME } from './Lobby.jsx'
import { saveStageBossPreview } from '../lib/graphicsStudioConfig.js'
import { playSfx } from '../lib/sfxRegistry.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  buildCloudProgressSnapshot,
  getFirebaseProgressRuntimeSnapshot,
  updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { isStageUnlocked } from '../lib/stageConfig.js'
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'
import { saveTitleSettings } from '../lib/titleSettings.js'
import { runLobbyHydrationCycles } from '../../test/lobbyHydrationCycles.jsx'

const stageBossPreviewRenderState = vi.hoisted(() => ({ count: 0 }))
vi.mock('../lib/guestRankingIdentity.js', () => ({
  getGuestRankingNickname: () => '게스트생존자',
  getRankingUser: vi.fn(async () => ({ uid: 'guest', displayName: '게스트생존자' })),
  saveGuestRankingNickname: vi.fn(async (nickname) => ({ ok: true, nickname })),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="stage-monster-canvas" />,
}))

vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
// Audio initialization and canvas chunk loading are outside this DOM hydration gate.
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(async () => {}) }))
vi.mock('howler', () => ({ Howl: vi.fn(), Howler: {} }))

vi.mock('../lib/sfxRegistry.js', () => ({
  playSfx: vi.fn(),
}))

vi.mock('./StageLock.jsx', () => ({
  StageLockPreview: ({ style = null, testId = 'stage-lock-preview', ariaLabel = '잠긴 스테이지 3D 자물쇠' }) => (
    <div data-testid={testId} aria-label={ariaLabel} style={style ?? undefined} />
  ),
}))

vi.mock('./StageBossPreview.jsx', async () => {
  const ReactActual = await vi.importActual('react')
  const { default: React, useEffect, useState } = ReactActual
  return {
    default: function MockStageBossPreview({
      framing = {},
      bossType = 'B01',
      motionToken = 0,
      style = null,
      testId = 'stage-boss-preview',
      ariaLabel = 'stage1 보스 3D',
    }) {
      stageBossPreviewRenderState.count += 1
      const [motionActive, setMotionActive] = useState(() => motionToken > 0)
      useEffect(() => {
        if (!motionToken) return undefined
        setMotionActive(true)
        const timer = window.setTimeout(() => setMotionActive(false), 1000)
        return () => window.clearTimeout(timer)
      }, [motionToken])
      return React.createElement('div', {
        'data-testid': testId,
        'data-zoom': framing.zoom,
        'data-pan-x': framing.panX,
        'data-pan-y': framing.panY,
        'data-boss-type': bossType,
        'data-motion-active': String(motionActive),
        'aria-label': ariaLabel,
        style: style ?? undefined,
      })
    },
  }
})

vi.mock('../lib/firebaseRanking.js', async () => {
  const actual = await vi.importActual('../lib/firebaseRanking.js')
  return {
    ...actual,
    fetchStageRanking: vi.fn(() => Promise.resolve([])),
  }
})

describe('Lobby', () => {
  let previousActEnvironment
  beforeEach(() => {
    previousActEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    _seedHydratedFirebaseProgressForTests({ uid: 'lobby-user', displayName: 'Lobby Tester' })
    commitFirebaseStudioRuntime({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
      // 스튜디오 런타임은 정수 revision까지 있어야 ready로 인정된다(fail-closed write gate).
    }, { revision: 0 })
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'lobby-user', displayName: 'Lobby Tester', email: 'lobby@example.com' },
      initialized: true,
      progressStatus: 'ready',
    })
    useGameStore.setState({ goldTotal: 12 })
    stageBossPreviewRenderState.count = 0
  })

  afterEach(() => {
    if (previousActEnvironment) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', previousActEnvironment)
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })

  it('opens stage play, ranking, and coin shop from the lobby', () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    const onOpenCoinShop = vi.fn()
    const onOpenRanking = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop, onOpenRanking })

    clickButtonByText(view.container, '입장하기')
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onStartStage).toHaveBeenCalledWith('stage1')

    clickButtonByText(view.container, '점수 레코드')
    expect(onOpenRanking).toHaveBeenCalledWith('stage1')

    clickButtonByText(view.container, '상점')
    expect(onOpenCoinShop).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    view.unmount()
  })

  it('opens settings for a guest without requiring or writing Firebase progress', () => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ status: 'signedOut', user: null, progressStatus: 'idle' })
    const before = getFirebaseProgressRuntimeSnapshot()
    const view = renderLobby({})

    expect(view.container.textContent).toContain('게스트생존자')

    act(() => {
      view.container.querySelector('[aria-label="설정 열기"]').click()
    })

    expect(view.container.querySelector('[role="dialog"]')).not.toBeNull()
    const oldAppearance = Array.from(view.container.querySelectorAll('button'))
      .find((button) => button.textContent === '구')
    act(() => oldAppearance.click())
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain('저장')
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)

    const user = { uid: 'newly-signed-in-user' }
    _seedHydratedFirebaseProgressForTests(user)
    saveTitleSettings({ vibration: false, playerAppearance: 'legacy' })
    const accountProgress = buildCloudProgressSnapshot().progress
    act(() => useAuthStore.setState({ status: 'signedIn', user, progressStatus: 'ready' }))
    expect(buildCloudProgressSnapshot().progress).toEqual(accountProgress)
    view.unmount()
  })

  it('renders the four-button mobile bottom navigator without the duplicate ability entry', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const nav = view.container.querySelector('[aria-label="로비 메뉴"]')
    const labels = Array.from(nav.querySelectorAll('button')).map((button) => button.textContent)

    expect(labels).toEqual(['무기', '랭킹', '상점', '미션'])
    expect(labels).not.toContain('능력치')
    // 4버튼으로 늘어난 뒤에도 하단 네비 터치 타깃 최소 44px를 지켜야 한다(320px 폭에서 69.75x48 실측).
    Array.from(nav.querySelectorAll('button')).forEach((button) => {
      expect(Number.parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(44)
    })

    view.unmount()
  })

  it('clears the weapon NEW badge when the opened encyclopedia closes', () => {
    useGameStore.setState({ newlyUnlockedWeaponIds: Object.freeze(['guidedMissile']) })
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const nav = view.container.querySelector('[aria-label="로비 메뉴"]')

    expect(view.container.querySelector('[data-testid="weapon-nav-new-badge"]')).not.toBeNull()
    act(() => {
      nav.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      view.container.querySelector('[role="dialog"]').previousElementSibling
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toEqual([])
    expect(view.container.querySelector('[data-testid="weapon-nav-new-badge"]')).toBeNull()
    view.unmount()
  })

  it('uses the authenticated Google account name when no Firebase nickname is set', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).toContain('Lobby Tester')
    expect(view.container.textContent).not.toContain('이름 없는 생존자')
    expect(view.container.textContent).not.toContain('Nameless Survivor')

    view.unmount()
  })

  it('keeps Stage 1 playable while signed-in Firebase progress is still loading or errored', () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    useAuthStore.setState({ progressStatus: 'loading', progressError: null })
    const loadingView = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(loadingView.container.querySelector('[data-testid="lobby-records-pending"]')).not.toBeNull()
    expect(loadingView.container.querySelectorAll('[data-testid="stage-lock-preview"]')).toHaveLength(3)
    expect(loadingView.container.querySelectorAll('[data-testid="stage-boss-preview"]')).toHaveLength(1)
    expect(Array.from(loadingView.container.querySelectorAll('button')).filter((button) => button.textContent === '입장하기')).toHaveLength(1)
    clickButtonByText(loadingView.container, '입장하기')
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onStartStage).toHaveBeenCalledWith('stage1')
    loadingView.unmount()

    useAuthStore.setState({ progressStatus: 'error', progressError: new Error('remote snapshot unavailable') })
    const errorView = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    expect(errorView.container.querySelector('[data-testid="lobby-records-pending"]')).not.toBeNull()
    expect(errorView.container.querySelectorAll('[data-testid="stage-lock-preview"]')).toHaveLength(3)
    expect(errorView.container.querySelectorAll('[data-testid="stage-boss-preview"]')).toHaveLength(1)
    expect(Array.from(errorView.container.querySelectorAll('button')).filter((button) => button.textContent === '입장하기')).toHaveLength(1)
    errorView.unmount()
    vi.useRealTimers()
  })

  // 계약 2026-10-24 §3: 목록은 Stage1~4 고정, 목록 확대 금지. 해금 기록과 노출은 별개다.
  it('lists exactly the four contract stages and never a fifth card', () => {
    seedPlayerRecords({ stage1Clears: 1, stage2Clears: 1, stage3Clears: 1, stage3BossDefeats: 1 })
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    const cards = Array.from(view.container.querySelectorAll('section'))
    expect(cards).toHaveLength(4)
    expect(cards.map((card) => card.getAttribute('aria-label').split(' ').slice(0, 2).join(' ')))
      .toEqual(['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'])

    view.unmount()
  })

  it('keeps the stage list at four cards even when the Stage5 unlock record exists', () => {
    // B04를 잡아 Stage5 해금 기록이 남은 계정. 기록은 유지되지만 카드는 늘지 않는다.
    seedPlayerRecords({
      stage1Clears: 1, stage2Clears: 1, stage3Clears: 1, stage4Clears: 1,
      stage3BossDefeats: 1, stage4BossDefeats: 1,
    })
    expect(isStageUnlocked('stage5', loadPlayerRecords())).toBe(true)

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.querySelectorAll('section')).toHaveLength(4)
    expect(view.container.querySelector('section[aria-label^="Stage 5 "]')).toBeNull()
    expect(view.container.textContent).not.toContain('학교 최종 돌파')

    view.unmount()
  })

  it('restores every cleared stage when the authenticated account progress arrives after the lobby mounts', () => {
    useAuthStore.setState({ progressStatus: 'loading' })
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.querySelector('[data-testid="lobby-records-pending"]')).not.toBeNull()
    expect(view.container.querySelectorAll('[data-testid="stage-lock-preview"]')).toHaveLength(3)
    expect(view.container.querySelectorAll('[data-testid="stage-boss-preview"]')).toHaveLength(1)
    expect(view.container.textContent).toContain('Stage 1 보스 처치 시 열림')
    expect(view.container.textContent).toContain('Stage 3 보스 처치 시 열림')

    seedPlayerRecords({
      stage1Clears: 1,
      stage2Clears: 1,
      stage3Clears: 1,
      stage4Clears: 1,
      // 계약 2026-10-24 §3: 해금 증거는 clear가 아니라 이전 스테이지 보스 사망 기록이다.
      stage1BossDefeats: 1,
      stage2BossDefeats: 1,
      stage3BossDefeats: 1,
      stage4BossDefeats: 1,
      bestSurvivalSeconds: 766,
      stage2BestSurvivalSec: 366,
      stage3BestSurvivalSec: 321,
      stage4BestSurvivalSec: 481,
    })
    act(() => {
      useAuthStore.setState({ progressStatus: 'ready' })
    })

    expect(view.container.querySelector('[data-testid="lobby-records-pending"]')).toBeNull()
    expect(Array.from(view.container.querySelectorAll('button')).filter((button) => button.textContent === '입장하기')).toHaveLength(4)
    expectVerifiedFixtureStageAccess(view.container)
    expect(view.container.textContent).toContain('12:46')
    expect(view.container.textContent).toContain('6:06')
    expect(view.container.textContent).toContain('5:21')
    expect(view.container.textContent).toContain('8:01')

    view.unmount()
  })

  if (process.env.UI10000_DIAGNOSTIC === '1') it('profiles bounded real Lobby DOM cost without reducing the final gate', async () => {
    const result = await runLobbyHydrationCycles({ count: 20, profileDom: true })
    writeFileSync(join(process.env.UI10000_EVIDENCE_DIR, 'jsdom-bounded-profile.json'), JSON.stringify(result, null, 2))
    expect(result.completed).toBe(20)
    expect(result.warnings.act).toBe(0)
  }, 60_000)

  it('keeps the verified account records across 10,000 login-hydrate-lobby cycles', () => {
    const account = { uid: 'master-account', displayName: '정실장', email: 'zard5388@gmail.com' }
    const canonicalRecords = {
      stage1Clears: 23,
      stage2Clears: 9,
      stage3Clears: 2,
      stage4Clears: 1,
      // Stage2/3 해금 증거는 이전 스테이지 보스 ledger 투영(f8a0ee89) — clear는 증거가 아니다.
      stage1BossDefeats: 1,
      stage2BossDefeats: 1,
      // 계약 2026-10-24 §3: Stage4/Stage5 해금 증거는 clear가 아니라 보스 사망 기록이다.
      stage3BossDefeats: 1,
      stage4BossDefeats: 1,
      bestSurvivalSeconds: 766,
      stage2BestSurvivalSec: 366,
      stage3BestSurvivalSec: 321,
      stage4BestSurvivalSec: 481,
    }

    for (let attempt = 1; attempt <= 10_000; attempt += 1) {
      _resetFirebaseProgressForTests()
      useAuthStore.setState({
        status: 'signedIn',
        user: account,
        initialized: true,
        progressStatus: 'loading',
        progressError: null,
      })
      const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

      expect(view.container.querySelector('[data-testid="lobby-records-pending"]'), `attempt ${attempt}`).not.toBeNull()
      // 로딩 중에는 Stage1만 열리고 나머지 노출 카드(Stage2~4)는 자물쇠다(b01ea4c3).
      expect(view.container.querySelectorAll('[data-testid="stage-lock-preview"]'), `attempt ${attempt}`).toHaveLength(3)

      act(() => {
        _seedHydratedFirebaseProgressForTests(account)
        seedPlayerRecords(canonicalRecords)
        useAuthStore.setState({ progressStatus: 'ready' })
      })

      expect(view.container.querySelector('[data-testid="lobby-records-pending"]'), `attempt ${attempt}`).toBeNull()
      expect(view.container.querySelectorAll('[data-testid="stage-lock-preview"]'), `attempt ${attempt}`).toHaveLength(0)
      // 카드 구조 검증은 첫/마지막 사이클만 — 사이클마다 DOM 질의 30회를 1만 번 돌리면
      // 이 테스트의 600초 예산(:끝의 600_000)을 넘긴다. 이 루프의 목적은 1만 사이클 기록 영속성이고,
      // 카드 구조는 바로 위 단발 테스트가 같은 헬퍼로 이미 검증한다.
      if (attempt === 1 || attempt === 10_000) expectVerifiedFixtureStageAccess(view.container, `attempt ${attempt}`)
      expect(view.container.textContent, `attempt ${attempt}`).toContain('12:46')
      expect(view.container.textContent, `attempt ${attempt}`).toContain('6:06')
      expect(view.container.textContent, `attempt ${attempt}`).toContain('5:21')
      expect(view.container.textContent, `attempt ${attempt}`).toContain('8:01')

      view.unmount()
    }
  }, 600_000)

  it('caps the desktop stage list width so cards do not stretch across wide monitors', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const stageList = view.container.querySelector('[aria-label="스테이지 목록"]')

    expect(stageList).not.toBeNull()
    expect(stageList.style.width).toBe('100%')
    expect(stageList.style.maxWidth).toBe('1080px')
    expect(stageList.style.alignSelf).toBe('center')

    view.unmount()
  })

  it('keeps the settings control at the 44px touch-target minimum', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const settingsButton = view.container.querySelector('[aria-label="설정 열기"]')

    expect(settingsButton).not.toBeNull()
    expect(settingsButton.style.width).toBe('44px')
    expect(settingsButton.style.height).toBe('44px')

    view.unmount()
  })

  it('keeps every stage primary and ranking control at the 44px touch-target minimum', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRows = Array.from(view.container.querySelectorAll('[data-testid="stage-card-preview-row"]'))
    const stageControls = previewRows.flatMap((row) => Array.from(row.querySelectorAll('button')))

    expect(stageControls).toHaveLength(previewRows.length * 2)
    stageControls.forEach((button) => {
      expect(Number.parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(44)
    })

    view.unmount()
  })

  it('does not show player cumulative play and season best in the lobby season block', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).not.toContain('내 시즌최고점')
    expect(view.container.textContent).not.toContain('내 누적플레이')

    view.unmount()
  })

  it('replaces daily and weekly first-place previews with a stage monster preview', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).not.toContain('일일 1위')
    expect(view.container.textContent).not.toContain('주간 1위')
    expect(view.container.querySelector('[aria-label="stage1 보스 3D"]')).toBeTruthy()

    view.unmount()
  })

  it('uses each stage card boss preview, including the PE teacher for Stage 3', () => {
    seedPlayerRecords({
      stage1Clears: 1,
      stage2Clears: 1,
      stage3Clears: 1,
      // 카드 해금 = 이전 스테이지 보스 사망 기록(계약 2026-10-24 §3, origin stage{N}BossDefeats).
      stage1BossDefeats: 1,
      stage2BossDefeats: 1,
      stage3BossDefeats: 1,
      bestSurvivalSeconds: 240,
      stage2BestSurvivalSec: 240,
    })

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previews = Array.from(view.container.querySelectorAll('[data-testid="stage-boss-preview"]'))

    expect(previews[0].dataset.bossType).toBe('B01')
    expect(previews[1].dataset.bossType).toBe('B02')
    expect(previews[2].dataset.bossType).toBe('B03')
    expect(previews[3].dataset.bossType).toBe('B04')

    view.unmount()
  })

  it('keeps Stage 4 locked behind Stage 3 with the exact safe hint before the clear', () => {
    seedPlayerRecords({
      stage1Clears: 1,
      stage2Clears: 1,
      bestSurvivalSeconds: 240,
      stage2BestSurvivalSec: 240,
    })

    const onStartStage = vi.fn()
    const onOpenRanking = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking })
    const stage4Card = findStageCard(view.container, 'Stage 4 급식실 대탈출')
    const lockPreview = stage4Card.querySelector('[data-testid="stage-lock-preview"]')
    const disabledEntry = findButtonByText(stage4Card, 'Stage 3 보스 처치 시 열림')
    const rankingButton = findButtonByText(stage4Card, '점수 레코드')

    expect(lockPreview).toBeTruthy()
    expect(lockPreview.getAttribute('aria-label')).toBe('stage4 잠김 3D 자물쇠')
    expect(stage4Card.querySelector('[data-testid="stage-boss-preview"]')).toBeFalsy()
    expect(stage4Card.textContent).not.toContain('🔒 Stage 3 보스 처치 시 열림')
    expect(disabledEntry.disabled).toBe(true)
    expect(disabledEntry.style.position).toBe('absolute')
    expect(disabledEntry.style.right).toBe('10px')
    expect(disabledEntry.style.bottom).toBe('10px')
    expect(disabledEntry.style.minWidth).toBe('132px')
    expect(disabledEntry.style.minHeight).toBe('44px')
    expect(disabledEntry.style.fontSize).toBe('11px')
    expect(rankingButton.disabled).toBe(true)
    expect(rankingButton.style.position).toBe('absolute')
    expect(rankingButton.style.top).toBe('34px')
    expect(rankingButton.style.left).toBe('10px')
    expect(rankingButton.style.width).toBe('74px')
    expect(rankingButton.style.minHeight).toBe('44px')
    expect(stage4Card.children).toHaveLength(1)

    act(() => {
      stage4Card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      lockPreview.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      disabledEntry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      rankingButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onStartStage).not.toHaveBeenCalled()
    expect(onOpenRanking).not.toHaveBeenCalled()
    expect(playSfx).not.toHaveBeenCalled()
    expect(stage4Card.querySelector('[data-testid="stage-card-showtime"]')).toBeFalsy()

    view.unmount()
  })

  it('renders locked Stage 2 and Stage 3 with the same preview/button structure and inert padlock preview', () => {
    const onStartStage = vi.fn()
    const onOpenRanking = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking })
    const stage2Card = findStageCard(view.container, 'Stage 2 복도 투사체 시험')
    const stage3Card = findStageCard(view.container, 'Stage 3 체육관 총력전')

    for (const [card, stageId, hint] of [
      [stage2Card, 'stage2', 'Stage 1 보스 처치 시 열림'],
      [stage3Card, 'stage3', 'Stage 2 보스 처치 시 열림'],
    ]) {
      const previewRow = card.querySelector('[data-testid="stage-card-preview-row"]')
      const lockPreview = card.querySelector('[data-testid="stage-lock-preview"]')
      const disabledEntry = findButtonByText(card, hint)
      const rankingButton = findButtonByText(card, '점수 레코드')

      expect(previewRow).toBeTruthy()
      expect(lockPreview).toBeTruthy()
      expect(lockPreview.getAttribute('aria-label')).toBe(`${stageId} 잠김 3D 자물쇠`)
      expect(card.querySelector('[data-testid="stage-boss-preview"]')).toBeFalsy()
      expect(card.textContent).not.toContain(`🔒 ${hint}`)
      expect(previewRow.contains(disabledEntry)).toBe(true)
      expect(previewRow.contains(rankingButton)).toBe(true)
      expect(disabledEntry.disabled).toBe(true)
      expect(rankingButton.disabled).toBe(true)
      expect(disabledEntry.style.position).toBe('absolute')
      expect(rankingButton.style.position).toBe('absolute')
      expect(card.children).toHaveLength(1)

      act(() => {
        card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        lockPreview.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
        disabledEntry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        rankingButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }

    expect(onStartStage).not.toHaveBeenCalled()
    expect(onOpenRanking).not.toHaveBeenCalled()
    expect(playSfx).not.toHaveBeenCalled()

    view.unmount()
  })

  it('reveals Stage 4 B04 preview and enables entry + ranking after the Stage 3 boss defeat', () => {
    vi.useFakeTimers()
    seedPlayerRecords({
      stage1Clears: 1,
      stage2Clears: 1,
      stage3Clears: 1,
      // 해금 증거는 B03 사망 기록뿐이다(계약 2026-10-24 §3).
      stage3BossDefeats: 1,
      bestSurvivalSeconds: 240,
      stage2BestSurvivalSec: 240,
      stage3BestSurvivalSec: 240,
    })
    const onStartStage = vi.fn()
    const onOpenRanking = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking })
    const stage4Card = findStageCard(view.container, 'Stage 4 급식실 대탈출')
    const preview = stage4Card.querySelector('[data-testid="stage-boss-preview"]')

    const enterButton = findButtonByText(stage4Card, '입장하기')
    const rankingButton = findButtonByText(stage4Card, '점수 레코드')

    // balanceqa 게이트 통과 후: 스3 보스 사망 기록으로 해금 + 프로덕션에서 플레이어블 → 입장/랭킹 활성, '준비 중' 없음.
    expect(preview.dataset.bossType).toBe('B04')
    expect(stage4Card.textContent).not.toContain('준비 중')
    expect(enterButton.disabled).toBe(false)
    expect(rankingButton.disabled).toBe(false)

    act(() => {
      rankingButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOpenRanking).toHaveBeenCalledWith('stage4')

    act(() => {
      enterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      vi.advanceTimersByTime(1_000)
    })
    expect(onStartStage).toHaveBeenCalledWith('stage4')

    vi.useRealTimers()
    view.unmount()
  })

  // origin 정책(Lobby.expansion.test): 일반 UI에서 dev 전체 해금 prop은 보스 증거를 대신하지 않는다.
  it('keeps Stage 4 locked under the dev all-stage prop until the Stage 3 boss record exists', () => {
    const onStartStage = vi.fn()
    const view = renderLobby({
      onStartStage,
      onOpenCoinShop: () => {},
      onOpenRanking: () => {},
      devAllStagesUnlocked: true,
    })
    const stage4Card = findStageCard(view.container, 'Stage 4 급식실 대탈출')

    expect(stage4Card.querySelector('[data-testid="stage-lock-preview"]')).toBeTruthy()
    expect(findButtonByText(stage4Card, 'Stage 3 보스 처치 시 열림').disabled).toBe(true)
    expect(onStartStage).not.toHaveBeenCalled()

    view.unmount()
  })

  it('assigns each lobby boss a distinct showtime sound cue', () => {
    expect(BOSS_SHOWTIME.B01.sounds[0].id).toBe('bossRoar')
    expect(BOSS_SHOWTIME.B02.sounds[0].id).toBe('zombieTankGroan')
    expect(BOSS_SHOWTIME.B03.sounds[0].id).toBe('zombieChargeRoar')
  })

  it('uses the stage title as the card hero without the old square stage badge', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(view.container.textContent).toContain('Stage 1')
    expect(view.container.textContent).toContain('교실 생존')
    expect(view.container.textContent).not.toContain('STAGE')

    view.unmount()
  })

  it('uses the saved studio stage boss preview framing', () => {
    commitFirebaseStudioRuntime({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
      bossFaceRecipes: {},
    }, { revision: 1 })
    saveStageBossPreview({ zoom: 137, panX: 0.5, panY: -0.25 })

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const preview = view.container.querySelector('[data-testid="stage-boss-preview"]')

    expect(preview.dataset.zoom).toBe('137')
    expect(preview.dataset.panX).toBe('0.5')
    expect(preview.dataset.panY).toBe('-0.25')

    view.unmount()
  })

  it('injects lobby juice keyframes and marks motion nodes for the reduced-effects gate', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })

    expect(document.getElementById('lobby-keyframes')).toBeTruthy()
    expect(view.container.querySelector('.lobby-anim')).toBeTruthy()
    expect(view.container.querySelector('[data-testid="lobby-ambient-drift"]').style.transform).toContain('translate3d')

    view.unmount()
  })

  it('keeps the base lobby light moving and gives a touched button a short afterglow', () => {
    vi.useFakeTimers()
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const ambient = view.container.querySelector('[data-testid="lobby-ambient-drift"]')
    const shopButton = view.container.querySelector('nav button:last-child')

    expect(ambient.style.transform).toContain('translate3d(0%, 0%, 0)')

    act(() => {
      vi.advanceTimersByTime(2400)
    })
    expect(ambient.style.transform).not.toContain('translate3d(0%, 0%, 0)')

    act(() => {
      shopButton.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    expect(shopButton.classList.contains('lobby-touch-feedback')).toBe(true)
    expect(view.container.querySelector('[data-testid="lobby-touch-pulse"]')?.classList.contains('lobby-touch-pulse-active')).toBe(true)
    expect(view.container.querySelector('[data-testid="lobby-touch-ambient"]')?.style.opacity).toBe('1')

    act(() => {
      vi.advanceTimersByTime(320)
    })
    expect(shopButton.classList.contains('lobby-touch-feedback')).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(view.container.querySelector('[data-testid="lobby-touch-ambient"]')?.style.opacity).toBe('0')

    vi.useRealTimers()
    view.unmount()
  })

  it('updates ambient drift on its interval without rerendering stage boss previews', () => {
    vi.useFakeTimers()
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const initialRenderCount = stageBossPreviewRenderState.count
    const ambient = view.container.querySelector('[data-testid="lobby-ambient-drift"]')

    expect(ambient.style.transform).toContain('translate3d(0%, 0%, 0)')

    act(() => {
      vi.advanceTimersByTime(2400)
    })

    expect(ambient.style.transform).not.toContain('translate3d(0%, 0%, 0)')
    expect(stageBossPreviewRenderState.count).toBe(initialRenderCount)

    vi.useRealTimers()
    view.unmount()
  })

  it('overlays the stage text on top of a taller boss preview area', () => {
    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const preview = previewRow.querySelector('[data-testid="stage-boss-preview"]')
    const overlay = previewRow.querySelector('[data-testid="stage-card-preview-overlay"]')

    expect(preview.style.height).toBe('144px')
    expect(previewRow.parentElement.style.padding).toBe('5px')
    expect(previewRow.firstElementChild).toBe(preview)
    expect(overlay.style.position).toBe('absolute')
    expect(overlay.style.textAlign).toBe('right')
    expect(overlay.textContent).toContain('Stage 1')
    expect(overlay.textContent).toContain('교실 생존')
    expect(previewRow.contains(findButtonByText(view.container, '입장하기'))).toBe(true)
    expect(previewRow.contains(findButtonByText(view.container, '점수 레코드'))).toBe(true)

    view.unmount()
  })

  it('places the clear badge at the top-left of the preview after clearing a stage', () => {
    seedPlayerRecords({ stage1Clears: 1, bestSurvivalSeconds: 240 })

    const view = renderLobby({ onStartStage: () => {}, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const clearBadge = Array.from(previewRow.querySelectorAll('span')).find((node) => node.textContent === '클리어')

    expect(clearBadge.style.position).toBe('absolute')
    expect(clearBadge.style.top).toBe('9px')
    expect(clearBadge.style.left).toBe('10px')

    const rankingButton = findButtonByText(view.container, '점수 레코드')
    expect(rankingButton.style.position).toBe('absolute')
    expect(rankingButton.style.top).toBe('34px')
    expect(rankingButton.style.left).toBe('10px')

    view.unmount()
  })

  it('plays each card boss showtime before entering the selected stage', () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const preview = previewRow.querySelector('[data-testid="stage-boss-preview"]')
    const overlay = previewRow.querySelector('[data-testid="stage-card-preview-overlay"]')

    expect(preview.dataset.motionActive).toBe('false')

    act(() => {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(preview.dataset.motionActive).toBe('true')
    expect(onStartStage).not.toHaveBeenCalled()
    expect(playSfx).toHaveBeenCalledWith('bossRoar', 0.9, { rate: 0.9 })
    expect(view.container.querySelector('[data-testid="stage-card-showtime"]')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(onStartStage).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(onStartStage).toHaveBeenCalledWith('stage1')

    vi.useRealTimers()
    view.unmount()
  })

  it('accepts only the first stage-card showtime until that entry resolves', () => {
    vi.useFakeTimers()
    seedPlayerRecords({ stage1Clears: 1 })
    const onStartStage = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const overlays = view.container.querySelectorAll('[data-testid="stage-card-preview-overlay"]')

    act(() => {
      overlays[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      overlays[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      vi.advanceTimersByTime(1_000)
    })

    expect(onStartStage).toHaveBeenCalledTimes(1)
    expect(onStartStage).toHaveBeenCalledWith('stage1')
    expect(playSfx).not.toHaveBeenCalledWith('zombieTankGroan', expect.anything(), expect.anything())

    vi.useRealTimers()
    view.unmount()
  })

  it('plays the showtime animation even under reduced effects (user-initiated feedback) with one-second pacing', () => {
    // 입장 쇼타임은 유저가 직접 누른 행동의 1초 피드백 — 모션 게이트(연출줄이기)를 우회한다.
    document.documentElement.dataset.reducedEffects = 'true'
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    const view = renderLobby({ onStartStage, onOpenCoinShop: () => {}, onOpenRanking: () => {} })
    const previewRow = view.container.querySelector('[data-testid="stage-card-preview-row"]')
    const enterButton = previewRow.querySelectorAll('button')[0]
    const preview = previewRow.querySelector('[data-testid="stage-boss-preview"]')

    act(() => {
      enterButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onStartStage).not.toHaveBeenCalled()
    expect(preview.dataset.motionActive).toBe('true')
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onStartStage).toHaveBeenCalledWith('stage1')

    delete document.documentElement.dataset.reducedEffects
    vi.useRealTimers()
    view.unmount()
  })
})

function renderLobby(props) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<Lobby {...props} />)
  })

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function clickButtonByText(container, text) {
  const button = findButtonByText(container, text)
  if (!button) throw new Error(`Missing button: ${text}`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function findButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  return button
}

function findStageCard(container, ariaLabel) {
  const card = container.querySelector(`[aria-label="${ariaLabel}"]`)
  if (!card) throw new Error(`Missing stage card: ${ariaLabel}`)
  return card
}

// 계약 2026-10-24 §3: 로비 선택 목록은 Stage1~4로 고정이고 목록 확대는 금지다.
// Stage5 해금 기록(stage4BossDefeats)이 있어도 카드는 늘지 않는다 — 기록과 노출은 별개다.
// 노출원은 stageConfig.LOBBY_STAGE_IDS 한 곳이며 STAGE_CONFIGS에는 stage5/확장 6~10이 그대로 남는다.
// 이 fixture는 Stage1~4를 모두 클리어한 계정이다. Pending 상태에서는 Stage1만 열리고 나머지는 자물쇠다.
function expectVerifiedFixtureStageAccess(container, context = 'verified fixture') {
  expect(container.querySelectorAll('section'), context).toHaveLength(4)
  expect(container.querySelector('section[aria-label^="Stage 5 "]'), `${context}: Stage5 must not be listed`).toBeNull()
  for (let stage = 1; stage <= 4; stage += 1) {
    const card = container.querySelector(`section[aria-label^="Stage ${stage} "]`)
    expect(card, `${context}: Stage ${stage}`).not.toBeNull()
    const enter = Array.from(card.querySelectorAll('button')).find(button => button.textContent === '입장하기')
    expect(enter, `${context}: Stage ${stage} entry`).toBeDefined()
    expect(enter.disabled, `${context}: Stage ${stage} unlocked`).toBe(false)
    expect(card.querySelector('[data-testid="stage-lock-preview"]'), context).toBeNull()
    expect(card.textContent, `${context}: Stage ${stage} record`).not.toContain('기록 없음')
  }
}

function seedPlayerRecords(records) {
  updateFirebasePlayerProgress((progress) => {
    progress.records = {
      ...(progress.records ?? {}),
      ...records,
    }
    return progress
  })
}
