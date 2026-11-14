import { describe, expect, it } from 'vitest'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import {
  QUEST_DEFINITIONS,
  createStageQuestProgress,
  getQuestDefinition,
  getStageQuestDefinitions,
} from './quests.js'

describe('stage quest definitions', () => {
  it('exposes the twelve planned quests as two independent quests per stage', () => {
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
      'stage6-relay-baton',
      'stage6-assembly-roll',
    ])
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']) {
      expect(getStageQuestDefinitions(stageId)).toHaveLength(2)
    }
    // 퀘스트는 stageId로만 묶여 다른 스테이지로 새지 않는다. 초안 Stage 7~10은 퀘스트가 없다.
    for (const stageId of ['stage7', 'stage8', 'stage9', 'stage10']) expect(getStageQuestDefinitions(stageId)).toEqual([])
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

  // Stage 6 운동장(2026-11-13): 의뢰 학생 2명은 확장 배치에 실제로 있고, 물건은 골대 2개 뒤(밖)에 놓인다.
  it('places the Stage 6 quests on real schoolyard placements behind the two goals', async () => {
    const { getStageObjectPlacements } = await import('../components/StageObjects/stageObjectPlacements.js')
    const { getStageObjectColliders } = await import('../components/StageObjects/stageObjectColliders.js')
    const { getQuestTargetPosition } = await import('../components/QuestWorldLayer.jsx')
    const placements = getStageObjectPlacements('stage6')
    const ids = new Set(placements.map(({ id }) => id))
    for (const quest of getStageQuestDefinitions('stage6')) {
      expect(ids.has(quest.giver.placementId)).toBe(true)
      expect(ids.has(quest.completion.placementId)).toBe(true)
      expect(ids.has(quest.itemTarget.placementId)).toBe(true)
    }
    // 학생은 콜라이더가 아니다 — solid는 골대 2개 그대로.
    expect(getStageObjectColliders('stage6')).toHaveLength(2)
    const baton = getQuestTargetPosition('stage6', 'stage6-relay-baton', getQuestDefinition('stage6-relay-baton').itemTarget, placements)
    const roll = getQuestTargetPosition('stage6', 'stage6-assembly-roll', getQuestDefinition('stage6-assembly-roll').itemTarget, placements)
    expect(baton.sourceId).toBe('exp_s6_goal_north')
    expect(roll.sourceId).toBe('exp_s6_goal_south')
    // 골대 반폭 z 0.45 + 0.38 바깥: 북쪽은 z < −11.45, 남쪽은 z > 11.45. 플레이어 이동 범위 |z| ≤ 18 안.
    expect(baton.position[2]).toBeLessThan(-11.45)
    expect(roll.position[2]).toBeGreaterThan(11.45)
    for (const { position } of [baton, roll]) expect(Math.abs(position[2])).toBeLessThanOrEqual(18)
  })
})
