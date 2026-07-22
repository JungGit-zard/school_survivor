// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD, {
  UpgradeIcon,
  getNextUnlockPreview,
  getUpgradeChoiceDesc,
  getUpgradeChoiceLabel,
  getWeaponUpgradeIconSrc,
  limitDuplicateWeaponUpgradeOptions,
  limitPencilUpgradeOptions,
} from './HUD.jsx'
import { WEAPON_CATALOG, isStarter } from '../lib/weaponCatalog.js'
import { useGameStore } from '../store/useGameStore.js'
import { _resetForTests as resetWeaponUnlocks, setUnlocked } from '../lib/weaponUnlocks.js'
import { STORAGE_KEY as PLAYER_RECORDS_KEY, load as loadPlayerRecords } from '../lib/playerRecords.js'
import { buildLocalPlayerRankingEntry } from '../lib/userRanking.js'
import { resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { saveStudioTunings } from '../lib/graphicsStudioConfig.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { STAGE4_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { hydrateFirebaseStudio, setFirebaseStudioUser } from '../lib/firebaseStudio.js'
import { blockFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'

const TEST_STUDIO_USER = { uid: 'hud-test-user' }
const EMPTY_STUDIO_SNAPSHOT = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: '2026-07-18T00:00:00.000Z',
  datasets: {
    tunings: {},
    sfxTunings: {},
    stageBossPreview: {},
    decals: {},
    propPlacements: { stage1: null, stage2: [], stage3: null },
  },
}

beforeEach(async () => {
  _seedHydratedFirebaseProgressForTests()
  setFirebaseStudioUser(TEST_STUDIO_USER)
  await hydrateFirebaseStudio({
    user: TEST_STUDIO_USER,
    client: { load: vi.fn().mockResolvedValue(EMPTY_STUDIO_SNAPSHOT) },
  })
})

afterEach(() => {
  vi.useRealTimers()
  _seedHydratedFirebaseProgressForTests()
  useGameStore.getState().resetGame()
  resetWeaponUnlocks()
  localStorage.removeItem(PLAYER_RECORDS_KEY)
  resetAdminConfig()
  setFirebaseStudioUser(null)
  blockFirebaseStudioRuntime()
})

describe('upgrade choice filtering', () => {
  it('labels run weapon acquisition as 획득, not account 해금', () => {
    expect(getUpgradeChoiceLabel({ key: 'acquireBag' })).toContain('획득')
    expect(getUpgradeChoiceLabel({ key: 'acquireChibiko' })).toBe('치비코 획득')
    expect(getUpgradeChoiceLabel({ key: 'acquireSharkMissile' })).toBe('상어미사일 획득')
    expect(getUpgradeChoiceLabel({ key: 'acquireCompassBlade' })).toBe('오리요강 획득')
    expect(getUpgradeChoiceLabel({ key: 'compassBladeCount', label: '오리요강 개수 +1' })).toBe('오리요강 개수 +1')
    expect(getUpgradeChoiceDesc({ key: 'compassBladeDamage', desc: '회전 오리요강 피해 증가' })).toBe('회전 오리요강 피해 증가')
    expect(getUpgradeChoiceDesc({ key: 'acquireBell', desc: '벨 스킬 해금' })).toBe('벨 스킬 획득')
  })

  it('limits pencil upgrade options to one card', () => {
    const options = [
      { key: 'pencilDamage' },
      { key: 'pencilCount' },
      { key: 'pencilPierce' },
      { key: 'pencilCrit' },
      { key: 'acquireBag' },
      { key: 'maxHealth' },
    ]

    const filtered = limitPencilUpgradeOptions(options, () => 0.4)
    const pencilCount = filtered.filter((option) => option.key.startsWith('pencil')).length

    expect(pencilCount).toBe(1)
    expect(filtered.map((option) => option.key)).toContain('acquireBag')
    expect(filtered.map((option) => option.key)).toContain('maxHealth')
  })

  it('limits every weapon to one card in the three upgrade choices', () => {
    const options = [
      { key: 'umbrellaDamage' },
      { key: 'umbrellaRadius' },
      { key: 'onigiiriDamage' },
      { key: 'onigiiriBounce' },
      { key: 'maxHealth' },
    ]

    const filtered = limitDuplicateWeaponUpgradeOptions(options, () => 0.8)
    const umbrellaCount = filtered.filter((option) => option.key.startsWith('umbrella')).length
    const onigiriCount = filtered.filter((option) => option.key.startsWith('onigiiri')).length

    expect(umbrellaCount).toBe(1)
    expect(onigiriCount).toBe(1)
    expect(filtered.map((option) => option.key)).toContain('maxHealth')
  })

  it('does not preview account-locked weapons as next run cards', () => {
    const weapons = buildWeaponsWithStarterWeaponsOwned()

    expect(getNextUnlockPreview('gameover', weapons)).toBeNull()

    setUnlocked('guidedMissile')

    expect(getNextUnlockPreview('gameover', weapons)).toMatchObject({
      weapon: 'guidedMissile',
      minLevel: 4,
    })
  })
})

function buildWeaponsWithStarterWeaponsOwned() {
  const weapons = {}
  for (const [id, entry] of Object.entries(WEAPON_CATALOG)) {
    weapons[id] = {
      ...entry.base,
      label: entry.label,
      active: isStarter(id),
      level: isStarter(id) ? 1 : 0,
    }
  }
  return weapons
}

describe('weapon upgrade icon assets', () => {
  it('maps every weapon upgrade icon type to an image asset', () => {
    const weaponIconTypes = [
      'pencil',
      'ruler',
      'boxCutter',
      'tumbler',
      'flask',
      'bell',
      'stun',
      'onigiri',
      'missile',
      'starlink',
      'compassBlade',
      'umbrella',
      'eraser',
      'chibiko',
      'sharkMissile',
      'lantern',
    ]

    for (const type of weaponIconTypes) {
      expect(getWeaponUpgradeIconSrc(type), `${type} icon`).toMatch(/wea_|weapon_icon|^data:image\//)
    }
    expect(getWeaponUpgradeIconSrc('lantern')).toContain('16_wea_lantern.webp')
  })

  it('leaves non-weapon upgrade icons on the fallback UI path', () => {
    expect(getWeaponUpgradeIconSrc('speed')).toBeNull()
    expect(getWeaponUpgradeIconSrc('health')).toBeNull()
  })

  it('falls back to the drawn weapon icon when an image asset fails to load', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(<UpgradeIcon type="pencil" />)
    })

    const image = container.querySelector('img')
    expect(image).not.toBeNull()

    act(() => {
      image.dispatchEvent(new Event('error', { bubbles: true }))
    })

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-upgrade-fallback-icon="pencil"]')).not.toBeNull()

    act(() => {
      root.unmount()
    })
  })

  it('applies Graphics Studio tuning to the image-only extra battery icon', () => {
    saveStudioTunings({
      'weapon-extra-battery': {
        scale: 1.4,
        scaleX: 1.2,
        scaleY: 0.8,
        rotationZ: 25,
        brightness: 1.25,
        saturation: 1.35,
      },
    })

    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(<UpgradeIcon type="missile" />)
    })

    const image = container.querySelector('img')
    expect(image.style.transform).toContain('scale(1.68, 1.12)')
    expect(image.style.transform).toContain('rotateZ(25deg)')
    expect(image.style.filter).toContain('brightness(1.25)')
    expect(image.style.filter).toContain('saturate(1.35)')

    act(() => {
      root.unmount()
    })
  })
})

describe('gameover presentation', () => {
  it('runs a one-second grayscale transition before showing the result popup', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame()
    useGameStore.setState({
      phase: 'gameover',
      elapsedMs: 65_000,
      goldSession: 7,
      goldTotal: 19,
    })

    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()
      expect(container.textContent).not.toContain('GAME OVER')

      act(() => {
        vi.advanceTimersByTime(999)
      })

      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()
      expect(container.textContent).not.toContain('GAME OVER')

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
      expect(container.textContent).toContain('GAME OVER')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('level-up upgrade layout', () => {
  it('shows three upgrade choices side by side without a full-screen overlay', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState((state) => ({
      phase: 'levelup',
      player: { ...state.player, level: 2 },
    }))
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const overlay = container.querySelector('[data-testid="levelup-upgrade-overlay"]')
      const choices = container.querySelector('[data-testid="levelup-upgrade-choices"]')
      const choiceButtons = container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')

      expect(overlay).not.toBeNull()
      expect(overlay.style.inset).toBe('')
      expect(choices).not.toBeNull()
      expect(choices.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))')
      expect(choiceButtons).toHaveLength(3)
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('development weapon cheat panel', () => {
  it('hides development run buttons until cheat UI is revealed', () => {
    useGameStore.getState().resetGame('stage1')
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      expect(container.textContent).toContain('Ⅱ')
      expect(container.querySelector('[aria-label="Restart"]')).toBeNull()
      expect(container.textContent).not.toContain('M')
      expect(container.textContent).not.toContain('W')
      expect(container.querySelector('[data-testid="weapon-cheat-panel"]')).toBeNull()
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('opens from the W button and acquires the selected weapon for the current run', () => {
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().weapons.guidedMissile.active).toBe(false)

    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} devCheatsVisible />)
      })

      clickButtonByText(container, 'W')

      const panel = container.querySelector('[data-testid="weapon-cheat-panel"]')
      expect(panel).not.toBeNull()
      expect(panel.textContent).toContain(WEAPON_CATALOG.guidedMissile.label)

      clickButtonByText(panel, WEAPON_CATALOG.guidedMissile.label)

      expect(useGameStore.getState().weapons.guidedMissile).toMatchObject({
        active: true,
        level: 1,
      })
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('matilda entrance presentation', () => {
  it('starts the Stage 3 Matilda countdown at five seconds before spawn', () => {
    useGameStore.getState().resetGame('stage3')
    const spawnMs = getStageConfig('stage3').matildaSec * 1000
    useGameStore.setState({
      phase: 'playing',
      elapsedMs: spawnMs - 6000,
      matildaSpawned: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      expect(container.querySelector('[data-testid="matilda-warning"]')).toBeNull()

      act(() => {
        useGameStore.setState({ elapsedMs: spawnMs - 5000 })
      })

      expect(container.querySelector('[data-testid="matilda-warning-count"]').textContent).toBe('5')

      act(() => {
        useGameStore.setState({ elapsedMs: spawnMs - 1000 })
      })

      expect(container.querySelector('[data-testid="matilda-warning-count"]').textContent).toBe('1')

      act(() => {
        useGameStore.setState({ elapsedMs: spawnMs })
      })

      expect(container.querySelector('[data-testid="matilda-warning"]')).toBeNull()
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('shows Matilda profile and RPG dialogue when she spawns', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({
      phase: 'playing',
      elapsedMs: getStageConfig('stage3').matildaSec * 1000,
      matildaSpawned: false,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      expect(container.querySelector('[data-testid="matilda-dialogue"]')).toBeNull()

      act(() => {
        useGameStore.setState({ matildaSpawned: true })
      })

      const dialogue = container.querySelector('[data-testid="matilda-dialogue"]')
      expect(dialogue).not.toBeNull()
      expect(dialogue.textContent).toContain('마틸다')
      expect(dialogue.textContent).toContain('오호호호! 떡하나주면 안잡아먹지!')
      expect(dialogue.querySelector('img')?.getAttribute('alt')).toBe('마틸다 프로필')

      act(() => {
        vi.advanceTimersByTime(4500)
      })

      expect(container.querySelector('[data-testid="matilda-dialogue"]')).toBeNull()
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('result action layout', () => {
  it('shows ranking above title on the game over result buttons', () => {
    vi.useFakeTimers()
    useGameStore.setState({ phase: 'gameover', goldSession: 8, goldTotal: 20 })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToRanking={() => {}} />)
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const labels = [...container.querySelector('[data-testid="result-primary-actions"]').querySelectorAll('button')]
        .map((button) => button.textContent.trim())
      const primaryActions = container.querySelector('[data-testid="result-primary-actions"]')

      expect(labels.slice(0, 4)).toEqual(['🏆 랭킹', '타이틀로', '코인상점', '다시 시작'])
      expect(primaryActions.style.flexDirection).toBe('column')
      expect([...primaryActions.querySelectorAll('button')].every((button) => button.style.width === '136px')).toBe(true)
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('pause lobby return', () => {
  it('asks before returning to lobby and records the paused score for ranking', () => {
    localStorage.removeItem(PLAYER_RECORDS_KEY)
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({
      phase: 'paused',
      pauseSource: 'manual',
      elapsedMs: 42_500,
      runKills: 7,
      goldSession: 3,
      runLevelUps: 1,
    })
    const onGoToLobby = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToLobby={onGoToLobby} />)
      })

      clickButtonByText(container, '로비로 돌아가기')

      expect(onGoToLobby).not.toHaveBeenCalled()
      expect(container.textContent).toContain('정말 로비로 돌아갈까요?')
      expect(localStorage.getItem(PLAYER_RECORDS_KEY)).toBeNull()

      clickButtonByText(container, '돌아가기')

      expect(onGoToLobby).toHaveBeenCalledTimes(1)
      const records = loadPlayerRecords()
      expect(records.bestSurvivalSeconds).toBe(42)
      expect(records.stage1Clears).toBe(0)

      const localEntry = buildLocalPlayerRankingEntry(records, { displayName: 'Tester' })
      expect(localEntry).toMatchObject({
        displayName: 'Tester',
        score: 42,
        survivalSeconds: 42,
        cleared: false,
      })
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('stage clear presentation', () => {
  it('uses 다음 스테이지로 as the primary Stage 1 clear action', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({
      phase: 'cleared',
      elapsedMs: 240_000,
      goldSession: 12,
      goldTotal: 40,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} devCheatsVisible />)
      })

      const buttons = [...container.querySelectorAll('button')]
      expect(buttons[0].textContent.trim()).toBe('다음 스테이지로')

      clickButtonByText(container, '다음 스테이지로')

      expect(useGameStore.getState()).toMatchObject({
        currentStageId: 'stage2',
        phase: 'playing',
      })
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('keeps playtest log copy out of the primary result actions', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({
      phase: 'cleared',
      elapsedMs: 240_000,
      goldSession: 12,
      goldTotal: 40,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} devCheatsVisible />)
      })

      const primaryActions = container.querySelector('[data-testid="result-primary-actions"]')
      const devTools = container.querySelector('[data-testid="result-dev-tools"]')

      expect(primaryActions).not.toBeNull()
      expect(primaryActions.textContent).not.toContain('로그 복사')
      expect(devTools).not.toBeNull()
      expect(devTools.textContent).toContain('개발 로그 복사')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('hides the development log copy tool when cheat UI is hidden by admin operations', () => {
    saveAdminConfig({
      operations: { cheatMenuButtonVisible: false },
    })
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({
      phase: 'cleared',
      elapsedMs: 240_000,
      goldSession: 12,
      goldTotal: 40,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} devCheatsVisible />)
      })

      expect(container.querySelector('[data-testid="result-dev-tools"]')).toBeNull()
      expect(container.textContent).not.toContain('로그 복사')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('stage4 HUD telegraphs', () => {
  function renderPlayingStage(stageId, elapsedMs, extra = {}) {
    useGameStore.getState().resetGame(stageId)
    useGameStore.setState({
      phase: 'playing',
      elapsedMs,
      bossSpawned: false,
      matildaSpawned: false,
      ...extra,
    })
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
    })
    return { container, root }
  }

  it('shows the E04 projectile intro warning at stage4 e04IntroSec', () => {
    const introSec = getStageConfig('stage4').e04IntroSec
    expect(introSec).toBe(18)
    const { container, root } = renderPlayingStage('stage4', (introSec - 1) * 1000)
    try {
      expect(container.textContent).toContain('복도 탄환 주의')
      // 게이트(18s) 도달 이후에는 사라진다.
      act(() => {
        useGameStore.setState({ elapsedMs: introSec * 1000 })
      })
      expect(container.textContent).not.toContain('복도 탄환 주의')
    } finally {
      act(() => { root.unmount() })
    }
  })

  it('does NOT show the E04 intro warning on stage3 (hint-only e04IntroSec, avoids false banner)', () => {
    const introSec = getStageConfig('stage3').e04IntroSec
    const { container, root } = renderPlayingStage('stage3', (introSec - 1) * 1000)
    try {
      expect(container.textContent).not.toContain('복도 탄환 주의')
    } finally {
      act(() => { root.unmount() })
    }
  })

  it('shows each stage4 formation telegraph label within its lead window', () => {
    for (const telegraph of STAGE4_SPAWN_TELEGRAPHS) {
      const elapsedMs = (telegraph.sec - 1) * 1000 // sec-1 은 [sec-leadSec, sec) 구간 내
      const { container, root } = renderPlayingStage('stage4', elapsedMs)
      try {
        expect(container.textContent).toContain(telegraph.label)
      } finally {
        act(() => { root.unmount() })
      }
    }
    expect(STAGE4_SPAWN_TELEGRAPHS.length).toBe(4)
  })

  it('shows the stage4 boss warning starting 3s before bossWarningSec (134s)', () => {
    const warningSec = getStageConfig('stage4').bossWarningSec
    expect(warningSec).toBe(134)
    const { container, root } = renderPlayingStage('stage4', (warningSec - 2) * 1000)
    try {
      expect(container.textContent).toContain('보스 출현')
      // 스폰 시각 도달 후엔 경고를 감춘다.
      act(() => {
        useGameStore.setState({ elapsedMs: warningSec * 1000 })
      })
      expect(container.textContent).not.toContain('보스 출현')
    } finally {
      act(() => { root.unmount() })
    }
  })
})

function clickButtonByText(container, label) {
  const button = [...container.querySelectorAll('button')]
    .find((item) => item.textContent.trim() === label)
  expect(button).not.toBeUndefined()
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
