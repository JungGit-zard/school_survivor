import { useEffect, useMemo, useRef, useState } from 'react'
import { isProjectMaster } from '../lib/projectAdmin.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

const LIMITS = { title: 120, body: 4000, comment: 1000, nickname: 24 }
const BOARD_MODES = { list: 'list', write: 'write', detail: 'detail' }
const POST_PAGE_SIZE = 50
const COMMENT_PAGE_SIZE = 100

// A privilege/identity change destroys the entire private session before the public
// session mounts: subscriptions, detail, cursors, drafts and pending callbacks.
export default function ZombieBoard(props) {
  const user = useAuthStore((state) => state.user)
  const sessionKey = isProjectMaster(user) ? `admin:${user?.uid || user?.email}` : 'public'
  return <BoardSession key={sessionKey} {...props} />
}

function BoardSession({ open, onClose, language = 'ko', copy, api = null, initialPostId = '', initialMode = '' }) {
  const boardCopy = copy || ZOMBIE_BOARD_COPY[language] || ZOMBIE_BOARD_COPY.ko
  const authUser = useAuthStore((state) => state.user)
  const authSigningIn = useAuthStore((state) => state.signingIn)
  const authError = useAuthStore((state) => state.error)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const admin = isProjectMaster(authUser)
  const dialogRef = useRef(null)
  const openerRef = useRef(null)
  const postsUnsubscribeRef = useRef(null)
  const commentsUnsubscribeRef = useRef(null)
  const mountedRef = useRef(false)
  const openRef = useRef(false)
  const boardSessionRef = useRef(0)
  const selectedPostIdRef = useRef('')
  const postsRequestRef = useRef(0)
  const commentsRequestRef = useRef(0)
  const commentSubmitRef = useRef(0)
  const [boardApi, setBoardApi] = useState(api)
  const [privateFeed, setPrivateFeed] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState([])
  const [selectedPostId, setSelectedPostId] = useState(initialPostId)
  const [mode, setMode] = useState(initialPostId ? BOARD_MODES.detail : initialMode === BOARD_MODES.write ? BOARD_MODES.write : BOARD_MODES.list)
  const [postCursorStack, setPostCursorStack] = useState([])
  const [commentCursorStack, setCommentCursorStack] = useState([])
  const [loading, setLoading] = useState(false)
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [postSubmitting, setPostSubmitting] = useState(false)
  const [commentSubmittingPostId, setCommentSubmittingPostId] = useState('')
  const [postForm, setPostForm] = useState({ title: '', body: '', nickname: '', isPrivate: false })
  const [commentForm, setCommentForm] = useState({ body: '', nickname: '' })
  const selectedPost = useMemo(() => posts.find((post) => post.id === selectedPostId) || null, [posts, selectedPostId])
  const selectedPostIsSubmittingComment = Boolean(selectedPost?.id && commentSubmittingPostId === selectedPost.id)
  const postCursor = postCursorStack[postCursorStack.length - 1] || null
  const commentCursor = commentCursorStack[commentCursorStack.length - 1] || null
  const canShowOlderPosts = posts.length >= POST_PAGE_SIZE
  const canShowNewerPosts = postCursorStack.length > 0
  const canShowOlderComments = comments.length >= COMMENT_PAGE_SIZE
  const canShowNewerComments = commentCursorStack.length > 0

  useEffect(() => { setBoardApi(api) }, [api])

  useEffect(() => {
    if (!open || !initialPostId) return
    setSelectedPostId(initialPostId)
    setMode(BOARD_MODES.detail)
    setPostCursorStack([])
    setCommentCursorStack([])
    setCommentsError('')
  }, [open, initialPostId])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    selectedPostIdRef.current = selectedPostId
  }, [selectedPostId])

  useEffect(() => {
    openRef.current = open
    boardSessionRef.current += 1
    if (!open) {
      postsRequestRef.current += 1
      commentsRequestRef.current += 1
      commentSubmitRef.current += 1
      setPostSubmitting(false)
      setCommentSubmittingPostId('')
    }
  }, [open])

  useEffect(() => {
    if (!open || api) return undefined
    let cancelled = false
    import('../lib/firebaseBoard.js')
      .then((mod) => { if (!cancelled) setBoardApi(mod) })
      .catch(() => { if (!cancelled) setPostsError(boardCopy.backendMissing) })
    return () => { cancelled = true }
  }, [api, boardCopy.backendMissing, open])

  useEffect(() => {
    if (!open) return undefined
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // 게임의 "문의하기"로 들어오면(initialMode=write) 대화상자 대신 제목 입력란에 바로 포커스한다.
    // 모바일에서는 이 포커스로 키보드가 올라오는 것이 의도된 동작이다.
    requestAnimationFrame(() => {
      const inquiryField = initialMode === BOARD_MODES.write
        ? dialogRef.current?.querySelector('input[name="postTitle"]')
        : null
      if (inquiryField) inquiryField.focus()
      else dialogRef.current?.focus()
    })
    return () => {
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = getFocusable(dialogRef.current)
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open || !boardApi) return undefined
    const subscribe = privateFeed && admin ? boardApi.subscribePrivateBoardPosts : boardApi.subscribeBoardPosts
    if (!subscribe) {
      setPosts([])
      setPostsLoaded(false)
      setLoading(false)
      setPostsError(boardCopy.backendMissing)
      return undefined
    }
    const requestId = postsRequestRef.current + 1
    postsRequestRef.current = requestId
    setLoading(true)
    setPostsLoaded(false)
    setPostsError('')
    postsUnsubscribeRef.current?.()
    const options = postCursor ? { before: postCursor } : undefined
    postsUnsubscribeRef.current = subscribe(
      (items) => {
        if (!mountedRef.current || postsRequestRef.current !== requestId) return
        setPosts(Array.isArray(items) ? items : [])
        setPostsLoaded(true)
        setLoading(false)
      },
      () => {
        if (!mountedRef.current || postsRequestRef.current !== requestId) return
        setPostsError(boardCopy.loadError)
        setPostsLoaded(false)
        setLoading(false)
      },
      options,
    )
    return () => {
      postsRequestRef.current += 1
      postsUnsubscribeRef.current?.()
      postsUnsubscribeRef.current = null
    }
  }, [admin, boardApi, boardCopy.backendMissing, boardCopy.loadError, open, postCursor, privateFeed])

  useEffect(() => {
    if (!open || !selectedPost?.id || mode !== BOARD_MODES.detail || !boardApi?.subscribeBoardComments) {
      commentsRequestRef.current += 1
      commentsUnsubscribeRef.current?.()
      commentsUnsubscribeRef.current = null
      setComments([])
      return undefined
    }
    setCommentsError('')
    commentsUnsubscribeRef.current?.()
    const postId = selectedPost.id
    const requestId = commentsRequestRef.current + 1
    commentsRequestRef.current = requestId
    const options = privateFeed ? { ...(commentCursor ? { before: commentCursor } : {}), isPrivate: true } : (commentCursor ? { before: commentCursor } : undefined)
    commentsUnsubscribeRef.current = boardApi.subscribeBoardComments(
      postId,
      (items) => {
        if (mountedRef.current && commentsRequestRef.current === requestId && selectedPostIdRef.current === postId) setComments(Array.isArray(items) ? items : [])
      },
      () => {
        if (mountedRef.current && commentsRequestRef.current === requestId && selectedPostIdRef.current === postId) setCommentsError(boardCopy.commentLoadError)
      },
      options,
    )
    return () => {
      commentsRequestRef.current += 1
      commentsUnsubscribeRef.current?.()
      commentsUnsubscribeRef.current = null
    }
  }, [boardApi, boardCopy.commentLoadError, commentCursor, mode, open, privateFeed, selectedPost?.id])

  if (!open) return null

  const closeBoard = () => {
    boardSessionRef.current += 1
    postsRequestRef.current += 1
    commentsRequestRef.current += 1
    commentSubmitRef.current += 1
    setPostSubmitting(false)
    setCommentSubmittingPostId('')
    commentsUnsubscribeRef.current?.()
    postsUnsubscribeRef.current?.()
    onClose?.()
  }

  const openList = () => {
    setMode(BOARD_MODES.list)
    setSelectedPostId('')
    setCommentCursorStack([])
    setCommentsError('')
  }

  const openWrite = () => {
    setPostSuccess(false)
    setMode(BOARD_MODES.write)
    setSelectedPostId('')
    setCommentCursorStack([])
    setPostsError('')
  }

  const openDetail = (postId) => {
    setPostSuccess(false)
    setSelectedPostId(postId)
    setCommentCursorStack([])
    setMode(BOARD_MODES.detail)
    setCommentsError('')
  }

  const switchFeed = (nextPrivate) => {
    if (nextPrivate && !admin) return
    boardSessionRef.current += 1
    postsRequestRef.current += 1
    commentsRequestRef.current += 1
    commentSubmitRef.current += 1
    postsUnsubscribeRef.current?.()
    commentsUnsubscribeRef.current?.()
    postsUnsubscribeRef.current = null
    commentsUnsubscribeRef.current = null
    selectedPostIdRef.current = ''
    setPosts([])
    setComments([])
    setSelectedPostId('')
    setPostCursorStack([])
    setCommentCursorStack([])
    setCommentsError('')
    setPostsError('')
    setPostsLoaded(false)
    setCommentForm({ body: '', nickname: '' })
    setPostSubmitting(false)
    setCommentSubmittingPostId('')
    setPostSuccess(false)
    setMode(BOARD_MODES.list)
    setPrivateFeed(nextPrivate)
  }

  const showOlderPosts = () => {
    const lastPost = posts[posts.length - 1]
    if (!lastPost || posts.length < POST_PAGE_SIZE) return
    setPostCursorStack((stack) => [...stack, cursorFromItem(lastPost)])
  }

  const showNewerPosts = () => {
    setPostCursorStack((stack) => stack.slice(0, -1))
  }

  const showOlderComments = () => {
    const lastComment = comments[comments.length - 1]
    if (!lastComment || comments.length < COMMENT_PAGE_SIZE) return
    setCommentCursorStack((stack) => [...stack, cursorFromItem(lastComment)])
  }

  const showNewerComments = () => {
    setCommentCursorStack((stack) => stack.slice(0, -1))
  }

  const submitPost = async (event) => {
    event.preventDefault()
    if (postSubmitting) return
    const payload = {
      title: postForm.title.trim(),
      body: postForm.body.trim(),
      nickname: postForm.nickname.trim(),
      ...(postForm.isPrivate ? { isPrivate: true } : {}),
    }
    const limitError = validatePostPayload(payload, boardCopy)
    if (limitError) {
      setPostsError(limitError)
      return
    }
    if (!boardApi?.createBoardPost) {
      setPostsError(boardCopy.backendMissing)
      return
    }
    setPostSubmitting(true)
    setPostsError('')
    const submitted = { ...postForm }
    const sessionId = boardSessionRef.current
    try {
      await boardApi.createBoardPost(payload)
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId })) {
        setPostForm((current) => sameDraft(current, submitted) ? { title: '', body: '', nickname: current.nickname, isPrivate: false } : current)
        if (privateFeed) switchFeed(false)
        setPostSuccess(Boolean(payload.isPrivate))
        if (payload.isPrivate) dialogRef.current.querySelector('.zombie-board__body').scrollTop = 0
        setPostCursorStack([])
        setMode(BOARD_MODES.list)
      }
    } catch (error) {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId })) setPostsError(payload.isPrivate ? boardCopy.loadError : errorMessage(error, boardCopy.loadError))
    } finally {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId })) setPostSubmitting(false)
    }
  }

  const submitComment = async (event) => {
    event.preventDefault()
    if (selectedPostIsSubmittingComment || !selectedPost) return
    const payload = {
      body: commentForm.body.trim(),
      nickname: commentForm.nickname.trim(),
      ...(privateFeed ? { isPrivate: true } : {}),
    }
    const limitError = validateCommentPayload(payload, boardCopy)
    if (limitError) {
      setCommentsError(limitError)
      return
    }
    if (!boardApi?.createBoardComment) {
      setCommentsError(boardCopy.backendMissing)
      return
    }
    setCommentSubmittingPostId(selectedPost.id)
    setCommentsError('')
    const submitted = { ...commentForm }
    const postId = selectedPost.id
    const sessionId = boardSessionRef.current
    const submitId = commentSubmitRef.current + 1
    commentSubmitRef.current = submitId
    try {
      await boardApi.createBoardComment(postId, payload)
      setCommentForm((current) => (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) && selectedPostIdRef.current === postId && commentSubmitRef.current === submitId && sameDraft(current, submitted)) ? { body: '', nickname: current.nickname } : current)
    } catch (error) {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) && selectedPostIdRef.current === postId && commentSubmitRef.current === submitId) setCommentsError(privateFeed ? boardCopy.commentLoadError : errorMessage(error, boardCopy.commentLoadError))
    } finally {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) && commentSubmitRef.current === submitId) setCommentSubmittingPostId((current) => current === postId ? '' : current)
    }
  }

  const deletePost = async (postId) => {
    if (!admin || !boardApi?.deleteBoardPost || !window.confirm(boardCopy.confirmDeletePost)) return
    setPostsError('')
    const sessionId = boardSessionRef.current
    try {
      await (privateFeed ? boardApi.deleteBoardPost(postId, { isPrivate: true }) : boardApi.deleteBoardPost(postId))
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) && selectedPostIdRef.current === postId) openList()
    } catch (error) {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId })) setPostsError(privateFeed ? boardCopy.loadError : errorMessage(error, boardCopy.loadError))
    }
  }

  const deleteComment = async (commentId) => {
    if (!admin || !selectedPost || !boardApi?.deleteBoardComment || !window.confirm(boardCopy.confirmDeleteComment)) return
    setCommentsError('')
    const sessionId = boardSessionRef.current
    const postId = selectedPost.id
    try {
      await (privateFeed ? boardApi.deleteBoardComment(postId, commentId, { isPrivate: true }) : boardApi.deleteBoardComment(postId, commentId))
    } catch (error) {
      if (isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) && selectedPostIdRef.current === postId) setCommentsError(privateFeed ? boardCopy.commentLoadError : errorMessage(error, boardCopy.commentLoadError))
    }
  }

  return (
    <div className="zombie-board__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBoard() }}>
      <style>{zombieBoardCss}</style>
      <section
        ref={dialogRef}
        className="zombie-board"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zombie-board-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="zombie-board__header">
          <div>
            <h2 id="zombie-board-title">{boardCopy.title}</h2>
            <p>{boardCopy.subtitle}</p>
          </div>
          <div className="zombie-board__header-actions">
            {!admin ? <button type="button" className="zombie-board__admin-login" onClick={() => signInWithGoogle?.()} disabled={authSigningIn}>{authSigningIn ? (boardCopy.adminSigningIn || boardCopy.adminLogin) : boardCopy.adminLogin}</button> : <span className="zombie-board__admin-badge">{boardCopy.adminOnly}</span>}
            <button type="button" className="zombie-board__close" aria-label={boardCopy.close} onClick={closeBoard}>×</button>
          </div>
        </header>
        {!admin && authError ? <p className="zombie-board__auth-error" role="alert">{boardCopy.adminLoginError || boardCopy.loadError}</p> : null}

        <div className="zombie-board__body">
          {admin ? <nav className="zombie-board__feeds" aria-label={boardCopy.adminOnly}>
            <button type="button" data-board-feed="public" aria-pressed={!privateFeed} disabled={!privateFeed} onClick={() => switchFeed(false)}>{boardCopy.publicFeed}</button>
            <button type="button" data-board-feed="private" aria-pressed={privateFeed} disabled={privateFeed} onClick={() => switchFeed(true)}>{boardCopy.privateFeed}</button>
          </nav> : null}
          {postSuccess ? <p className="zombie-board__notice" role="status">{boardCopy.privateSuccess}</p> : null}
          {mode === BOARD_MODES.list ? (
            <section className="zombie-board__panel" aria-label={boardCopy.listLabel}>
              <div className="zombie-board__toolbar">
                <h3>{privateFeed ? boardCopy.privateFeed : boardCopy.listLabel}</h3>
                <button type="button" className="zombie-board__primary" onClick={openWrite}>{boardCopy.writePost}</button>
              </div>
              {loading ? <p className="zombie-board__notice">{boardCopy.loading}</p> : null}
              {postsError ? <p className="zombie-board__error" role="alert">{postsError}</p> : null}
              {!loading && postsLoaded && !postsError && !posts.length ? <p className="zombie-board__notice">{boardCopy.empty}</p> : null}
              <div className="zombie-board__list">
                {posts.map((post) => (
                  <article key={post.id} className="zombie-board__post-card">
                    <button type="button" data-post-id={post.id} onClick={() => openDetail(post.id)}>
                      <strong>{post.title}</strong>
                      <span>{post.nickname || boardCopy.anonymous} · {formatBoardDate(post.createdAt)}</span>
                      <span>{excerpt(post.body)}</span>
                    </button>
                  </article>
                ))}
              </div>
              <PaginationControls
                newerLabel={boardCopy.newerPosts}
                olderLabel={boardCopy.olderPosts}
                canShowNewer={canShowNewerPosts}
                canShowOlder={canShowOlderPosts}
                onNewer={showNewerPosts}
                onOlder={showOlderPosts}
              />
            </section>
          ) : null}

          {mode === BOARD_MODES.write ? (
            <section className="zombie-board__panel" aria-label={boardCopy.writePost}>
              <button type="button" className="zombie-board__back" onClick={openList}>{boardCopy.back}</button>
              {postsError ? <p className="zombie-board__error" role="alert">{postsError}</p> : null}
              <form className="zombie-board__form" aria-label={boardCopy.writePost} onSubmit={submitPost}>
                <h3>{boardCopy.writePost}</h3>
                <label>{boardCopy.titleLabel}<input name="postTitle" maxLength={LIMITS.title} value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} /></label>
                <label>{boardCopy.bodyLabel}<textarea name="postBody" maxLength={LIMITS.body} value={postForm.body} onChange={(event) => setPostForm({ ...postForm, body: event.target.value })} /></label>
                <label>{boardCopy.nicknameLabel}<input name="postNickname" maxLength={LIMITS.nickname} placeholder={boardCopy.nicknamePlaceholder} value={postForm.nickname} onChange={(event) => setPostForm({ ...postForm, nickname: event.target.value })} /></label>
                <label className="zombie-board__private-option"><input type="checkbox" name="postPrivate" checked={postForm.isPrivate} aria-describedby="zombie-board-private-help" onChange={(event) => setPostForm({ ...postForm, isPrivate: event.target.checked })} />{boardCopy.privatePost}</label>
                <p id="zombie-board-private-help" className="zombie-board__notice">{boardCopy.privateExplanation}</p>
                <button type="submit" className="zombie-board__primary" disabled={postSubmitting || !boardApi?.createBoardPost}>{postSubmitting ? boardCopy.submittingPost : boardCopy.submitPost}</button>
              </form>
            </section>
          ) : null}

          {mode === BOARD_MODES.detail ? (
            <section className="zombie-board__panel" aria-label={boardCopy.detailLabel}>
              {selectedPost ? (
                <>
                  <button type="button" className="zombie-board__back" onClick={openList}>{boardCopy.back}</button>
                  <article className="zombie-board__detail-card">
                    <div className="zombie-board__detail-head">
                      <div>
                        <h3>{selectedPost.title}</h3>
                        <p>{selectedPost.nickname || boardCopy.anonymous} · <span aria-label={boardCopy.createdAt}>{formatBoardDate(selectedPost.createdAt)}</span></p>
                      </div>
                      {admin ? <button type="button" data-testid={`delete-post-${selectedPost.id}`} onClick={() => deletePost(selectedPost.id)}>{boardCopy.deletePost}</button> : null}
                    </div>
                    <p className="zombie-board__detail-body">{selectedPost.body}</p>
                  </article>

                  <div className="zombie-board__comments">
                    <h3>{boardCopy.comments}</h3>
                    {commentsError ? <p className="zombie-board__error" role="alert">{commentsError}</p> : null}
                    {comments.map((comment) => (
                      <article key={comment.id} className="zombie-board__comment">
                        <p>{comment.body}</p>
                        <span>{comment.nickname || boardCopy.anonymous} · {formatBoardDate(comment.createdAt)}</span>
                        {admin ? <button type="button" data-testid={`delete-comment-${comment.id}`} onClick={() => deleteComment(comment.id)}>{boardCopy.deleteComment}</button> : null}
                      </article>
                    ))}
                    <PaginationControls
                      newerLabel={boardCopy.newerComments}
                      olderLabel={boardCopy.olderComments}
                      canShowNewer={canShowNewerComments}
                      canShowOlder={canShowOlderComments}
                      onNewer={showNewerComments}
                      onOlder={showOlderComments}
                    />
                  </div>

                  <form className="zombie-board__form" aria-label={boardCopy.writeComment} onSubmit={submitComment}>
                    <h3>{boardCopy.writeComment}</h3>
                    <label>{boardCopy.commentLabel}<textarea name="commentBody" maxLength={LIMITS.comment} value={commentForm.body} onChange={(event) => setCommentForm({ ...commentForm, body: event.target.value })} /></label>
                    <label>{boardCopy.nicknameLabel}<input name="commentNickname" maxLength={LIMITS.nickname} placeholder={boardCopy.nicknamePlaceholder} value={commentForm.nickname} onChange={(event) => setCommentForm({ ...commentForm, nickname: event.target.value })} /></label>
                    <button type="submit" className="zombie-board__primary" disabled={selectedPostIsSubmittingComment || !boardApi?.createBoardComment}>{selectedPostIsSubmittingComment ? boardCopy.submittingComment : boardCopy.submitComment}</button>
                  </form>
                </>
              ) : (
                <>
                  <button type="button" className="zombie-board__back" onClick={openList}>{boardCopy.back}</button>
                  <p className="zombie-board__notice" role={postsError ? 'alert' : 'status'}>{postsError || (loading || !postsLoaded ? boardCopy.loading : boardCopy.missingPost)}</p>
                </>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function PaginationControls({ newerLabel, olderLabel, canShowNewer, canShowOlder, onNewer, onOlder }) {
  if (!canShowNewer && !canShowOlder) return null
  return (
    <nav className="zombie-board__pagination" aria-label={`${newerLabel} / ${olderLabel}`}>
      <button type="button" onClick={onNewer} disabled={!canShowNewer}>{newerLabel}</button>
      <button type="button" onClick={onOlder} disabled={!canShowOlder}>{olderLabel}</button>
    </nav>
  )
}

function cursorFromItem(item) {
  return { createdAt: item.createdAt, id: item.id }
}

function getFocusable(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter((node) => !node.disabled && node.getAttribute('aria-hidden') !== 'true')
}

function sameDraft(a, b) {
  return Object.keys(b).every((key) => a[key] === b[key])
}

function isCurrentBoardContext({ mountedRef, openRef, boardSessionRef, sessionId }) {
  return mountedRef.current && openRef.current && boardSessionRef.current === sessionId
}

function validatePostPayload(payload, boardCopy) {
  if (!payload.title || !payload.body) return boardCopy.requiredPost
  if (payload.title.length > LIMITS.title) return boardCopy.titleTooLong
  if (payload.body.length > LIMITS.body) return boardCopy.bodyTooLong
  if (payload.nickname.length > LIMITS.nickname) return boardCopy.nicknameTooLong
  return ''
}

function validateCommentPayload(payload, boardCopy) {
  if (!payload.body) return boardCopy.requiredComment
  if (payload.body.length > LIMITS.comment) return boardCopy.commentTooLong
  if (payload.nickname.length > LIMITS.nickname) return boardCopy.nicknameTooLong
  return ''
}

function errorMessage(error, fallback) {
  return error?.message || fallback
}

function excerpt(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 96) return text
  return `${text.slice(0, 96)}…`
}

function formatBoardDate(value) {
  if (!value) return ''
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

const zombieBoardCss = `
.zombie-board__backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: rgba(12, 18, 33, 0.62);
}

.zombie-board {
  width: min(840px, 100%);
  max-height: min(86dvh, 860px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 2px solid rgba(37, 99, 235, 0.28);
  border-radius: 28px;
  background: #F6F8FF;
  color: #172033;
  box-shadow: 0 26px 90px rgba(5, 7, 11, 0.28);
}

.zombie-board__header,
.zombie-board__detail-head,
.zombie-board__toolbar,
.zombie-board__header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.zombie-board__header {
  padding: 20px;
  border-bottom: 1px solid rgba(37, 99, 235, 0.18);
  background: #FFFFFF;
}

.zombie-board__header-actions {
  flex: 0 0 auto;
  align-self: flex-start;
  align-items: flex-start;
}

.zombie-board h2,
.zombie-board h3,
.zombie-board p {
  margin: 0;
}

.zombie-board__header p,
.zombie-board__post-card span,
.zombie-board__detail-card p,
.zombie-board__comment span,
.zombie-board__notice {
  color: #41506A;
  line-height: 1.5;
}

.zombie-board__close,
.zombie-board button {
  min-height: 44px;
  min-width: 44px;
  border-radius: 14px;
  border: 2px solid rgba(37, 99, 235, 0.22);
  background: #FFFFFF;
  color: #172033;
  font-weight: 900;
  cursor: pointer;
}

.zombie-board__close {
  font-size: 28px;
  line-height: 1;
}

.zombie-board__admin-login,
.zombie-board__admin-badge {
  align-self: flex-start;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 2px solid rgba(37, 99, 235, 0.18);
  background: #FFFFFF;
  color: #2563EB;
  font-size: 0.9rem;
  line-height: 1.2;
  white-space: nowrap;
}

.zombie-board__admin-badge {
  display: inline-flex;
  align-items: center;
  font-weight: 900;
}

.zombie-board__body {
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.zombie-board__panel,
.zombie-board__list,
.zombie-board__form,
.zombie-board__detail-card,
.zombie-board__comment,
.zombie-board__comments {
  display: grid;
  gap: 12px;
}

.zombie-board__post-card,
.zombie-board__detail-card,
.zombie-board__comment,
.zombie-board__form {
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
}

.zombie-board__toolbar {
  align-items: center;
}

.zombie-board__post-card button {
  width: 100%;
  display: grid;
  gap: 6px;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0;
}

.zombie-board__post-card strong,
.zombie-board__detail-card h3 {
  overflow-wrap: anywhere;
}

.zombie-board__post-card span:last-child,
.zombie-board__detail-body,
.zombie-board__comment p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.zombie-board__form label {
  display: grid;
  gap: 6px;
  color: #172033;
  font-weight: 850;
}

.zombie-board__form input:not([type="checkbox"]),
.zombie-board__form textarea {
  width: 100%;
  min-height: 44px;
  border: 2px solid rgba(37, 99, 235, 0.18);
  border-radius: 14px;
  padding: 10px 12px;
  background: #FFFFFF;
  color: #172033;
  font: inherit;
}

.zombie-board__form .zombie-board__private-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}
.zombie-board__private-option input { width: 22px; height: 22px; margin: 0; flex: 0 0 auto; }
.zombie-board__feeds { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.zombie-board__feeds button { padding: 8px 12px; }
.zombie-board button:focus-visible, .zombie-board input:focus-visible { outline: 3px solid #7C3AED; outline-offset: 2px; }

.zombie-board__form textarea {
  min-height: 110px;
  resize: vertical;
}

.zombie-board__primary,
.zombie-board__back,
.zombie-board__detail-head button,
.zombie-board__comment button {
  padding: 10px 16px;
  background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
  color: #FFFFFF;
}

.zombie-board__back {
  justify-self: start;
}

.zombie-board__primary:disabled,
.zombie-board__pagination button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.zombie-board__pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.zombie-board__pagination button {
  padding: 10px 14px;
}

.zombie-board__error,
.zombie-board__auth-error {
  padding: 10px 12px;
  border-radius: 14px;
  background: #FEE2E2;
  color: #991B1B;
  font-weight: 850;
}

.zombie-board__auth-error {
  margin: 12px 20px 0;
}

@media (max-width: 720px) {
  .zombie-board__backdrop {
    align-items: stretch;
    padding: 8px;
  }

  .zombie-board {
    max-height: calc(100dvh - 16px);
    border-radius: 22px;
  }

  .zombie-board__header {
    padding: 14px;
  }

  .zombie-board__header {
    flex-direction: column;
  }

  .zombie-board__header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .zombie-board__body {
    padding: 12px;
  }
}
`
