import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { pickDialogueId } from '../dialogues/dialogueStore.js'
import { propLabel, t } from './i18n.js'

const SUBJECT_NAMES = new Map(STAGE_PROP_PALETTE.map(({ type, label }) => [type, label]))

const REWARD_SUBJECT_TYPES = Object.freeze({
  classroomDesk: 'desk',
  corridorLockerBank: 'locker',
  corridorJanitorCart: 'janitorCart',
  corridorLostFoundBoard: 'bulletinBoard',
})

const STUDENT_POOLS = Object.freeze({
  stage1: 'student.stage1',
  stage2: 'investigation.student.stage2',
  stage3: 'investigation.student.stage3',
  stage4: 'investigation.student.stage4',
})

export function getInvestigationDialogue(stageId, type, { random } = {}) {
  if (type === 'unconsciousStudent' || type === 'classPresidentStudent') {
    const poolId = STUDENT_POOLS[stageId] ?? STUDENT_POOLS.stage1
    return {
      subjectType: 'student',
      subjectName: t('dialogue.studentName', null, '좀비가 된 학생'),
      dialogueId: pickDialogueId(poolId, { random }),
    }
  }

  const koreanName = SUBJECT_NAMES.get(type)
  if (!koreanName) return null

  return {
    subjectType: REWARD_SUBJECT_TYPES[type] ?? type,
    subjectName: propLabel(type, koreanName),
    dialogueId: pickDialogueId(`investigation.${type}`, { random }),
  }
}
