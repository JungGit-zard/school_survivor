// @vitest-environment jsdom
// 치프(정예) 좀비 이름표 + 미니 HP바(간이판).
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChiefStatusBar, { CHIEF_STATUS_POLL_MS, chiefStatusView } from './ChiefStatusBar.jsx'
import { EnemyEntityPool } from '../lib/enemyEntityPool.js'
import { enemyPool } from '../lib/refs.js'
import { setLocale } from '../lib/i18n.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const scratch = () => ({ index: -1, typeCode: 0, hp: 0, maxHp: 0 })

describe('chiefStatusView', () => {
  it('살아 있는 치프만 집고, 일반 좀비는 무시한다', () => {
    const pool = new EnemyEntityPool()
    pool.spawn({ type: 'E01', x: 0, y: 0, z: 0, hp: 8, maxHp: 8, visualScale: 1 })
    expect(chiefStatusView(pool, scratch())).toBeNull()
    pool.spawn({ type: 'E89', x: 1, y: 0, z: 0, hp: 300, maxHp: 400, visualScale: 1 })
    expect(chiefStatusView(pool, scratch())).toEqual({ type: 'E89', ratio: 0.75 })
  })
})

describe('ChiefStatusBar', () => {
  let host
  let root
  beforeEach(() => {
    vi.useFakeTimers()
    setLocale('ko')
    for (let i = 0; i <= enemyPool.highestActive; i += 1) if (enemyPool.active[i]) enemyPool.despawnIndex(i, enemyPool.generation[i])
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    for (let i = 0; i <= enemyPool.highestActive; i += 1) if (enemyPool.active[i]) enemyPool.despawnIndex(i, enemyPool.generation[i])
    vi.useRealTimers()
  })

  it('치프가 있으면 이름(치프 배지 + 반장 좀비)과 HP 비율을 보이고, 죽으면 사라진다', () => {
    const handle = enemyPool.spawn({ type: 'E89', x: 0, y: 0, z: 0, hp: 200, maxHp: 400, visualScale: 1 })
    act(() => root.render(<ChiefStatusBar phase="playing" />))
    const bar = host.querySelector('[data-testid="chief-status-bar"]')
    expect(bar).not.toBeNull()
    expect(bar.textContent).toContain('치프')
    expect(bar.textContent).toContain('반장 좀비')
    expect(host.querySelector('[data-testid="chief-status-fill"]').style.width).toBe('50%')
    // 390px 폰: 폭이 화면을 넘지 않고 터치를 막지 않는다.
    expect(bar.style.width).toBe('240px')
    expect(bar.style.maxWidth).toBe('calc(100% - 32px)')
    expect(bar.style.pointerEvents).toBe('none')
    enemyPool.despawnIndex(handle.index, handle.generation)
    act(() => { vi.advanceTimersByTime(CHIEF_STATUS_POLL_MS + 1) })
    expect(host.querySelector('[data-testid="chief-status-bar"]')).toBeNull()
  })

  it('플레이 중이 아니거나 숨김이면 그리지 않는다', () => {
    enemyPool.spawn({ type: 'E89', x: 0, y: 0, z: 0, hp: 400, maxHp: 400, visualScale: 1 })
    act(() => root.render(<ChiefStatusBar phase="paused" />))
    expect(host.querySelector('[data-testid="chief-status-bar"]')).toBeNull()
    act(() => root.render(<ChiefStatusBar phase="playing" hidden />))
    expect(host.querySelector('[data-testid="chief-status-bar"]')).toBeNull()
  })
})
