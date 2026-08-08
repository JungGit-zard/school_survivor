import { describe, expect, it } from 'vitest'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { getInvestigationDialogue } from './investigationDialogue.js'

describe('getInvestigationDialogue', () => {
  it('returns an ID, never an executable dialogue string, for every inspectable prop', () => {
    for (const { type } of STAGE_PROP_PALETTE) {
      const dialogue = getInvestigationDialogue('stage2', type, { random: () => 0 })
      expect(dialogue?.subjectName).toBeTruthy()
      expect(dialogue?.dialogueId).toMatch(/^[a-zA-Z0-9.]+$/)
      expect(getDialogueText(dialogue.dialogueId)).not.toBe('')
    }
  })

  it('uses the 300-target Stage 1 generic student ID pool for both fallen-student models', () => {
    for (const type of ['unconsciousStudent', 'classPresidentStudent']) {
      const dialogue = getInvestigationDialogue('stage1', type, { random: () => 0.999999 })
      expect(dialogue).toMatchObject({ subjectType: 'student' })
      expect(dialogue.dialogueId).toMatch(/^student\.stage1\./)
    }
  })

  it('keeps Stage 2–4 fixed student IDs outside the Stage 1 generic pool', () => {
    for (const stageId of ['stage2', 'stage3', 'stage4']) {
      const dialogue = getInvestigationDialogue(stageId, 'unconsciousStudent', { random: () => 0 })
      expect(dialogue.dialogueId).toMatch(new RegExp(`^investigation\\.student\\.${stageId}\\.`))
    }
  })
})
