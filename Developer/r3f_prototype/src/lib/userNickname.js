export const STORAGE_KEY = 'school_survivor:userNicknames'

const LOCAL_OWNER_KEY = 'local'
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
  return uid || LOCAL_OWNER_KEY
}

export function getSavedNickname(user) {
  const nicknames = readNicknameMap()
  const nickname = nicknames[getNicknameOwnerKey(user)]
  return typeof nickname === 'string' ? nickname : ''
}

export function saveNicknameForUser(user, value) {
  const result = validateNickname(value)
  if (!result.ok) return result

  const nicknames = readNicknameMap()
  nicknames[getNicknameOwnerKey(user)] = result.nickname
  writeNicknameMap(nicknames)
  return result
}

function readNicknameMap() {
  if (typeof localStorage === 'undefined') return {}

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const out = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== 'string' || typeof value !== 'string') continue
      const ownerKey = key.trim()
      const nickname = normalizeNickname(value)
      if (ownerKey && nickname) out[ownerKey] = nickname
    }
    return out
  } catch {
    return {}
  }
}

function writeNicknameMap(nicknames) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nicknames))
}
