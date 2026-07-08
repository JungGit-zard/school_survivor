import { useMemo, useRef } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos } from '../lib/refs.js'
import { getUnconsciousStudents, findStudentInRange } from '../lib/studentProximity.js'
import { pickStudentLine } from '../lib/studentDialogueLines.js'

// 쓰러진 학생 근접 감지기(비주얼 없음). playing일 때만 매 프레임 playerPos와
// 현재 스테이지 학생들의 거리를 재고, 반경 안에 들어오면 대화창을 연다.
// 각 학생은 런당 1회만 말한다(talkedRef). 새 판(gameKey 변경) 시 초기화.
export default function StudentDialogueTrigger() {
  const currentStageId = useGameStore((s) => s.currentStageId)
  const gameKey = useGameStore((s) => s.gameKey)
  const openStudentDialogue = useGameStore((s) => s.openStudentDialogue)

  const students = useMemo(() => getUnconsciousStudents(currentStageId), [currentStageId])

  // 이번 판에서 이미 말 건 학생 id 집합. gameKey가 바뀌면 새 Set으로 리셋.
  const talkedRef = useRef(new Set())
  const lastGameKeyRef = useRef(gameKey)
  if (lastGameKeyRef.current !== gameKey) {
    lastGameKeyRef.current = gameKey
    talkedRef.current = new Set()
  }

  usePlayingFrame(() => {
    const id = findStudentInRange(playerPos.x, playerPos.z, students, talkedRef.current)
    if (!id) return
    talkedRef.current.add(id)
    openStudentDialogue(pickStudentLine())
  })

  return null
}
