// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import ConsentGate from './ConsentGate.jsx'
import { CONSENT_ITEMS } from '../lib/legalDocuments.js'
import { recordConsent } from '../lib/consent.js'

// consent.js는 backendmini가 병렬 구현 중인 저장 계층이다. ConsentGate는 계약된
// recordConsent(user) 시그니처만 호출하므로, 여기서는 저장 로직 없이 목으로 대체해
// UI 동작(체크 게이트, 성공/실패 분기, 취소)만 검증한다.
vi.mock('../lib/consent.js', () => ({
  recordConsent: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('ConsentGate', () => {
  it('renders one checkbox per CONSENT_ITEMS entry without hardcoding the count', () => {
    const { container, cleanup } = renderGate()

    for (const item of CONSENT_ITEMS) {
      expect(container.querySelector(`#consent-item-${item.id}`)).not.toBeNull()
      expect(container.textContent).toContain(item.label)
    }
    // 전체 동의 체크박스 + 항목별 체크박스가 모두 실제 input[type=checkbox]다.
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(CONSENT_ITEMS.length + 1)

    cleanup()
  })

  it('disables the confirm button until every item is checked', () => {
    const { container, cleanup } = renderGate()
    const confirmButton = findButtonByText(container, '확인하고 시작')
    expect(confirmButton.disabled).toBe(true)

    // 하나만 체크 → 여전히 비활성.
    checkItem(container, CONSENT_ITEMS[0].id)
    expect(confirmButton.disabled).toBe(true)
    expect(container.textContent).toContain('두 항목에 모두 동의해야')

    // 나머지도 체크 → 활성화.
    for (let i = 1; i < CONSENT_ITEMS.length; i += 1) {
      checkItem(container, CONSENT_ITEMS[i].id)
    }
    expect(confirmButton.disabled).toBe(false)

    cleanup()
  })

  it('checking all items via the master toggle also enables confirm', () => {
    const { container, cleanup } = renderGate()
    const master = container.querySelector('#consent-master-checkbox')

    setChecked(master, true)

    for (const item of CONSENT_ITEMS) {
      expect(container.querySelector(`#consent-item-${item.id}`).checked).toBe(true)
    }
    expect(findButtonByText(container, '확인하고 시작').disabled).toBe(false)

    cleanup()
  })

  it('expands and collapses each item full text independently', () => {
    const { container, cleanup } = renderGate()
    const [first, second] = CONSENT_ITEMS

    expect(container.querySelector(`#consent-text-${first.id}`)).toBeNull()

    const expandButtons = container.querySelectorAll('button[aria-controls^="consent-text-"]')
    act(() => { expandButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true })) })

    expect(container.querySelector(`#consent-text-${first.id}`)?.textContent).toContain(first.text.slice(0, 20))
    if (second) {
      expect(container.querySelector(`#consent-text-${second.id}`)).toBeNull()
    }

    cleanup()
  })

  it('calls recordConsent and advances on success', async () => {
    recordConsent.mockResolvedValue(true)
    const onConfirmed = vi.fn()
    const onCancel = vi.fn()
    const { container, cleanup } = renderGate({ onConfirmed, onCancel })

    checkAllItems(container)
    await act(async () => {
      findButtonByText(container, '확인하고 시작').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(recordConsent).toHaveBeenCalledTimes(1)
    expect(onConfirmed).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    cleanup()
  })

  it.each([
    ['returns false', () => Promise.resolve(false)],
    ['rejects', () => Promise.reject(new Error('network down'))],
  ])('keeps the gate open and does not advance when recordConsent %s', async (_scenario, impl) => {
    recordConsent.mockImplementation(impl)
    const onConfirmed = vi.fn()
    const unhandledRejection = vi.fn()
    window.addEventListener('unhandledrejection', unhandledRejection)
    const { container, cleanup } = renderGate({ onConfirmed })

    checkAllItems(container)
    await act(async () => {
      findButtonByText(container, '확인하고 시작').dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onConfirmed).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    expect(unhandledRejection).not.toHaveBeenCalled()
    // 재시도 가능: 확인 버튼이 다시 활성 상태로 남아있어야 한다.
    expect(findButtonByText(container, '확인하고 시작').disabled).toBe(false)

    window.removeEventListener('unhandledrejection', unhandledRejection)
    cleanup()
  })

  it('does not advance to the next step when cancelled without consenting', () => {
    const onEnterLobby = vi.fn()
    const onConfirmed = vi.fn(() => onEnterLobby())
    const onCancel = vi.fn()
    const { container, cleanup } = renderGate({ onConfirmed, onCancel })

    findButtonByText(container, '취소').dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onEnterLobby).not.toHaveBeenCalled()
    expect(recordConsent).not.toHaveBeenCalled()

    cleanup()
  })

  it('cancelling via the close button or scrim also skips consent', () => {
    const onCancel = vi.fn()
    const { container, cleanup } = renderGate({ onCancel })

    findButtonByText(container, '×').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('exposes dialog semantics for accessibility', () => {
    const { container, cleanup } = renderGate()
    const dialog = container.querySelector('[role="dialog"]')

    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('consent-gate-heading')
    expect(container.querySelector('#consent-gate-heading')).not.toBeNull()

    cleanup()
  })
})

function renderGate({ onConfirmed = vi.fn(), onCancel = vi.fn() } = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <ConsentGate user={{ uid: 'consent-user' }} onConfirmed={onConfirmed} onCancel={onCancel} />,
    )
  })

  return {
    container,
    cleanup: () => {
      act(() => { root.unmount() })
      container.remove()
    },
  }
}

function findButtonByText(container, text) {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent.includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  return button
}

function checkItem(container, itemId) {
  setChecked(container.querySelector(`#consent-item-${itemId}`), true)
}

function checkAllItems(container) {
  for (const item of CONSENT_ITEMS) {
    checkItem(container, item.id)
  }
}

function setChecked(input, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set
    setter.call(input, value)
    input.dispatchEvent(new Event('click', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
