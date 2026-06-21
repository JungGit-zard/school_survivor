// @vitest-environment jsdom
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import UserRanking from './UserRanking.jsx'
import { saveAdminConfig } from '../lib/adminConfig.js'

describe('UserRanking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders ranking rows from 1st through 100th place', () => {
    const html = renderToStaticMarkup(
      <UserRanking
        onBack={() => {}}
        entries={[{ displayName: '지안', survivalSeconds: 240, stageId: 'stage2', cleared: true }]}
      />,
    )

    expect(html).toContain('유저랭킹')
    expect(html).toContain('1위')
    expect(html).toContain('100위')
    expect(html).toContain('지안')
    expect(html).toContain('330점')
    expect(html).toContain('4:00')
    expect(html).toContain('기록 없음')
  })

  it('renders the configured ranking season and reward summary', () => {
    saveAdminConfig({
      rankingSeason: {
        seasonName: '방학 생존 시즌',
        rewardTiers: [
          { rankTo: 1, label: '1위', gold: 777, badge: '방학왕' },
        ],
      },
    })

    const html = renderToStaticMarkup(<UserRanking onBack={() => {}} entries={[]} />)

    expect(html).toContain('방학 생존 시즌')
    expect(html).toContain('1위 777G')
  })

  it('returns to the title screen from the back button', () => {
    const onBack = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(<UserRanking onBack={onBack} entries={[]} />)
    })
    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent.includes('타이틀로 돌아가기'))
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onBack).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    container.remove()
  })
})
