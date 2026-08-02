import { useMemo, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos } from '../lib/refs.js'
import { getInvestigationTargets, findInvestigationTargetInRange } from '../lib/studentProximity.js'
import { rollInvestigationReward } from '../lib/studentSearchRewards.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import { getQuestTargetPosition, getQuestWorldInteraction } from './QuestWorldLayer.jsx'

export function getQuestGiverInteraction(quest, progress) {
  if (!quest || !progress) return null
  if (progress.status === 'undiscovered') return { type: 'start', quest }
  return null
}

export function shouldSkipGenericInvestigationReward(quest) {
  return Boolean(quest)
}

export function shouldDeferGenericInvestigation({
  playerX,
  playerZ,
  itemTargets,
  completionTargets,
  questProgress,
}) {
  return Boolean(getQuestWorldInteraction({
    playerX,
    playerZ,
    itemTargets,
    completionTargets,
    questProgress,
  }))
}

export function nextDeferredInvestigationSuppressionId({
  playerX,
  playerZ,
  targets,
  currentSuppressedTargetId,
  questInteractionActive,
}) {
  const currentTarget = targets.find(({ id }) => id === currentSuppressedTargetId)
  if (currentTarget && findInvestigationTargetInRange(
    playerX,
    playerZ,
    [currentTarget],
    new Set(),
  )) return currentTarget.id

  if (!questInteractionActive) return null
  return findInvestigationTargetInRange(playerX, playerZ, targets, new Set())?.id ?? null
}

export function findQuestByGiverPlacementId(quests, placementId) {
  return quests.find((quest) => (
    placementId === quest.giver.placementId
    || placementId.startsWith(`${quest.giver.placementId}-copy-`)
  )) ?? null
}

// 조사 대상 근접 감지기(비주얼 없음). 모든 스테이지의 학생·소품은
// 각각 런당 1회만 조사할 수 있으며, 생성된 대상은 항상 조사문을 가진다.
export default function StudentDialogueTrigger() {
  const currentStageId = useGameStore((s) => s.currentStageId)
  const gameKey = useGameStore((s) => s.gameKey)
  const openStudentDialogue = useGameStore((s) => s.openStudentDialogue)

  const targets = useMemo(() => getInvestigationTargets(currentStageId), [currentStageId, gameKey])
  const stageQuests = useMemo(() => getStageQuestDefinitions(currentStageId), [currentStageId])
  const placements = useMemo(
    () => getStageObjectPlacements(currentStageId),
    [currentStageId, gameKey],
  )
  const itemTargets = useMemo(() => stageQuests.map((quest) => ({
    quest,
    target: getQuestTargetPosition(currentStageId, quest.id, quest.itemTarget, placements),
  })), [currentStageId, placements, stageQuests])
  const completionTargets = useMemo(() => stageQuests.map((quest) => ({
    quest,
    target: getQuestTargetPosition(currentStageId, quest.id, quest.completion, placements),
  })), [currentStageId, placements, stageQuests])

  // 이번 판에서 이미 말 건 학생 id 집합. gameKey가 바뀌면 새 Set으로 리셋.
  const talkedRef = useRef(new Set())
  const deferredTargetRef = useRef(null)
  const lastGameKeyRef = useRef(gameKey)
  if (lastGameKeyRef.current !== gameKey) {
    lastGameKeyRef.current = gameKey
    talkedRef.current = new Set()
    deferredTargetRef.current = null
  }

  usePlayingFrame(() => {
    const store = useGameStore.getState()
    const questInteractionActive = shouldDeferGenericInvestigation({
      playerX: playerPos.x,
      playerZ: playerPos.z,
      itemTargets,
      completionTargets,
      questProgress: store.questProgress,
    })
    const deferredTargetId = nextDeferredInvestigationSuppressionId({
      playerX: playerPos.x,
      playerZ: playerPos.z,
      targets,
      currentSuppressedTargetId: deferredTargetRef.current,
      questInteractionActive,
    })
    deferredTargetRef.current = deferredTargetId
    if (deferredTargetId || questInteractionActive) return

    const target = findInvestigationTargetInRange(
      playerPos.x,
      playerPos.z,
      targets,
      talkedRef.current,
    )
    if (!target) return
    const quest = findQuestByGiverPlacementId(stageQuests, target.id)
    const progress = store.questProgress?.[quest?.id]
    const questInteraction = getQuestGiverInteraction(quest, progress)
    if (questInteraction?.type === 'start') {
      if (store.startQuest?.(quest.id)) {
        talkedRef.current.add(target.id)
        openStudentDialogue(quest.startLine, null, {
          subjectType: 'quest',
          subjectName: quest.giver.name,
        })
      }
      return
    }
    if (shouldSkipGenericInvestigationReward(quest)) {
      talkedRef.current.add(target.id)
      return
    }
    talkedRef.current.add(target.id)
    openStudentDialogue(
      target.line,
      rollInvestigationReward(target.subjectType),
      { subjectType: target.subjectType, subjectName: target.subjectName },
    )
  })

  return null
}
