// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

// 홈페이지 → /game?lang=xx: ko/en/ja만 첫 로드 기본값으로 쓰고, 그 외(vi 등)는 기존 기본값(브라우저 언어).
afterEach(() => { window.history.replaceState(null, '', '/'); vi.resetModules() })

async function loadWithUrl(url) {
  window.history.replaceState(null, '', url)
  vi.resetModules()
  return import('./i18n.js')
}

it.each(['en', 'ja', 'ko'])('applies ?lang=%s on first load', async (lang) => {
  const i18n = await loadWithUrl(`/game?lang=${lang}`)
  expect(i18n.getLocale()).toBe(lang)
  expect(i18n.detectInitialLocale()).toBe(lang)
})

it('ignores an unsupported ?lang and keeps the browser default', async () => {
  const fallback = (await loadWithUrl('/game')).getLocale()
  const i18n = await loadWithUrl('/game?lang=vi')
  expect(i18n.getLocale()).toBe(fallback)
})

it('reads ?lang only once: a later URL change or user choice is not overridden', async () => {
  const i18n = await loadWithUrl('/game?lang=ja')
  window.history.replaceState(null, '', '/game?lang=en')
  expect(i18n.detectInitialLocale()).toBe('ja')
  i18n.setLocale('ko')
  expect(i18n.getLocale()).toBe('ko')
})
