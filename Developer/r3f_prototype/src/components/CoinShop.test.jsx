// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CoinShop from './CoinShop.jsx'
import { resetAllLevels } from '../lib/passiveUpgrades.js'
import { resetWeaponPermanentUpgradeLevels } from '../lib/weaponPermanentUpgrades.js'
import { _resetForTests as resetWeaponUnlocks, setUnlocked } from '../lib/weaponUnlocks.js'
import { useGameStore } from '../store/useGameStore.js'

describe('CoinShop', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAllLevels()
    resetWeaponUnlocks()
    resetWeaponPermanentUpgradeLevels()
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

  it('renders the weapon permanent upgrade tab with locked and unlocked weapon states', () => {
    setUnlocked('guidedMissile')
    useGameStore.setState({ goldTotal: 300 })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<CoinShop onBack={() => {}} />)
    })
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '무기 강화')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('무기 기본능력 영구 강화')
    expect(container.textContent).toContain('연필')
    expect(container.textContent).toContain('보조배터리 미사일')
    expect(container.textContent).toContain('상어미사일')
    expect(container.textContent).toContain('무기 해금 후 강화 가능')

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === '강화')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useGameStore.getState().goldTotal).toBe(0)
    expect(container.textContent).toContain('Lv.1 / 10')

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
