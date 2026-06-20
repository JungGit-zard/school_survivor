// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GoogleAccountPanelView } from './GoogleAccountPanel.jsx'

describe('GoogleAccountPanelView', () => {
  it('shows a disabled setup state when Firebase env vars are missing', () => {
    const html = renderToStaticMarkup(
      <GoogleAccountPanelView status="unconfigured" signingIn={false} onSignIn={() => {}} onSignOut={() => {}} />,
    )

    expect(html).toContain('Google 로그인 설정 필요')
    expect(html).toContain('Firebase .env')
    expect(html).toContain('disabled')
  })

  it('offers Google sign in when configured and signed out', () => {
    const onSignIn = vi.fn()
    const html = renderToStaticMarkup(
      <GoogleAccountPanelView status="signedOut" signingIn={false} onSignIn={onSignIn} onSignOut={() => {}} />,
    )

    expect(html).toContain('Google 로그인')
    expect(html).toContain('계정 연동 가능')
  })

  it('shows account identity and sign out when signed in', () => {
    const html = renderToStaticMarkup(
      <GoogleAccountPanelView
        status="signedIn"
        signingIn={false}
        user={{
          displayName: 'Kim',
          email: 'kim@example.com',
          photoURL: 'https://example.com/photo.png',
        }}
        onSignIn={() => {}}
        onSignOut={() => {}}
      />,
    )

    expect(html).toContain('Kim')
    expect(html).toContain('kim@example.com')
    expect(html).toContain('로그아웃')
  })
})
