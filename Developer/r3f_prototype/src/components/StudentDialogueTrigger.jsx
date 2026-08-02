import { useMemo, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos } from '../lib/refs.js'
import { getInvestigationTargets, findInvestigationTargetInRange } from '../lib/studentProximity.js'
import { pickStudentLine } from '../lib/studentDialogueLines.js'
import { rollInvestigationReward } from '../lib/studentSearchRewards.js'
import { getStageQuestDefinitions } from '../lib/quests.js'

export function getQuestGiverInteraction(quest, progress) {
  if (!quest || !progress) return null
  if (progress.status === 'undiscovered') return { type: 'start', quest }
  return null
}

export function shouldSkipGenericInvestigationReward(quest) {
  return Boolean(quest)
}

export function findQuestByGiverPlacementId(quests, placementId) {
  return quests.find((quest) => (
    placementId === quest.giver.placementId
    || placementId.startsWith(`${quest.giver.placementId}-copy-`)
  )) ?? null
}

// 조사 대상 근접 감지기(비주얼 없음). 쓰러진 학생과 스테이지 2의
// 모든 배치 소품은 각각 런당 1회만 조사할 수 있다.
export default function StudentDialogueTrigger() {
  const currentStageId = useGameStore((s) => s.currentStageId)
  const gameKey = useGameStore((s) => s.gameKey)
  const openStudentDialogue = useGameStore((s) => s.openStudentDialogue)

  const targets = useMemo(() => getInvestigationTargets(currentStageId), [currentStageId])
  const stageQuests = useMemo(() => getStageQuestDefinitions(currentStageId), [currentStageId])

  // 이번 판에서 이미 말 건 학생 id 집합. gameKey가 바뀌면 새 Set으로 리셋.
  const talkedRef = useRef(new Set())
  const lastGameKeyRef = useRef(gameKey)
  if (lastGameKeyRef.current !== gameKey) {
    lastGameKeyRef.current = gameKey
    talkedRef.current = new Set()
  }

  usePlayingFrame(() => {
    const target = findInvestigationTargetInRange(
      playerPos.x,
      playerPos.z,
      targets,
      talkedRef.current,
    )
    if (!target) return
    const quest = findQuestByGiverPlacementId(stageQuests, target.id)
    const progress = useGameStore.getState().questProgress?.[quest?.id]
    const questInteraction = getQuestGiverInteraction(quest, progress)
    if (questInteraction?.type === 'start') {
      if (useGameStore.getState().startQuest?.(quest.id)) {
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
      target.line ?? pickStudentLine(),
      rollInvestigationReward(target.subjectType),
      { subjectType: target.subjectType, subjectName: target.subjectName },
    )
  })

  return null
}
