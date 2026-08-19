import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { findInvestigationTargetInRange, getInvestigationTargets } from '../lib/studentProximity.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getQuestTargetPosition } from './QuestWorldLayer.jsx'
import {
  getGenericInvestigationDialogueId,
  nextDeferredInvestigationSuppressionId,
  shouldDeferGenericInvestigation,
} from './StudentDialogueTrigger.jsx'
import { getPoolIds } from '../dialogues/dialogueStore.js'

const triggerSource = readFileSync(new URL('./StudentDialogueTrigger.jsx', import.meta.url), 'utf8')

beforeEach(() => {
  commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
})

describe('StudentDialogueTrigger', () => {
  it('passes the investigation subject type to the reward policy', () => {
    expect(triggerSource).toContain("rollInvestigationReward(target.subjectType)")
  })

  it('routes every generic Stage 1 fallen student to the shared ID pool', () => {
    const targets = getInvestigationTargets('stage1')
    // 배치 id는 스튜디오 저장이 정본이라 리터럴로 박으면 배치를 옮길 때마다 썩는다
    // (stage1-student-sw-01은 커밋 875ebfe 스튜디오 저장에서 사라졌다).
    // 검증하려는 건 "두 학생 모델 종류 다 공용 풀로 간다"이므로 모델 타입으로 찾는다.
    const placements = getStageObjectPlacements('stage1')
    const findByType = (type) => targets.find(({ id }) => id === placements.find((p) => p.type === type)?.id)
    const unconsciousStudent = findByType('unconsciousStudent')
    const classPresidentStudent = findByType('classPresidentStudent')

    for (const target of [unconsciousStudent, classPresidentStudent]) {
      expect(target).toBeTruthy()
      expect(getPoolIds('student.stage1')).toContain(getGenericInvestigationDialogueId({ target }))
    }
  })

  it('keeps the fixed fallen-student investigation dialogue outside Stage 1', () => {
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      const target = getInvestigationTargets(stageId).find(({ subjectType }) => subjectType === 'student')
      expect(getGenericInvestigationDialogueId({ target })).toBe(target.dialogueId)
    }
  })

  it('preserves the quest-start priority before generic fallen-student dialogue', () => {
    const quest = getStageQuestDefinitions('stage1').find(({ id }) => id === 'stage1-talk-book')
    expect(triggerSource).toContain('const questInteraction = getQuestGiverInteraction(quest, progress)')
    expect(triggerSource.indexOf('if (questInteraction?.type === \'start\')'))
      .toBeLessThan(triggerSource.lastIndexOf('getGenericInvestigationDialogueId({'))
    expect(triggerSource).toContain('openStudentDialogue(quest.startDialogueId, null')
    expect(quest).toBeTruthy()
  })

  it('uses the Stage 1 pool resolver in the real generic dialogue runtime call', () => {
    expect(triggerSource).toMatch(/openStudentDialogue\(\s*getGenericInvestigationDialogueId\(\{ target \}\),\s*rollInvestigationReward\(target\.subjectType\)/)
  })

  it('defers the Stage 1 speech-book overlap to the active quest interaction', () => {
    const stageId = 'stage1'
    const quest = getStageQuestDefinitions(stageId).find(({ id }) => id === 'stage1-talk-book')
    const placements = getStageObjectPlacements(stageId)
    const itemTarget = getQuestTargetPosition(stageId, quest.id, quest.itemTarget, placements)
    const genericTarget = findInvestigationTargetInRange(
      itemTarget.position[0],
      itemTarget.position[2],
      getInvestigationTargets(stageId),
      new Set(),
    )

    // 겹치는 일반 조사 대상은 이제 책이 놓인 그 책상 자신이다. 커밋 f85c84b이 소품 조사문을
    // 전 스테이지로 넓히기 전엔 스테이지1 조사 대상이 학생뿐이라 옆 학생이 잡혔다.
    expect(genericTarget?.id).toBe(quest.itemTarget.placementId)
    expect(shouldDeferGenericInvestigation({
      playerX: itemTarget.position[0],
      playerZ: itemTarget.position[2],
      itemTargets: [{ quest, target: itemTarget }],
      completionTargets: [],
      questProgress: { [quest.id]: { status: 'active' } },
    })).toBe(true)
  })

  it('defers a Stage 2 copied return giver to the item-acquired completion interaction', () => {
    const stageId = 'stage2'
    const quest = getStageQuestDefinitions(stageId).find(({ id }) => id === 'stage2-bandage')
    const placements = getStageObjectPlacements(stageId)
    const completionTarget = getQuestTargetPosition(stageId, quest.id, quest.completion, placements)

    expect(completionTarget.sourceId).toMatch(/^stage2-student-east-north-copy-/)
    expect(shouldDeferGenericInvestigation({
      playerX: completionTarget.position[0],
      playerZ: completionTarget.position[2],
      itemTargets: [],
      completionTargets: [{ quest, target: completionTarget }],
      questProgress: { [quest.id]: { status: 'item-acquired' } },
    })).toBe(true)
  })

  it('holds a deferred generic target until exit, then allows investigation on re-approach', () => {
    const stageId = 'stage1'
    const quest = getStageQuestDefinitions(stageId).find(({ id }) => id === 'stage1-talk-book')
    const placements = getStageObjectPlacements(stageId)
    const itemTarget = getQuestTargetPosition(stageId, quest.id, quest.itemTarget, placements)
    const targets = getInvestigationTargets(stageId)
    const genericTarget = findInvestigationTargetInRange(
      itemTarget.position[0],
      itemTarget.position[2],
      targets,
      new Set(),
    )

    const deferredId = nextDeferredInvestigationSuppressionId({
      playerX: itemTarget.position[0],
      playerZ: itemTarget.position[2],
      targets,
      currentSuppressedTargetId: null,
      questInteractionActive: true,
    })
    expect(deferredId).toBe(genericTarget.id)
    expect(nextDeferredInvestigationSuppressionId({
      playerX: itemTarget.position[0],
      playerZ: itemTarget.position[2],
      targets,
      currentSuppressedTargetId: deferredId,
      questInteractionActive: false,
    })).toBe(genericTarget.id)

    const exitX = genericTarget.position[0] + 2
    expect(nextDeferredInvestigationSuppressionId({
      playerX: exitX,
      playerZ: genericTarget.position[2],
      targets,
      currentSuppressedTargetId: deferredId,
      questInteractionActive: false,
    })).toBeNull()
    expect(nextDeferredInvestigationSuppressionId({
      playerX: itemTarget.position[0],
      playerZ: itemTarget.position[2],
      targets,
      currentSuppressedTargetId: null,
      questInteractionActive: false,
    })).toBeNull()
    expect(findInvestigationTargetInRange(
      itemTarget.position[0],
      itemTarget.position[2],
      targets,
      new Set(),
    )).toBe(genericTarget)
  })
})
