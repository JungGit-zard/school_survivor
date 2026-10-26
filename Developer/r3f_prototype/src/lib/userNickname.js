import { getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProfile } from './firebaseProgress.js'
import { t } from './i18n.js'

export const STORAGE_KEY = 'school_survivor:userNicknames'

// 게스트 자동 닉네임('생존자-abc123')은 저장값을 바꾸지 않고 표시할 때만 현재 언어로 바꾼다.
const GUEST_AUTO_NICKNAME = /^생존자-([A-Za-z0-9]{6})$/

export function displayNickname(value) {
  if (typeof value !== 'string') return value
  const match = GUEST_AUTO_NICKNAME.exec(value)
  return match ? `${t('guest.nicknamePrefix', null, '생존자')}-${match[1]}` : value
}

const MIN_NICKNAME_LENGTH = 2
const MAX_NICKNAME_LENGTH = 12

export function normalizeNickname(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim()
}

export function validateNickname(value) {
  const nickname = normalizeNickname(value)

  if (nickname.length < MIN_NICKNAME_LENGTH) {
    return { ok: false, nickname, error: t('nickname.tooShort', null, '닉네임은 2글자 이상으로 입력해 주세요.') }
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, nickname, error: t('nickname.tooLong', null, '닉네임은 12글자 이하로 입력해 주세요.') }
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
