import { describe, expect, it } from 'vitest'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import {
  QUEST_DEFINITIONS,
  createStageQuestProgress,
  getQuestDefinition,
  getStageQuestDefinitions,
} from './quests.js'

describe('stage quest definitions', () => {
  it('exposes the ten planned quests as two independent quests per stage', () => {
    expect(QUEST_DEFINITIONS.map(({ id }) => id)).toEqual([
      'stage1-talk-book',
      'stage1-attendance',
      'stage2-bandage',
      'stage2-broadcast-key',
      'stage3-whistle',
      'stage3-scoreboard-fuse',
      'stage4-allergy-list',
      'stage4-gas-valve',
      'stage5-late-slip',
      'stage5-pa-key',
    ])
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      expect(getStageQuestDefinitions(stageId)).toHaveLength(2)
    }
    // Stage 5 퀘스트는 stageId로만 묶여 다른 스테이지로 새지 않는다. 초안 스테이지 6은 퀘스트가 없다.
    expect(getStageQuestDefinitions('stage6')).toEqual([])
    expect(getQuestDefinition('missing-quest')).toBeNull()
    expect(createStageQuestProgress('stage2')).toEqual({
      'stage2-bandage': { status: 'undiscovered', itemHeld: false },
      'stage2-broadcast-key': { status: 'undiscovered', itemHeld: false },
    })
  })

  it('keeps the planned start and completion dialogue with item and target metadata', () => {
    for (const quest of QUEST_DEFINITIONS) {
      expect(quest.startDialogueId).toBe(`quest.${quest.id}.start`)
      expect(quest.completionDialogueId).toBe(`quest.${quest.id}.completion`)
      for (const locale of ['ko', 'en', 'ja']) {
        expect(getDialogueText(quest.startDialogueId, locale)).not.toBe('')
        expect(getDialogueText(quest.completionDialogueId, locale)).not.toBe('')
      }
      expect(quest.item).toMatchObject({ id: expect.any(String), name: expect.any(String), description: expect.any(String), visualKind: expect.any(String) })
      expect(quest.giver.placementId).toBeTruthy()
      expect(quest.itemTarget.type).toBeTruthy()
      expect(['return', 'install']).toContain(quest.completion.kind)
      expect(quest.rewardGold).toBe(2)
    }
  })

  it('places the Stage 1 speech book on the designated middle desk as a red book', () => {
    const talkBook = getQuestDefinition('stage1-talk-book')

    expect(talkBook.item.visualKind).toBe('red-book')
    expect(talkBook.itemTarget).toMatchObject({
      placementId: 'stage1-desk-mid-02',
      surface: { localPosition: [0.54, 0.89, 0.24] },
    })
  })
})
