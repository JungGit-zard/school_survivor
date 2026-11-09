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

  // 2026-11-08 Stage 5 교무실 프롭 6종: 어느 것을 조사해도 "대사 없음" 문구가 나오지 않는다(ko/en/ja 각 5줄).
  it('gives every staff-room prop its own five-line pool in ko, en and ja', () => {
    const types = ['staffroomDeskIsland', 'staffroomViceDesk', 'staffroomCopier', 'staffroomEntranceDoor', 'staffroomSpeaker', 'staffroomClutter']
    for (const type of types) {
      for (const locale of ['ko', 'en', 'ja']) {
        const ids = new Set()
        for (let index = 0; index < 5; index += 1) {
          const dialogue = getInvestigationDialogue('stage5', type, { random: () => (index + 0.5) / 5 })
          expect(dialogue?.dialogueId, type).not.toBe('dialogue.unavailable')
          ids.add(dialogue.dialogueId)
          expect(getDialogueText(dialogue.dialogueId, locale)).not.toBe(getDialogueText('dialogue.unavailable', locale))
        }
        expect(ids.size, type).toBe(5)
      }
    }
    expect(getInvestigationDialogue('stage5', 'unconsciousStudent', { random: () => 0 }).dialogueId).toMatch(/^investigation\.student\.stage5\./)
  })
})
