// @vitest-environment jsdom
import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InspectionModeScreen from './InspectionModeScreen.jsx'

describe('InspectionModeScreen', () => {
  let container
  let root

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-08T10:00:00'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('shows the maintenance message, end time, and a live remaining countdown', () => {
    act(() => {
      root.render(<InspectionModeScreen state={{
        message: '데이터베이스 점검 중입니다.',
        endsAt: Date.parse('2026-08-08T10:01:00'),
      }} />)
    })

    expect(container.textContent).toContain('서비스 점검 중')
    expect(container.textContent).toContain('데이터베이스 점검 중입니다.')
    expect(container.querySelector('[data-testid="inspection-remaining-time"]')?.textContent).toContain('1분')

    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector('[data-testid="inspection-remaining-time"]')?.textContent).toContain('59초')
  })
})
