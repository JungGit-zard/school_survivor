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
import { load as loadPlayerRecords } from '../lib/playerRecords.js'
import { buildLocalPlayerRankingEntry } from '../lib/userRanking.js'
import { resetAdminConfig, saveAdminConfig } from '../lib/adminConfig.js'
import { DEFAULT_STAGE_BOSS_PREVIEW, saveStudioTunings } from '../lib/graphicsStudioConfig.js'
import { getStageConfig } from '../lib/stageConfig.js'
import { STAGE4_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { STAGE4_BURST_EVENTS } from '../lib/burstEvents.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { hydrateFirebaseStudio, setFirebaseStudioUser } from '../lib/firebaseStudio.js'
import { blockFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { MATILDA_DIALOGUE_MS } from '../lib/matildaEntryGrace.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { clearPortalTarget, playerPos, publishPortalTarget } from '../lib/refs.js'
import { setLocale } from '../lib/i18n.js'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { resetCriticalScreenShakeForTest, subscribeWholeScreenCriticalShake } from '../lib/criticalScreenShake.js'

const TEST_STUDIO_USER = { uid: 'hud-test-user' }
const EMPTY_STUDIO_SNAPSHOT = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: '2026-07-18T00:00:00.000Z',
  datasets: {
    tunings: {},
    sfxTunings: {},
    stageBossPreview: DEFAULT_STAGE_BOSS_PREVIEW,
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
  resetAdminConfig()
  setLocale('ko')
  setFirebaseStudioUser(null)
  blockFirebaseStudioRuntime()
  clearPortalTarget()
  playerPos.set(0, 0, 0)
})

describe('portal direction objective', () => {
  it('shows a low-frequency visual objective only while an active portal is playable', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage1')
    playerPos.set(0, 0, 0)
    publishPortalTarget(0, -1.5)
    useGameStore.setState({ phase: 'playing', escapePortalActive: true })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const objective = container.querySelector('[data-testid="portal-objective"]')
      expect(objective?.textContent).toBe('탈출구 ↑ 2zm')
      expect(objective?.getAttribute('aria-hidden')).toBe('true')
      expect(objective?.style.bottom).toBe('102px')
      const status = container.querySelector('[role="status"]')
      expect(status?.getAttribute('aria-label')).toBe('탈출구로 이동')
      expect(status?.textContent).toBe('탈출구로 이동')

      act(() => {
        useGameStore.setState({ phase: 'paused' })
      })
      expect(container.querySelector('[data-testid="portal-objective"]')).toBeNull()
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('persistent player level label', () => {
  it('keeps the current level immediately left of the gold amount and updates immediately', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState((state) => ({ player: { ...state.player, level: 7 } }))
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const levelLabel = container.querySelector('[data-testid="player-level-label"]')
      const goldChip = container.querySelector('[data-testid="gold-chip"]')
      const goldAmount = container.querySelector('[data-testid="gold-amount"]')
      expect(levelLabel?.textContent).toBe('Lv.7')
      expect(levelLabel?.parentElement).toBe(goldChip)
      expect(levelLabel?.nextElementSibling).toBe(goldAmount)
      expect(levelLabel?.style.position).toBe('')

      act(() => {
        useGameStore.setState((state) => ({ player: { ...state.player, level: 8 } }))
      })
      expect(container.querySelector('[data-testid="player-level-label"]')?.textContent).toBe('Lv.8')
    } finally {
      act(() => { root.unmount() })
    }
  })
})

describe('bottom-right pause control', () => {
  it('moves only pause to the safe bottom-right while keeping the quest bag in the top-left controls', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ phase: 'playing' })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const pause = container.querySelector('[data-testid="bottom-right-pause"]')
      const topLeftControls = container.querySelector('[data-testid="top-left-controls"]')
      expect(pause?.style.right).toBe('var(--hud-safe-right)')
      expect(pause?.style.bottom).toBe('var(--hud-pause-bottom)')
      expect(pause?.style.getPropertyValue('--hud-safe-right')).toBe('max(14px, env(safe-area-inset-right, 0px))')
      expect(pause?.style.getPropertyValue('--hud-pause-bottom')).toBe('calc(100px + env(safe-area-inset-bottom, 0px))')
      expect(topLeftControls?.contains(pause)).toBe(false)
      expect(topLeftControls?.querySelector('.hud-quest-bag-button')).not.toBeNull()

      act(() => pause.click())
      expect(useGameStore.getState().phase).toBe('paused')
      expect(pause.getAttribute('aria-label')).toBe('게임 재개')
    } finally {
      act(() => { root.unmount() })
    }
  })
})

describe('student dialogue IDs', () => {
  it('renders the resolved known text and never renders an unknown raw ID', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        useGameStore.getState().openStudentDialogue('quest.stage1-talk-book.start')
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })
      expect(container.textContent).toContain(getDialogueText('quest.stage1-talk-book.start'))

      act(() => {
        useGameStore.getState().closeStudentDialogue()
        useGameStore.getState().openStudentDialogue('missing.dialogue.id')
      })
      expect(container.textContent).not.toContain('missing.dialogue.id')
    } finally {
      act(() => { root.unmount() })
    }
  })

  it('renders the laid student profile image above the game canvas layer', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        useGameStore.getState().openStudentDialogue('quest.stage1-talk-book.start', null, { subjectType: 'student' })
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const portrait = container.querySelector('[data-testid="student-dialogue-catcher"] img')
      expect(portrait).not.toBeNull()
      expect(portrait.getAttribute('src')).toContain('laid_man')
      expect(container.firstElementChild.style.zIndex).toBe('10')
    } finally {
      act(() => { root.unmount() })
    }
  })
})

describe('active weapon HUD icons', () => {
  it('renders the active weapon image above the game canvas layer', () => {
    useGameStore.getState().resetGame('stage1')
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const icon = container.querySelector('img[src*="01_wea_pencil"]')
      expect(icon).not.toBeNull()
      expect(container.firstElementChild.style.zIndex).toBe('10')
    } finally {
      act(() => { root.unmount() })
    }
  })
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

  it('translates Hanako upgrade copy through the locale dictionaries', () => {
    const option = {
      key: 'acquireHanako',
      label: '하나코 해금',
      desc: '치비코를 획득해야 등장; 20초마다 주인공 최대 체력의 5% 회복',
    }

    setLocale('en')
    expect(getUpgradeChoiceLabel(option)).toBe('Acquire Hanako')
    expect(getUpgradeChoiceDesc(option)).toBe('Appears after Chibiko is acquired; restores 5% of the hero’s max HP every 20 seconds')

    setLocale('ja')
    expect(getUpgradeChoiceLabel(option)).toBe('ハナコ 獲得')
    expect(getUpgradeChoiceDesc(option)).toBe('チビコを獲得すると登場。20秒ごとに主人公の最大HPの5%を回復')
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

  it('limits every weapon to one card in the four upgrade choices', () => {
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
      'hanako',
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

  it('keeps the extra-battery weapon icon visible while Firebase Studio is blocked', () => {
    blockFirebaseStudioRuntime()
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<UpgradeIcon type="missile" />))
    expect(container.querySelector('img')?.getAttribute('src')).toContain('08_wea_extrabattery.png.webp')
    act(() => root.unmount())
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

  it('shows an already-confirmed game over result immediately after the coin-shop return', () => {
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
        root.render(
          <React.StrictMode>
            <HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} showGameoverResultImmediately />
          </React.StrictMode>,
        )
      })

      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
      expect(container.textContent).toContain('GAME OVER')

      act(() => {
        useGameStore.setState({ phase: 'playing' })
      })
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()

      act(() => {
        useGameStore.setState({ phase: 'gameover' })
      })
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(1_000)
      })
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('level-up upgrade layout', () => {
  it('exposes four unseen acquisition cards per serial without skipping after a selection', () => {
    useGameStore.getState().resetGame('stage1')
    for (const weaponId of ['scienceFlask', 'bell', 'stunGun', 'onigiri', 'guidedMissile']) setUnlocked(weaponId)
    useGameStore.setState((state) => ({
      phase: 'levelup',
      pendingLevelUps: 1,
      player: { ...state.player, level: 8 },
      levelUpChoiceSerial: 100,
    }))
    const container = document.createElement('div')
    const root = createRoot(container)
    const random = vi.spyOn(Math, 'random')

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const firstLabels = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
        .map((button) => button.getAttribute('aria-label').split(':')[0])
      expect(firstLabels).toEqual(['커터칼 획득', '30cm 자 획득', '텀블러 획득', '과학 플라스크 획득'])
      expect(useGameStore.getState().levelUpAcquireExposureKeys).toEqual([
        'acquireBoxCutter', 'acquireBag', 'acquireTumbler', 'acquireFlask',
      ])
      expect(random).not.toHaveBeenCalled()

      act(() => {
        useGameStore.getState().applyUpgrade('acquireBoxCutter')
        useGameStore.setState((state) => ({
          phase: 'levelup',
          pendingLevelUps: 1,
          player: { ...state.player, level: 8 },
          levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
        }))
      })

      const secondLabels = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
        .map((button) => button.getAttribute('aria-label').split(':')[0])
      expect(secondLabels).toEqual(['바이키티 커터칼 획득', '벨 획득', '전기 획득', '오니기리 획득'])
      expect(secondLabels).toEqual(expect.not.arrayContaining(firstLabels))
      expect(useGameStore.getState().levelUpAcquireExposureKeys).toEqual([
        'acquireBoxCutter', 'acquireBag', 'acquireTumbler', 'acquireFlask',
        'acquireBikittyCutter', 'acquireBell', 'acquireStun', 'acquireOnigiri',
      ])
    } finally {
      random.mockRestore()
      act(() => root.unmount())
    }
  })

  it('shows four upgrade choices side by side without a full-screen overlay', () => {
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
      expect(choices.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')
      expect(choiceButtons).toHaveLength(4)
      expect([...choiceButtons].every((choice) => choice.getAttribute('aria-label')?.includes(': '))).toBe(true)
      expect([...choiceButtons].every((choice) => choice.classList.contains('levelup-upgrade-choice'))).toBe(true)

      const accessibilityCss = document.getElementById('hud-keyframes')?.textContent ?? ''
      expect(accessibilityCss).toContain('@media (max-width:360px)')
      expect(accessibilityCss).toContain('.levelup-upgrade-choice:focus-visible')
      expect(accessibilityCss).toContain('font-size:11px !important')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('blocks selection until the last upgrade card finishes opening', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState((state) => ({
      phase: 'levelup',
      pendingLevelUps: 1,
      player: { ...state.player, level: 2 },
    }))
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const animationEnd = (name) => {
      // jsdom에는 AnimationEvent가 없어 React가 WebKit 이벤트명으로 폴백한다.
      const event = new window.Event('webkitAnimationEnd', { bubbles: true })
      Object.defineProperty(event, 'animationName', { value: name })
      return event
    }

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      let buttons = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
      expect(buttons).toHaveLength(4)
      expect(buttons.every((button) => button.disabled)).toBe(true)

      act(() => buttons[0].click())
      expect(useGameStore.getState().phase).toBe('levelup')

      act(() => buttons[1].dispatchEvent(animationEnd('levelupCardPop')))
      expect(buttons.every((button) => button.disabled)).toBe(true)

      act(() => buttons[3].dispatchEvent(animationEnd('otherAnimation')))
      expect(buttons.every((button) => button.disabled)).toBe(true)

      act(() => buttons[3].dispatchEvent(animationEnd('levelupCardPop')))
      buttons = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
      expect(buttons.every((button) => button.disabled)).toBe(false)

      act(() => buttons[0].click())
      expect(useGameStore.getState().phase).toBe('playing')

      act(() => {
        useGameStore.setState((state) => ({
          phase: 'levelup',
          pendingLevelUps: 1,
          levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
        }))
      })
      expect([...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
        .every((button) => button.disabled)).toBe(true)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('guarantees eligible follow-up cards once on the next level-up screen', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().applyUpgrade('acquireChibiko')
    useGameStore.getState().applyUpgrade('acquireBoxCutter')
    useGameStore.setState((state) => ({
      phase: 'levelup',
      pendingLevelUps: 1,
      player: { ...state.player, level: 6 },
      levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
    }))
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const choices = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
      expect(choices).toHaveLength(4)
      expect(choices.some((choice) => choice.textContent.includes('하나코 획득'))).toBe(true)
      expect(choices.some((choice) => choice.textContent.includes('바이키티 커터칼 획득'))).toBe(true)
      expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys).toEqual([])
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('does not display or consume unavailable follow-up cards', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState((state) => ({
      phase: 'levelup',
      pendingLevelUps: 1,
      player: { ...state.player, level: 5 },
      levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
      pendingGuaranteedUpgradeChoiceKeys: ['acquireHanako', 'acquireBikittyCutter'],
      weapons: {
        ...state.weapons,
        chibiko: { ...state.weapons.chibiko, active: true },
        hanako: { ...state.weapons.hanako, active: true },
        boxCutter: { ...state.weapons.boxCutter, active: true },
      },
    }))
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const choices = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
      expect(choices.some((choice) => choice.textContent.includes('하나코 획득'))).toBe(false)
      expect(choices.some((choice) => choice.textContent.includes('바이키티 커터칼 획득'))).toBe(false)
      expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys)
        .toEqual(['acquireBikittyCutter'])

      act(() => {
        useGameStore.setState((state) => ({
          player: { ...state.player, level: 6 },
          levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
        }))
      })
      const eligibleChoices = [...container.querySelectorAll('[data-testid="levelup-upgrade-choice"]')]
      expect(eligibleChoices.some((choice) => choice.textContent.includes('바이키티 커터칼 획득'))).toBe(true)
      expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys).toEqual([])
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('clears a follow-up guarantee when all eight weapon slots are full', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState((state) => {
      const activeWeaponIds = new Set(Object.keys(state.weapons).slice(0, 8))
      return {
        phase: 'levelup',
        pendingLevelUps: 1,
        player: { ...state.player, level: 6 },
        levelUpChoiceSerial: state.levelUpChoiceSerial + 1,
        pendingGuaranteedUpgradeChoiceKeys: ['acquireHanako'],
        weapons: Object.fromEntries(Object.entries(state.weapons).map(([id, weapon]) => [
          id,
          activeWeaponIds.has(id) ? { ...weapon, active: true } : weapon,
        ])),
      }
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      expect(useGameStore.getState().pendingGuaranteedUpgradeChoiceKeys).toEqual([])
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})

describe('HUD mobile accessibility', () => {
  it('uses P and Escape for the same guarded pause transition', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ phase: 'playing' })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true }))
      })
      expect(useGameStore.getState().phase).toBe('paused')

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))
      })
      expect(useGameStore.getState().phase).toBe('playing')

      act(() => {
        useGameStore.setState({ phase: 'levelup' })
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))
      })
      expect(useGameStore.getState().phase).toBe('levelup')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('keeps the release pause control touch-safe in the bottom-right safe area', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ phase: 'playing' })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
      })

      const pauseButton = container.querySelector('.hud-pause-button')
      expect(pauseButton).not.toBeNull()
      expect(pauseButton.getAttribute('aria-label')).toBe('게임 일시정지')
      expect(pauseButton.style.width).toBe('44px')
      expect(pauseButton.style.height).toBe('44px')
      expect(pauseButton.style.getPropertyValue('--hud-safe-right')).toContain('safe-area-inset-right')
      expect(pauseButton.style.getPropertyValue('--hud-pause-bottom')).toContain('safe-area-inset-bottom')

      const accessibilityCss = document.getElementById('hud-keyframes')?.textContent ?? ''
      expect(accessibilityCss).toContain('.hud-pause-button:focus-visible')
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
        useGameStore.setState({ elapsedMs: spawnMs - 5000, matildaSpawned: true })
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
        vi.advanceTimersByTime(MATILDA_DIALOGUE_MS)
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
  it('keeps the game over result popup compact and orders actions from restart to ranking', () => {
    vi.useFakeTimers()
    useGameStore.setState({
      phase: 'gameover',
      goldSession: 8,
      goldTotal: 20,
      newlyUnlockedWeaponIds: [],
    })
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
      const modal = container.querySelector('[data-testid="gameover-result-overlay"] > div')

      expect(labels).toEqual(['다시시작', '타이틀로', '코인상점', '랭킹'])
      expect(container.textContent).not.toContain('다음에 만날 무기')
      expect(primaryActions.style.flexDirection).toBe('column')
      expect(modal.style.maxWidth).toBe('220px')
      expect([...primaryActions.querySelectorAll('button')].every((button) => button.style.width === '136px')).toBe(true)
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })

  it('shows Matilda death dialogue before the game over popup and prints the Matilda death line', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({
      phase: 'gameover',
      deathCause: 'matilda',
      goldSession: 8,
      goldTotal: 20,
    })
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToRanking={() => {}} />)
      })

      expect(container.querySelector('[data-testid="matilda-dialogue"]')).not.toBeNull()
      expect(container.textContent).toContain('오호호호!!!!! 맛있게 먹을께!!!!')
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()
      // 부딪힌 프레임을 먼저 보여준다 — 홀드 동안에는 흑백 레이어가 아예 없다.
      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(320)
      })
      const grayscale = container.querySelector('[data-testid="gameover-grayscale-transition"]')
      expect(grayscale).not.toBeNull()
      expect(grayscale.style.animation).toContain('gameoverGrayscaleFade 480ms')

      // 결과창은 접촉 기준 1000ms에 뜬다(이미 320ms 진행했으므로 679ms 더 = 999ms).
      // 예전에는 MATILDA_DIALOGUE_MS(5000)를 더해 6초를 기다렸고, 즉사인데 화면이
      // 멈춘 것처럼 보였다(2026-08-14 사용자 지시로 제거).
      act(() => {
        vi.advanceTimersByTime(679)
      })
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).toBeNull()
      expect(container.querySelector('[data-testid="matilda-dialogue"]')).not.toBeNull()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(container.querySelector('[data-testid="matilda-dialogue"]')).toBeNull()
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="gameover-death-line"]').textContent)
        .toBe('마틸다 에게 영혼을 뺴앗겨 버렸다!!')
    } finally {
      act(() => {
        root.unmount()
      })
    }
  })
})

describe('matilda contact death impact presentation', () => {
  // 사용자 지시(2026-08-16): 맞닿은 지점에서 정지 → 효과음과 함께 크리티컬처럼 흔들고
  // → 그걸 보여주고 흑백 → 게임오버 ui. 순서가 이 스위트의 전부다.
  function renderMatildaDeath({ reducedEffects = false } = {}) {
    const sfxIds = []
    const shakes = []
    resetCriticalScreenShakeForTest()
    if (reducedEffects) document.documentElement.dataset.reducedEffects = 'true'
    const unsubscribeSfx = subscribeSfx((event) => sfxIds.push(event.id))
    const unsubscribeShake = subscribeWholeScreenCriticalShake((event) => shakes.push(event))

    const container = document.createElement('div')
    const root = createRoot(container)
    const cleanup = () => {
      act(() => { root.unmount() })
      unsubscribeSfx()
      unsubscribeShake()
      delete document.documentElement.dataset.reducedEffects
      resetCriticalScreenShakeForTest()
    }
    return { container, root, sfxIds, shakes, cleanup }
  }

  it('freezes on the collision frame, then fires sting + crit shake, then fades to grayscale', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({ phase: 'gameover', deathCause: 'matilda' })
    const { container, root, sfxIds, shakes, cleanup } = renderMatildaDeath()

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToRanking={() => {}} />)
      })

      // 0ms — 부딪힌 그림만 보인다. 아직 효과음도 흔들림도 흑백도 없다.
      expect(sfxIds).not.toContain('matildaDeath')
      expect(shakes).toHaveLength(0)
      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).toBeNull()

      act(() => { vi.advanceTimersByTime(199) })
      expect(sfxIds).not.toContain('matildaDeath')
      expect(shakes).toHaveLength(0)

      // 200ms — 효과음 + 크리티컬 흔들림. 흑백은 아직.
      act(() => { vi.advanceTimersByTime(1) })
      expect(sfxIds).toContain('matildaDeath')
      expect(shakes).toHaveLength(1)
      expect(shakes[0].strong).toBe(false)
      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).toBeNull()

      // 흔들림(90ms)이 끝난 뒤에야 흑백이 시작한다 — 289ms까지는 아직 컬러다.
      act(() => { vi.advanceTimersByTime(89) })
      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).toBeNull()

      // 320ms — 흑백 페이드 시작.
      act(() => { vi.advanceTimersByTime(31) })
      const grayscale = container.querySelector('[data-testid="gameover-grayscale-transition"]')
      expect(grayscale).not.toBeNull()
      expect(grayscale.style.animation).toContain('gameoverGrayscaleFade 480ms')

      // 1000ms — 결과창. 접촉부터 1.5초 상한 안이다.
      act(() => { vi.advanceTimersByTime(680) })
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
    } finally {
      cleanup()
    }
  })

  it('skips the shake when reduced effects are enabled but still plays sfx and grayscale', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({ phase: 'gameover', deathCause: 'matilda' })
    const { container, root, sfxIds, shakes, cleanup } = renderMatildaDeath({ reducedEffects: true })

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToRanking={() => {}} />)
      })
      act(() => { vi.advanceTimersByTime(320) })

      expect(shakes).toHaveLength(0)
      expect(sfxIds).toContain('matildaDeath')
      expect(container.querySelector('[data-testid="gameover-grayscale-transition"]')).not.toBeNull()
    } finally {
      cleanup()
    }
  })

  it('does not shake or play the matilda sting on an ordinary zombie death', () => {
    vi.useFakeTimers()
    useGameStore.getState().resetGame('stage3')
    useGameStore.setState({ phase: 'gameover', deathCause: 'zombie' })
    const { container, root, sfxIds, shakes, cleanup } = renderMatildaDeath()

    try {
      act(() => {
        root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} onGoToRanking={() => {}} />)
      })

      // 일반 사망은 기존대로 즉시 흑백 페이드(1000ms)로 들어간다.
      const grayscale = container.querySelector('[data-testid="gameover-grayscale-transition"]')
      expect(grayscale).not.toBeNull()
      expect(grayscale.style.animation).toContain('gameoverGrayscaleFade 1000ms')

      act(() => { vi.advanceTimersByTime(1000) })
      expect(shakes).toHaveLength(0)
      expect(sfxIds).not.toContain('matildaDeath')
      expect(container.querySelector('[data-testid="gameover-result-overlay"]')).not.toBeNull()
    } finally {
      cleanup()
    }
  })
})

describe('pause lobby return', () => {
  it('asks before returning to lobby and records the paused score for ranking', () => {
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
    // 예고 개수는 리터럴이 아니라 형태 버스트 개수에서 파생한다 — 예고 없는 형태 버스트가
    // 생기면 즉시 깨지게 하는 것이 목적이다(2026-08-17 1.3배 사다리로 4 → 5가 됐다).
    expect(STAGE4_SPAWN_TELEGRAPHS.length).toBe(STAGE4_BURST_EVENTS.filter((event) => event.formation).length)
  })

  it('shows the boss warning 3s before the run-scoped randomized spawn second', () => {
    const bossSpawnSec = 173
    const { container, root } = renderPlayingStage('stage4', (bossSpawnSec - 2) * 1000, { bossSpawnSec })
    try {
      expect(container.textContent).toContain('보스 출현')
      // 스폰 시각 도달 후엔 경고를 감춘다.
      act(() => {
        useGameStore.setState({ elapsedMs: bossSpawnSec * 1000 })
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
