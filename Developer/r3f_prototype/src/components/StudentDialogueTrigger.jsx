import { useMemo, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos } from '../lib/refs.js'
import { getInvestigationTargets, findInvestigationTargetInRange } from '../lib/studentProximity.js'
import { pickStudentLine } from '../lib/studentDialogueLines.js'
import { rollStudentSearchReward } from '../lib/studentSearchRewards.js'

// 조사 대상 근접 감지기(비주얼 없음). 쓰러진 학생과 스테이지 2의
// 사물함·불레틴보드는 각각 런당 1회만 조사할 수 있다.
export default function StudentDialogueTrigger() {
  const currentStageId = useGameStore((s) => s.currentStageId)
  const gameKey = useGameStore((s) => s.gameKey)
  const openStudentDialogue = useGameStore((s) => s.openStudentDialogue)

  const targets = useMemo(() => getInvestigationTargets(currentStageId), [currentStageId])

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
    talkedRef.current.add(target.id)
    openStudentDialogue(
      target.line ?? pickStudentLine(),
      rollStudentSearchReward(),
      { subjectType: target.subjectType, subjectName: target.subjectName },
    )
  })

  return null
}
