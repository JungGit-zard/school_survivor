// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ZombieBoard from './ZombieBoard.jsx'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const auth = vi.hoisted(() => ({ user: null }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector(auth) }))
vi.mock('../lib/projectAdmin.js', () => ({ isProjectMaster: (user) => Boolean(user?.master) }))
let root, container, api, feeds, commentFeeds
const copy = ZOMBIE_BOARD_COPY.ko
const secret = { id: 's1', title: 'SECRET TITLE', body: 'SECRET BODY', createdAt: 2, isPrivate: true }
const publicPost = { id: 'p1', title: 'Public', body: 'Public body', createdAt: 1 }
function render(open = true) {
  if (!root) { container = document.createElement('div'); document.body.append(container); root = createRoot(container) }
  act(() => root.render(<ZombieBoard open={open} api={api} />))
}
function click(text) {
  const button = [...container.querySelectorAll('button')].find((node) => node.textContent === text)
  expect(button, `button: ${text}`).toBeTruthy()
  act(() => button.click())
}
function input(name, value) {
  const node = container.querySelector(`[name="${name}"]`)
  const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })) })
}
function writeSecret() {
  click(copy.writePost)
  input('postTitle', 'Private question'); input('postBody', 'Private content')
  const checkbox = container.querySelector('input[type="checkbox"]')
  expect(checkbox).not.toBeNull()
  expect(checkbox.closest('label').textContent).toContain(copy.privatePost)
  act(() => checkbox.click())
}
beforeEach(() => {
  auth.user = null; feeds = []; commentFeeds = []
  const subscribe = (privateFeed) => vi.fn((data, error, options) => {
    const stop = vi.fn(); feeds.push({ privateFeed, data, error, stop, options })
    data(privateFeed ? [secret] : [publicPost]); return stop
  })
  api = {
    subscribeBoardPosts: subscribe(false), subscribePrivateBoardPosts: subscribe(true),
    subscribeBoardComments: vi.fn((id, data, error, options) => {
      const stop = vi.fn(); commentFeeds.push({ data, error, stop, options }); data([]); return stop
    }),
    createBoardPost: vi.fn().mockResolvedValue('s2'), createBoardComment: vi.fn().mockResolvedValue('c1'),
    deleteBoardPost: vi.fn().mockResolvedValue(), deleteBoardComment: vi.fn().mockResolvedValue(),
  }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { if (root) act(() => root.unmount()); root = null; container?.remove(); vi.restoreAllMocks() })

it('submits a labeled native private checkbox to the API and returns to public list with safe success and reset', async () => {
  render(); writeSecret()
  expect(container.textContent).toContain(copy.privateExplanation)
  await act(async () => container.querySelector('button[type="submit"]').click())
  expect(api.createBoardPost).toHaveBeenCalledExactlyOnceWith({ title: 'Private question', body: 'Private content', nickname: '', isPrivate: true })
  expect(container.querySelector('[role="status"]').textContent).toBe(copy.privateSuccess)
  expect(container.textContent).toContain('Public')
  expect(container.textContent).not.toContain('Private question')
  expect(api.subscribePrivateBoardPosts).not.toHaveBeenCalled()
  click(copy.writePost)
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(false)
  expect(container.querySelector('[name="postTitle"]').value).toBe('')
})

it('never subscribes private feed or exposes admin toggle to anonymous and normal signed-in users', () => {
  render()
  expect(container.querySelector('[data-board-feed="private"]')).toBeNull()
  auth.user = { uid: 'normal' }; render()
  expect(container.querySelector('[data-board-feed="private"]')).toBeNull()
  expect(api.subscribePrivateBoardPosts).not.toHaveBeenCalled()
  expect(container.textContent).not.toContain(secret.title)
})

it.each(['logout', 'revocation'])('purges private detail, comments, cursors and invalidates callbacks after %s', async (transition) => {
  auth.user = { uid: 'admin', master: true }; render()
  act(() => container.querySelector('[data-board-feed="private"]').click())
  const privateFeed = feeds.at(-1)
  const page = Array.from({ length: 50 }, (_, i) => ({ ...secret, id: `s${i}`, createdAt: 100 - i }))
  act(() => privateFeed.data(page))
  click(copy.olderPosts)
  expect(feeds.at(-1).options.before).toEqual({ createdAt: 51, id: 's49' })
  const lastPrivateFeed = feeds.at(-1)
  act(() => container.querySelector('[data-post-id="s1"]').click())
  const privateComments = commentFeeds.at(-1)
  act(() => privateComments.data([{ id: 'c1', body: 'SECRET COMMENT' }]))
  input('commentBody', 'draft')
  let rejectComment
  api.createBoardComment.mockImplementation(() => new Promise((_r, reject) => { rejectComment = reject }))
  act(() => container.querySelector('button[type="submit"]').click())
  auth.user = transition === 'logout' ? null : { uid: 'admin', master: false }; render()
  expect(lastPrivateFeed.stop).toHaveBeenCalled()
  expect(privateComments.stop).toHaveBeenCalled()
  act(() => { lastPrivateFeed.data([secret]); lastPrivateFeed.error(new Error('SECRET ERROR')); privateComments.data([{ body: 'SECRET COMMENT' }]); privateComments.error(new Error('SECRET ERROR')) })
  await act(async () => rejectComment(new Error('SECRET ASYNC ERROR')))
  expect(container.textContent).not.toContain('SECRET')
  expect(container.querySelector('.zombie-board__detail-card')).toBeNull()
  expect(feeds.at(-1).privateFeed).toBe(false)
  expect(feeds.at(-1).options).toBeUndefined()
  expect(container.querySelector('[name="commentBody"]')).toBeNull()
})

it('routes private comments and deletes to the private root only; switches feeds without stale data', async () => {
  auth.user = { uid: 'admin', master: true }; render()
  act(() => container.querySelector('[data-board-feed="private"]').click())
  const privateFeed = feeds.at(-1)
  expect(feeds[0].stop).toHaveBeenCalled()
  act(() => container.querySelector('[data-post-id="s1"]').click())
  expect(api.subscribeBoardComments).toHaveBeenLastCalledWith('s1', expect.any(Function), expect.any(Function), { isPrivate: true })
  act(() => commentFeeds.at(-1).data([{ id: 'c1', body: 'Secret reply' }]))
  input('commentBody', 'Reply')
  await act(async () => container.querySelector('button[type="submit"]').click())
  expect(api.createBoardComment).toHaveBeenCalledWith('s1', { body: 'Reply', nickname: '', isPrivate: true })
  await act(async () => container.querySelector('[data-testid="delete-comment-c1"]').click())
  expect(api.deleteBoardComment).toHaveBeenCalledWith('s1', 'c1', { isPrivate: true })
  await act(async () => container.querySelector('[data-testid="delete-post-s1"]').click())
  expect(api.deleteBoardPost).toHaveBeenCalledWith('s1', { isPrivate: true })
  act(() => container.querySelector('[data-board-feed="public"]').click())
  act(() => privateFeed.data([secret]))
  expect(container.textContent).not.toContain('SECRET')
  expect(container.textContent).toContain('Public')
})

it('fails closed when the private API is missing and never falls back to a public write', async () => {
  auth.user = { uid: 'admin', master: true }; delete api.subscribePrivateBoardPosts; render()
  act(() => container.querySelector('[data-board-feed="private"]').click())
  expect(api.subscribeBoardPosts).toHaveBeenCalledTimes(1)
  expect(container.textContent).not.toContain('Public body')
  expect(container.textContent).toContain(copy.backendMissing)
  writeSecret(); api.createBoardPost.mockRejectedValue(new Error('SECRET ERROR'))
  await act(async () => container.querySelector('button[type="submit"]').click())
  expect(api.createBoardPost).toHaveBeenCalledTimes(1)
  expect(api.createBoardPost.mock.calls[0][0].isPrivate).toBe(true)
  expect(container.textContent).not.toContain('SECRET ERROR')
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(true)
})

it('preserves an edited private draft when an older save completes', async () => {
  let resolve
  api.createBoardPost.mockImplementation(() => new Promise((r) => { resolve = r }))
  render(); writeSecret()
  act(() => container.querySelector('button[type="submit"]').click())
  input('postTitle', 'New draft')
  await act(async () => resolve('s2'))
  click(copy.writePost)
  expect(container.querySelector('[name="postTitle"]').value).toBe('New draft')
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(true)
})

it('returns an admin private-feed save to the public feed, clearing detail and pagination', async () => {
  auth.user = { uid: 'admin', master: true }; render()
  act(() => container.querySelector('[data-board-feed="private"]').click())
  const privateFeed = feeds.at(-1)
  writeSecret()
  await act(async () => container.querySelector('button[type="submit"]').click())
  expect(privateFeed.stop).toHaveBeenCalled()
  expect(feeds.at(-1).privateFeed).toBe(false)
  expect(container.querySelector('[data-board-feed="public"]').getAttribute('aria-pressed')).toBe('true')
  expect(container.querySelector('[role="status"]').textContent).toBe(copy.privateSuccess)
  act(() => privateFeed.data([secret]))
  expect(container.textContent).not.toContain('SECRET')
  click(copy.writePost)
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false)
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(false)
})

it('ignores a private save completion after close/reopen and keeps the newer checkbox draft', async () => {
  let resolve
  api.createBoardPost.mockImplementation(() => new Promise((r) => { resolve = r }))
  render(); writeSecret()
  act(() => container.querySelector('button[type="submit"]').click())
  render(false); render(true)
  input('postTitle', 'Reopened draft')
  await act(async () => resolve('s2'))
  expect(container.querySelector('[name="postTitle"]').value).toBe('Reopened draft')
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(true)
  expect(container.querySelector('[role="status"]')).toBeNull()
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false)
})

it('has essential private/contact translations for each of six languages and excludes checkbox from blanket input CSS', () => {
  for (const translation of Object.values(ZOMBIE_BOARD_COPY)) {
    for (const key of ['previewHeading', 'contact', 'privatePost', 'privateExplanation', 'privateSuccess', 'publicFeed', 'privateFeed']) expect(translation[key]).toEqual(expect.any(String))
  }
  render()
  const css = container.querySelector('style').textContent
  expect(css).toContain('input:not([type="checkbox"])')
  expect(css).toMatch(/private-option[^}]*min-height: 44px/s)
})
