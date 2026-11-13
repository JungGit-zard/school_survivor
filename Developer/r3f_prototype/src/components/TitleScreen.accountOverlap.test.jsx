// @vitest-environment jsdom
// 2026-11-14 타이틀 롤백 리뷰: 로그인 후 계정 카드가 폰 폭에서 KO 언어 버튼 밑으로 깔려 로그아웃을 못 눌렀다.
// jsdom에는 레이아웃이 없으므로, 컴포넌트가 실제로 내보내는 style/CSS 문자열을 그대로 꺼내 프레임 폭별로 계산한다.
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TitleScreen from './TitleScreen.jsx'
import { GoogleAccountPanelView, TITLE_ACCOUNT_CARD_NARROW_WIDTH, TITLE_ACCOUNT_CARD_WIDTH } from './GoogleAccountPanel.jsx'
import { useLocaleStore } from '../lib/i18n.js'

vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => null }))
// SSR에서 zustand는 초기 상태(로그아웃)를 돌려주므로, 로그인 상태를 선택자 가짜로 고정한다.
vi.mock('../store/useAuthStore.js', () => {
  const state = {
    status: 'signedIn',
    user: { uid: 'overlap-user', displayName: '아주아주긴이름의테스트사용자', email: 'very.long.email.address@example.com' },
    error: null,
    signingIn: false,
    initializeAuth: () => {},
    signInWithGoogle: () => {},
    signOutOfGoogle: () => {},
  }
  const useAuthStore = (selector) => selector(state)
  useAuthStore.getState = () => state
  useAuthStore.setState = () => {}
  useAuthStore.subscribe = () => () => {}
  return { useAuthStore }
})

// 이 폭 이하(화면 폭 media query)에서는 카드가 한 열로 접히고 NARROW 폭을 쓴다.
const NARROW_BREAKPOINT = 360

afterEach(() => {
  useLocaleStore.setState({ locale: 'ko' })
})

describe('signed-in title account card vs the KO language button', () => {
  it.each([320, 360, 390, 430])('at %ipx the card ends left of the language button and logout stays tappable', (frameWidth) => {
    const doc = renderTitle()
    const card = doc.querySelector('[data-account-title-card]')
    expect(card).not.toBeNull()
    const languageAnchor = doc.querySelector('[data-title-language]')
    const languageButton = languageAnchor.querySelector('button[aria-haspopup]')

    const cardStyle = inlineStyle(card)
    const cardLeft = cssPx(cardStyle.left, frameWidth)
    const cardWidth = cssPx(
      frameWidth <= NARROW_BREAKPOINT ? narrowTitleCardWidth(doc) : cardStyle.width,
      frameWidth,
    )
    const cardRight = cardLeft + cardWidth

    const languageRight = cssPx(inlineStyle(languageAnchor).right, frameWidth)
    const languageWidth = cssPx(inlineStyle(languageButton).width, frameWidth)
    const languageLeft = frameWidth - languageRight - languageWidth

    expect(cardRight).toBeLessThan(languageLeft)

    const logout = Array.from(card.querySelectorAll('button')).find((button) => button.textContent.trim() === '로그아웃')
    expect(logout).toBeTruthy()
    const logoutStyle = inlineStyle(logout)
    expect(cssPx(logoutStyle['min-height'], frameWidth)).toBeGreaterThanOrEqual(44)
    expect(cssPx(logoutStyle['min-width'], frameWidth)).toBeGreaterThanOrEqual(44)
    // 카드 안쪽 폭(테두리 2px*2 + 좌우 패딩 6px*2 = 16px)
    const inner = cardWidth - 16
    if (frameWidth <= NARROW_BREAKPOINT) {
      // 한 열로 접히면 로그아웃이 안쪽 폭 전체를 쓴다.
      expect(inner).toBeGreaterThanOrEqual(44)
    } else {
      // 두 열: 아바타(28)+간격(7) | 이름 | 간격(8) + 로그아웃(min 58). 이름 칸이 사라지면 안 된다.
      const nameColumn = inner - 35 - 8 - cssPx(logoutStyle['min-width'], frameWidth)
      expect(nameColumn).toBeGreaterThanOrEqual(40)
    }
  })

  it('uses the shared width constants and one-line ellipsis rules for the title card', () => {
    const doc = renderTitle()
    const card = doc.querySelector('[data-account-title-card]')
    expect(inlineStyle(card).width).toBe(TITLE_ACCOUNT_CARD_WIDTH)
    expect(narrowTitleCardWidth(doc)).toBe(TITLE_ACCOUNT_CARD_NARROW_WIDTH)
    const css = doc.querySelector('style[data-google-account-accessibility-css]').textContent
    expect(css).toMatch(/@media \(max-width: 480px\) \{\s*\.google-account-panel\.google-account-panel--title strong,[\s\S]*?-webkit-line-clamp: 1 !important;/)
    // 데스크톱 프레임(≈506px)은 300px 상한 그대로라 모습이 같다.
    expect(cssPx(TITLE_ACCOUNT_CARD_WIDTH, 506)).toBe(300)
  })

  it('leaves the signed-out sticker and the non-title card untouched', () => {
    const signedOut = renderToStaticMarkup(
      <GoogleAccountPanelView compact status="signedOut" signingIn={false} onSignIn={() => {}} onSignOut={() => {}} />,
    )
    expect(signedOut).toContain('data-account-compact')
    expect(signedOut).not.toContain('data-account-title-card')
    expect(signedOut).not.toContain('google-account-panel--title')

    const bootstrapCard = renderToStaticMarkup(
      <GoogleAccountPanelView status="signedIn" user={{ uid: 'u1', displayName: 'Tester' }} signingIn={false} onSignIn={() => {}} onSignOut={() => {}} />,
    )
    expect(bootstrapCard).toContain('width:min(300px, calc(100% - 112px))')
    expect(bootstrapCard).not.toContain('data-account-title-card')
  })
})

function renderTitle() {
  const html = renderToStaticMarkup(<TitleScreen onEnterLobby={() => {}} />)
  const doc = document.implementation.createHTMLDocument('title')
  doc.body.innerHTML = html
  return doc
}

function narrowTitleCardWidth(doc) {
  const css = doc.querySelector('style[data-google-account-accessibility-css]').textContent
  const start = css.indexOf('@media (max-width: 360px) {')
  expect(start).toBeGreaterThanOrEqual(0)
  const block = css.slice(start, css.indexOf('@media', start + 1))
  const match = block.match(/\.google-account-panel\.google-account-panel--title \{\s*width: ([^;]+?) !important;/)
  expect(match).not.toBeNull()
  return match[1]
}

// SSR이 내보낸 style 속성을 그대로 읽는다(jsdom CSSOM은 min()/env()를 버릴 수 있다).
function inlineStyle(element) {
  const raw = element.getAttribute('style') || ''
  const out = {}
  for (const part of raw.split(';')) {
    const index = part.indexOf(':')
    if (index < 0) continue
    out[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return out
}

// px / % / calc() / min() / max() / env() 만 쓰는 길이 식을 프레임 폭 기준 px로 계산한다(safe-area = 0).
function cssPx(value, frameWidth) {
  expect(typeof value).toBe('string')
  const expr = value
    .replace(/env\([^)]*\)/g, '0px')
    .replace(/(\d+(?:\.\d+)?)%/g, (_, pct) => `${(Number(pct) / 100) * frameWidth}px`)
    .replace(/calc\(/g, '(')
    .replace(/min\(/g, 'Math.min(')
    .replace(/max\(/g, 'Math.max(')
    .replace(/(\d+(?:\.\d+)?)px/g, '$1')
  expect(expr).toMatch(/^[\d\s+\-*/().,a-zA-Z]+$/)
  return Function(`return (${expr})`)()
}
