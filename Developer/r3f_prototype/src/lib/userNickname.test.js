// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  getNicknameOwnerKey,
  getSavedNickname,
  normalizeNickname,
  saveNicknameForUser,
  validateNickname,
} from './userNickname.js'
import { _seedHydratedFirebaseProgressForTests, getFirebaseProgressRuntimeSnapshot } from './firebaseProgress.js'

describe('user nickname storage', () => {
  beforeEach(() => {
    _seedHydratedFirebaseProgressForTests({ uid: 'uid-1' })
  })

  it('normalizes whitespace and validates nickname length', () => {
    expect(normalizeNickname('  생존   반장  ')).toBe('생존 반장')
    expect(validateNickname('A')).toMatchObject({ ok: false })
    expect(validateNickname('좀비학교생존왕123456789')).toMatchObject({ ok: false })
    expect(validateNickname('생존왕')).toEqual({ ok: true, nickname: '생존왕', error: '' })
  })

  it('uses the Google uid as the nickname owner key', () => {
    expect(getNicknameOwnerKey({ uid: ' user-1 ' })).toBe('user-1')
    expect(getNicknameOwnerKey(null)).toBe('firebase-runtime')
  })

  it('saves and reads a nickname for the matched Google user', () => {
    const result = saveNicknameForUser({ uid: 'uid-1' }, '  교실 생존자  ')

    expect(result).toEqual({ ok: true, nickname: '교실 생존자', error: '' })
    expect(getSavedNickname({ uid: 'uid-1' })).toBe('교실 생존자')
    expect(getFirebaseProgressRuntimeSnapshot().profile.nickname).toBe('교실 생존자')
  })
})

describe('displayNickname', () => {
  it('localizes only the automatic guest nickname prefix for display', async () => {
    const { displayNickname } = await import('./userNickname.js')
    const { setLocale } = await import('./i18n.js')
    setLocale('en')
    try {
      expect(displayNickname('생존자-a1B2c3')).toBe('Survivor-a1B2c3')
      expect(displayNickname('생존자왕')).toBe('생존자왕')
      expect(displayNickname('생존자-a1B2c3x')).toBe('생존자-a1B2c3x')
      expect(displayNickname('')).toBe('')
      expect(displayNickname(undefined)).toBeUndefined()
      setLocale('ja')
      expect(displayNickname('생존자-a1B2c3')).toBe('サバイバー-a1B2c3')
      setLocale('ko')
      expect(displayNickname('생존자-a1B2c3')).toBe('생존자-a1B2c3')
    } finally {
      setLocale('ko')
    }
  })
})
