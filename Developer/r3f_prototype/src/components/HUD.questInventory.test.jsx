// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import HUD from './HUD.jsx'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { useGameStore } from '../store/useGameStore.js'

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
})

describe('quest inventory HUD', () => {
  it('renders the quest bag next to pause and opens and closes its paused panel', () => {
    const { container, root } = renderHud()
    try {
      const pauseButton = container.querySelector('.hud-pause-button')
      const questButton = container.querySelector('[aria-controls="quest-inventory-panel"]')
      expect(questButton).not.toBeNull()
      expect(pauseButton.nextElementSibling).toBe(questButton)
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

  it('shows a dominant centered popup only when a quest starts, while item and completion toasts stay compact', () => {
    const [quest] = getStageQuestDefinitions('stage1')
    const { container, root } = renderHud()

    try {
      act(() => {
        expect(useGameStore.getState().startQuest(quest.id)).toBe(true)
      })

      const popup = container.querySelector('[data-testid="quest-start-popup"]')
      expect(popup).not.toBeNull()
      expect(popup.textContent).toContain(quest.title)
      expect(popup.style.top).toBe('50%')
      expect(popup.style.transform).toBe('translate(-50%, -50%)')
      expect(popup.querySelector('small')?.style.color).toBe('rgb(255, 255, 255)')
      expect(popup.querySelector('small')?.style.fontFamily).toContain('Nanum Myeongjo')
      expect(popup.querySelector('small')?.style.webkitTextStroke).toBe('1.2px #000')
      expect(popup.style.fontSize).toBe('19px')
      expect(popup.style.pointerEvents).toBe('none')
      expect(popup.getAttribute('aria-live')).toBe('assertive')

      act(() => {
        useGameStore.setState({ questToast: { type: 'item', questId: quest.id } })
      })
      const itemToast = container.querySelector('[data-testid="quest-toast"]')
      expect(itemToast).not.toBeNull()
      expect(container.querySelector('[data-testid="quest-start-popup"]')).toBeNull()
      expect(itemToast.style.top).toBe('66px')
      expect(itemToast.getAttribute('aria-live')).toBe('polite')

      act(() => {
        useGameStore.setState({ questToast: { type: 'completed', questId: quest.id } })
      })
      expect(container.querySelector('[data-testid="quest-complete-popup"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="quest-start-popup"]')).toBeNull()
    } finally {
      act(() => root.unmount())
    }
  })

  it('merges quest NPC dialogue, acquisition or completion notice, and outlined white guidance into one raised panel', () => {
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
      expect(startPopup.querySelector('small')?.style.color).toBe('rgb(255, 255, 255)')
      expect(startPopup.querySelector('small')?.style.fontFamily).toContain('Nanum Myeongjo')
      expect(startPopup.querySelector('small')?.style.webkitTextStroke).toBe('1.2px #000')
      expect(container.querySelector('[data-testid="student-dialogue-catcher"]').style.alignItems).toBe('center')

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
      expect(completionPopup.textContent.indexOf(getDialogueText(quest.completionDialogueId)))
        .toBeLessThan(completionPopup.textContent.indexOf(quest.title))
      expect(completionPopup.textContent).toContain(`${quest.rewardGold}G`)
      expect(completionPopup.querySelector('small')?.style.color).toBe('rgb(255, 255, 255)')
      expect(completionPopup.querySelector('small')?.style.fontFamily).toContain('Nanum Myeongjo')
      expect(completionPopup.querySelector('small')?.style.webkitTextStroke).toBe('1.2px #000')
    } finally {
      act(() => root.unmount())
    }
  })
})
