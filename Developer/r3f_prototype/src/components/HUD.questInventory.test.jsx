// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HUD from './HUD.jsx'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { BOSS_PASSIVE_ITEMS } from '../lib/bossPassiveItems.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { useGameStore } from '../store/useGameStore.js'

function fontSizeProp(element) {
  return element[Object.keys(element).find((key) => key.startsWith('__reactProps'))].style.fontSize
}

function renderHud() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => {
    root.render(<HUD onOpenCoinShop={() => {}} onGoToTitle={() => {}} />)
  })
  return { container, root }
}

function clickQuestBag(container) {
  const button = container.querySelector('[aria-controls="quest-inventory-panel"]')
  expect(button).not.toBeNull()
  act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  return button
}

beforeEach(() => {
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ bossPassiveUnlocks: {} })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('quest inventory HUD', () => {
  it('renders the quest bag next to pause and opens and closes its paused panel', () => {
    const { container, root } = renderHud()
    try {
      const pauseButton = container.querySelector('.hud-pause-button')
      const questButton = container.querySelector('[aria-controls="quest-inventory-panel"]')
      expect(pauseButton).not.toBeNull()
      expect(questButton).not.toBeNull()
      expect(container.querySelector('[data-testid="top-left-controls"]')?.contains(questButton)).toBe(true)
      expect(questButton.getAttribute('aria-label')).toBe('퀘스트 가방 열기')

      clickQuestBag(container)

      expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'quest' })
      expect(questButton.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelector('#quest-inventory-panel')).not.toBeNull()
      expect(document.activeElement?.getAttribute('aria-label')).toBe('퀘스트 가방 닫기')

      clickQuestBag(container)

      expect(useGameStore.getState()).toMatchObject({ phase: 'playing', pauseSource: null })
      expect(container.querySelector('#quest-inventory-panel')).toBeNull()
      expect(document.activeElement).toBe(questButton)
    } finally {
      act(() => root.unmount())
    }
  })

  it('shows the empty-state guidance when no quest has started', () => {
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      expect(container.textContent).toContain('아직 받은 퀘스트가 없어요.')
      expect(container.textContent).toContain('도움이 필요한 학생을 조사해 보세요.')
      expect(container.textContent).toContain('보스 패시브 아이템')
      expect(container.querySelectorAll('[aria-label="빈 보스 패시브 슬롯"]')).toHaveLength(8)
    } finally {
      act(() => root.unmount())
    }
  })

  it('fills the first boss passive slot with the set square after B01 is defeated', () => {
    useGameStore.setState({ bossPassiveUnlocks: { b01SetSquare: true } })
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      expect(container.querySelector('[aria-label="삼각자 — 커터칼·30cm 자·바이키티 공격력 +5%"]')).not.toBeNull()
      expect(container.querySelectorAll('[aria-label="빈 보스 패시브 슬롯"]')).toHaveLength(7)
    } finally {
      act(() => root.unmount())
    }
  })

  it('fills the second boss passive slot with the corridor pass after B02 is defeated', () => {
    useGameStore.setState({ bossPassiveUnlocks: { b01SetSquare: true, b02CorridorPass: true } })
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      const corridorPass = BOSS_PASSIVE_ITEMS.b02CorridorPass
      expect(container.querySelector(`[aria-label="${corridorPass.name} — ${corridorPass.description}"]`)).not.toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('keeps B01 through B04 boss passives in the first four slots after B04 is defeated', () => {
    useGameStore.setState({ bossPassiveUnlocks: { b01SetSquare: true, b02CorridorPass: true, b03GymWhistle: true, b04ServingLadle: true } })
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      const slots = [...container.querySelectorAll('[role="listitem"]')]
      expect(slots).toHaveLength(8)
      expect(slots.slice(0, 4).map((slot) => slot.getAttribute('aria-label'))).toEqual([
        '삼각자 — 커터칼·30cm 자·바이키티 공격력 +5%',
        '복도 통제선 — 선긋기·벨·학생용 랜턴 공격력 +5%',
        '체육관 호루라기 — 꼬마 로자리·치비코·오니기리 공격력 +5%',
        '급식 국자 — 텀블러·과학 플라스크·지우개 폭탄 공격력 +5%',
      ])
      expect(slots.slice(4).every((slot) => slot.getAttribute('aria-label') === '빈 보스 패시브 슬롯')).toBe(true)
      expect(container.querySelectorAll('[aria-label="빈 보스 패시브 슬롯"]')).toHaveLength(4)
    } finally {
      act(() => root.unmount())
    }
  })

  it('shows active quest and held item details, including the new-item badge', () => {
    const [firstQuest] = getStageQuestDefinitions('stage1')
    useGameStore.setState({
      questProgress: { [firstQuest.id]: { status: 'item-acquired', itemHeld: true } },
      newQuestItemIds: [firstQuest.item.id],
    })
    const { container, root } = renderHud()
    try {
      const questButton = container.querySelector('[aria-controls="quest-inventory-panel"]')
      expect(questButton.textContent).toContain('!')
      clickQuestBag(container)
      expect(container.textContent).toContain(firstQuest.title)
      expect(container.textContent).toContain(firstQuest.objective)
      expect(container.textContent).toContain(firstQuest.item.name)
      expect(container.textContent).toContain(firstQuest.item.description)
    } finally {
      act(() => root.unmount())
    }
  })

  it('counts only unfinished quests and gives active quests an item-finding state', () => {
    const [firstQuest, secondQuest] = getStageQuestDefinitions('stage1')
    useGameStore.setState({
      questProgress: {
        [firstQuest.id]: { status: 'active', itemHeld: false },
        [secondQuest.id]: { status: 'completed', itemHeld: false },
      },
    })
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      expect(container.textContent).toContain('진행 중 1 · 아이템 0')
      expect(container.textContent).toContain('아이템 찾기')
      expect(container.textContent).toContain('완료')
    } finally {
      act(() => root.unmount())
    }
  })

  it('closes the quest inventory with Escape before the general pause handler runs', () => {
    const { container, root } = renderHud()
    try {
      clickQuestBag(container)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))
      })
      expect(useGameStore.getState()).toMatchObject({ phase: 'playing', pauseSource: null })
      expect(container.querySelector('#quest-inventory-panel')).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('orders quest acceptance as a tappable centered card and transient quest notices as half-size top feedback', () => {
    vi.useFakeTimers()
    const [quest] = getStageQuestDefinitions('stage1')
    const { container, root } = renderHud()

    try {
      act(() => {
        expect(useGameStore.getState().startQuest(quest.id)).toBe(true)
      })

      const popup = container.querySelector('[data-testid="quest-start-popup"]')
      expect(popup).not.toBeNull()
      expect(popup.textContent).not.toContain(getDialogueText(quest.startDialogueId))
      expect(popup.textContent).toContain(quest.title)
      expect(popup.textContent).toContain(`${quest.rewardGold} 골드`)
      expect(popup.style.top).toBe('auto')
      expect(popup.closest('[data-testid="quest-banner-viewport"]').style.justifyContent).toBe('center')
      expect(popup.style.transform).toBe('none')
      expect(popup.style.borderRadius).toBe('12px')
      expect(popup.style.pointerEvents).toBe('auto')
      expect(popup.getAttribute('aria-live')).toBe('assertive')
      const portrait = popup.querySelector('[data-testid="quest-giver-profile"]')
      expect(portrait).not.toBeNull()
      expect(portrait[Object.keys(portrait).find(key => key.startsWith('__reactProps'))].style.width).toBe('clamp(44px, 12vw, 76px)')
      const notice = popup.querySelector('strong:not([data-testid="quest-reward"])')
      const reward = popup.querySelector('[data-testid="quest-reward"]')
      const action = popup.querySelector('small')
      expect(reward).not.toBeNull()
      // Inspect the delivered React style because jsdom drops clamp font sizes.
      expect(fontSizeProp(notice)).toBe('clamp(13px, 3.6vw, 15px)')
      expect(fontSizeProp(action)).toBe('clamp(22px, 6.4vw, 24px)')
      expect(notice?.style.lineHeight).toBe('1.25')
      expect(notice?.style.fontFamily).toContain('Nanum Myeongjo')
      expect(action?.style.fontFamily).not.toContain('Nanum Myeongjo')
      expect(action?.style.fontWeight).toBe('800')
      expect(action?.style.lineHeight).toBe('1.35')
      act(() => { vi.advanceTimersByTime(2000) })
      expect(container.querySelector('[data-testid="quest-start-popup"]')).not.toBeNull()
      act(() => {
        popup.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      })
      expect(useGameStore.getState().questToast).toBeNull()

      act(() => {
        useGameStore.setState({ phase: 'playing', pauseSource: null, questToast: { type: 'item', questId: quest.id } })
      })
      const itemPopup = container.querySelector('[data-testid="quest-item-popup"]')
      expect(itemPopup).not.toBeNull()
      expect(container.querySelector('[data-testid="quest-start-popup"]')).toBeNull()
      expect(container.querySelector('#quest-inventory-panel')).toBeNull()
      expect(itemPopup.style.top).toBe('12px')
      expect(itemPopup.style.transform).toBe('translateX(-50%) scale(0.5)')
      expect(itemPopup.style.transformOrigin).toBe('top center')
      expect(itemPopup.style.zIndex).toBe('30')
      expect(itemPopup.getAttribute('aria-live')).toBe('polite')
      act(() => { vi.advanceTimersByTime(999) })
      expect(container.querySelector('[data-testid="quest-item-popup"]')).not.toBeNull()
      expect(container.querySelector('#quest-inventory-panel')).toBeNull()
      act(() => { vi.advanceTimersByTime(1) })
      expect(useGameStore.getState().questToast).toBeNull()
      expect(container.querySelector('#quest-inventory-panel')).toBeNull()

      act(() => {
        useGameStore.setState({ questToast: { type: 'completed', questId: quest.id } })
      })
      const completePopup = container.querySelector('[data-testid="quest-complete-popup"]')
      expect(completePopup).not.toBeNull()
      expect(completePopup.style.top).toBe('12px')
      expect(completePopup.style.transform).toBe('translateX(-50%)')
      expect(container.querySelector('[data-testid="quest-start-popup"]')).toBeNull()
      act(() => { vi.advanceTimersByTime(1000) })
      expect(useGameStore.getState().questToast).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('does not let an old item timer clear a replacement quest toast', () => {
    vi.useFakeTimers()
    const [firstQuest, secondQuest] = getStageQuestDefinitions('stage1')
    const { container, root } = renderHud()

    try {
      act(() => {
        useGameStore.setState({ phase: 'playing', pauseSource: null, questToast: { type: 'item', questId: firstQuest.id } })
      })
      expect(container.querySelector('[data-testid="quest-item-popup"]')).not.toBeNull()

      act(() => { vi.advanceTimersByTime(500) })
      act(() => {
        useGameStore.setState({ questToast: { type: 'completed', questId: secondQuest.id } })
      })

      act(() => { vi.advanceTimersByTime(500) })
      expect(useGameStore.getState().questToast).toMatchObject({ type: 'completed', questId: secondQuest.id })
      expect(container.querySelector('[data-testid="quest-complete-popup"]')).not.toBeNull()

      act(() => { vi.advanceTimersByTime(500) })
      expect(useGameStore.getState().questToast).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('auto-dismisses quest completion dialogue after the half-duration without touching quest acceptance dialogue', () => {
    vi.useFakeTimers()
    const [quest] = getStageQuestDefinitions('stage1')
    const { container, root } = renderHud()

    try {
      act(() => {
        expect(useGameStore.getState().startQuest(quest.id)).toBe(true)
        useGameStore.getState().openStudentDialogue(quest.startDialogueId, null, {
          subjectType: 'quest',
          subjectName: quest.giver.name,
        })
      })
      expect(container.querySelector('[data-testid="quest-dialogue-popup"]')).not.toBeNull()
      act(() => { vi.advanceTimersByTime(2000) })
      expect(useGameStore.getState().pauseSource).toBe('dialogue')
      expect(useGameStore.getState().questToast).toMatchObject({ type: 'started', questId: quest.id })

      act(() => {
        useGameStore.getState().closeStudentDialogue()
        useGameStore.setState({ questToast: { type: 'completed', questId: quest.id } })
        useGameStore.getState().openStudentDialogue(quest.completionDialogueId, null, {
          subjectType: 'quest',
          subjectName: quest.completion.name,
        })
      })
      expect(container.querySelector('[data-testid="quest-dialogue-popup"]')).not.toBeNull()
      act(() => { vi.advanceTimersByTime(999) })
      expect(useGameStore.getState().pauseSource).toBe('dialogue')
      act(() => { vi.advanceTimersByTime(1) })
      expect(useGameStore.getState().pauseSource).toBeNull()
      expect(useGameStore.getState().questToast).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('shows quest dialogue in a dark ivory-text window with the giver profile on the left', () => {
    const [quest] = getStageQuestDefinitions('stage1')
    const { container, root } = renderHud()

    try {
      act(() => {
        expect(useGameStore.getState().startQuest(quest.id)).toBe(true)
        useGameStore.getState().openStudentDialogue(quest.startDialogueId, null, {
          subjectType: 'quest',
          subjectName: quest.giver.name,
        })
      })

      const startPopup = container.querySelector('[data-testid="quest-dialogue-popup"]')
      expect(startPopup).not.toBeNull()
      expect(container.querySelector('[data-testid="quest-start-popup"]')).toBeNull()
      expect(startPopup.textContent.indexOf(getDialogueText(quest.startDialogueId)))
        .toBeLessThan(startPopup.textContent.indexOf(quest.title))
      expect(startPopup.textContent).toContain(quest.objective)
      expect(startPopup.style.background).toContain('rgb(47, 52, 64)')
      expect(startPopup.style.color).toBe('rgb(255, 243, 214)')
      const startProfile = startPopup.querySelector('[data-testid="quest-dialogue-giver-profile"]')
      const startContent = startProfile?.nextElementSibling
      expect(startProfile).not.toBeNull()
      expect(startProfile?.parentElement).toBe(startPopup)
      expect(startPopup.style.display).toBe('flex')
      expect(startContent?.style.display).toBe('grid')
      expect(startPopup.querySelector('div[aria-live="polite"]')?.style.color).toBe('rgb(255, 243, 214)')
      expect(startPopup.querySelector('div[aria-live="polite"]')?.style.webkitTextStroke).toBe('0 transparent')
      expect(startPopup.querySelector('div[aria-live="polite"]')?.style.textShadow).toBe('none')
      expect(startPopup.style.top).toBe('auto')
      expect(startPopup.closest('[data-testid="quest-banner-viewport"]').style.alignItems).toBe('center')
      expect(startPopup.style.transform).toBe('none')
      expect(startPopup.querySelector('strong')?.style.color).toBe('rgb(203, 216, 255)')
      expect(fontSizeProp(startPopup.querySelector('strong'))).toBe('clamp(13px, 3.6vw, 15px)')
      expect(fontSizeProp(startPopup.querySelector('small'))).toBe('clamp(22px, 6.4vw, 24px)')
      expect(startPopup.querySelector('strong')?.style.webkitTextStroke).toBe('0 transparent')
      expect(startPopup.querySelector('small')?.style.color).toBe('rgb(255, 255, 255)')
      expect(startPopup.querySelector('small')?.style.fontFamily).not.toContain('Nanum Myeongjo')
      expect(startPopup.querySelector('small')?.style.webkitTextStroke).toBe('0 transparent')
      expect(container.querySelector('[data-testid="student-dialogue-catcher"]').style.alignItems).toBe('center')

      const dialogueLine = startPopup.querySelector('div[aria-live="polite"]')
      const questNotice = startPopup.querySelector('strong')
      const nextAction = startPopup.querySelector('small')
      const contentBlock = questNotice?.parentElement
      expect(contentBlock?.style.display).toBe('grid')
      expect(contentBlock?.style.gap).toBe('3px')
      expect([...contentBlock.children]).toEqual([questNotice, nextAction])
      expect(dialogueLine?.style.lineHeight).toBe('1.34')
      expect(dialogueLine?.style.fontWeight).toBe('700')
      expect(questNotice?.style.lineHeight).toBe('1.16')
      expect(questNotice?.style.padding).toBe('7px 9px')
      expect(nextAction?.style.lineHeight).toBe('1.24')
      expect(nextAction?.style.fontWeight).toBe('800')
      expect(startPopup.style.overflowY).toBe('auto')
      const startPopupSize = [startPopup.style.width, startPopup.style.padding, startPopup.style.maxHeight]

      act(() => {
        container.querySelector('[data-testid="student-dialogue-catcher"]')
          .dispatchEvent(new Event('pointerdown', { bubbles: true }))
      })
      expect(useGameStore.getState().questToast).toBeNull()

      act(() => {
        useGameStore.setState({ questToast: { type: 'completed', questId: quest.id } })
        useGameStore.getState().openStudentDialogue(quest.completionDialogueId, null, {
          subjectType: 'quest',
          subjectName: quest.completion.name,
        })
      })

      const completionPopup = container.querySelector('[data-testid="quest-dialogue-popup"]')
      expect(completionPopup).not.toBeNull()
      expect(container.querySelector('[data-testid="quest-complete-popup"]')).toBeNull()
      expect(completionPopup.style.top).toBe('12px')
      expect(completionPopup.style.transform).toBe('translateX(-50%)')
      expect([completionPopup.style.width, completionPopup.style.padding, completionPopup.style.maxHeight]).toEqual(startPopupSize)
      expect(completionPopup.style.overflowY).toBe('auto')
      expect(completionPopup.textContent.indexOf(getDialogueText(quest.completionDialogueId)))
        .toBeLessThan(completionPopup.textContent.indexOf(quest.title))
      expect(completionPopup.textContent).toContain(`${quest.rewardGold}G`)
      expect(completionPopup.querySelector('small')?.style.color).toBe('rgb(255, 243, 214)')
      expect(completionPopup.querySelector('small')?.style.fontFamily).toContain('Nanum Myeongjo')
      expect(completionPopup.querySelector('small')?.style.webkitTextStroke).toBe('0 transparent')
    } finally {
      act(() => root.unmount())
    }
  })
})
