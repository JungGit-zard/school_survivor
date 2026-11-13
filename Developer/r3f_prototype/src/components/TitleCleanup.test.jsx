// @vitest-environment jsdom
// 2026-11-03 타이틀 정리(Terry 승인): 게스트 로그인 카드 축소, 홈페이지 보조 링크, 탭 제목·lang 동기화.
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TitleScreenSource from './TitleScreen.jsx?raw'
import { GoogleAccountPanelView } from './GoogleAccountPanel.jsx'
import { setLocale, useLocaleStore } from '../lib/i18n.js'
import { applyLanguage } from '../lib/titleSettings.js'
import { fitTitleFontSize } from './TitleScreen.jsx'
import ReadyGameAppSource from './ReadyGameApp.jsx?raw'
import { sunnyCta, sunnyPalette } from '../lib/uiStyle.js'


afterEach(() => {
  setLocale('ko')
  useLocaleStore.setState({ locale: 'ko' })
})

describe('guest sign-in collapses on the title', () => {
  it('renders only a small secondary sign-in button for a signed-out guest', () => {
    const html = renderToStaticMarkup(
      <GoogleAccountPanelView compact status="signedOut" signingIn={false} onSignIn={() => {}} onSignOut={() => {}} />,
    )
    expect(html).toContain('data-account-compact')
    expect(html).not.toContain('계정 연동 가능')
    expect(html).not.toContain('google-account-panel')
    expect(html).toContain('min-height:44px')
    expect(html).toContain('>로그인<')
  })

  it('keeps the full status display once signed in', () => {
    const html = renderToStaticMarkup(
      <GoogleAccountPanelView compact status="signedIn" user={{ uid: 'u1', displayName: 'Tester' }} signingIn={false} onSignIn={() => {}} onSignOut={() => {}} />,
    )
    expect(html).not.toContain('data-account-compact')
    expect(html).toContain('google-account-panel')
    expect(html).toContain('Tester')
  })

  it('uses the compact panel on the title and keeps the homepage as a text link', () => {
    expect(TitleScreenSource).toContain('<GoogleAccountPanel compact />')
    expect(TitleScreenSource).toContain('data-title-homepage style={styles.homepageLink}')
    expect(TitleScreenSource).not.toContain('styles.homepageButton')
    // 타이틀의 동의/닉네임 모달은 한 번도 열리지 않던 죽은 코드라 롤백 후에도 되살리지 않는다.
    expect(TitleScreenSource).not.toContain('ConsentGate')
    expect(TitleScreenSource).not.toContain('nicknameOpen')
  })

  it('builds the START style from the palette orange only', () => {
    expect(sunnyCta().background).toBe(sunnyPalette.orange)
    expect(sunnyCta().color).toBe(sunnyPalette.line)
  })

  it('keeps the cream desktop gutter for the title only; the dark lobby gets the dark gutter', () => {
    expect(ReadyGameAppSource).toContain("const CREAM_GUTTER_SCREENS = new Set(['title'])")
    expect(ReadyGameAppSource).toContain("const DARK_GUTTER = '#0a0810'")
  })

  it('caps the headline font size by the game frame width', () => {
    const size = fitTitleFontSize('clamp(40px, 12vw, 64px)', {
      accent: [...'ESCAPE!'].map((char) => ({ char })),
      school: [...'ZOMBIE SCHOOL'].map((char) => ({ char })),
    })
    expect(size).toMatch(/^min\(clamp\(40px, 12cqw, 64px\), calc\(\(100cqw - 80px\) \/ [\d.]+\)\)$/)
  })
})

describe('document title and lang follow the game language', () => {
  it.each([
    ['en', 'Escape! Zombie School'],
    ['ko', '탈출! 좀비학교'],
    ['ja', '脱出！ゾンビ学校'],
  ])('setLocale(%s) updates <html lang> and document.title', (locale, title) => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
    setLocale(locale)
    expect(document.documentElement.lang).toBe(locale)
    expect(document.title).toBe(title)
  })

  it('applyLanguage from title settings switches the tab title too', () => {
    applyLanguage('en')
    expect(document.title).toBe('Escape! Zombie School')
    applyLanguage('ko')
    expect(document.title).toBe('탈출! 좀비학교')
    expect(document.documentElement.lang).toBe('ko')
  })
})
