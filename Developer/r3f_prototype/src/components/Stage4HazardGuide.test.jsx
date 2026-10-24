// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stage4HazardGuide from './Stage4HazardGuide.jsx'
import { resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { setLocale } from '../lib/i18n.js'

let root, container
let props
const render = (next = {}) => {
  props = { ...props, ...next }
  act(() => root.render(<Stage4HazardGuide {...props} />))
}
const at = (ms) => act(() => { setRuntimeElapsedMs(ms); vi.advanceTimersByTime(50) })
const guide = () => container.querySelector('[data-testid="stage4-hazard-guide"]')

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  resetRuntimeTime()
  setLocale('ko')
  props = { stageId: 'stage4', phase: 'playing', gameKey: 1, hidden: false }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  resetRuntimeTime()
  vi.useRealTimers()
})

describe('Stage4 nonmodal contextual guide', () => {
  it('orients to existing north/central/south landmarks then explains continuous vs segmented markers', () => {
    render()
    expect(guide().textContent).toMatch(/북.*조리.*싱크/)
    expect(guide().textContent).not.toMatch(/안전|포탈|포털/)
    at(3000)
    expect(guide().textContent).toMatch(/중앙.*솥.*남.*배식.*학생/)
    at(6000)
    expect(guide().textContent).toMatch(/고정.*연속.*솥/)
    at(9000)
    expect(guide().textContent).toMatch(/주방장.*국물.*분절/)
    at(16000)
    expect(guide()).toBe(null)
  })
  it('uses actual runtime clock for all 3s warning and only the current 250ms explosion', () => {
    setRuntimeElapsedMs(11999); render(); expect(guide().dataset.kind).not.toBe('warning')
    at(12000); expect(guide().dataset.kind).toBe('warning')
    at(13500); expect(guide().dataset.kind).toBe('warning')
    at(14999); expect(guide().dataset.kind).toBe('warning')
    at(15000); expect(guide().dataset.kind).toBe('burst')
    at(15249); expect(guide().dataset.kind).toBe('burst')
    at(15250); expect(guide()).toBe(null)
  })
  it('does not consume orientation or warning while paused and resets on restart', () => {
    render(); at(4000)
    render({ phase: 'paused' })
    act(() => vi.advanceTimersByTime(90000))
    expect(guide()).toBe(null)
    render({ phase: 'playing' })
    expect(guide().dataset.kind).toBe('orientationSouth')
    at(14000); render({ phase: 'paused' })
    act(() => vi.advanceTimersByTime(90000))
    render({ phase: 'playing' }); expect(guide().dataset.kind).toBe('warning')
    setRuntimeElapsedMs(0); render({ gameKey: 2 })
    expect(guide().dataset.kind).toBe('orientation')
  })
  it('yields to higher HUD priority, nonplaying phases and other stages without hiding world graphics', () => {
    render({ hidden: true }); expect(guide()).toBe(null)
    render({ hidden: false }); expect(guide()).not.toBe(null)
    for (const phase of ['paused', 'levelup', 'gameover', 'cleared']) {
      render({ phase }); expect(guide()).toBe(null)
    }
    render({ phase: 'playing', stageId: 'stage1' }); expect(guide()).toBe(null)
  })
  it('is pointer transparent, nonmodal, nonfocusable and stays in the dedicated upper HUD gap', () => {
    render()
    const el = guide()
    expect(el.style.pointerEvents).toBe('none')
    expect(el.style.top).toContain('safe-area-inset-top')
    expect(el.style.top).toContain('52px')
    expect(el.style.maxHeight).toBe('44px')
    expect(el.style.left).toContain('34vw') // reserve the existing live-score column
    expect(el.style.right).toBe('var(--stage4-guide-right)')
    expect(el.style.getPropertyValue('--stage4-guide-right')).toContain('safe-area-inset-right')
    expect(el.querySelector('button, input, [tabindex], [role="dialog"]')).toBe(null)
    expect(el.getAttribute('aria-live')).toBe('polite')
  })
  it.each(['ko', 'en', 'ja'])('localizes orientation and hazard meaning in %s without exposing keys', (locale) => {
    setLocale(locale); render()
    expect(guide().textContent).not.toContain('stage4Guide.')
    if (locale === 'en') expect(guide().textContent).toContain('North')
    if (locale === 'ja') expect(guide().textContent).toContain('北')
    at(9000)
    if (locale === 'en') expect(guide().textContent).toMatch(/segmented/i)
    if (locale === 'ja') expect(guide().textContent).toContain('分割')
  })
  it('distinguishes actual boss defeat from escape without treating time or portal as a kill', () => {
    setRuntimeElapsedMs(160000); render({ bossDefeated: false, escapePortalActive: false })
    expect(guide()).toBe(null)
    render({ escapePortalActive: true }); expect(guide()).toBe(null)
    render({ bossDefeated: true, escapePortalActive: false })
    expect(guide().textContent).toMatch(/해금.*탈출구.*닫/)
    render({ escapePortalActive: true })
    expect(guide().textContent).toMatch(/해금.*탈출구/)
    at(162000); expect(guide().dataset.kind).toBe('warning')
  })
  it('does not leave polling timers after unmount', () => {
    render()
    expect(vi.getTimerCount()).toBe(1)
    act(() => root.render(null))
    expect(vi.getTimerCount()).toBe(0)
  })
})
