import { getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProfile } from './firebaseProgress.js'

export const STORAGE_KEY = 'school_survivor:userNicknames'

const MIN_NICKNAME_LENGTH = 2
const MAX_NICKNAME_LENGTH = 12

export function normalizeNickname(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

export function validateNickname(value) {
  const nickname = normalizeNickname(value)

  if (nickname.length < MIN_NICKNAME_LENGTH) {
    return { ok: false, nickname, error: '닉네임은 2글자 이상으로 입력해 주세요.' }
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, nickname, error: '닉네임은 12글자 이하로 입력해 주세요.' }
  }

  return { ok: true, nickname, error: '' }
}

export function getNicknameOwnerKey(user) {
  const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
  return uid || 'firebase-runtime'
}

export function getSavedNickname() {
  return getFirebaseProgressRuntimeSnapshot().profile?.nickname ?? ''
}

export function saveNicknameForUser(_user, value) {
  const result = validateNickname(value)
  if (!result.ok) return result
  updateFirebasePlayerProfile((profile) => {
    profile.nickname = result.nickname
    return profile
  })
  return result
}
