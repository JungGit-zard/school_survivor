const PENDING_START_AFTER_LOGIN_KEY = 'eszs:pending-start-after-google-login'

export function markPendingStartAfterLogin(storage = getSessionStorage()) {
  try {
    storage?.setItem(PENDING_START_AFTER_LOGIN_KEY, '1')
  } catch {}
}

export function hasPendingStartAfterLogin(storage = getSessionStorage()) {
  try {
    return storage?.getItem(PENDING_START_AFTER_LOGIN_KEY) === '1'
  } catch {
    return false
  }
}

export function consumePendingStartAfterLogin(storage = getSessionStorage()) {
  const pending = hasPendingStartAfterLogin(storage)
  if (pending) clearPendingStartAfterLogin(storage)
  return pending
}

export function clearPendingStartAfterLogin(storage = getSessionStorage()) {
  try {
    storage?.removeItem(PENDING_START_AFTER_LOGIN_KEY)
  } catch {}
}

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}
