import { getPoolIds, pickDialogueId } from '../dialogues/dialogueStore.js'

export const STUDENT_DIALOGUE_IDS = Object.freeze(getPoolIds('student.stage1', 'ko'))

export function pickStudentDialogueId(random = Math.random) {
  return pickDialogueId('student.stage1', { random })
}
