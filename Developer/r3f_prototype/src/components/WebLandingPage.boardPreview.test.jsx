// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebLandingPage from './WebLandingPage.jsx'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const api = vi.hoisted(() => ({ subscribeBoardPosts: vi.fn(), subscribeBoardComments: vi.fn(), createBoardPost: vi.fn(), createBoardComment: vi.fn() }))
vi.mock('../lib/firebaseBoard.js', () => api)
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => <div /> }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ user: null, signingIn: false }) }))
vi.mock('../lib/projectAdmin.js', () => ({ isProjectMaster: () => false }))

const posts = Array.from({ length: 7 }, (_, i) => ({ id: `p${7 - i}`, title: `Title ${7 - i}`, body: `Body ${7 - i}`, createdAt: 7 - i }))
let subscriptions
let root
let container
function render(strict = false) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(strict ? <React.StrictMode><WebLandingPage /></React.StrictMode> : <WebLandingPage />))
  return container
}
const preview = () => container.querySelector('#zombie-board-preview')
async function flush() { await act(async () => { await Promise.resolve() }) }
beforeEach(() => {
  subscriptions = []
  api.subscribeBoardPosts.mockReset().mockImplementation((data, error) => {
    const stop = vi.fn()
    subscriptions.push({ data, error, stop })
    return stop
  })
  api.subscribeBoardComments.mockReset().mockImplementation((_id, data) => { data([]); return vi.fn() })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('homepage inline post titles', () => {
  it('shows the exact inquiry heading above rows and scrolls SPA hash arrivals without opening a modal', () => {
    const scroll = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll })
    window.history.replaceState(null, '', '/landing#zombie-board-preview')
    render()
    expect(preview().querySelector('h2').textContent).toBe('자유게시판: 문의도 이곳에 해주세요!')
    expect(scroll).toHaveBeenCalled()
    expect(scroll.mock.instances[0]).toBe(preview())
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    act(() => subscriptions[0].data(posts))
    const select = container.querySelector('#web-landing-language')
    for (const language of Object.keys(ZOMBIE_BOARD_COPY)) {
      act(() => { select.value = language; select.dispatchEvent(new Event('change', { bubbles: true })) })
      expect(preview().querySelector('h2').textContent).toBe(ZOMBIE_BOARD_COPY[language].previewHeading)
      expect(preview().querySelectorAll('button')).toHaveLength(5)
    }
    scroll.mockClear()
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')))
    expect(scroll).toHaveBeenCalled()
    window.history.replaceState(null, '', '/')
    delete HTMLElement.prototype.scrollIntoView
  })
  it('subscribes on entry without a click, shows only five titles in API order directly below actions, and never locks scroll', () => {
    render()
    expect(api.subscribeBoardPosts).toHaveBeenCalledTimes(1)
    expect(preview()).not.toBeNull()
    expect(container.querySelector('.web-landing__hero-actions').nextElementSibling).toBe(preview())
    expect(preview().textContent).toContain(ZOMBIE_BOARD_COPY.ko.loading)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
    act(() => subscriptions[0].data(posts))
    expect(Array.from(preview().querySelectorAll('button'), (b) => b.textContent)).toEqual(posts.slice(0, 5).map((p) => p.title))
    expect(preview().textContent).not.toContain('Body')
    act(() => root.unmount())
    root = null
    expect(subscriptions[0].stop).toHaveBeenCalledOnce()
    act(() => { subscriptions[0].data(posts); subscriptions[0].error(new Error('stale')) })
    expect(container.textContent).toBe('')
  })

  it('opens the exact clicked post after delayed modal load, returns to list without reselecting on live ticks, and keeps full-board entry', async () => {
    render()
    act(() => subscriptions[0].data(posts))
    const opener = preview().querySelector('[data-post-id="p5"]')
    opener.focus()
    act(() => opener.click())
    await flush()
    const dialog = () => container.querySelector('[role="dialog"]')
    expect(dialog()).not.toBeNull()
    expect(dialog().textContent).toContain(ZOMBIE_BOARD_COPY.ko.loading)
    expect(dialog().textContent).not.toContain(ZOMBIE_BOARD_COPY.ko.missingPost)
    expect(document.body.style.overflow).toBe('hidden')
    act(() => subscriptions[1].data(posts))
    expect(dialog().querySelector('.zombie-board__detail-card h3').textContent).toBe('Title 5')
    expect(dialog().querySelector('.zombie-board__detail-body').textContent).toBe('Body 5')
    expect(api.subscribeBoardComments).toHaveBeenCalledWith('p5', expect.any(Function), expect.any(Function), undefined)
    act(() => dialog().querySelector('.zombie-board__back').click())
    act(() => subscriptions[1].data([...posts]))
    expect(dialog().querySelector('.zombie-board__detail-card')).toBeNull()
    expect(dialog().querySelectorAll('[data-post-id]')).toHaveLength(7)
    act(() => dialog().querySelector('.zombie-board__close').click())
    expect(dialog()).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(opener)
    act(() => container.querySelector('.web-landing__hero-actions a[href="#zombie-board"]').click())
    await flush()
    act(() => subscriptions[2].data(posts))
    expect(dialog().querySelector('.zombie-board__detail-card')).toBeNull()
    expect(dialog().querySelectorAll('[data-post-id]')).toHaveLength(7)
  })

  it('shows missing only after the selected post is absent from a loaded modal snapshot, and does not auto-reselect later', async () => {
    render()
    act(() => subscriptions[0].data(posts))
    act(() => preview().querySelector('[data-post-id="p7"]').click())
    await flush()
    act(() => subscriptions[1].data([]))
    expect(container.querySelector('[role="dialog"]').textContent).toContain(ZOMBIE_BOARD_COPY.ko.missingPost)
    act(() => container.querySelector('.zombie-board__back').click())
    act(() => subscriptions[1].data(posts))
    expect(container.querySelector('.zombie-board__detail-card')).toBeNull()
  })

  it('uses existing localized loading, empty and safe error copy in all six languages, and recovers on data', () => {
    render()
    const select = container.querySelector('#web-landing-language')
    for (const language of Object.keys(ZOMBIE_BOARD_COPY)) {
      act(() => { select.value = language; select.dispatchEvent(new Event('change', { bubbles: true })) })
      const copy = ZOMBIE_BOARD_COPY[language]
      // Language changes must not create an additional data subscription.
      expect(api.subscribeBoardPosts).toHaveBeenCalledTimes(1)
      act(() => subscriptions[0].data([]))
      expect(preview().textContent).toContain(copy.empty)
      act(() => subscriptions[0].error(new Error('permission_denied secret')))
      expect(preview().textContent).toContain(copy.loadError)
      expect(preview().textContent).not.toContain(copy.empty)
      expect(preview().textContent).not.toContain('permission_denied')
      act(() => subscriptions[0].data(posts))
      expect(preview().querySelectorAll('button')).toHaveLength(5)
    }
  })

  it('ignores stale data and errors from the canceled StrictMode subscription while a new subscription is active', () => {
    render(true)
    expect(subscriptions).toHaveLength(2)
    expect(subscriptions[0].stop).toHaveBeenCalledOnce()
    act(() => subscriptions[1].data(posts))
    act(() => { subscriptions[0].data([]); subscriptions[0].error(new Error('stale')) })
    expect(preview().querySelectorAll('button')).toHaveLength(5)
    expect(preview().querySelector('[role="alert"]')).toBeNull()
  })

  it('localizes loading before data arrives and keeps compact full-width rows without list scrolling', () => {
    render()
    const select = container.querySelector('#web-landing-language')
    for (const language of Object.keys(ZOMBIE_BOARD_COPY)) {
      act(() => { select.value = language; select.dispatchEvent(new Event('change', { bubbles: true })) })
      expect(preview().textContent).toContain(ZOMBIE_BOARD_COPY[language].loading)
    }
    act(() => subscriptions[0].data(posts))
    const css = preview().querySelector('style').textContent
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('text-overflow: ellipsis')
    expect(css).toContain('white-space: nowrap')
    expect(css).not.toMatch(/max-height|overflow-y|overflow:\s*(auto|scroll)/)
    expect(css).toContain('focus-visible')
    // Preserve the five 44px rows when the new heading wraps on 320px screens.
    expect(css).toMatch(/@media \(max-width: 360px\)[\s\S]*padding: 4px 8px/)
    expect(css).toMatch(/@media \(max-width: 360px\)[\s\S]*font-size: 14px; line-height: 18px/)
    expect(css).toContain('margin: 0; font-size: 14px; line-height: 18px')

    // CSS contracts only: browser ancestor-clipping / row hit testing belongs to independent QA.
    const landingCss = container.querySelector('main > style').textContent
    const shell = landingCss.match(/\.web-landing__hero-shell\s*\{([^}]+)\}/)[1]
    expect(shell).toContain('height: max-content;')
    expect(shell).toContain('overflow: hidden;')
    expect(shell).toContain('border-radius: 28px;')
    const narrow = landingCss.slice(landingCss.indexOf('@media (max-width: 360px)'), landingCss.indexOf('@media (max-width: 600px)'))
    expect(landingCss).toContain('@media (max-width: 360px)')
    expect(narrow).toMatch(/\.web-landing__hero\s*\{[^}]*padding: 12px;/)
    expect(narrow).toMatch(/\.web-landing__hero-copy\s*\{[^}]*gap: 6px;/)
    expect(narrow).toMatch(/\.web-landing__title\s*\{[^}]*font-size: 32px;/)
    expect(narrow).toMatch(/\.web-landing__headline\s*\{[^}]*font-size: 20px;/)
    expect(narrow).toMatch(/\.web-landing__hero-actions\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[^}]*gap: 6px;/)
    expect(narrow).toMatch(/\.web-landing__hero-actions \.web-landing__cta\s*\{[^}]*min-height: 44px;[^}]*padding: 6px 4px;/)
    expect(narrow).not.toMatch(/display:\s*none|overflow|scroll|\.web-landing__nav/)
    expect(container.querySelector('.web-landing__hero-actions').children).toHaveLength(5)
    expect(preview().querySelectorAll('button')).toHaveLength(5)
  })

  it('shows a localized modal load error rather than falsely reporting the selected post missing', async () => {
    render()
    act(() => subscriptions[0].data(posts))
    act(() => preview().querySelector('button').click())
    await flush()
    act(() => subscriptions[1].error(new Error('permission_denied')))
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog.querySelector('[role="alert"]').textContent).toBe(ZOMBIE_BOARD_COPY.ko.loadError)
    expect(dialog.textContent).not.toContain(ZOMBIE_BOARD_COPY.ko.missingPost)
    expect(dialog.textContent).not.toContain('permission_denied')
  })

  it('renders long or HTML-like titles as text with the full accessible name', () => {
    render()
    const title = '<img src=x onerror=alert(1)> ' + '긴 제목'.repeat(30)
    act(() => subscriptions[0].data([{ ...posts[0], title }]))
    const row = preview().querySelector('button')
    expect(row.textContent).toBe(title)
    expect(row.title).toBe(title)
    expect(row.querySelector('img')).toBeNull()
  })
})
