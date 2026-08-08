// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frame = vi.hoisted(() => ({ callback: null }))

vi.mock('../lib/usePlayingFrame.js', () => ({
  usePlayingFrame: (callback) => {
    frame.callback = callback
  },
}))

import StudentDialogueTrigger from './StudentDialogueTrigger.jsx'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { playerPos } from '../lib/refs.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { computeDefaultStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { useGameStore } from '../store/useGameStore.js'

const talkBook = getStageQuestDefinitions('stage1').find(({ id }) => id === 'stage1-talk-book')
const defaultStage1 = computeDefaultStageObjectPlacements('stage1')
const canonicalGiver = defaultStage1.find(({ id }) => id === talkBook.giver.placementId)
const canonicalDesk = defaultStage1.find(({ id }) => id === talkBook.itemTarget.placementId)

function renderTrigger() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<StudentDialogueTrigger />))
  return { container, root }
}

beforeEach(() => {
  frame.callback = null
  useGameStore.getState().resetGame('stage1')
  playerPos.set(canonicalGiver.position[0], 0, canonicalGiver.position[2])
})

afterEach(() => {
  commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
  playerPos.set(0, 0, 0)
})

describe('Stage 1 talk-book runtime start chain', () => {
  it('starts the quest through the mounted trigger when its canonical giver is present in the active Studio placements', () => {
    commitFirebaseStudioRuntime({
      propPlacements: { stage1: [canonicalGiver, canonicalDesk] },
    }, { revision: 1 })
    const { container, root } = renderTrigger()

    try {
      act(() => frame.callback?.({}, 1 / 60))

      expect(useGameStore.getState().questProgress[talkBook.id]).toMatchObject({ status: 'active' })
      expect(useGameStore.getState().questToast).toEqual({ type: 'started', questId: talkBook.id })
      expect(useGameStore.getState().studentDialogue).toMatchObject({
        dialogueId: talkBook.startDialogueId,
        subjectType: 'quest',
        subjectName: talkBook.giver.name,
      })
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('does not synthesize the quest after the canonical giver was deliberately removed from the active Studio placements', () => {
    commitFirebaseStudioRuntime({
      propPlacements: { stage1: [canonicalDesk] },
    }, { revision: 2 })
    const { container, root } = renderTrigger()

    try {
      act(() => frame.callback?.({}, 1 / 60))

      expect(useGameStore.getState().questProgress[talkBook.id]).toMatchObject({ status: 'undiscovered' })
      expect(useGameStore.getState().questToast).toBeNull()
      expect(useGameStore.getState().studentDialogue).toBeNull()
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
