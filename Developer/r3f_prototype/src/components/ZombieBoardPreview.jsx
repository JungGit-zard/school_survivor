import { useEffect, useRef, useState } from 'react'
import { subscribeBoardPosts } from '../lib/firebaseBoard.js'
import { ZOMBIE_BOARD_COPY } from './zombieBoardCopy.js'

export default function ZombieBoardPreview({ language = 'ko', onOpenPost }) {
  const copy = ZOMBIE_BOARD_COPY[language] || ZOMBIE_BOARD_COPY.ko
  const sectionRef = useRef(null)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    const unsubscribe = subscribeBoardPosts(
      (items) => {
        if (!active) return
        setPosts(Array.isArray(items) ? items.slice(0, 5) : [])
        setStatus('loaded')
      },
      () => { if (active) setStatus('error') },
    )
    return () => { active = false; unsubscribe?.() }
  }, [])

  useEffect(() => {
    const scrollToBoard = () => {
      if (window.location.hash === '#zombie-board-preview') sectionRef.current?.scrollIntoView?.({ block: 'start' })
    }
    scrollToBoard()
    window.addEventListener('hashchange', scrollToBoard)
    return () => window.removeEventListener('hashchange', scrollToBoard)
  }, [])

  return (
    <section ref={sectionRef} id="zombie-board-preview" className="zombie-board-preview" aria-labelledby="zombie-board-preview-title" aria-busy={status === 'loading'}>
      <style>{previewCss}</style>
      <h2 id="zombie-board-preview-title">{copy.previewHeading}</h2>
      {status === 'loading' ? <p role="status">{copy.loading}</p> : null}
      {status === 'error' ? <p role="alert">{copy.loadError}</p> : null}
      {status === 'loaded' && !posts.length ? <p role="status">{copy.empty}</p> : null}
      {status === 'loaded' && posts.length ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <button type="button" data-post-id={post.id} title={post.title} onClick={() => onOpenPost?.(post.id)}>{post.title}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

const previewCss = `
.zombie-board-preview {
  width: 100%;
  min-width: 0;
  scroll-margin-top: 76px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 16px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.94);
  color: #172033;
}
.zombie-board-preview h2 { margin: 0 0 4px; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
.zombie-board-preview p { margin: 8px 0; font-size: 14px; overflow-wrap: anywhere; }
.zombie-board-preview ul { margin: 0; padding: 0; list-style: none; }
.zombie-board-preview li + li { border-top: 1px solid #E8ECFF; }
.zombie-board-preview button {
  display: block;
  width: 100%;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #2563EB;
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  line-height: 24px;
  text-align: start;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.zombie-board-preview button:hover { background: #E8ECFF; }
.zombie-board-preview button:focus-visible { outline: 2px solid #7C3AED; outline-offset: 1px; }
.zombie-board-preview button:active { background: #DCE4FF; }
@media (max-width: 360px) {
  .zombie-board-preview { padding: 4px 8px; }
  .zombie-board-preview h2 { margin: 0; font-size: 14px; line-height: 18px; }
}
`
