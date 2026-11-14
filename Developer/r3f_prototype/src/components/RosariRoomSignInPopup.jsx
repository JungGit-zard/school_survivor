import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiType } from '../lib/uiStyle.js'
import { useT } from '../lib/i18n.js'

// 게스트가 로비의 「로자리의 방」을 누르면 뜨는 안내 팝업. 로그인은 기존 useAuthStore.signInWithGoogle
// (타이틀 계정 패널과 같은 경로)만 부른다. ESC·뒤로가기·닫기 버튼·바깥 탭으로 닫힌다.
const HISTORY_KEY = 'ezsRosariGate'

export default function RosariRoomSignInPopup({ onClose }) {
  const t = useT()
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signingIn = useAuthStore((s) => s.signingIn)
  const authStatus = useAuthStore((s) => s.status)
  const signInButtonRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    signInButtonRef.current?.focus()
    // 뒤로가기(안드로이드 back 포함)는 팝업만 닫는다: 열 때 기록 하나를 쌓고 popstate에서 닫는다.
    window.history.pushState({ ...(window.history.state || {}), [HISTORY_KEY]: true }, '')
    const onPopState = () => onCloseRef.current?.()
    const onKey = (event) => { if (event.key === 'Escape') onCloseRef.current?.() }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKey)
      // 버튼·ESC로 닫혔으면 쌓아 둔 기록을 걷어 낸다(뒤로가기로 닫혔으면 이미 빠져 있다).
      if (window.history.state?.[HISTORY_KEY]) window.history.back()
    }
  }, [])

  const handleSignIn = async () => {
    const user = await signInWithGoogle?.()
    if (user?.uid) onCloseRef.current?.()
  }

  const busy = signingIn || authStatus === 'checking'

  return (
    <div style={styles.overlay}>
      <button type="button" tabIndex={-1} aria-hidden="true" data-ui-sfx="close" style={styles.scrim} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rosari-gate-title"
        aria-describedby="rosari-gate-body"
        data-testid="rosari-room-signin-popup"
        style={styles.modal}
      >
        <div style={styles.header}>
          <h2 id="rosari-gate-title" style={styles.title}>{t('rosariRoom.title')}</h2>
          <button type="button" aria-label={t('lobby.rosariRoomGate.close')} style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <p id="rosari-gate-body" style={styles.body}>{t('lobby.rosariRoomGate.body')}</p>
        <button
          ref={signInButtonRef}
          type="button"
          data-testid="rosari-room-signin-button"
          disabled={busy}
          style={{ ...styles.signInButton, ...(busy ? styles.busy : null) }}
          onClick={handleSignIn}
        >
          {busy ? t('lobby.rosariRoomGate.signingIn') : t('lobby.rosariRoomGate.signIn')}
        </button>
        <button type="button" data-testid="rosari-room-signin-cancel" data-ui-sfx="close" style={styles.cancelButton} onClick={onClose}>
          {t('lobby.rosariRoomGate.close')}
        </button>
      </section>
    </div>
  )
}

const styles = {
  overlay: { position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: uiType.family },
  scrim: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, padding: 0, background: 'rgba(5,2,9,0.55)', cursor: 'pointer' },
  modal: {
    ...schoolPanel('paper'),
    position: 'relative',
    width: 'min(100% - 28px, 360px)',
    maxHeight: 'calc(100dvh - 28px)',
    overflowY: 'auto',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, #ffe3ef 0%, #fff6dc 100%)',
    color: '#3b1c37',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { margin: 0, fontSize: 20, lineHeight: 1.2, fontWeight: uiType.weightHeavy, color: '#5f2d58', overflowWrap: 'anywhere' },
  closeButton: {
    flex: '0 0 auto', width: 44, height: 44, display: 'grid', placeItems: 'center', padding: 0,
    border: uiBorders.strong, borderRadius: 8, background: uiPalette.paperLight, color: uiPalette.ink,
    fontSize: 22, fontWeight: uiType.weightHeavy, cursor: 'pointer',
  },
  body: { margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 800, wordBreak: 'keep-all', overflowWrap: 'anywhere' },
  signInButton: { ...schoolButton('primary'), width: '100%', minHeight: 48, padding: '0 12px', fontSize: 16 },
  busy: { opacity: 0.7, cursor: 'wait' },
  cancelButton: { ...schoolButton('paper'), width: '100%', minHeight: 44, padding: '0 12px', fontSize: 14 },
}
