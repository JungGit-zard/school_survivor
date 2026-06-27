// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoinShop from './CoinShop.jsx'
import { resetAllLevels } from '../lib/passiveUpgrades.js'
import { useGameStore } from '../store/useGameStore.js'

describe('CoinShop', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllLevels()
    useGameStore.setState({ goldTotal: 199, passiveVersion: 0 })
  })

  it('renders the redesigned school upgrade shop surface', () => {
    const html = renderToStaticMarkup(
      <CoinShop onBack={() => {}} backLabel="타이틀로 돌아가기" />,
    )

    expect(html).toContain('코인상점')
    expect(html).toContain('생존 강화 신청서')
    expect(html).toContain('보유 코인')
    expect(html).toContain('진행도')
    expect(html).toContain('회수 반경 아이콘')
    expect(html).toContain('이동속도 아이콘')
    expect(html).toContain('체력 아이콘')
    expect(html).toContain('공격력 아이콘')
    expect(html).toContain('학습력 아이콘')
    expect(html).toContain('타이틀로 돌아가기')
  })

  it('keeps the passive purchase flow working from the redesigned button', () => {
    const onBack = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<CoinShop onBack={onBack} backLabel="타이틀로 돌아가기" />)
    })

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '구매')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useGameStore.getState().goldTotal).toBe(179)
    expect(useGameStore.getState().passiveVersion).toBe(1)

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '타이틀로 돌아가기')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onBack).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
