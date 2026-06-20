import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'

export default function GoogleAccountPanel() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const error = useAuthStore((s) => s.error)
  const signingIn = useAuthStore((s) => s.signingIn)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signOutOfGoogle = useAuthStore((s) => s.signOutOfGoogle)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <GoogleAccountPanelView
      status={status}
      user={user}
      error={error}
      signingIn={signingIn}
      onSignIn={signInWithGoogle}
      onSignOut={signOutOfGoogle}
    />
  )
}

export function GoogleAccountPanelView({ status, user, error, signingIn, onSignIn, onSignOut }) {
  const signedIn = status === 'signedIn' && user
  const disabled = status === 'unconfigured' || status === 'checking' || signingIn
  const label = getPanelLabel(status, signingIn)

  return (
    <section style={styles.panel} aria-label="Google account">
      <div style={styles.identity}>
        {signedIn && user.photoURL ? (
          <img src={user.photoURL} alt="" style={styles.avatar} />
        ) : (
          <span style={styles.avatarFallback}>G</span>
        )}
        <span style={styles.copy}>
          <strong style={styles.title}>{signedIn ? (user.displayName || 'Google 계정') : label}</strong>
          <span style={styles.detail}>
            {signedIn ? (user.email || '계정 연결됨') : getPanelDetail(status, error)}
          </span>
        </span>
      </div>
      {signedIn ? (
        <button type="button" style={styles.secondaryButton} onClick={onSignOut}>
          로그아웃
        </button>
      ) : (
        <button type="button" style={styles.primaryButton} disabled={disabled} onClick={onSignIn}>
          {signingIn ? '로그인 중...' : 'Google 로그인'}
        </button>
      )}
    </section>
  )
}

function getPanelLabel(status, signingIn) {
  if (signingIn) return 'Google 로그인 중'
  if (status === 'unconfigured') return 'Google 로그인 설정 필요'
  if (status === 'checking') return '계정 확인 중'
  if (status === 'error') return '로그인 오류'
  return '계정 연동 가능'
}

function getPanelDetail(status, error) {
  if (status === 'unconfigured') return 'Firebase .env 설정 후 사용'
  if (status === 'checking') return '저장된 로그인 확인 중'
  if (status === 'error') return error || '다시 시도해 주세요'
  return '진행 정보 클라우드 저장 준비'
}

const styles = {
  panel: {
    position: 'absolute',
    top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 8px))',
    left: 'max(14px, calc(env(safe-area-inset-left, 0px) + 8px))',
    width: 'min(260px, calc(100% - 78px))',
    minHeight: 44,
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: 8,
    padding: '6px 7px',
    border: '2px solid #050209',
    borderRadius: 8,
    background: 'rgba(248,247,242,0.94)',
    color: '#050209',
    boxShadow: '0 4px 0 #050209, 0 0 12px rgba(89,199,255,0.24)',
    boxSizing: 'border-box',
    zIndex: 3,
    pointerEvents: 'auto',
  },
  identity: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 28,
    height: 28,
    flex: '0 0 auto',
    border: '2px solid #050209',
    borderRadius: 8,
    objectFit: 'cover',
    background: '#ffffff',
  },
  avatarFallback: {
    width: 28,
    height: 28,
    flex: '0 0 auto',
    display: 'grid',
    placeItems: 'center',
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#ffffff',
    color: '#2867d7',
    fontSize: 16,
    lineHeight: 1,
    fontWeight: 1000,
  },
  copy: {
    minWidth: 0,
    display: 'block',
  },
  title: {
    display: 'block',
    overflow: 'hidden',
    color: '#050209',
    fontSize: 12,
    lineHeight: 1.15,
    fontWeight: 1000,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  detail: {
    display: 'block',
    overflow: 'hidden',
    marginTop: 2,
    color: '#4d4658',
    fontSize: 10,
    lineHeight: 1.15,
    fontWeight: 800,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  primaryButton: {
    minWidth: 83,
    minHeight: 30,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#59c7ff',
    color: '#050209',
    fontSize: 11,
    lineHeight: 1.1,
    fontWeight: 1000,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #050209',
  },
  secondaryButton: {
    minWidth: 58,
    minHeight: 30,
    border: '2px solid #050209',
    borderRadius: 8,
    background: '#f7d17e',
    color: '#050209',
    fontSize: 11,
    lineHeight: 1.1,
    fontWeight: 1000,
    cursor: 'pointer',
    boxShadow: '0 2px 0 #050209',
  },
}
