// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LobbySettingsModal from './LobbySettingsModal.jsx'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, applyCloudProgressSnapshot, buildCloudProgressSnapshot, getFirebaseProgressRuntimeSnapshot, requestCloudProgressSave } from '../lib/firebaseProgress.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { TERMS_TEXT, TERMS_TITLE, PRIVACY_TEXT, PRIVACY_TITLE } from '../lib/legalDocuments.js'
import { _resetGuestSessionSettingsForTests, loadGuestSessionSettings, loadTitleSettings, saveTitleSettings } from '../lib/titleSettings.js'
import { saveGuestRankingNickname } from '../lib/guestRankingIdentity.js'
import { PLAYER_APPEARANCE_VALUES } from '../lib/playerAppearance.js'

vi.mock('../lib/guestRankingIdentity.js', () => ({
  getGuestRankingNickname: () => '자동생존자',
  getRankingUser: vi.fn(async () => ({ uid: 'guest', displayName: '자동생존자' })),
  saveGuestRankingNickname: vi.fn(async (nickname) => ({ ok: true, nickname })),
}))

vi.mock('../lib/firebaseProgress.js', async (importOriginal) => ({
  ...await importOriginal(),
  requestCloudProgressSave: vi.fn(async () => true),
}))

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
  it.each([true, false])('edits a guest nickname without Google/progress and handles save outcome %s', async (ok) => {
    useAuthStore.setState({ user: null, status: 'signedOut', progressStatus: 'idle' })
    saveGuestRankingNickname.mockResolvedValueOnce(ok ? { ok: true, nickname: '새이름' } : { ok: false, error: '저장 실패' })
    const onNicknameChange = vi.fn()
    const view = renderSettings({ onNicknameChange })
    await flushAsyncWork()
    expect(view.container.textContent).toContain('자동생존자')
    await clickButtonByText(view.container, '닉네임')
    const input = view.container.querySelector('#lobby-nickname-input')
    expect(input.value).toBe('자동생존자')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '새이름')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await clickButtonByText(view.container, '저장')
    expect(saveGuestRankingNickname).toHaveBeenCalledWith('새이름')
    if (ok) {
      expect(onNicknameChange).toHaveBeenCalledWith('새이름')
      expect(view.container.querySelector('#lobby-nickname-input')).toBeNull()
    } else {
      expect(view.container.textContent).toContain('저장 실패')
      expect(view.container.querySelector('#lobby-nickname-input').value).toBe('새이름')
    }
    view.unmount()
  })
  beforeEach(() => {
    _resetGuestSessionSettingsForTests()
    _seedHydratedFirebaseProgressForTests()
    useAuthStore.setState({ status: 'signedIn', user: { uid: 'test-user' }, progressStatus: 'ready' })
    vi.clearAllMocks()
    requestCloudProgressSave.mockResolvedValue(true)
    mockDeleteResult = { ok: true, ranking: {} }
    mockReauthResult = true
    // 이전 테스트가 mockImplementation으로 동작을 덮어썼을 수 있으므로 매 테스트마다
    // 위 mockDeleteResult/mockReauthResult를 읽는 기본 구현으로 되돌린다.
    deleteAccountAndData.mockImplementation(async () => mockDeleteResult)
    reauthenticateForDeletion.mockImplementation(async () => mockReauthResult)
  })

  it('offers one option per savable appearance, in detail order, with exactly one selected', () => {
    const view = renderSettings()
    // 저장 가능한 값이 늘었는데 버튼이 안 늘면 그 외형은 영영 고를 수 없다.
    expect([...Object.keys(APPEARANCE_LABEL_BY_VALUE)].sort()).toEqual([...PLAYER_APPEARANCE_VALUES].sort())
    expect(appearanceButtons(view.container).map((button) => button.textContent)).toEqual(APPEARANCE_LABELS)
    expect(pressedAppearance(view.container)).toBe('표준')
    // 개발 용어(버전명/내부 값)가 라벨로 새어 나오면 안 된다.
    expect(APPEARANCE_LABELS.join(' ')).not.toMatch(/v9|legacy|rosari/i)
    expect(appearanceButtons(view.container).map((b) => b.textContent).join(' ')).not.toMatch(/v9|legacy|rosari/i)
    view.unmount()
  })

  it('selects any of the three appearances, reopens with the selection and round-trips Firebase data', async () => {
    let view = renderSettings()
    expect(buildCloudProgressSnapshot().progress.titleSettings).not.toHaveProperty('playerAppearance')
    // 이미 눌려 있는 선택지는 중복 저장이 차단되므로 그 값만 마지막에 돈다.
    const alreadyPressed = pressedAppearance(view.container)
    const order = [
      ...PLAYER_APPEARANCE_VALUES.filter((v) => APPEARANCE_LABEL_BY_VALUE[v] !== alreadyPressed),
      ...PLAYER_APPEARANCE_VALUES.filter((v) => APPEARANCE_LABEL_BY_VALUE[v] === alreadyPressed),
    ]
    for (const value of order) {
      await clickButtonByText(view.container, APPEARANCE_LABEL_BY_VALUE[value])
      expect(loadTitleSettings().playerAppearance).toBe(value)
      // 저장된 선택은 모달을 닫고 Firebase 스냅샷으로 되살아나야 한다.
      const saved = buildCloudProgressSnapshot()
      view.unmount()
      _seedHydratedFirebaseProgressForTests()
      applyCloudProgressSnapshot(saved, { uid: 'test-user' })
      view = renderSettings()
      expect(pressedAppearance(view.container)).toBe(APPEARANCE_LABEL_BY_VALUE[value])
    }
    expect(requestCloudProgressSave).toHaveBeenCalledTimes(PLAYER_APPEARANCE_VALUES.length)
    view.unmount()
  })

  it('selects the third appearance and keeps exactly one option pressed', async () => {
    const view = renderSettings()
    await clickButtonByText(view.container, '정밀')
    expect(requestCloudProgressSave).toHaveBeenCalledTimes(1)
    expect(pressedAppearance(view.container)).toBe('정밀')
    expect(view.container.querySelector('[role="alert"]')).toBeNull()
    // 이미 선택된 선택지를 다시 눌러도 중복 저장하지 않는다.
    await clickButtonByText(view.container, '정밀')
    expect(requestCloudProgressSave).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it.each([undefined, 'v9', 'legacy', 'rosari'])('restores previous appearance %s after save failure', async (previous) => {
    if (previous) saveTitleSettings({ playerAppearance: previous })
    // 저장 계층(titleSettings/firebaseProgress 화이트리스트)이 아직 받아주지 않는 값은 시드
    // 직후 사라진다. 롤백은 "클릭 직전에 실제로 저장돼 있던 상태로 정확히 되돌리는가"로
    // 판정해야 화이트리스트 상태와 무관하게 성립한다.
    const seeded = loadTitleSettings().playerAppearance
    if (previous) expect(seeded).toBe(previous)
    let completeSave
    requestCloudProgressSave.mockImplementationOnce(() => new Promise((resolve) => { completeSave = resolve }))
    const view = renderSettings()
    await clickButtonByText(view.container, seeded === 'legacy' ? '표준' : '단순')
    for (const button of appearanceButtons(view.container)) expect(button.disabled).toBe(true)
    expect(view.container.querySelector('button[aria-label="닫기"]').disabled).toBe(true)
    expect(getButtonByText(view.container, '로그아웃').disabled).toBe(true)
    // Another setting remains editable while the cloud appearance save is pending.
    await clickButtonByLabel(view.container, '진동 끄기')
    await act(async () => completeSave(false))
    expect(loadTitleSettings().playerAppearance).toBe(seeded)
    expect(pressedAppearance(view.container)).toBe(APPEARANCE_LABEL_BY_VALUE[seeded ?? 'v9'])
    expect(loadTitleSettings().vibration).toBe(false)
    expect(view.container.querySelector('[role="alert"]').textContent).toContain('저장할 수 없습니다')
    if (!seeded) expect(buildCloudProgressSnapshot().progress.titleSettings).not.toHaveProperty('playerAppearance')
    view.unmount()
  })

  it('does not roll an old account preference into a newly hydrated account', async () => {
    let completeSave
    requestCloudProgressSave.mockImplementationOnce(() => new Promise((resolve) => { completeSave = resolve }))
    const view = renderSettings()
    await clickButtonByText(view.container, '단순')
    _seedHydratedFirebaseProgressForTests({ uid: 'different-user' })
    saveTitleSettings({ vibration: false, playerAppearance: 'v9' })
    const before = buildCloudProgressSnapshot().progress
    await act(async () => completeSave(false))
    expect(buildCloudProgressSnapshot().progress).toEqual(before)
    view.unmount()
  })

  it('handles a rejected save and restores the previous preference', async () => {
    requestCloudProgressSave.mockRejectedValueOnce(new Error('offline'))
    const view = renderSettings()
    await clickButtonByText(view.container, '단순')
    expect(loadTitleSettings()).not.toHaveProperty('playerAppearance')
    expect(getButtonByText(view.container, '표준').disabled).toBe(false)
    expect(view.container.querySelector('[role="alert"]')).not.toBeNull()
    view.unmount()
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

  it('keeps settings and the current session when saving prevents logout', async () => {
    const onLogoutToTitle = vi.fn()
    const user = { uid: 'logout-save-failure', displayName: 'Player' }
    useAuthStore.setState({ status: 'signedIn', user, signOutOfGoogle: vi.fn(async () => false) })
    const view = renderSettings({ onLogoutToTitle })
    await clickButtonByText(view.container, '로그아웃')
    expect(onLogoutToTitle).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toEqual(user)
    expect(view.container.textContent).toContain('로그아웃')
    expect(view.container.querySelector('[role="alert"]').textContent).toBe('진행도를 저장하지 못해 로그아웃하지 않았습니다. 연결을 확인한 뒤 다시 시도해 주세요.')
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
    // 삭제를 in-flight로 붙잡아 둬야 중복 클릭 차단을 관찰할 수 있다.
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
    expect(view.container.textContent).toContain(TERMS_TEXT.slice(0, 10))

    await clickButtonByText(view.container, PRIVACY_TITLE)
    expect(view.container.textContent).toContain(PRIVACY_TEXT.slice(0, 10))

    view.unmount()
  })

  it('exposes a separate hit camera shake toggle and applies it to runtime dataset', async () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'hit-shake-settings-user' })
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'hit-shake-settings-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings()

    expect(view.container.textContent).toContain('피격 카메라 흔들림')
    expect(loadTitleSettings().hitCameraShake).toBe(true)

    await clickButtonByLabel(view.container, '피격 카메라 흔들림 끄기')

    expect(loadTitleSettings().hitCameraShake).toBe(false)
    expect(document.documentElement.dataset.hitCameraShake).toBe('false')

    await clickButtonByLabel(view.container, '피격 카메라 흔들림 켜기')

    expect(loadTitleSettings().hitCameraShake).toBe(true)
    expect(document.documentElement.dataset.hitCameraShake).toBeUndefined()

    view.unmount()
  })



  it('pairs toggle color with semantic enabled and disabled states', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'toggle-state-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings()

    expect(view.container.querySelector('[data-panel-state="enabled"]')).not.toBeNull()
    await clickButtonByLabel(view.container, '진동 끄기')
    expect(view.container.querySelector('[data-panel-state="disabled"]')).not.toBeNull()

    view.unmount()
  })

  // 회귀: 구 트리에서 설정을 열면 loadTitleSettings → ensureHydrated가 FirebaseProgressError를 던졌다.
  // 게스트·하이드레이트 전·store만 ready인 경합·하이드레이트 후 어느 상태에서도 열기와 토글이 던지면 안 된다.
  it.each([
    ['guest without login', null, 'idle', false],
    ['signed in before the snapshot hydrates', { uid: 'pending-user' }, 'loading', false],
    ['signed in with ready status but no applied snapshot', { uid: 'pending-user' }, 'ready', false],
    ['signed in after the snapshot hydrates', { uid: 'pending-user' }, 'ready', true],
  ])('opens settings and toggles every switch without throwing: %s', async (_name, user, progressStatus, hydrated) => {
    _resetFirebaseProgressForTests()
    if (hydrated) _seedHydratedFirebaseProgressForTests(user)
    useAuthStore.setState({ status: user ? 'signedIn' : 'signedOut', user, progressStatus, signOutOfGoogle: vi.fn(async () => {}) })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    // act 환경 경고는 무관하다. 렌더/이벤트 중 던져진 진행도 오류만 잡는다.
    const progressErrors = () => errors.mock.calls.filter((args) => args.some((arg) => (
      arg instanceof Error || /progress is unavailable|progress-not-hydrated/.test(String(arg))
    )))
    try {
      const view = renderSettings()
      const toggles = () => Array.from(view.container.querySelectorAll('button[aria-label]'))
        .filter((button) => /(끄기|켜기)$/.test(button.getAttribute('aria-label')))
      expect(toggles()).toHaveLength(4)
      for (let index = 0; index < 4; index += 1) {
        await act(async () => { toggles()[index].dispatchEvent(new MouseEvent('click', { bubbles: true })) })
      }
      expect(progressErrors()).toEqual([])
      if (hydrated) expect(loadTitleSettings().vibration).toBe(false)

      if (user && progressStatus === 'loading') {
        // 스냅샷이 늦게 도착해도 원격 값으로 다시 읽고, 그 뒤 토글은 저장된다.
        await act(async () => {
          _seedHydratedFirebaseProgressForTests(user)
          useAuthStore.setState({ progressStatus: 'ready' })
        })
        expect(loadTitleSettings().vibration).toBe(true)
        await clickButtonByLabel(view.container, '진동 끄기')
        expect(loadTitleSettings().vibration).toBe(false)
        expect(progressErrors()).toEqual([])
      }
      view.unmount()
    } finally {
      errors.mockRestore()
    }
  })

  it('closes from the close control', async () => {
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'modal-a11y-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const onClose = vi.fn()
    const view = renderSettings({ onClose })
    await clickButtonByLabel(view.container, '닫기')
    expect(onClose).toHaveBeenCalledTimes(1)

    view.unmount()
  })

  it('closes on Escape, but first steps back out of the delete confirmation', async () => {
    useAuthStore.setState({ status: 'signedIn', user: { uid: 'test-user' }, signOutOfGoogle: vi.fn(async () => {}) })
    const onClose = vi.fn()
    const view = renderSettings({ onClose })
    const pressEscape = () => act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    await clickButtonByText(view.container, '계정 삭제')
    expect(view.container.textContent).toContain('영구')
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
    expect(getButtonByText(view.container, '로그아웃')).toBeTruthy()
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)

    view.unmount()
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps guest choices for this session only, explains why, and greys out account-only actions', async () => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: null, status: 'signedOut', progressStatus: 'idle' })
    const before = getFirebaseProgressRuntimeSnapshot()
    let view = renderSettings()
    await flushAsyncWork()

    expect(view.container.querySelector('[data-testid="settings-guest-session-note"]')?.textContent).toContain('로그인하면 설정이 저장')
    await clickButtonByText(view.container, APPEARANCE_LABEL_BY_VALUE.legacy)
    expect(view.container.querySelector('[role="alert"]')).toBeNull()
    expect(getButtonByText(view.container, APPEARANCE_LABEL_BY_VALUE.legacy).getAttribute('aria-pressed')).toBe('true')
    await clickButtonByLabel(view.container, '진동 끄기')
    expect(requestCloudProgressSave).not.toHaveBeenCalled()
    for (const label of ['로그아웃', '계정 삭제']) {
      const button = getButtonByText(view.container, label)
      expect(button.disabled).toBe(true)
      expect(Number(button.style.opacity)).toBeLessThan(0.5)
      expect(button.style.cursor).toBe('not-allowed')
    }
    view.unmount()

    view = renderSettings()
    expect(getButtonByText(view.container, APPEARANCE_LABEL_BY_VALUE.legacy).getAttribute('aria-pressed')).toBe('true')
    expect(view.container.querySelector('[aria-label="진동 켜기"]')).not.toBeNull()
    expect(loadGuestSessionSettings()).toMatchObject({ playerAppearance: 'legacy', vibration: false })
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
    view.unmount()
  })

  it('keeps the account deletion confirmation separate from the modal close control', async () => {
    let resolveDelete
    deleteAccountAndData.mockImplementation(() => new Promise((resolve) => { resolveDelete = resolve }))
    const onClose = vi.fn()
    useAuthStore.setState({
      status: 'signedIn',
      user: { uid: 'busy-delete-user' },
      signOutOfGoogle: vi.fn(async () => {}),
    })
    const view = renderSettings({ onClose })

    await clickButtonByText(view.container, '계정 삭제')
    expect(onClose).not.toHaveBeenCalled()

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
  const button = getButtonByText(container, text)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

// 외형 라벨은 모델 정밀도가 낮은 쪽에서 높은 쪽 순서다. 버전명/개발 용어를 쓰지 않는다.
const APPEARANCE_LABEL_BY_VALUE = { legacy: '단순', v9: '표준', rosari: '정밀' }
const APPEARANCE_LABELS = Object.values(APPEARANCE_LABEL_BY_VALUE)

function appearanceButtons(container) {
  const group = container.querySelector('[role="group"][aria-label="주인공 외형"]')
  if (!group) throw new Error('Missing appearance group')
  return Array.from(group.querySelectorAll('button'))
}

function pressedAppearance(container) {
  const pressed = appearanceButtons(container).filter((button) => button.getAttribute('aria-pressed') === 'true')
  expect(pressed.map((button) => button.textContent)).toHaveLength(1)
  return pressed[0].textContent
}

function getButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  return button
}

async function clickButtonByLabel(container, label) {
  const button = container.querySelector(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`Missing button label: ${label}`)
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
