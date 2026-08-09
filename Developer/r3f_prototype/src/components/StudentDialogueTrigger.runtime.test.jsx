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

import StudentDialogueTrigger, { shouldDeferGenericInvestigation } from './StudentDialogueTrigger.jsx'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { playerPos } from '../lib/refs.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { computeDefaultStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { useGameStore } from '../store/useGameStore.js'
import {
  BULLETIN_BOARD_CONTACT_MARGIN,
  findInvestigationTargetInRange,
  getInvestigationTargets,
} from '../lib/studentProximity.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { STAGE2_PLAYER_INSET_X } from '../lib/playerMovementBounds.js'

const talkBook = getStageQuestDefinitions('stage1').find(({ id }) => id === 'stage1-talk-book')
const defaultStage1 = computeDefaultStageObjectPlacements('stage1')
const canonicalGiver = defaultStage1.find(({ id }) => id === talkBook.giver.placementId)
const canonicalDesk = defaultStage1.find(({ id }) => id === talkBook.itemTarget.placementId)
const canonicalBoard = computeDefaultStageObjectPlacements('stage2')
  .find(({ type }) => type === 'corridorLostFoundBoard')

function renderTrigger() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<StudentDialogueTrigger />))
  return { container, root }
}

function worldPointFromTargetLocal(target, localX, localZ) {
  const rotationY = target.rotationY ?? 0
  return {
    x: target.position[0] + localX * Math.cos(rotationY) + localZ * Math.sin(rotationY),
    z: target.position[2] - localX * Math.sin(rotationY) + localZ * Math.cos(rotationY),
  }
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

describe('Stage 2 bulletin board runtime investigation chain', () => {
  it('creates a reachable physical-contact target and opens dialogue through the mounted trigger', () => {
    useGameStore.getState().resetGame('stage2')
    commitFirebaseStudioRuntime({
      propPlacements: { stage2: [canonicalBoard] },
    }, { revision: 3 })
    const board = getInvestigationTargets('stage2')
      .find(({ id }) => id === canonicalBoard.id)
    expect(board).toMatchObject({ subjectType: 'bulletinBoard' })

    const contactPoint = worldPointFromTargetLocal(
      board,
      0,
      board.halfZ + BULLETIN_BOARD_CONTACT_MARGIN,
    )
    const { halfX, halfZ } = getStageBounds('stage2')
    expect(Math.abs(contactPoint.x)).toBeLessThanOrEqual(halfX - STAGE2_PLAYER_INSET_X)
    expect(Math.abs(contactPoint.z)).toBeLessThanOrEqual(halfZ)
    expect(findInvestigationTargetInRange(
      contactPoint.x,
      contactPoint.z,
      [board],
      new Set(),
    )).toBe(board)

    const beforePhysicalContact = worldPointFromTargetLocal(
      board,
      0,
      board.halfZ + BULLETIN_BOARD_CONTACT_MARGIN + 0.001,
    )
    expect(findInvestigationTargetInRange(
      beforePhysicalContact.x,
      beforePhysicalContact.z,
      [board],
      new Set(),
    )).toBeNull()
    expect(shouldDeferGenericInvestigation({
      playerX: contactPoint.x,
      playerZ: contactPoint.z,
      itemTargets: [],
      completionTargets: [],
      questProgress: useGameStore.getState().questProgress,
    })).toBe(false)

    playerPos.set(contactPoint.x, 0, contactPoint.z)
    const { container, root } = renderTrigger()

    try {
      act(() => frame.callback?.({}, 1 / 60))

      const dialogue = useGameStore.getState().studentDialogue
      expect(dialogue).toMatchObject({
        subjectType: 'bulletinBoard',
        subjectName: board.subjectName,
      })
      expect(dialogue.dialogueId).toMatch(/^investigation\.corridorLostFoundBoard\./)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
