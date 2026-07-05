export const STUDIO_GAME_SYNC_MESSAGE = 'escape-zombie-school.studioGameSync.v1'
export const STUDIO_GAME_URL_STORAGE_KEY = 'escape-zombie-school.studioGameUrl.v1'

export function getDefaultStudioGameUrl(location = globalThis.location) {
  if (!location?.href) return ''
  const url = new URL(location.href)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return url.href
}

export function parseStudioGameUrl(value, baseHref = globalThis.location?.href) {
  try {
    const url = new URL(value, baseHref)
    return /^https?:$/.test(url.protocol) ? url : null
  } catch {
    return null
  }
}

export function isAllowedStudioGameOrigin(origin) {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (
      url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname === '0.0.0.0'
      || url.hostname.startsWith('192.168.')
    )
  } catch {
    return false
  }
}
