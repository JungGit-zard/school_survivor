// @vitest-environment jsdom
// 2026-10-26 Terry 라이브 리포트: 게임의 "문의하기"를 누르면 홈페이지에서 바로 문의 입력란에 포커스가 가야 한다.
// 게임 → /landing?lang=<locale>#inquiry → 게시판 글쓰기 모드가 열리고 제목 입력란이 포커스된다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WebLandingPage from './WebLandingPage.jsx'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const api = vi.hoisted(() => ({ subscribeBoardPosts: vi.fn(), subscribeBoardComments: vi.fn(), createBoardPost: vi.fn(), createBoardComment: vi.fn() }))
vi.mock('../lib/firebaseBoard.js', () => api)
vi.mock('./TitleSceneCanvas.jsx', () => ({ default: () => <div /> }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ user: null, signingIn: false }) }))
vi.mock('../lib/projectAdmin.js', () => ({ isProjectMaster: () => false }))

let root
let container
function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<WebLandingPage />))
  return container
}
async function settle() {
  await act(async () => {
    await vi.dynamicImportSettled()
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const dialog = () => container.querySelector('[role="dialog"]')
const titleInput = () => container.querySelector('input[name="postTitle"]')

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  api.subscribeBoardPosts.mockReset().mockImplementation(() => vi.fn())
  api.subscribeBoardComments.mockReset().mockImplementation((_id, data) => { data([]); return vi.fn() })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  window.history.replaceState(null, '', '/landing')
})

it('opens the board in write mode with the inquiry title field focused on #inquiry arrival', async () => {
  window.history.replaceState(null, '', '/landing#inquiry')
  render()
  await settle()
  expect(dialog()).not.toBeNull()
  expect(titleInput()).not.toBeNull()
  expect(document.activeElement).toBe(titleInput())
})

it('also honours ?focus=inquiry', async () => {
  window.history.replaceState(null, '', '/landing?focus=inquiry')
  render()
  await settle()
  expect(document.activeElement).toBe(titleInput())
})

it('opens and focuses the inquiry field on a later hash change', async () => {
  window.history.replaceState(null, '', '/landing')
  render()
  await settle()
  expect(dialog()).toBeNull()
  await act(async () => {
    window.history.replaceState(null, '', '/landing#inquiry')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  await settle()
  expect(document.activeElement).toBe(titleInput())
})

it('keeps the board closed for a plain landing visit and the old #zombie-board-preview anchor', async () => {
  window.history.replaceState(null, '', '/landing#zombie-board-preview')
  render()
  await settle()
  expect(dialog()).toBeNull()
})

it.each(['ko', 'en', 'ja'])('opens the inquiry form in the game language (%s) from ?lang=', async (language) => {
  window.history.replaceState(null, '', `/landing?lang=${language}#inquiry`)
  render()
  await settle()
  expect(container.querySelector('form.zombie-board__form h3').textContent).toBe(ZOMBIE_BOARD_COPY[language].writePost)
  expect(container.querySelector('#web-landing-language').value).toBe(language)
  expect(document.activeElement).toBe(titleInput())
})

it('ignores an unknown ?lang= value', async () => {
  window.history.replaceState(null, '', '/landing?lang=xx#inquiry')
  render()
  await settle()
  expect(container.querySelector('#web-landing-language').value).toBe('ko')
})
