// 만화·마케팅 이미지는 게임(escapezombie.com)과 완전히 분리된 미디어 사이트에서만 제공한다.
// 게임 앱은 이 주소로 가는 일반 링크만 가진다 — 도메인이 바뀌면 이 한 줄만 고친다.
export const MEDIA_SITE_URL = 'https://media.escapezombie.com/'

export function getMediaSiteComicsUrl(language) {
  return `${MEDIA_SITE_URL}?lang=${encodeURIComponent(language)}`
}
