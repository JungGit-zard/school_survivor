// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import { _seedHydratedFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { TERMS_TITLE, PRIVACY_TITLE } from '../lib/legalDocuments.js'

// vi.mock factory는 파일 최상단으로 호이스팅되므로 팩토리 내부에서 참조하는 바깥
// 변수는 "mock" 접두사가 필요하다(이 저장소 관례).
let mockDeleteResult = { ok: true, ranking: {} }
let mockReauthResult = true

vi.mock('../lib/accountDeletion.js', () => ({
  deleteAccountAndData: vi.fn(async () => mockDeleteResult),
  reauthenticateForDeletion: vi.fn(async () => mockReauthResult),
}))

const { deleteAccountAndData, reauthenticateForDeletion } = await import('../lib/accountDeletion.js')

describe('LobbySettingsModal', () => {
  beforeEach(() => {
    localStorage.clear()
    _seedHydratedFirebaseProgressForTests()
    vi.clearAllMocks()
    mockDeleteResult = { ok: true, ranking: {} }
    mockReauthResult = true
    // 이전 테스트가 mockImplementation으로 동작을 덮어썼을 수 있으므로 매 테스트마다
    // 위 mockDeleteResult/mockReauthResult를 읽는 기본 구현으로 되돌린다.
    deleteAccountAndData.mockImplementation(async () => mockDeleteResult)
    reauthenticateForDeletion.mockImplementation(async () => mockReauthResult)
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

  it('requires a second explicit confirmation step before deleting the account', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'del-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings()

    await clickButtonByText(view.container, '계정 삭제')

    expect(deleteAccountAndData).not.toHaveBeenCalled()
    expect(view.container.textContent).toContain('복구할 수 없습니다')

    view.unmount()
  })

  it('deletes the account and routes back to the title screen when confirmed', async () => {
    mockDeleteResult = { ok: true, ranking: {} }
    const onLogoutToTitle = vi.fn()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'del-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings({ onLogoutToTitle })

    await clickButtonByText(view.container, '계정 삭제')
    await clickButtonByText(view.container, '영구 삭제')
    await flushAsyncWork()

    expect(deleteAccountAndData).toHaveBeenCalledWith(expect.objectContaining({ uid: 'del-user' }))
    expect(onLogoutToTitle).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('blocks duplicate delete clicks while a deletion is already in flight', async () => {
    let resolveDelete
    deleteAccountAndData.mockImplementation(() => new Promise((resolve) => { resolveDelete = resolve }))
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'del-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings()

    await clickButtonByText(view.container, '계정 삭제')
    await clickButtonByText(view.container, '영구 삭제')
    await clickButtonByText(view.container, '삭제 중...').catch(() => {})

    expect(deleteAccountAndData).toHaveBeenCalledTimes(1)

    resolveDelete({ ok: true, ranking: {} })
    await flushAsyncWork()
    view.unmount()
  })

  it('offers reauthentication and retries deletion when Firebase requires a recent login', async () => {
    mockDeleteResult = { ok: false, reason: 'reauthRequired', message: 'stale session' }
    mockReauthResult = true
    const onLogoutToTitle = vi.fn()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'del-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings({ onLogoutToTitle })

    await clickButtonByText(view.container, '계정 삭제')
    await clickButtonByText(view.container, '영구 삭제')
    await flushAsyncWork()

    expect(view.container.textContent).toContain('다시 로그인')

    mockDeleteResult = { ok: true, ranking: {} }
    await clickButtonByText(view.container, '다시 로그인하고 재시도')
    await flushAsyncWork()

    expect(reauthenticateForDeletion).toHaveBeenCalledTimes(1)
    expect(deleteAccountAndData).toHaveBeenCalledTimes(2)
    expect(onLogoutToTitle).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('shows the terms of service and privacy policy full text on demand', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'legal-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings()

    await clickButtonByText(view.container, TERMS_TITLE)
    expect(view.container.textContent).toContain('시행일')

    await clickButtonByText(view.container, PRIVACY_TITLE)
    expect(view.container.textContent).toContain('처리하는 항목')

    view.unmount()
  })
})

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

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
