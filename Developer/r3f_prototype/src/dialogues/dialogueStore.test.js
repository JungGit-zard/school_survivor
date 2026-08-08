import { describe, expect, it } from 'vitest'
import {
  getDialoguePoolStatus,
  getDialogueText,
  getPoolIds,
  parseRawDialogue,
  pickDialogueId,
} from './dialogueStore.js'

describe('dialogueStore', () => {
  it('treats quotes, braces, password-like text, and broken-looking code as inert raw text', () => {
    const entries = parseRawDialogue('probe.001\t"0304" { not: executable } ) ]')
    expect(entries.get('probe.001')).toBe('"0304" { not: executable } ) ]')
  })

  it('skips malformed raw rows and never leaks a missing ID into the UI', () => {
    const entries = parseRawDialogue('missing-tab\nempty.001\t\nvalid.001\tok')
    expect(entries.has('missing-tab')).toBe(false)
    expect(entries.has('empty.001')).toBe(false)
    expect(entries.get('valid.001')).toBe('ok')
    expect(getDialogueText('missing.dialogue.id', 'en')).toBe('Dialogue unavailable.')
    expect(getDialogueText('missing.dialogue.id', 'ko')).toBe('??? ???? ???.')
    expect(getDialogueText('missing.dialogue.id', 'ja')).toBe('?????????????')
  })

  it('returns localized fallback when the dialogue id is empty', () => {
    expect(getDialogueText('', 'en')).toBe('Dialogue unavailable.')
    expect(getDialogueText('', 'ko')).toBe('??? ???? ???.')
    expect(getDialogueText('', 'ja')).toBe('?????????????')
  })

  it('falls back to Korean and always resolves a valid pool ID', () => {
    const id = pickDialogueId('student.stage1', { locale: 'not-a-locale', random: () => 0 })
    expect(getPoolIds('student.stage1', 'ko')).toContain(id)
    expect(getDialogueText(id, 'not-a-locale')).not.toBe('')
  })

  it('keeps quest dialogue IDs resolvable in every supported locale', () => {
    for (const locale of ['ko', 'en', 'ja']) {
      expect(getDialogueText('quest.stage1-talk-book.start', locale)).not.toBe('')
      expect(getDialogueText('quest.stage4-gas-valve.completion', locale)).not.toBe('')
    }
  })

  it('keeps the Stage 1 pool target at exactly 300 lines', () => {
    expect(getDialoguePoolStatus()['student.stage1'].target).toBe(300)
  })

  it('keeps the investigation pool targets at exactly 5 lines', () => {
    const status = getDialoguePoolStatus()
    expect(status['investigation.classroomDesk'].target).toBe(5)

    for (const [poolId, poolStatus] of Object.entries(status)) {
      if (!poolId.startsWith('investigation.')) continue
      expect(poolStatus.target).toBe(5)
    }
  })
})
