import { beforeEach, describe, expect, it } from 'vitest'
import { createStageQuestProgress } from '../lib/quests.js'
import { saveStagePropPlacements } from '../lib/stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { useGameStore } from './useGameStore.js'

describe('quest game state', () => {
  beforeEach(() => {
    commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
    useGameStore.setState({
      currentStageId: 'stage1',
      phase: 'playing',
      pauseSource: null,
      questProgress: createStageQuestProgress('stage1'),
      questJourneyCompletedIds: [],
      questToast: null,
      newQuestItemIds: [],
      questCollectedSourceIds: [],
      goldTotal: 10,
      goldSession: 0,
    })
  })

  it('starts only a current-stage undiscovered quest once', () => {
    expect(useGameStore.getState().startQuest('stage2-bandage')).toBe(false)
    expect(useGameStore.getState().startQuest('stage1-talk-book')).toBe(true)
    expect(useGameStore.getState().questProgress['stage1-talk-book']).toEqual({
      status: 'active',
      itemHeld: false,
    })
    expect(useGameStore.getState().questToast).toEqual({ type: 'started', questId: 'stage1-talk-book' })
    expect(useGameStore.getState().startQuest('stage1-talk-book')).toBe(false)
  })

  it('rejects every quest transition while the run is not playing', () => {
    useGameStore.setState({ phase: 'paused', pauseSource: 'manual' })
    expect(useGameStore.getState().startQuest('stage1-talk-book')).toBe(false)

    useGameStore.setState({
      questProgress: {
        ...createStageQuestProgress('stage1'),
        'stage1-talk-book': { status: 'active', itemHeld: false },
      },
    })
    expect(useGameStore.getState().collectQuestItem('stage1-talk-book', 'stage1-desk-ne-01')).toBe(false)

    useGameStore.setState({
      questProgress: {
        ...createStageQuestProgress('stage1'),
        'stage1-talk-book': { status: 'item-acquired', itemHeld: true },
      },
    })
    expect(useGameStore.getState().completeQuest('stage1-talk-book', 'stage1-student-west-01')).toBe(false)
  })

  it('collects and returns an active quest item once, awarding exactly two gold', () => {
    const store = useGameStore.getState()
    expect(store.collectQuestItem('stage1-talk-book', 'stage1-desk-nw-01')).toBe(false)
    expect(store.startQuest('stage1-talk-book')).toBe(true)
    expect(useGameStore.getState().collectQuestItem('stage1-talk-book', 'stage1-desk-ne-01')).toBe(true)
    expect(useGameStore.getState().questProgress['stage1-talk-book']).toEqual({
      status: 'item-acquired',
      itemHeld: true,
    })
    expect(useGameStore.getState().newQuestItemIds).toEqual(['talk-book'])
    expect(useGameStore.getState().collectQuestItem('stage1-talk-book', 'stage1-desk-ne-01')).toBe(false)
    expect(useGameStore.getState().completeQuest('stage1-talk-book', 'stage1-student-south-01')).toBe(false)
    expect(useGameStore.getState().completeQuest('stage1-talk-book', 'stage1-student-west-01')).toBe(true)
    expect(useGameStore.getState().questProgress['stage1-talk-book']).toEqual({
      status: 'completed',
      itemHeld: false,
    })
    expect(useGameStore.getState().goldTotal).toBe(12)
    expect(useGameStore.getState().goldSession).toBe(2)
    expect(useGameStore.getState().questJourneyCompletedIds).toEqual(['stage1-talk-book'])
    expect(useGameStore.getState().newQuestItemIds).toEqual([])
    expect(useGameStore.getState().completeQuest('stage1-talk-book', 'stage1-student-west-01')).toBe(false)
    expect(useGameStore.getState().goldTotal).toBe(12)
  })

  it('allows the final fallback source only after every configured item target is absent', () => {
    useGameStore.setState({
      currentStageId: 'stage2',
      questProgress: createStageQuestProgress('stage2'),
    })
    expect(useGameStore.getState().startQuest('stage2-bandage')).toBe(true)
    expect(useGameStore.getState().collectQuestItem('stage2-bandage', 'stage2-bandage:fallback')).toBe(false)

    saveStagePropPlacements({
      stage2: [{ id: 'unrelated-desk', type: 'classroomDesk', position: [0, 0, 0], scale: 1 }],
    })
    expect(useGameStore.getState().collectQuestItem('stage2-bandage', 'stage2-bandage:fallback')).toBe(true)
  })

  it('accepts Stage 2 scattered copies for return completion but rejects another copy base', () => {
    useGameStore.setState({
      currentStageId: 'stage2',
      phase: 'playing',
      questProgress: createStageQuestProgress('stage2'),
    })
    expect(useGameStore.getState().startQuest('stage2-bandage')).toBe(true)
    expect(useGameStore.getState().collectQuestItem('stage2-bandage', 'stage2-locker-bank-left-north-copy-1')).toBe(true)
    expect(useGameStore.getState().completeQuest('stage2-bandage', 'stage2-student-west-mid-copy-1')).toBe(false)
    expect(useGameStore.getState().completeQuest('stage2-bandage', 'stage2-student-east-north-copy-1')).toBe(true)
  })

  it('manages quest inventory notices and only pauses or resumes its own quest pause', () => {
    useGameStore.setState({
      questToast: { type: 'item', questId: 'stage1-talk-book' },
      newQuestItemIds: ['talk-book'],
    })
    useGameStore.getState().clearQuestToast()
    useGameStore.getState().markQuestInventorySeen()
    expect(useGameStore.getState().questToast).toBeNull()
    expect(useGameStore.getState().newQuestItemIds).toEqual([])

    useGameStore.getState().toggleQuestInventory()
    expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'quest' })
    useGameStore.getState().closeQuestInventory()
    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', pauseSource: null })

    useGameStore.setState({ phase: 'paused', pauseSource: 'manual' })
    useGameStore.getState().toggleQuestInventory()
    useGameStore.getState().closeQuestInventory()
    expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'manual' })
  })

  it('preserves completed journey only while moving to the next stage', () => {
    useGameStore.setState({
      questProgress: {
        ...createStageQuestProgress('stage1'),
        'stage1-talk-book': { status: 'completed', itemHeld: false },
      },
      questJourneyCompletedIds: ['stage1-talk-book'],
      newQuestItemIds: ['talk-book'],
      questToast: { type: 'completed', questId: 'stage1-talk-book' },
      phase: 'playing',
      currentStageId: 'stage1',
    })

    expect(useGameStore.getState().clearStageAndStartNext()).toBe(true)
    expect(useGameStore.getState().currentStageId).toBe('stage2')
    expect(useGameStore.getState().questJourneyCompletedIds).toEqual(['stage1-talk-book'])
    expect(useGameStore.getState().questProgress).toEqual(createStageQuestProgress('stage2'))
    expect(useGameStore.getState().newQuestItemIds).toEqual([])
    expect(useGameStore.getState().questToast).toBeNull()
    expect(useGameStore.getState().questCollectedSourceIds).toEqual([])

    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().questJourneyCompletedIds).toEqual([])
    expect(useGameStore.getState().questProgress).toEqual(createStageQuestProgress('stage1'))
    expect(useGameStore.getState().newQuestItemIds).toEqual([])
    expect(useGameStore.getState().questToast).toBeNull()
  })
})
