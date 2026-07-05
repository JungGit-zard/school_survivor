// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import { useAuthStore } from '../store/useAuthStore.js'

describe('LobbySettingsModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('signs out of Google and forces the title screen from settings', async () => {
    const signOutOfGoogle = vi.fn(async () => {})
    const onLogoutToTitle = vi.fn()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'logout-user', displayName: 'Logout Tester', email: 'logout@example.com' },
      signOutOfGoogle,
    })
    const view = renderSettings({ onLogoutToTitle })

    await clickButtonByText(view.container, '로그아웃')

    expect(signOutOfGoogle).toHaveBeenCalledTimes(1)
    expect(onLogoutToTitle).toHaveBeenCalledTimes(1)

    view.unmount()
  })
})

function renderSettings(props = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<LobbySettingsModal onClose={() => {}} onNicknameChange={() => {}} {...props} />)
  })

  return {
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

async function clickButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
