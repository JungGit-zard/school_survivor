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
    if (url.protocol !== 'http:') return false
    const host = url.hostname
    // ponytail: startsWith('192.168.')는 '192.168.evil.com' 같은 공인 도메인도 통과시켜
    // 화이트리스트가 우회됨 → LAN IPv4 형태로 정확히 매칭한다(octet 범위는 dev용이라 생략).
    return (
      host === 'localhost'
      || host === '127.0.0.1'
      || host === '0.0.0.0'
      || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
    )
  } catch {
    return false
  }
}
