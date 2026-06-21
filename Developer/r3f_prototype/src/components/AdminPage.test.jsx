// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import AdminPage from './AdminPage.jsx'
import { loadAdminConfig } from '../lib/adminConfig.js'

describe('AdminPage', () => {
  let container
  let root

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the balance and ranking season tabs', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    expect(container.textContent).toContain('운영 콘솔')
    expect(container.textContent).toContain('게임 밸런스')
    expect(container.textContent).toContain('랭킹/시즌')
    expect(container.textContent).toContain('Stage 1 생존 시간')
  })

  it('saves balance changes to the admin config store', () => {
    act(() => {
      root.render(<AdminPage />)
    })

    const stage1Input = container.querySelector('input[name="stage1DurationSec"]')
    act(() => {
      stage1Input.value = '180'
      stage1Input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const saveButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent.includes('저장'))
    act(() => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(loadAdminConfig().balance.stageDurationSec.stage1).toBe(180)
  })
})
