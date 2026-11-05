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

import StudentDialogueTrigger, { INVESTIGATION_COOLDOWN_MS, isInvestigationOnCooldown, shouldDeferGenericInvestigation } from './StudentDialogueTrigger.jsx'
import { getRuntimeElapsedMs, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { playerPos } from '../lib/refs.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { computeDefaultStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { useGameStore } from '../store/useGameStore.js'
import { findInvestigationTargetInRange, getInvestigationTargets } from '../lib/studentProximity.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { STAGE2_PLAYER_INSET_X } from '../lib/playerMovementBounds.js'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'

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
    // Stage 2 entry needs stage1 boss-defeat evidence; without it resetGame('stage2') is refused (f8a0ee89).
    _seedHydratedFirebaseProgressForTests({ uid: 'dialogue-trigger-stage2' }, {
      progress: { records: { stage1BossDefeats: 1 } },
    })
    expect(useGameStore.getState().resetGame('stage2')).not.toBe(false)
    expect(useGameStore.getState().currentStageId).toBe('stage2')
    commitFirebaseStudioRuntime({
      propPlacements: { stage2: [canonicalBoard] },
    }, { revision: 3 })
    const board = getInvestigationTargets('stage2')
      .find(({ id }) => id === canonicalBoard.id)
    expect(board).toMatchObject({ subjectType: 'bulletinBoard' })

    const contactPoint = worldPointFromTargetLocal(
      board,
      0,
      board.halfZ + board.contactMargin,
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
      board.halfZ + board.contactMargin + 0.001,
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

describe('investigation dialogue global cooldown', () => {
  it('treats the window as half-open on game time', () => {
    expect(isInvestigationOnCooldown(1000, -Infinity)).toBe(false)
    expect(isInvestigationOnCooldown(1000 + INVESTIGATION_COOLDOWN_MS - 1, 1000)).toBe(true)
    expect(isInvestigationOnCooldown(1000 + INVESTIGATION_COOLDOWN_MS, 1000)).toBe(false)
  })

  it('blocks a second prop dialogue until the cooldown elapses, without consuming that prop', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'dialogue-trigger-cooldown' }, {
      progress: { records: { stage1BossDefeats: 1 } },
    })
    expect(useGameStore.getState().resetGame('stage2')).not.toBe(false)
    const quests = getStageQuestDefinitions('stage2')
    const props = computeDefaultStageObjectPlacements('stage2')
    commitFirebaseStudioRuntime({ propPlacements: { stage2: props } }, { revision: 4 })
    const generic = getInvestigationTargets('stage2').filter((target) => (
      !quests.some((quest) => target.id === quest.giver.placementId || target.id.startsWith(`${quest.giver.placementId}-copy-`))
    ))
    const contact = (target) => worldPointFromTargetLocal(target, 0, target.halfZ + target.contactMargin)
    const isolated = generic.filter((target) => {
      const p = contact(target)
      return findInvestigationTargetInRange(p.x, p.z, generic, new Set()) === target
        && !shouldDeferGenericInvestigation({
          playerX: p.x, playerZ: p.z, itemTargets: [], completionTargets: [],
          questProgress: useGameStore.getState().questProgress,
        })
    })
    const plainIsolated = isolated.filter(({ subjectType }) => subjectType !== 'locker')
    expect(plainIsolated.length).toBeGreaterThanOrEqual(2)
    const [first, second] = plainIsolated

    const { container, root } = renderTrigger()
    try {
      const startMs = getRuntimeElapsedMs(useGameStore.getState().elapsedMs)
      let p = contact(first)
      playerPos.set(p.x, 0, p.z)
      act(() => frame.callback?.({}, 1 / 60))
      expect(useGameStore.getState().studentDialogue?.subjectName).toBe(first.subjectName)
      act(() => useGameStore.getState().closeStudentDialogue())
      // An upgrade reward routes to levelup; the real frame loop only runs while playing.
      act(() => useGameStore.setState({ phase: 'playing', pauseSource: null }))

      p = contact(second)
      playerPos.set(p.x, 0, p.z)
      setRuntimeElapsedMs(startMs + INVESTIGATION_COOLDOWN_MS - 1)
      act(() => frame.callback?.({}, 1 / 60))
      expect(useGameStore.getState().studentDialogue).toBeNull()

      setRuntimeElapsedMs(startMs + INVESTIGATION_COOLDOWN_MS)
      act(() => frame.callback?.({}, 1 / 60))
      expect(useGameStore.getState().studentDialogue?.subjectName).toBe(second.subjectName)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })

  it('lets a guaranteed-reward locker open during the cooldown while a plain prop stays blocked', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'dialogue-trigger-locker' }, {
      progress: { records: { stage1BossDefeats: 1 } },
    })
    expect(useGameStore.getState().resetGame('stage2')).not.toBe(false)
    const quests = getStageQuestDefinitions('stage2')
    commitFirebaseStudioRuntime({ propPlacements: { stage2: computeDefaultStageObjectPlacements('stage2') } }, { revision: 5 })
    const generic = getInvestigationTargets('stage2').filter((target) => (
      !quests.some((quest) => target.id === quest.giver.placementId || target.id.startsWith(`${quest.giver.placementId}-copy-`))
    ))
    const contact = (target) => worldPointFromTargetLocal(target, 0, target.halfZ + target.contactMargin)
    const isolated = generic.filter((target) => {
      const p = contact(target)
      return findInvestigationTargetInRange(p.x, p.z, generic, new Set()) === target
        && !shouldDeferGenericInvestigation({
          playerX: p.x, playerZ: p.z, itemTargets: [], completionTargets: [],
          questProgress: useGameStore.getState().questProgress,
        })
    })
    const plain = isolated.filter(({ subjectType }) => subjectType !== 'locker')
    const locker = isolated.find(({ subjectType }) => subjectType === 'locker')
    expect(plain.length).toBeGreaterThanOrEqual(2)
    expect(locker).toBeTruthy()
    const visit = (target) => {
      const p = contact(target)
      playerPos.set(p.x, 0, p.z)
      act(() => frame.callback?.({}, 1 / 60))
      const dialogue = useGameStore.getState().studentDialogue
      if (dialogue) {
        act(() => useGameStore.getState().closeStudentDialogue())
        act(() => useGameStore.setState({ phase: 'playing', pauseSource: null }))
      }
      return dialogue
    }

    const { container, root } = renderTrigger()
    try {
      setRuntimeElapsedMs(getRuntimeElapsedMs(useGameStore.getState().elapsedMs))
      expect(visit(plain[0])?.subjectName).toBe(plain[0].subjectName)
      expect(visit(plain[1])).toBeNull()
      expect(visit(locker)?.subjectType).toBe('locker')
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
