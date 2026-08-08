import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { STUDENT_DIALOGUE_IDS, pickStudentDialogueId } from './studentDialogueLines.js'

const ORIGINAL_DIALOGUE_COUNT = 52
const ORIGINAL_KO_HASH = '6d447e90cfd2b232c188a25693dba020dc40b7ed3da587f17c571b2e318505a3'

describe('student dialogue ID pool', () => {
  it('keeps every currently migrated Stage 1 entry addressable through IDs', () => {
    expect(STUDENT_DIALOGUE_IDS.length).toBeGreaterThan(0)
    expect(STUDENT_DIALOGUE_IDS.length).toBeLessThanOrEqual(300)
    expect(new Set(STUDENT_DIALOGUE_IDS).size).toBe(STUDENT_DIALOGUE_IDS.length)
    for (const id of STUDENT_DIALOGUE_IDS) expect(getDialogueText(id)).not.toBe('')
  })

  it('locks the original first 52 Korean texts after raw-store migration', () => {
    const original = STUDENT_DIALOGUE_IDS.slice(0, ORIGINAL_DIALOGUE_COUNT).map((id) => getDialogueText(id, 'ko'))
    const hash = createHash('sha256').update(JSON.stringify(original)).digest('hex')
    expect(hash).toBe(ORIGINAL_KO_HASH)
  })

  it('chooses only IDs from the generic Stage 1 pool', () => {
    expect(pickStudentDialogueId(() => 0)).toBe(STUDENT_DIALOGUE_IDS[0])
    expect(pickStudentDialogueId(() => 0.999999)).toBe(STUDENT_DIALOGUE_IDS.at(-1))
  })
})
