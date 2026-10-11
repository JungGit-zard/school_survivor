// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ZombieBoard from './ZombieBoard.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const boardApi = vi.hoisted(() => ({
  postsUnsubscribe: vi.fn(),
  commentsUnsubscribe: vi.fn(),
  subscribeBoardPosts: vi.fn(),
  subscribeBoardComments: vi.fn(),
  createBoardPost: vi.fn(),
  createBoardComment: vi.fn(),
  deleteBoardPost: vi.fn(),
  deleteBoardComment: vi.fn(),
}))

const authState = vi.hoisted(() => ({ user: null, signingIn: false, error: null, signInWithGoogle: vi.fn() }))

vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: (selector) => selector(authState),
}))
vi.mock('../lib/projectAdmin.js', () => ({
  isProjectMaster: (user) => user?.email === 'admin@example.com',
}))

function renderBoard(props = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onClose = vi.fn()
  let currentProps = { open: props.open ?? true, copy: props.copy }
  const render = () => root.render(<ZombieBoard open={currentProps.open} onClose={onClose} copy={currentProps.copy} api={boardApi} />)
  act(render)
  return {
    container,
    onClose,
    rerender: (nextProps = {}) => act(() => { currentProps = { ...currentProps, ...nextProps }; render() }),
    unmount: () => act(() => { root.unmount(); container.remove() }),
  }
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

function changeField(field, value) {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes(text))
}

function openWriteMode(view) {
  act(() => buttonByText(view.container, '글쓰기').click())
}

beforeEach(() => {
  boardApi.postsUnsubscribe.mockReset()
  boardApi.commentsUnsubscribe.mockReset()
  boardApi.subscribeBoardPosts.mockReset()
  boardApi.subscribeBoardComments.mockReset()
  boardApi.createBoardPost.mockReset()
  boardApi.createBoardComment.mockReset()
  boardApi.deleteBoardPost.mockReset()
  boardApi.deleteBoardComment.mockReset()
  authState.user = null
  authState.signingIn = false
  authState.error = null
  authState.signInWithGoogle = vi.fn()
  boardApi.subscribeBoardPosts.mockImplementation((onData) => {
    onData([])
    return boardApi.postsUnsubscribe
  })
  boardApi.subscribeBoardComments.mockImplementation((postId, onData) => {
    onData([])
    return boardApi.commentsUnsubscribe
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ZombieBoard', () => {
  it('shows admin Google login pending and error states without exposing raw auth errors', () => {
    authState.signingIn = true
    authState.error = 'raw firebase popup error'
    const view = renderBoard()
    const login = buttonByText(view.container, '관리자 로그인 중')
    expect(login).not.toBeUndefined()
    expect(login.disabled).toBe(true)
    expect(view.container.querySelector('[role="alert"]').textContent).toContain('관리자 로그인에 실패했습니다')
    expect(view.container.textContent).not.toContain('raw firebase popup error')
    view.unmount()
  })

  it('lets anonymous visitors create a post, prevents double submit while pending, and clears only after success', async () => {
    let resolveCreate
    boardApi.createBoardPost.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    const view = renderBoard()
    openWriteMode(view)

    act(() => changeField(view.container.querySelector('input[name="postTitle"]'), '첫 글'))
    act(() => changeField(view.container.querySelector('textarea[name="postBody"]'), '로그인 없이 씁니다'))
    const submit = view.container.querySelector('button[type="submit"]')
    act(() => submit.click())
    act(() => submit.click())

    expect(boardApi.createBoardPost).toHaveBeenCalledTimes(1)
    expect(boardApi.createBoardPost).toHaveBeenCalledWith({ title: '첫 글', body: '로그인 없이 씁니다', nickname: '' })
    expect(submit.disabled).toBe(true)
    expect(view.container.querySelector('input[name="postTitle"]').value).toBe('첫 글')

    await act(async () => { resolveCreate('post-1') })
    openWriteMode(view)
    expect(view.container.querySelector('input[name="postTitle"]').value).toBe('')
    expect(view.container.querySelector('textarea[name="postBody"]').value).toBe('')
    view.unmount()
  })

  it('does not let a stale post submit completion mutate a reopened board session', async () => {
    let resolveCreate
    boardApi.createBoardPost.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    const view = renderBoard()
    openWriteMode(view)
    act(() => changeField(view.container.querySelector('input[name="postTitle"]'), '레이스 글'))
    act(() => changeField(view.container.querySelector('textarea[name="postBody"]'), '닫았다가 다시 열어도 유지'))
    act(() => view.container.querySelector('button[type="submit"]').click())
    expect(view.container.querySelector('button[type="submit"]').disabled).toBe(true)

    act(() => view.container.querySelector('[aria-label="게시판 닫기"]').click())
    view.rerender({ open: false })
    view.rerender({ open: true })
    expect(view.container.querySelector('input[name="postTitle"]').value).toBe('레이스 글')
    expect(view.container.querySelector('button[type="submit"]').disabled).toBe(false)

    await act(async () => { resolveCreate('stale-post') })
    expect(view.container.querySelector('form[aria-label="글쓰기"]')).not.toBeNull()
    expect(view.container.querySelector('input[name="postTitle"]').value).toBe('레이스 글')
    view.unmount()
  })

  it('preserves anonymous post draft and exposes the backend error when create fails', async () => {
    boardApi.createBoardPost.mockRejectedValue(new Error('Firebase save failed'))
    const view = renderBoard()
    openWriteMode(view)
    const title = view.container.querySelector('input[name="postTitle"]')
    const body = view.container.querySelector('textarea[name="postBody"]')
    act(() => changeField(title, '오류 글'))
    act(() => changeField(body, '본문 유지'))
    await act(async () => view.container.querySelector('button[type="submit"]').click())
    await flush()
    expect(title.value).toBe('오류 글')
    expect(body.value).toBe('본문 유지')
    expect(view.container.textContent).toContain('Firebase save failed')
    view.unmount()
  })

  it('uses list, write, and detail modes so mobile opens a post detail immediately', () => {
    const longBody = '긴 본문 '.repeat(40).trim()
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([{ id: 'p1', title: '목록 제목', body: longBody, nickname: '', createdAt: 1 }])
      return boardApi.postsUnsubscribe
    })
    const view = renderBoard()
    expect(view.container.querySelector('form[aria-label="글쓰기"]')).toBeNull()
    expect(view.container.textContent).not.toContain(longBody)
    act(() => view.container.querySelector('button[data-post-id="p1"]').click())
    expect(view.container.querySelector('form[aria-label="댓글 쓰기"]')).not.toBeNull()
    expect(view.container.textContent).toContain(longBody)
    act(() => view.container.querySelector('.zombie-board__back').click())
    expect(view.container.querySelector('form[aria-label="댓글 쓰기"]')).toBeNull()
    openWriteMode(view)
    expect(view.container.querySelector('form[aria-label="글쓰기"]')).not.toBeNull()
    view.unmount()
  })

  it('does not silently truncate over-limit programmatic post values', async () => {
    const view = renderBoard()
    openWriteMode(view)
    act(() => changeField(view.container.querySelector('input[name="postTitle"]'), '가'.repeat(121)))
    act(() => changeField(view.container.querySelector('textarea[name="postBody"]'), '본문'))
    await act(async () => view.container.querySelector('button[type="submit"]').click())
    expect(boardApi.createBoardPost).not.toHaveBeenCalled()
    expect(view.container.textContent).toContain('제목은 120자 이하')
    view.unmount()
  })

  it('opens details, writes anonymous comments with pending/error states, and unsubscribes on close', async () => {
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([{ id: 'p1', title: '안녕', body: '게시글 본문', nickname: '', createdAt: 1 }])
      return boardApi.postsUnsubscribe
    })
    boardApi.createBoardComment.mockRejectedValue(new Error('comment blocked'))
    const view = renderBoard()
    act(() => view.container.querySelector('button[data-post-id="p1"]').click())
    expect(boardApi.subscribeBoardComments).toHaveBeenCalledWith('p1', expect.any(Function), expect.any(Function), undefined)
    const comment = view.container.querySelector('textarea[name="commentBody"]')
    act(() => changeField(comment, '댓글 내용'))
    await act(async () => view.container.querySelector('form[aria-label="댓글 쓰기"] button[type="submit"]').click())
    await flush()
    expect(boardApi.createBoardComment).toHaveBeenCalledWith('p1', { body: '댓글 내용', nickname: '' })
    expect(comment.value).toBe('댓글 내용')
    expect(view.container.textContent).toContain('comment blocked')
    act(() => view.container.querySelector('[aria-label="게시판 닫기"]').click())
    expect(boardApi.commentsUnsubscribe).toHaveBeenCalled()
    expect(boardApi.postsUnsubscribe).toHaveBeenCalled()
    expect(view.onClose).toHaveBeenCalled()
    view.unmount()
  })

  it('does not clear a different post comment draft when a stale submit resolves', async () => {
    let resolveComment
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([
        { id: 'p1', title: 'A', body: 'A body', nickname: '', createdAt: 1 },
        { id: 'p2', title: 'B', body: 'B body', nickname: '', createdAt: 2 },
      ])
      return boardApi.postsUnsubscribe
    })
    boardApi.createBoardComment.mockImplementation(() => new Promise((resolve) => { resolveComment = resolve }))
    const view = renderBoard()
    act(() => view.container.querySelector('button[data-post-id="p1"]').click())
    act(() => changeField(view.container.querySelector('textarea[name="commentBody"]'), '같은 댓글'))
    act(() => view.container.querySelector('form[aria-label="댓글 쓰기"] button[type="submit"]').click())
    act(() => view.container.querySelector('.zombie-board__back').click())
    act(() => view.container.querySelector('button[data-post-id="p2"]').click())
    act(() => changeField(view.container.querySelector('textarea[name="commentBody"]'), '같은 댓글'))
    await act(async () => { resolveComment('c1') })
    expect(view.container.querySelector('textarea[name="commentBody"]').value).toBe('같은 댓글')
    view.unmount()
  })

  it('keeps stale comment subscription callbacks from replacing the current post comments', () => {
    const callbacks = {}
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([
        { id: 'p1', title: 'A', body: 'A body', nickname: '', createdAt: 1 },
        { id: 'p2', title: 'B', body: 'B body', nickname: '', createdAt: 2 },
      ])
      return boardApi.postsUnsubscribe
    })
    boardApi.subscribeBoardComments.mockImplementation((postId, onData) => {
      callbacks[postId] = onData
      onData([])
      return boardApi.commentsUnsubscribe
    })
    const view = renderBoard()
    act(() => view.container.querySelector('button[data-post-id="p1"]').click())
    act(() => view.container.querySelector('.zombie-board__back').click())
    act(() => view.container.querySelector('button[data-post-id="p2"]').click())
    act(() => callbacks.p1([{ id: 'c-old', body: 'A stale comment', nickname: '', createdAt: 1 }]))
    expect(view.container.textContent).not.toContain('A stale comment')
    act(() => callbacks.p2([{ id: 'c-new', body: 'B current comment', nickname: '', createdAt: 2 }]))
    expect(view.container.textContent).toContain('B current comment')
    view.unmount()
  })

  it('shows friendly load errors without the empty message when subscription fails', () => {
    boardApi.subscribeBoardPosts.mockImplementation((onData, onError) => {
      onError(new Error('permission_denied'))
      return boardApi.postsUnsubscribe
    })
    const view = renderBoard()
    expect(view.container.textContent).toContain('게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    expect(view.container.textContent).not.toContain('아직 게시글이 없습니다')
    expect(view.container.textContent).not.toContain('permission_denied')
    view.unmount()
  })

  it('shows older and newer page controls for full post and comment pages with cursor options', () => {
    const postPage1 = Array.from({ length: 50 }, (_, index) => ({
      id: `p${50 - index}`,
      title: `게시글 ${50 - index}`,
      body: `본문 ${50 - index}`,
      nickname: '',
      createdAt: 5000 - index,
    }))
    const postPage2 = Array.from({ length: 3 }, (_, index) => ({
      id: `old${3 - index}`,
      title: `이전 글 ${3 - index}`,
      body: `이전 본문 ${3 - index}`,
      nickname: '',
      createdAt: 3000 - index,
    }))
    const commentPage1 = Array.from({ length: 100 }, (_, index) => ({
      id: `c${100 - index}`,
      body: `댓글 ${100 - index}`,
      nickname: '',
      createdAt: 10000 - index,
    }))
    const commentPage2 = [{ id: 'old-comment', body: '오래된 댓글', nickname: '', createdAt: 7000 }]
    let latestPostData
    let latestCommentData
    boardApi.subscribeBoardPosts.mockImplementation((onData, onError, options) => {
      latestPostData = onData
      onData(options?.before ? postPage2 : postPage1)
      return boardApi.postsUnsubscribe
    })
    boardApi.subscribeBoardComments.mockImplementation((postId, onData, onError, options) => {
      latestCommentData = onData
      onData(options?.before ? commentPage2 : commentPage1)
      return boardApi.commentsUnsubscribe
    })

    const view = renderBoard()
    expect(boardApi.subscribeBoardPosts).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), undefined)
    act(() => buttonByText(view.container, '이전 글').click())
    expect(boardApi.subscribeBoardPosts).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), { before: { createdAt: 4951, id: 'p1' } })
    expect(view.container.textContent).toContain('이전 글 3')
    act(() => buttonByText(view.container, '최신 글').click())
    expect(boardApi.subscribeBoardPosts).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), undefined)
    expect(view.container.textContent).toContain('게시글 50')
    const stalePostData = latestPostData

    act(() => view.container.querySelector('button[data-post-id="p50"]').click())
    expect(boardApi.subscribeBoardComments).toHaveBeenLastCalledWith('p50', expect.any(Function), expect.any(Function), undefined)
    act(() => buttonByText(view.container, '이전 댓글').click())
    expect(boardApi.subscribeBoardComments).toHaveBeenLastCalledWith('p50', expect.any(Function), expect.any(Function), { before: { createdAt: 9901, id: 'c1' } })
    expect(view.container.textContent).toContain('오래된 댓글')
    act(() => buttonByText(view.container, '최신 댓글').click())
    expect(boardApi.subscribeBoardComments).toHaveBeenLastCalledWith('p50', expect.any(Function), expect.any(Function), undefined)
    act(() => view.container.querySelector('.zombie-board__back').click())
    act(() => view.container.querySelector('button[data-post-id="p49"]').click())
    expect(boardApi.subscribeBoardComments).toHaveBeenLastCalledWith('p49', expect.any(Function), expect.any(Function), undefined)
    act(() => latestCommentData(commentPage2))
    act(() => view.container.querySelector('.zombie-board__back').click())
    act(() => buttonByText(view.container, '이전 글').click())
    act(() => stalePostData(postPage1))
    expect(view.container.textContent).not.toContain('게시글 50')
    view.unmount()
  })

  it('shows delete controls only for an administrator and requires explicit confirmation', async () => {
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([{ id: 'p1', title: '공지', body: '관리자 글', nickname: '관리자', createdAt: 1 }])
      return boardApi.postsUnsubscribe
    })
    const nonAdmin = renderBoard()
    act(() => nonAdmin.container.querySelector('button[data-post-id="p1"]').click())
    expect(nonAdmin.container.querySelector('[data-testid="delete-post-p1"]')).toBeNull()
    nonAdmin.unmount()

    authState.user = { email: 'admin@example.com' }
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const admin = renderBoard()
    act(() => admin.container.querySelector('button[data-post-id="p1"]').click())
    await act(async () => admin.container.querySelector('[data-testid="delete-post-p1"]').click())
    expect(boardApi.deleteBoardPost).not.toHaveBeenCalled()
    window.confirm.mockReturnValue(true)
    await act(async () => admin.container.querySelector('[data-testid="delete-post-p1"]').click())
    expect(boardApi.deleteBoardPost).toHaveBeenCalledWith('p1')
    admin.unmount()
  })

  it('closes with Escape, restores opener focus, and does not render submitted text as HTML', () => {
    boardApi.subscribeBoardPosts.mockImplementation((onData) => {
      onData([{ id: 'p1', title: '<img src=x onerror=alert(1)>', body: '<b>본문</b>', nickname: '', createdAt: 1 }])
      return boardApi.postsUnsubscribe
    })
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const view = renderBoard()
    act(() => view.container.querySelector('button[data-post-id="p1"]').click())
    expect(view.container.innerHTML).not.toContain('<img src=x onerror=alert(1)>')
    expect(view.container.textContent).toContain('<img src=x onerror=alert(1)>')
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(view.onClose).toHaveBeenCalled()
    expect(document.activeElement).toBe(opener)
    view.unmount()
  })
})
