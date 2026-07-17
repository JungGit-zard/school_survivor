export const STUDIO_GAME_SYNC_MESSAGE = 'escape-zombie-school.studioGameSync.v1'
export const STUDIO_GAME_URL_STORAGE_KEY = 'escape-zombie-school.studioGameUrl.v1'

export function getDefaultStudioGameUrl(location = globalThis.location) {
  if (!location?.href) return ''
  const url = new URL(location.href)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return getCanonicalLocalGameUrl(url).href
}

export function parseStudioGameUrl(value, baseHref = globalThis.location?.href) {
  try {
    const url = new URL(value, baseHref)
    if (!/^https?:$/.test(url.protocol)) return null
    const canonicalUrl = getCanonicalLocalGameUrl(url)
    const currentOrigin = baseHref ? new URL(baseHref).origin : globalThis.location?.origin
    return isAllowedStudioGameOrigin(canonicalUrl.origin, currentOrigin) ? canonicalUrl : null
  } catch {
    return null
  }
}

function getCanonicalLocalGameUrl(url) {
  if (url.protocol === 'http:' && ['127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
    url.hostname = 'localhost'
  }
  return url
}

export function isAllowedStudioGameOrigin(origin, currentOrigin = globalThis.location?.origin) {
  try {
    const url = new URL(origin)
    const current = currentOrigin ? new URL(currentOrigin) : null
    if (!/^https?:$/.test(url.protocol)) return false
    if (current && url.origin === current.origin) return true

    // Cross-origin posting is a local-development convenience only. A deployed
    // HTTPS Studio must never send workspace data to localhost or the LAN.
    if (url.protocol !== 'http:') return false
    if (!current) return isLocalDevHost(url.hostname)
    if (current.protocol !== 'http:') return false
    if (!isLocalDevHost(current.hostname)) return false
    return isLocalDevHost(url.hostname)
  } catch {
    return false
  }
}

function isLocalDevHost(host) {
  return (
    host === 'localhost'
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
  )
}
